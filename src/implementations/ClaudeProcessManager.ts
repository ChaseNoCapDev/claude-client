import { injectable, inject } from 'inversify';
import { IResult, success, failure } from '@chasenocap/di-framework';
import type { ILogger } from '@chasenocap/logger';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

import { IClaudeProcessManager } from '../interfaces/IClaudeProcessManager.js';
import {
  ClaudeCommand,
  ClaudeResponse,
} from '../types/ClaudeTypes.js';
import { CLAUDE_TYPES } from '../utils/ClaudeTokens.js';

const execAsync = promisify(exec);

@injectable()
export class ClaudeProcessManager implements IClaudeProcessManager {
  private runningProcesses = new Map<number, ChildProcess>();

  constructor(
    @inject(CLAUDE_TYPES.ILogger) private logger: ILogger
  ) {
    this.logger = logger.child({ service: 'ClaudeProcessManager' });
  }

  async spawn(command: ClaudeCommand): Promise<IResult<ChildProcess>> {
    try {
      this.logger.debug('Spawning Claude process', { 
        command: command.command,
        args: command.args,
        cwd: command.cwd
      });

      const childProcess = spawn(command.command, command.args || [], {
        cwd: command.cwd || globalThis.process.cwd(),
        env: { ...globalThis.process.env, ...command.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (childProcess.pid) {
        this.runningProcesses.set(childProcess.pid, childProcess);

        // Clean up when process exits
        childProcess.on('exit', () => {
          if (childProcess.pid) {
            this.runningProcesses.delete(childProcess.pid);
          }
        });
      }

      return success(childProcess);
    } catch (error) {
      this.logger.error('Failed to spawn Claude process', error as Error, {
        command: command.command,
        args: command.args
      });
      return failure(error as Error);
    }
  }

  async execute(command: ClaudeCommand): Promise<IResult<ClaudeResponse>> {
    const startTime = Date.now();
    const responseId = `exec_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.info('Executing Claude command', {
        id: responseId,
        command: command.command,
        args: command.args
      });

      const spawnResult = await this.spawn(command);
      if (!spawnResult.success) {
        return failure(spawnResult.error!);
      }

      const childProcess = spawnResult.data!;
      const chunks: string[] = [];
      const errorChunks: string[] = [];

      // Collect stdout
      childProcess.stdout?.on('data', (chunk) => {
        chunks.push(chunk.toString());
      });

      // Collect stderr
      childProcess.stderr?.on('data', (chunk) => {
        errorChunks.push(chunk.toString());
      });

      // Wait for process to complete
      const exitCode = await new Promise<number>((resolve, reject) => {
        if (command.timeout) {
          setTimeout(() => {
            childProcess.kill('SIGTERM');
            reject(new Error(`Process timed out after ${command.timeout}ms`));
          }, command.timeout);
        }

        childProcess.on('exit', (code) => {
          resolve(code || 0);
        });

        childProcess.on('error', (error) => {
          reject(error);
        });
      });

      const duration = Date.now() - startTime;
      const output = chunks.join('');
      const error = errorChunks.join('');

      const response: ClaudeResponse = {
        id: responseId,
        output,
        error: error || undefined,
        exitCode,
        duration,
        timestamp: new Date(),
      };

      this.logger.info('Claude command completed', {
        id: responseId,
        exitCode,
        duration,
        outputLength: output.length,
        hasError: !!error
      });

      return success(response);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Claude command failed', error as Error, {
        id: responseId,
        duration,
        command: command.command
      });

      return failure(error as Error);
    }
  }

  async executeStream(
    command: ClaudeCommand,
    onChunk: (chunk: string) => void
  ): Promise<IResult<ClaudeResponse>> {
    const startTime = Date.now();
    const responseId = `stream_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.info('Executing Claude command with streaming', {
        id: responseId,
        command: command.command,
        args: command.args
      });

      const spawnResult = await this.spawn(command);
      if (!spawnResult.success) {
        return failure(spawnResult.error!);
      }

      const childProcess = spawnResult.data!;
      const allChunks: string[] = [];
      const errorChunks: string[] = [];

      // Stream stdout and collect for final response
      childProcess.stdout?.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        allChunks.push(chunkStr);
        onChunk(chunkStr);
      });

      // Collect stderr
      childProcess.stderr?.on('data', (chunk) => {
        errorChunks.push(chunk.toString());
      });

      // Wait for process to complete
      const exitCode = await new Promise<number>((resolve, reject) => {
        if (command.timeout) {
          setTimeout(() => {
            childProcess.kill('SIGTERM');
            reject(new Error(`Process timed out after ${command.timeout}ms`));
          }, command.timeout);
        }

        childProcess.on('exit', (code) => {
          resolve(code || 0);
        });

        childProcess.on('error', (error) => {
          reject(error);
        });
      });

      const duration = Date.now() - startTime;
      const output = allChunks.join('');
      const error = errorChunks.join('');

      const response: ClaudeResponse = {
        id: responseId,
        output,
        error: error || undefined,
        exitCode,
        duration,
        timestamp: new Date(),
      };

      this.logger.info('Claude streaming command completed', {
        id: responseId,
        exitCode,
        duration,
        chunkCount: allChunks.length,
        outputLength: output.length
      });

      return success(response);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Claude streaming command failed', error as Error, {
        id: responseId,
        duration,
        command: command.command
      });

      return failure(error as Error);
    }
  }

  async kill(processId: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<IResult<void>> {
    try {
      const childProcess = this.runningProcesses.get(processId);
      if (!childProcess) {
        return failure(new Error(`Process ${processId} not found`));
      }

      childProcess.kill(signal);
      this.runningProcesses.delete(processId);

      this.logger.info('Killed Claude process', { processId, signal });
      return success(undefined);
    } catch (error) {
      this.logger.error('Failed to kill Claude process', error as Error, {
        processId,
        signal
      });
      return failure(error as Error);
    }
  }

  getRunningProcesses(): number[] {
    return Array.from(this.runningProcesses.keys());
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Claude processes', {
      processCount: this.runningProcesses.size
    });

    const killPromises = Array.from(this.runningProcesses.keys()).map(
      (pid) => this.kill(pid, 'SIGTERM')
    );

    await Promise.all(killPromises);
    this.runningProcesses.clear();
    
    this.logger.info('Claude process cleanup completed');
  }

  async isClaudeAvailable(): Promise<boolean> {
    try {
      // Try to check if 'claude' command is available
      await execAsync('which claude');
      return true;
    } catch {
      // If 'which' fails, try 'claude --version'
      try {
        await execAsync('claude --version');
        return true;
      } catch {
        return false;
      }
    }
  }

  async getClaudeVersion(): Promise<IResult<string>> {
    try {
      const { stdout } = await execAsync('claude --version');
      const version = stdout.trim();
      this.logger.debug('Retrieved Claude version', { version });
      return success(version);
    } catch (error) {
      this.logger.error('Failed to get Claude version', error as Error);
      return failure(error as Error);
    }
  }
}
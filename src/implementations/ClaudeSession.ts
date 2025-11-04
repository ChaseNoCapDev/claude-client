import { injectable, inject } from 'inversify';
import { IResult, success, failure } from '@chasenocap/di-framework';
import type { ILogger } from '@chasenocap/logger';

import type { IClaudeSession } from '../interfaces/IClaudeSession.js';
import type { IClaudeProcessManager } from '../interfaces/IClaudeProcessManager.js';
import type {
  ClaudeCommand,
  ClaudeResponse,
  ClaudeExecutionOptions,
  ClaudeSessionConfig,
} from '../types/ClaudeTypes.js';
import { CLAUDE_TYPES } from '../utils/ClaudeTokens.js';

@injectable()
export class ClaudeSession implements IClaudeSession {
  public readonly id: string;
  public readonly config: ClaudeSessionConfig;
  public readonly createdAt: Date;

  private _isActive = true;
  private _lastActivity: Date;
  private _executionCount = 0;
  private _totalDuration = 0;
  private _lastExecutionTime?: Date;
  private sessionLogger: ILogger;

  constructor(
    config: ClaudeSessionConfig,
    @inject(CLAUDE_TYPES.IClaudeProcessManager) private processManager: IClaudeProcessManager,
    @inject(CLAUDE_TYPES.ILogger) logger: ILogger
  ) {
    this.id = config.id;
    this.config = { ...config };
    this.createdAt = new Date();
    this._lastActivity = new Date();
    
    this.sessionLogger = logger.child({ 
      service: 'ClaudeSession',
      sessionId: this.id 
    });

    this.sessionLogger.info('Claude session created', {
      config: this.config,
      createdAt: this.createdAt
    });
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get lastActivity(): Date {
    return this._lastActivity;
  }

  async execute(
    command: ClaudeCommand,
    options?: ClaudeExecutionOptions
  ): Promise<IResult<ClaudeResponse>> {
    if (!this._isActive) {
      return failure(new Error(`Session ${this.id} is not active`));
    }

    this.updateActivity();

    // Merge session config with command
    const cwd = command.cwd ?? this.config.workingDirectory;
    const timeout = options?.timeout ?? command.timeout ?? this.config.timeout;

    const mergedCommand: ClaudeCommand = {
      ...command,
      ...(cwd && { cwd }),
      env: { ...this.config.environment, ...command.env },
      ...(timeout && { timeout }),
    };

    this.sessionLogger.info('Executing command in session', {
      command: mergedCommand.command,
      args: mergedCommand.args,
      options
    });

    const startTime = Date.now();
    const result = await this.processManager.execute(mergedCommand);
    const duration = Date.now() - startTime;

    // Update session statistics
    this._executionCount++;
    this._totalDuration += duration;
    this._lastExecutionTime = new Date();

    if (result.success) {
      this.sessionLogger.info('Command executed successfully in session', {
        command: mergedCommand.command,
        duration,
        exitCode: result.data?.exitCode
      });
    } else {
      this.sessionLogger.error('Command execution failed in session', result.error!, {
        command: mergedCommand.command,
        duration
      });
    }

    return result;
  }

  async executeStream(
    command: ClaudeCommand,
    onChunk: (chunk: string) => void,
    options?: ClaudeExecutionOptions
  ): Promise<IResult<ClaudeResponse>> {
    if (!this._isActive) {
      return failure(new Error(`Session ${this.id} is not active`));
    }

    this.updateActivity();

    // Merge session config with command
    const cwd = command.cwd ?? this.config.workingDirectory;
    const timeout = options?.timeout ?? command.timeout ?? this.config.timeout;

    const mergedCommand: ClaudeCommand = {
      ...command,
      ...(cwd && { cwd }),
      env: { ...this.config.environment, ...command.env },
      ...(timeout && { timeout }),
    };

    this.sessionLogger.info('Executing streaming command in session', {
      command: mergedCommand.command,
      args: mergedCommand.args,
      options
    });

    const startTime = Date.now();
    const result = await this.processManager.executeStream(mergedCommand, onChunk);
    const duration = Date.now() - startTime;

    // Update session statistics
    this._executionCount++;
    this._totalDuration += duration;
    this._lastExecutionTime = new Date();

    if (result.success) {
      this.sessionLogger.info('Streaming command executed successfully in session', {
        command: mergedCommand.command,
        duration,
        exitCode: result.data?.exitCode
      });
    } else {
      this.sessionLogger.error('Streaming command execution failed in session', result.error!, {
        command: mergedCommand.command,
        duration
      });
    }

    return result;
  }

  async updateConfig(config: Partial<ClaudeSessionConfig>): Promise<IResult<void>> {
    if (!this._isActive) {
      return failure(new Error(`Session ${this.id} is not active`));
    }

    try {
      Object.assign(this.config, config);
      this.updateActivity();

      this.sessionLogger.info('Session configuration updated', {
        updatedConfig: config,
        newConfig: this.config
      });

      return success(undefined);
    } catch (error) {
      this.sessionLogger.error('Failed to update session configuration', error as Error, {
        attemptedConfig: config
      });
      return failure(error as Error);
    }
  }

  async destroy(): Promise<IResult<void>> {
    try {
      this._isActive = false;
      
      this.sessionLogger.info('Claude session destroyed', {
        sessionId: this.id,
        stats: this.getStats(),
        lifespan: Date.now() - this.createdAt.getTime()
      });

      return success(undefined);
    } catch (error) {
      this.sessionLogger.error('Failed to destroy session', error as Error);
      return failure(error as Error);
    }
  }

  getStats(): {
    executionCount: number;
    totalDuration: number;
    averageDuration: number;
    lastExecutionTime?: Date;
  } {
    return {
      executionCount: this._executionCount,
      totalDuration: this._totalDuration,
      averageDuration: this._executionCount > 0 ? this._totalDuration / this._executionCount : 0,
      ...(this._lastExecutionTime && { lastExecutionTime: this._lastExecutionTime }),
    };
  }

  private updateActivity(): void {
    this._lastActivity = new Date();
  }
}
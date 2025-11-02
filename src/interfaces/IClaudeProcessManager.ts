import { IResult } from '@chasenocap/di-framework';
import { ChildProcess } from 'child_process';
import { ClaudeCommand, ClaudeResponse } from '../types/ClaudeTypes.js';

/**
 * Low-level interface for managing Claude subprocess operations
 */
export interface IClaudeProcessManager {
  /**
   * Spawn a new Claude process
   */
  spawn(command: ClaudeCommand): Promise<IResult<ChildProcess>>;

  /**
   * Execute a command and wait for completion
   */
  execute(command: ClaudeCommand): Promise<IResult<ClaudeResponse>>;

  /**
   * Execute a command with streaming support
   */
  executeStream(
    command: ClaudeCommand,
    onChunk: (chunk: string) => void
  ): Promise<IResult<ClaudeResponse>>;

  /**
   * Kill a running process
   */
  kill(processId: number, signal?: string): Promise<IResult<void>>;

  /**
   * Get all running Claude processes
   */
  getRunningProcesses(): number[];

  /**
   * Clean up all running processes
   */
  cleanup(): Promise<void>;

  /**
   * Check if Claude CLI is available in PATH
   */
  isClaudeAvailable(): Promise<boolean>;

  /**
   * Get Claude CLI version
   */
  getClaudeVersion(): Promise<IResult<string>>;
}
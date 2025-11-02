import { IResult } from '@chasenocap/di-framework';
import {
  ClaudeCommand,
  ClaudeResponse,
  ClaudeExecutionOptions,
  ClaudeSessionConfig,
} from '../types/ClaudeTypes.js';

/**
 * Main interface for Claude CLI interactions
 */
export interface IClaudeClient {
  /**
   * Execute a Claude command
   */
  execute(
    command: ClaudeCommand,
    options?: ClaudeExecutionOptions
  ): Promise<IResult<ClaudeResponse>>;

  /**
   * Execute a Claude command with streaming support
   */
  executeStream(
    command: ClaudeCommand,
    onChunk: (chunk: string) => void,
    options?: ClaudeExecutionOptions
  ): Promise<IResult<ClaudeResponse>>;

  /**
   * Create a new session for persistent interactions
   */
  createSession(config: ClaudeSessionConfig): Promise<IResult<string>>;

  /**
   * Destroy a session and clean up resources
   */
  destroySession(sessionId: string): Promise<IResult<void>>;

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[];

  /**
   * Check if Claude CLI is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the version of Claude CLI
   */
  getVersion(): Promise<IResult<string>>;
}
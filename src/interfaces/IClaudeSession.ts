import { IResult } from '@chasenocap/di-framework';
import {
  ClaudeCommand,
  ClaudeResponse,
  ClaudeExecutionOptions,
  ClaudeSessionConfig,
} from '../types/ClaudeTypes.js';

/**
 * Interface for managing persistent Claude sessions
 */
export interface IClaudeSession {
  /** Unique session identifier */
  readonly id: string;

  /** Session configuration */
  readonly config: ClaudeSessionConfig;

  /** Whether the session is active */
  readonly isActive: boolean;

  /** Session creation timestamp */
  readonly createdAt: Date;

  /** Last activity timestamp */
  readonly lastActivity: Date;

  /**
   * Execute a command within this session
   */
  execute(
    command: ClaudeCommand,
    options?: ClaudeExecutionOptions
  ): Promise<IResult<ClaudeResponse>>;

  /**
   * Execute a command with streaming within this session
   */
  executeStream(
    command: ClaudeCommand,
    onChunk: (chunk: string) => void,
    options?: ClaudeExecutionOptions
  ): Promise<IResult<ClaudeResponse>>;

  /**
   * Update session configuration
   */
  updateConfig(config: Partial<ClaudeSessionConfig>): Promise<IResult<void>>;

  /**
   * Destroy the session and clean up resources
   */
  destroy(): Promise<IResult<void>>;

  /**
   * Get session statistics
   */
  getStats(): {
    executionCount: number;
    totalDuration: number;
    averageDuration: number;
    lastExecutionTime?: Date;
  };
}
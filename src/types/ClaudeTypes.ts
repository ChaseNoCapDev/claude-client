/**
 * Core types for Claude client operations
 */

export interface ClaudeCommand {
  /** The command to execute */
  command: string;
  /** Arguments to pass to the command */
  args?: string[];
  /** Working directory for the command */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout in milliseconds */
  timeout?: number;
}

export interface ClaudeResponse {
  /** Unique identifier for this response */
  id: string;
  /** The raw output from Claude */
  output: string;
  /** Error output if any */
  error?: string;
  /** Exit code of the process */
  exitCode: number;
  /** Execution duration in milliseconds */
  duration: number;
  /** Timestamp when response was generated */
  timestamp: Date;
}

export interface ClaudeStreamChunk {
  /** Unique identifier for the session */
  sessionId: string;
  /** Chunk sequence number */
  sequence: number;
  /** Chunk data */
  data: string;
  /** Whether this is the final chunk */
  isComplete: boolean;
  /** Timestamp of the chunk */
  timestamp: Date;
}

export interface ClaudeSessionConfig {
  /** Session identifier */
  id: string;
  /** Working directory for the session */
  workingDirectory?: string;
  /** Environment variables for the session */
  environment?: Record<string, string>;
  /** Session timeout in milliseconds */
  timeout?: number;
  /** Whether to enable streaming */
  enableStreaming?: boolean;
  /** Buffer size for streaming */
  streamBufferSize?: number;
}

export interface ClaudeExecutionOptions {
  /** Whether to stream the response */
  stream?: boolean;
  /** Session to use for execution */
  sessionId?: string;
  /** Custom timeout for this execution */
  timeout?: number;
  /** Additional context to pass to Claude */
  context?: Record<string, unknown>;
}

export type ClaudeEventType = 
  | 'session.created'
  | 'session.destroyed'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'stream.chunk'
  | 'stream.completed'
  | 'stream.error';

export interface ClaudeEvent {
  type: ClaudeEventType;
  sessionId?: string;
  executionId?: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}
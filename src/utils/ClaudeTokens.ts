import { createToken } from '@chasenocap/di-framework';
import type { ILogger } from '@chasenocap/logger';
import { IClaudeClient } from '../interfaces/IClaudeClient.js';
import { IClaudeSession } from '../interfaces/IClaudeSession.js';
import { IClaudeProcessManager } from '../interfaces/IClaudeProcessManager.js';

/**
 * Dependency injection tokens for Claude client components
 */
export const CLAUDE_TYPES = {
  // External dependencies
  ILogger: createToken<ILogger>('ILogger'),

  // Claude-specific interfaces
  IClaudeClient: createToken<IClaudeClient>('IClaudeClient'),
  IClaudeSession: createToken<IClaudeSession>('IClaudeSession'),
  IClaudeProcessManager: createToken<IClaudeProcessManager>('IClaudeProcessManager'),

  // Configuration
  ClaudeConfig: createToken<ClaudeClientConfig>('ClaudeConfig'),
} as const;

/**
 * Configuration interface for Claude client
 */
export interface ClaudeClientConfig {
  /** Default timeout for commands in milliseconds */
  defaultTimeout: number;
  /** Maximum number of concurrent sessions */
  maxConcurrentSessions: number;
  /** Default working directory */
  defaultWorkingDirectory: string;
  /** Whether to enable streaming by default */
  enableStreamingByDefault: boolean;
  /** Buffer size for streaming operations */
  streamBufferSize: number;
  /** Session cleanup interval in milliseconds */
  sessionCleanupInterval: number;
  /** Maximum session idle time before cleanup */
  maxSessionIdleTime: number;
}

/**
 * Default configuration for Claude client
 */
export const DEFAULT_CLAUDE_CONFIG: ClaudeClientConfig = {
  defaultTimeout: 30000, // 30 seconds
  maxConcurrentSessions: 10,
  defaultWorkingDirectory: process.cwd(),
  enableStreamingByDefault: false,
  streamBufferSize: 1024,
  sessionCleanupInterval: 60000, // 1 minute
  maxSessionIdleTime: 300000, // 5 minutes
};
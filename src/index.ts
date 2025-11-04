import 'reflect-metadata';

// Core interfaces
export type { IClaudeClient } from './interfaces/IClaudeClient.js';
export type { IClaudeSession } from './interfaces/IClaudeSession.js';
export type { IClaudeProcessManager } from './interfaces/IClaudeProcessManager.js';

// Implementations
export { ClaudeClient } from './implementations/ClaudeClient.js';
export { ClaudeSession } from './implementations/ClaudeSession.js';
export { ClaudeProcessManager } from './implementations/ClaudeProcessManager.js';

// Types
export type {
  ClaudeCommand,
  ClaudeResponse,
  ClaudeStreamChunk,
  ClaudeSessionConfig,
  ClaudeExecutionOptions,
  ClaudeEventType,
  ClaudeEvent,
} from './types/ClaudeTypes.js';

// Dependency injection tokens and configuration
export {
  CLAUDE_TYPES,
  DEFAULT_CLAUDE_CONFIG,
} from './utils/ClaudeTokens.js';
export type { ClaudeClientConfig } from './utils/ClaudeTokens.js';

// Utilities
export { createClaudeContainer } from './utils/ClaudeContainer.js';
export { ClaudeStreamProcessor } from './utils/ClaudeStreamProcessor.js';
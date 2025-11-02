import 'reflect-metadata';

// Core interfaces
export { IClaudeClient } from './interfaces/IClaudeClient.js';
export { IClaudeSession } from './interfaces/IClaudeSession.js';
export { IClaudeProcessManager } from './interfaces/IClaudeProcessManager.js';

// Implementations
export { ClaudeClient } from './implementations/ClaudeClient.js';
export { ClaudeSession } from './implementations/ClaudeSession.js';
export { ClaudeProcessManager } from './implementations/ClaudeProcessManager.js';

// Types
export {
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
  ClaudeClientConfig,
  DEFAULT_CLAUDE_CONFIG,
} from './utils/ClaudeTokens.js';

// Utilities
export { createClaudeContainer } from './utils/ClaudeContainer.js';
export { ClaudeStreamProcessor } from './utils/ClaudeStreamProcessor.js';
import { Container } from 'inversify';
import type { ILogger } from '@chasenocap/logger';
import { createLogger } from '@chasenocap/logger';

import { IClaudeClient } from '../interfaces/IClaudeClient.js';
import { IClaudeProcessManager } from '../interfaces/IClaudeProcessManager.js';
import { ClaudeClient } from '../implementations/ClaudeClient.js';
import { ClaudeProcessManager } from '../implementations/ClaudeProcessManager.js';
import { 
  CLAUDE_TYPES, 
  ClaudeClientConfig, 
  DEFAULT_CLAUDE_CONFIG 
} from './ClaudeTokens.js';

/**
 * Create a pre-configured container for Claude client dependencies
 */
export function createClaudeContainer(
  config: Partial<ClaudeClientConfig> = {},
  logger?: ILogger
): Container {
  const container = new Container();

  // Merge provided config with defaults
  const claudeConfig: ClaudeClientConfig = {
    ...DEFAULT_CLAUDE_CONFIG,
    ...config,
  };

  // Bind configuration
  container.bind<ClaudeClientConfig>(CLAUDE_TYPES.ClaudeConfig)
    .toConstantValue(claudeConfig);

  // Bind logger (use provided or create default)
  const loggerInstance = logger || createLogger('claude-client');
  container.bind<ILogger>(CLAUDE_TYPES.ILogger)
    .toConstantValue(loggerInstance);

  // Bind process manager
  container.bind<IClaudeProcessManager>(CLAUDE_TYPES.IClaudeProcessManager)
    .to(ClaudeProcessManager)
    .inSingletonScope();

  // Bind main client
  container.bind<IClaudeClient>(CLAUDE_TYPES.IClaudeClient)
    .to(ClaudeClient)
    .inSingletonScope();

  return container;
}

/**
 * Create a Claude client with default configuration
 */
export async function createClaudeClient(
  config: Partial<ClaudeClientConfig> = {},
  logger?: ILogger
): Promise<IClaudeClient> {
  const container = createClaudeContainer(config, logger);
  return container.get<IClaudeClient>(CLAUDE_TYPES.IClaudeClient);
}

/**
 * Create a Claude client with custom logger and configuration
 */
export async function createClaudeClientWithLogger(
  loggerConfig: string,
  claudeConfig: Partial<ClaudeClientConfig> = {}
): Promise<{ client: IClaudeClient; logger: ILogger }> {
  const logger = createLogger(loggerConfig);
  const client = await createClaudeClient(claudeConfig, logger);
  
  return { client, logger };
}
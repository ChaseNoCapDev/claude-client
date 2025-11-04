import { injectable, inject } from 'inversify';
import { IResult, success, failure } from '@chasenocap/di-framework';
import type { ILogger } from '@chasenocap/logger';

import type { IClaudeClient } from '../interfaces/IClaudeClient.js';
import type { IClaudeProcessManager } from '../interfaces/IClaudeProcessManager.js';
import { ClaudeSession } from './ClaudeSession.js';
import type {
  ClaudeCommand,
  ClaudeResponse,
  ClaudeExecutionOptions,
  ClaudeSessionConfig,
} from '../types/ClaudeTypes.js';
import { CLAUDE_TYPES } from '../utils/ClaudeTokens.js';
import type { ClaudeClientConfig } from '../utils/ClaudeTokens.js';

@injectable()
export class ClaudeClient implements IClaudeClient {
  private sessions = new Map<string, ClaudeSession>();
  private cleanupInterval: NodeJS.Timeout;
  private clientLogger: ILogger;

  constructor(
    @inject(CLAUDE_TYPES.IClaudeProcessManager) private processManager: IClaudeProcessManager,
    @inject(CLAUDE_TYPES.ILogger) private logger: ILogger,
    @inject(CLAUDE_TYPES.ClaudeConfig) private config: ClaudeClientConfig
  ) {
    this.clientLogger = logger.child({ service: 'ClaudeClient' });

    // Start session cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanupInactiveSessions(),
      this.config.sessionCleanupInterval
    );

    this.clientLogger.info('Claude client initialized', {
      config: this.config,
      maxSessions: this.config.maxConcurrentSessions
    });
  }

  async execute(
    command: ClaudeCommand,
    options?: ClaudeExecutionOptions
  ): Promise<IResult<ClaudeResponse>> {
    this.clientLogger.info('Executing Claude command', {
      command: command.command,
      args: command.args,
      sessionId: options?.sessionId,
      hasTimeout: !!options?.timeout
    });

    // If session ID provided, use that session
    if (options?.sessionId) {
      const session = this.sessions.get(options.sessionId);
      if (!session) {
        return failure(new Error(`Session ${options.sessionId} not found`));
      }
      return session.execute(command, options);
    }

    // Otherwise execute directly via process manager
    const mergedCommand: ClaudeCommand = {
      ...command,
      cwd: command.cwd || this.config.defaultWorkingDirectory,
      timeout: options?.timeout || command.timeout || this.config.defaultTimeout,
    };

    return this.processManager.execute(mergedCommand);
  }

  async executeStream(
    command: ClaudeCommand,
    onChunk: (chunk: string) => void,
    options?: ClaudeExecutionOptions
  ): Promise<IResult<ClaudeResponse>> {
    this.clientLogger.info('Executing Claude streaming command', {
      command: command.command,
      args: command.args,
      sessionId: options?.sessionId,
      hasTimeout: !!options?.timeout
    });

    // If session ID provided, use that session
    if (options?.sessionId) {
      const session = this.sessions.get(options.sessionId);
      if (!session) {
        return failure(new Error(`Session ${options.sessionId} not found`));
      }
      return session.executeStream(command, onChunk, options);
    }

    // Otherwise execute directly via process manager
    const mergedCommand: ClaudeCommand = {
      ...command,
      cwd: command.cwd || this.config.defaultWorkingDirectory,
      timeout: options?.timeout || command.timeout || this.config.defaultTimeout,
    };

    return this.processManager.executeStream(mergedCommand, onChunk);
  }

  async createSession(config: ClaudeSessionConfig): Promise<IResult<string>> {
    try {
      // Check if we've reached the session limit
      if (this.sessions.size >= this.config.maxConcurrentSessions) {
        return failure(
          new Error(`Maximum concurrent sessions limit reached (${this.config.maxConcurrentSessions})`)
        );
      }

      // Check if session already exists
      if (this.sessions.has(config.id)) {
        return failure(new Error(`Session ${config.id} already exists`));
      }

      // Create new session with defaults
      const sessionConfig: ClaudeSessionConfig = {
        ...config,
        workingDirectory: config.workingDirectory || this.config.defaultWorkingDirectory,
        timeout: config.timeout || this.config.defaultTimeout,
        enableStreaming: config.enableStreaming ?? this.config.enableStreamingByDefault,
        streamBufferSize: config.streamBufferSize || this.config.streamBufferSize,
      };

      const session = new ClaudeSession(sessionConfig, this.processManager, this.logger);
      this.sessions.set(config.id, session);

      this.clientLogger.info('Claude session created', {
        sessionId: config.id,
        totalSessions: this.sessions.size,
        config: sessionConfig
      });

      return success(config.id);
    } catch (error) {
      this.clientLogger.error('Failed to create Claude session', error as Error, {
        sessionId: config.id,
        config
      });
      return failure(error as Error);
    }
  }

  async destroySession(sessionId: string): Promise<IResult<void>> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return failure(new Error(`Session ${sessionId} not found`));
      }

      const destroyResult = await session.destroy();
      if (!destroyResult.success) {
        return destroyResult;
      }

      this.sessions.delete(sessionId);

      this.clientLogger.info('Claude session destroyed', {
        sessionId,
        remainingSessions: this.sessions.size,
        stats: session.getStats()
      });

      return success(undefined);
    } catch (error) {
      this.clientLogger.error('Failed to destroy Claude session', error as Error, {
        sessionId
      });
      return failure(error as Error);
    }
  }

  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys()).filter(
      (sessionId) => this.sessions.get(sessionId)?.isActive
    );
  }

  async isAvailable(): Promise<boolean> {
    return this.processManager.isClaudeAvailable();
  }

  async getVersion(): Promise<IResult<string>> {
    return this.processManager.getClaudeVersion();
  }

  /**
   * Clean up inactive sessions based on idle time
   */
  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();
    const sessionsToCleanup: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (!session.isActive) {
        sessionsToCleanup.push(sessionId);
        continue;
      }

      const idleTime = now - session.lastActivity.getTime();
      if (idleTime > this.config.maxSessionIdleTime) {
        sessionsToCleanup.push(sessionId);
      }
    }

    if (sessionsToCleanup.length > 0) {
      this.clientLogger.info('Cleaning up inactive sessions', {
        sessionIds: sessionsToCleanup,
        count: sessionsToCleanup.length
      });

      for (const sessionId of sessionsToCleanup) {
        await this.destroySession(sessionId);
      }
    }
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    this.clientLogger.info('Cleaning up Claude client', {
      activeSessions: this.sessions.size
    });

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Destroy all sessions
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      await this.destroySession(sessionId);
    }

    // Clean up process manager
    await this.processManager.cleanup();

    this.clientLogger.info('Claude client cleanup completed');
  }
}
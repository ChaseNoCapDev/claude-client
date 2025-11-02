import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Container } from 'inversify';
import { success, failure } from '@chasenocap/di-framework';
import { createLogger } from '@chasenocap/logger';

import { ClaudeClient } from '../../src/implementations/ClaudeClient.js';
import { IClaudeProcessManager } from '../../src/interfaces/IClaudeProcessManager.js';
import { CLAUDE_TYPES, DEFAULT_CLAUDE_CONFIG } from '../../src/utils/ClaudeTokens.js';
import { ClaudeCommand, ClaudeResponse } from '../../src/types/ClaudeTypes.js';

// Mock process manager
const mockProcessManager: IClaudeProcessManager = {
  spawn: vi.fn(),
  execute: vi.fn(),
  executeStream: vi.fn(),
  kill: vi.fn(),
  getRunningProcesses: vi.fn(() => []),
  cleanup: vi.fn(),
  isClaudeAvailable: vi.fn(() => Promise.resolve(true)),
  getClaudeVersion: vi.fn(() => Promise.resolve(success('1.0.0'))),
};

describe('ClaudeClient', () => {
  let container: Container;
  let client: ClaudeClient;
  let logger = createLogger({ service: 'test' });

  beforeEach(() => {
    container = new Container();
    
    container.bind(CLAUDE_TYPES.IClaudeProcessManager).toConstantValue(mockProcessManager);
    container.bind(CLAUDE_TYPES.ILogger).toConstantValue(logger);
    container.bind(CLAUDE_TYPES.ClaudeConfig).toConstantValue(DEFAULT_CLAUDE_CONFIG);
    
    client = new ClaudeClient(
      mockProcessManager,
      logger,
      DEFAULT_CLAUDE_CONFIG
    );

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await client.cleanup();
  });

  describe('execute', () => {
    it('should execute command via process manager when no session provided', async () => {
      const command: ClaudeCommand = {
        command: 'claude',
        args: ['--help'],
      };

      const expectedResponse: ClaudeResponse = {
        id: 'test-123',
        output: 'Claude help output',
        exitCode: 0,
        duration: 100,
        timestamp: new Date(),
      };

      (mockProcessManager.execute as any).mockResolvedValue(
        success(expectedResponse)
      );

      const result = await client.execute(command);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedResponse);
      expect(mockProcessManager.execute).toHaveBeenCalledWith({
        ...command,
        cwd: DEFAULT_CLAUDE_CONFIG.defaultWorkingDirectory,
        timeout: DEFAULT_CLAUDE_CONFIG.defaultTimeout,
      });
    });

    it('should handle process manager errors', async () => {
      const command: ClaudeCommand = {
        command: 'claude',
        args: ['--invalid'],
      };

      const error = new Error('Command failed');
      (mockProcessManager.execute as any).mockResolvedValue(
        failure(error)
      );

      const result = await client.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('executeStream', () => {
    it('should execute streaming command via process manager', async () => {
      const command: ClaudeCommand = {
        command: 'claude',
        args: ['stream-test'],
      };

      const expectedResponse: ClaudeResponse = {
        id: 'stream-123',
        output: 'Streaming output',
        exitCode: 0,
        duration: 200,
        timestamp: new Date(),
      };

      const chunks: string[] = [];
      const onChunk = (chunk: string) => chunks.push(chunk);

      (mockProcessManager.executeStream as any).mockResolvedValue(
        success(expectedResponse)
      );

      const result = await client.executeStream(command, onChunk);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedResponse);
      expect(mockProcessManager.executeStream).toHaveBeenCalledWith(
        {
          ...command,
          cwd: DEFAULT_CLAUDE_CONFIG.defaultWorkingDirectory,
          timeout: DEFAULT_CLAUDE_CONFIG.defaultTimeout,
        },
        onChunk
      );
    });
  });

  describe('session management', () => {
    it('should create a new session', async () => {
      const sessionConfig = {
        id: 'test-session-1',
        workingDirectory: '/tmp',
        timeout: 5000,
      };

      const result = await client.createSession(sessionConfig);

      expect(result.success).toBe(true);
      expect(result.data).toBe('test-session-1');
      expect(client.getActiveSessions()).toContain('test-session-1');
    });

    it('should prevent duplicate session creation', async () => {
      const sessionConfig = {
        id: 'duplicate-session',
        workingDirectory: '/tmp',
      };

      // Create first session
      await client.createSession(sessionConfig);

      // Try to create duplicate
      const result = await client.createSession(sessionConfig);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('already exists');
    });

    it('should enforce maximum session limit', async () => {
      const limitedConfig = {
        ...DEFAULT_CLAUDE_CONFIG,
        maxConcurrentSessions: 2,
      };

      const limitedClient = new ClaudeClient(
        mockProcessManager,
        logger,
        limitedConfig
      );

      // Create sessions up to limit
      await limitedClient.createSession({ id: 'session-1' });
      await limitedClient.createSession({ id: 'session-2' });

      // Try to exceed limit
      const result = await limitedClient.createSession({ id: 'session-3' });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Maximum concurrent sessions limit');

      await limitedClient.cleanup();
    });

    it('should destroy sessions', async () => {
      const sessionConfig = { id: 'destroyable-session' };
      
      await client.createSession(sessionConfig);
      expect(client.getActiveSessions()).toContain('destroyable-session');

      const result = await client.destroySession('destroyable-session');

      expect(result.success).toBe(true);
      expect(client.getActiveSessions()).not.toContain('destroyable-session');
    });

    it('should return error when destroying non-existent session', async () => {
      const result = await client.destroySession('non-existent');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not found');
    });
  });

  describe('availability checks', () => {
    it('should check if Claude is available', async () => {
      (mockProcessManager.isClaudeAvailable as any).mockResolvedValue(true);

      const isAvailable = await client.isAvailable();

      expect(isAvailable).toBe(true);
      expect(mockProcessManager.isClaudeAvailable).toHaveBeenCalled();
    });

    it('should get Claude version', async () => {
      const version = '2.1.0';
      (mockProcessManager.getClaudeVersion as any).mockResolvedValue(
        success(version)
      );

      const result = await client.getVersion();

      expect(result.success).toBe(true);
      expect(result.data).toBe(version);
      expect(mockProcessManager.getClaudeVersion).toHaveBeenCalled();
    });
  });
});
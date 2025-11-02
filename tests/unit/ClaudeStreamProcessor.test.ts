import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLogger } from '@chasenocap/logger';

import { ClaudeStreamProcessor, createStreamProcessor } from '../../src/utils/ClaudeStreamProcessor.js';

describe('ClaudeStreamProcessor', () => {
  let processor: ClaudeStreamProcessor;
  let logger = createLogger({ service: 'test' });

  beforeEach(() => {
    processor = new ClaudeStreamProcessor('test-session', logger, 3);
  });

  afterEach(() => {
    processor.cleanup();
  });

  describe('processChunk', () => {
    it('should process chunks and emit events', async () => {
      const chunkData = 'Hello, world!';
      const chunkHandler = vi.fn();
      
      processor.on('chunk', chunkHandler);

      const chunk = processor.processChunk(chunkData);

      expect(chunk.sessionId).toBe('test-session');
      expect(chunk.sequence).toBe(0);
      expect(chunk.data).toBe(chunkData);
      expect(chunk.isComplete).toBe(false);
      expect(chunkHandler).toHaveBeenCalledWith(chunk);
    });

    it('should increment sequence numbers', () => {
      const chunk1 = processor.processChunk('first');
      const chunk2 = processor.processChunk('second');

      expect(chunk1.sequence).toBe(0);
      expect(chunk2.sequence).toBe(1);
    });

    it('should maintain buffer with size limit', () => {
      // Add chunks exceeding buffer size
      processor.processChunk('chunk1');
      processor.processChunk('chunk2');
      processor.processChunk('chunk3');
      processor.processChunk('chunk4'); // Should cause buffer overflow

      const bufferedData = processor.getBufferedData();
      expect(bufferedData).toBe('chunk2chunk3chunk4');
    });
  });

  describe('complete', () => {
    it('should mark stream as complete and emit completion event', async () => {
      const completeHandler = vi.fn();
      processor.on('complete', completeHandler);

      processor.processChunk('data1');
      processor.processChunk('data2');

      const finalChunk = processor.complete();

      expect(finalChunk.isComplete).toBe(true);
      expect(finalChunk.sessionId).toBe('test-session');
      expect(completeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session',
          totalChunks: 2,
          totalData: 'data1data2',
        })
      );
    });
  });

  describe('error', () => {
    it('should handle errors and emit error events', async () => {
      const errorHandler = vi.fn();
      processor.on('error', errorHandler);

      processor.processChunk('some data');
      const error = new Error('Stream failed');
      processor.error(error);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session',
          error,
          chunksProcessed: 1,
        })
      );
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      processor.processChunk('chunk1');
      processor.processChunk('chunk2');

      const stats = processor.getStats();

      expect(stats.sessionId).toBe('test-session');
      expect(stats.chunksProcessed).toBe(2);
      expect(stats.isComplete).toBe(false);
      expect(stats.bufferSize).toBe(2);
      expect(stats.dataLength).toBe('chunk1chunk2'.length);
      expect(stats.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createChunkHandler', () => {
    it('should create a function that processes chunks', () => {
      const handler = processor.createChunkHandler();
      
      handler('test data');
      
      expect(processor.getBufferedData()).toBe('test data');
      expect(processor.getStats().chunksProcessed).toBe(1);
    });
  });
});

describe('createStreamProcessor factory', () => {
  it('should create processor with event handlers', () => {
    const onChunk = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();
    const logger = createLogger({ service: 'test' });

    const processor = createStreamProcessor(
      'factory-session',
      onChunk,
      onComplete,
      onError,
      logger,
      5
    );

    // Test that handlers are connected
    processor.processChunk('test');
    expect(onChunk).toHaveBeenCalled();

    processor.complete();
    expect(onComplete).toHaveBeenCalled();

    processor.cleanup();
  });

  it('should work without optional handlers', () => {
    const processor = createStreamProcessor('minimal-session');
    
    expect(() => {
      processor.processChunk('test');
      processor.complete();
    }).not.toThrow();

    processor.cleanup();
  });
});
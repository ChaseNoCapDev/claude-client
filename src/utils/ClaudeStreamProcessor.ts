import { EventEmitter } from 'events';
import type { ILogger } from '@chasenocap/logger';
import { ClaudeStreamChunk } from '../types/ClaudeTypes.js';

/**
 * Enhanced streaming processor for Claude responses with buffering and event handling
 */
export class ClaudeStreamProcessor extends EventEmitter {
  private buffer: string[] = [];
  private chunkSequence = 0;
  private isComplete = false;
  private sessionId: string;
  private startTime: number;

  constructor(
    sessionId: string,
    private logger?: ILogger,
    private bufferSize = 1024
  ) {
    super();
    this.sessionId = sessionId;
    this.startTime = Date.now();
    
    this.logger?.debug('Claude stream processor created', {
      sessionId,
      bufferSize
    });
  }

  /**
   * Process incoming chunk of data
   */
  processChunk(data: string): ClaudeStreamChunk {
    const chunk: ClaudeStreamChunk = {
      sessionId: this.sessionId,
      sequence: this.chunkSequence++,
      data,
      isComplete: false,
      timestamp: new Date(),
    };

    this.buffer.push(data);
    
    // Emit chunk event
    this.emit('chunk', chunk);
    
    // Log chunk processing
    this.logger?.debug('Processed stream chunk', {
      sessionId: this.sessionId,
      sequence: chunk.sequence,
      dataLength: data.length,
      bufferSize: this.buffer.length
    });

    // If buffer exceeds size, flush older chunks
    if (this.buffer.length > this.bufferSize) {
      const removed = this.buffer.splice(0, this.buffer.length - this.bufferSize);
      this.logger?.debug('Buffer overflow, removed chunks', {
        sessionId: this.sessionId,
        removedCount: removed.length,
        bufferSize: this.buffer.length
      });
    }

    return chunk;
  }

  /**
   * Mark the stream as complete
   */
  complete(): ClaudeStreamChunk {
    this.isComplete = true;
    const duration = Date.now() - this.startTime;

    const finalChunk: ClaudeStreamChunk = {
      sessionId: this.sessionId,
      sequence: this.chunkSequence,
      data: '',
      isComplete: true,
      timestamp: new Date(),
    };

    this.emit('complete', {
      sessionId: this.sessionId,
      totalChunks: this.chunkSequence,
      totalData: this.getBufferedData(),
      duration,
    });

    this.logger?.info('Claude stream completed', {
      sessionId: this.sessionId,
      totalChunks: this.chunkSequence,
      duration,
      bufferSize: this.buffer.length
    });

    return finalChunk;
  }

  /**
   * Handle stream error
   */
  error(error: Error): void {
    this.isComplete = true;
    const duration = Date.now() - this.startTime;

    this.emit('error', {
      sessionId: this.sessionId,
      error,
      duration,
      chunksProcessed: this.chunkSequence,
    });

    this.logger?.error('Claude stream error', error, {
      sessionId: this.sessionId,
      duration,
      chunksProcessed: this.chunkSequence
    });
  }

  /**
   * Get all buffered data as a single string
   */
  getBufferedData(): string {
    return this.buffer.join('');
  }

  /**
   * Get stream statistics
   */
  getStats(): {
    sessionId: string;
    chunksProcessed: number;
    isComplete: boolean;
    duration: number;
    bufferSize: number;
    dataLength: number;
  } {
    return {
      sessionId: this.sessionId,
      chunksProcessed: this.chunkSequence,
      isComplete: this.isComplete,
      duration: Date.now() - this.startTime,
      bufferSize: this.buffer.length,
      dataLength: this.getBufferedData().length,
    };
  }

  /**
   * Create a transform function for use with Claude commands
   */
  createChunkHandler(): (chunk: string) => void {
    return (chunk: string) => {
      this.processChunk(chunk);
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.buffer = [];
    this.removeAllListeners();
    
    this.logger?.debug('Claude stream processor cleaned up', {
      sessionId: this.sessionId
    });
  }
}

/**
 * Factory function to create a stream processor with event handling
 */
export function createStreamProcessor(
  sessionId: string,
  onChunk?: (chunk: ClaudeStreamChunk) => void,
  onComplete?: (stats: any) => void,
  onError?: (error: any) => void,
  logger?: ILogger,
  bufferSize?: number
): ClaudeStreamProcessor {
  const processor = new ClaudeStreamProcessor(sessionId, logger, bufferSize);

  if (onChunk) {
    processor.on('chunk', onChunk);
  }

  if (onComplete) {
    processor.on('complete', onComplete);
  }

  if (onError) {
    processor.on('error', onError);
  }

  return processor;
}
# @chasenocap/claude-client

Claude CLI subprocess wrapper with streaming support for metaGOTHIC framework.

## Features

- **Subprocess Management**: Reliable Claude CLI process spawning and management
- **Session Support**: Persistent sessions for multiple command executions
- **Streaming**: Real-time streaming of Claude responses
- **Error Handling**: Comprehensive error handling with structured results
- **Dependency Injection**: Full DI support with Inversify
- **Logging**: Structured logging with Winston integration
- **TypeScript**: Full TypeScript support with strict typing

## Installation

```bash
npm install @chasenocap/claude-client
```

## Quick Start

### Basic Usage

```typescript
import { createClaudeClient } from '@chasenocap/claude-client';

const client = await createClaudeClient();

// Check if Claude is available
const isAvailable = await client.isAvailable();
if (!isAvailable) {
  throw new Error('Claude CLI not found');
}

// Execute a simple command
const result = await client.execute({
  command: 'claude',
  args: ['--help']
});

if (result.success) {
  console.log('Output:', result.data.output);
} else {
  console.error('Error:', result.error);
}
```

### Streaming Support

```typescript
import { createClaudeClient } from '@chasenocap/claude-client';

const client = await createClaudeClient();

// Execute command with streaming
const result = await client.executeStream(
  {
    command: 'claude',
    args: ['process', 'large-file.txt']
  },
  (chunk) => {
    // Handle real-time output
    process.stdout.write(chunk);
  }
);

console.log('Final result:', result.data);
```

### Session Management

```typescript
import { createClaudeClient } from '@chasenocap/claude-client';

const client = await createClaudeClient();

// Create a persistent session
const sessionResult = await client.createSession({
  id: 'my-session',
  workingDirectory: '/path/to/project',
  timeout: 60000
});

if (sessionResult.success) {
  // Execute commands within the session
  const result = await client.execute(
    {
      command: 'claude',
      args: ['analyze', 'code.ts']
    },
    { sessionId: 'my-session' }
  );
  
  console.log('Analysis:', result.data?.output);
  
  // Clean up session
  await client.destroySession('my-session');
}
```

### Advanced Configuration

```typescript
import { createClaudeClient, DEFAULT_CLAUDE_CONFIG } from '@chasenocap/claude-client';
import { createLogger } from '@chasenocap/logger';

const logger = createLogger({ service: 'my-app' });

const client = await createClaudeClient({
  ...DEFAULT_CLAUDE_CONFIG,
  defaultTimeout: 60000,
  maxConcurrentSessions: 5,
  enableStreamingByDefault: true,
}, logger);
```

### Dependency Injection

```typescript
import { Container } from 'inversify';
import { createClaudeContainer, CLAUDE_TYPES, IClaudeClient } from '@chasenocap/claude-client';

// Create container with custom configuration
const container = createClaudeContainer({
  defaultTimeout: 30000,
  maxConcurrentSessions: 3,
});

// Get client instance
const client = container.get<IClaudeClient>(CLAUDE_TYPES.IClaudeClient);
```

## API Reference

### IClaudeClient

Main interface for Claude interactions.

#### Methods

- `execute(command, options?)` - Execute a Claude command
- `executeStream(command, onChunk, options?)` - Execute with streaming
- `createSession(config)` - Create a persistent session
- `destroySession(sessionId)` - Destroy a session
- `getActiveSessions()` - Get list of active session IDs
- `isAvailable()` - Check if Claude CLI is available
- `getVersion()` - Get Claude CLI version

### ClaudeCommand

```typescript
interface ClaudeCommand {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}
```

### ClaudeResponse

```typescript
interface ClaudeResponse {
  id: string;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
  timestamp: Date;
}
```

### ClaudeSessionConfig

```typescript
interface ClaudeSessionConfig {
  id: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
  timeout?: number;
  enableStreaming?: boolean;
  streamBufferSize?: number;
}
```

## Configuration

### ClaudeClientConfig

```typescript
interface ClaudeClientConfig {
  defaultTimeout: number;                // Default: 30000ms
  maxConcurrentSessions: number;         // Default: 10
  defaultWorkingDirectory: string;       // Default: process.cwd()
  enableStreamingByDefault: boolean;     // Default: false
  streamBufferSize: number;              // Default: 1024
  sessionCleanupInterval: number;        // Default: 60000ms
  maxSessionIdleTime: number;            // Default: 300000ms
}
```

## Error Handling

All methods return `IResult<T>` which contains either success data or error information:

```typescript
const result = await client.execute(command);

if (result.success) {
  // Access result.data
  console.log(result.data.output);
} else {
  // Handle result.error
  console.error(result.error.message);
}
```

## Streaming

The package provides enhanced streaming capabilities:

```typescript
import { ClaudeStreamProcessor } from '@chasenocap/claude-client';

const processor = new ClaudeStreamProcessor('session-id');

processor.on('chunk', (chunk) => {
  console.log('Received:', chunk.data);
});

processor.on('complete', (stats) => {
  console.log('Stream completed:', stats);
});

// Use with client
const handler = processor.createChunkHandler();
await client.executeStream(command, handler);
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run coverage

# Run tests in watch mode
npm run test:watch
```

## Development

```bash
# Build the package
npm run build

# Build in watch mode
npm run build:watch

# Run linting
npm run lint

# Type checking
npm run typecheck
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `npm test` and `npm run lint`
6. Submit a pull request

## Related Packages

- [@chasenocap/logger](../logger) - Logging utilities
- [@chasenocap/di-framework](../di-framework) - Dependency injection framework
- [@chasenocap/test-helpers](../test-helpers) - Testing utilities
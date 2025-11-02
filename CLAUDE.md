# CLAUDE.md - Claude Client Package

This file provides guidance to Claude Code when working with the claude-client package.

## Package Overview

The claude-client package provides a robust subprocess wrapper for Claude CLI with streaming support, session management, and comprehensive error handling. This is the foundational package for the metaGOTHIC framework's AI integration.

### Purpose
Centralized Claude CLI interaction with subprocess management, streaming, and session persistence for AI-driven development workflows.

### Size & Scope
- **Target Size**: ~1500 lines (within metaGOTHIC package guidelines)
- **Public Exports**: 12+ items (interfaces, implementations, utilities)
- **Dependencies**: di-framework, logger, Node.js subprocess APIs
- **Single Responsibility**: Claude CLI subprocess management only

## Architecture

### Core Components

1. **IClaudeClient Interface** (`src/interfaces/IClaudeClient.ts`)
   - Main API for Claude interactions
   - Session management operations
   - Availability and version checking

2. **ClaudeClient Implementation** (`src/implementations/ClaudeClient.ts`)
   - Manages multiple sessions
   - Handles command routing
   - Implements cleanup and lifecycle management

3. **ClaudeProcessManager** (`src/implementations/ClaudeProcessManager.ts`)
   - Low-level subprocess operations
   - Process spawning and management
   - Streaming implementation

4. **ClaudeSession** (`src/implementations/ClaudeSession.ts`)
   - Persistent session context
   - Session-specific configuration
   - Execution statistics tracking

5. **ClaudeStreamProcessor** (`src/utils/ClaudeStreamProcessor.ts`)
   - Enhanced streaming with buffering
   - Event-driven chunk processing
   - Stream statistics and monitoring

## Design Decisions

### Subprocess Management
- Uses Node.js `child_process.spawn()` for full control
- Separate stdout/stderr handling
- Timeout support with configurable defaults
- Process cleanup on client shutdown

### Session Architecture
```typescript
// Session-based execution
const sessionId = await client.createSession({
  id: 'ai-analysis',
  workingDirectory: '/project',
  timeout: 60000
});

await client.execute(command, { sessionId });
```

### Streaming Support
```typescript
// Real-time streaming with enhanced processing
await client.executeStream(command, (chunk) => {
  // Handle real-time output
  process.stdout.write(chunk);
});
```

### Result Pattern
All operations return `IResult<T>` for consistent error handling:
```typescript
const result = await client.execute(command);
if (result.success) {
  console.log(result.data.output);
} else {
  logger.error('Command failed', result.error);
}
```

## Configuration

### Default Configuration
```typescript
{
  defaultTimeout: 30000,           // 30 seconds
  maxConcurrentSessions: 10,       // Session limit
  defaultWorkingDirectory: process.cwd(),
  enableStreamingByDefault: false,
  streamBufferSize: 1024,          // Streaming buffer
  sessionCleanupInterval: 60000,   // 1 minute
  maxSessionIdleTime: 300000,      // 5 minutes
}
```

### Environment Variables
- Uses standard Node.js environment detection
- Respects PATH for Claude CLI discovery
- Custom environment per session/command

## Usage Patterns

### Basic Command Execution
```typescript
import { createClaudeClient } from '@chasenocap/claude-client';

const client = await createClaudeClient();
const result = await client.execute({
  command: 'claude',
  args: ['--help']
});
```

### Session-Based Workflows
```typescript
// Create persistent session
const sessionResult = await client.createSession({
  id: 'dev-session',
  workingDirectory: '/project',
  environment: { CONTEXT: 'development' }
});

// Execute multiple commands in session
await client.execute(command1, { sessionId: 'dev-session' });
await client.execute(command2, { sessionId: 'dev-session' });

// Cleanup
await client.destroySession('dev-session');
```

### Streaming Integration
```typescript
import { ClaudeStreamProcessor } from '@chasenocap/claude-client';

const processor = new ClaudeStreamProcessor('session-id');
processor.on('chunk', handleChunk);
processor.on('complete', handleCompletion);

const handler = processor.createChunkHandler();
await client.executeStream(command, handler);
```

### Dependency Injection Usage
```typescript
// In service class
@injectable()
class AIAnalysisService {
  constructor(
    @inject(CLAUDE_TYPES.IClaudeClient) private claude: IClaudeClient,
    @inject(CLAUDE_TYPES.ILogger) private logger: ILogger
  ) {}

  async analyzeCode(filePath: string): Promise<AnalysisResult> {
    const result = await this.claude.execute({
      command: 'claude',
      args: ['analyze', filePath]
    });
    
    if (!result.success) {
      this.logger.error('Analysis failed', result.error);
      throw result.error;
    }
    
    return parseAnalysis(result.data.output);
  }
}
```

## Testing Strategy

### Unit Tests
- Mock process manager for isolated testing
- Test session lifecycle management
- Validate streaming chunk processing
- Error handling scenarios

### Integration Tests
- Test with actual Claude CLI (if available)
- End-to-end streaming workflows
- Session persistence and cleanup
- Process timeout handling

### Test Utilities
```typescript
// Test with mocked Claude
const mockProcessManager = createMockProcessManager();
const testClient = new ClaudeClient(mockProcessManager, logger, config);
```

## Integration Points

### With metaGOTHIC Services
- Used by `claude-service` for AI processing
- Integrated with GraphQL subscriptions for streaming
- Session management for persistent AI contexts

### With Other Packages
- **logger**: Structured logging for all operations
- **di-framework**: Dependency injection container setup
- **event-system**: Event emission for debugging/monitoring

## Performance Characteristics

### Process Management
- **Spawn Time**: <100ms for Claude CLI startup
- **Memory**: Minimal overhead beyond Claude process
- **Cleanup**: Automatic process termination on shutdown

### Streaming
- **Latency**: Real-time chunk processing
- **Buffering**: Configurable buffer sizes
- **Throughput**: Limited by Claude CLI output rate

### Session Management
- **Sessions**: Up to 10 concurrent by default
- **Cleanup**: Automatic idle session cleanup
- **Memory**: Minimal per-session overhead

## Error Handling

### Process Errors
```typescript
// Command execution failure
{
  success: false,
  error: Error('Process exited with code 1'),
  context: { command, exitCode, stderr }
}
```

### Session Errors
```typescript
// Session not found
{
  success: false,
  error: Error('Session my-session not found')
}
```

### Timeout Handling
```typescript
// Command timeout
{
  success: false,
  error: Error('Process timed out after 30000ms')
}
```

## Common Patterns

### Availability Checking
```typescript
const isAvailable = await client.isAvailable();
if (!isAvailable) {
  throw new Error('Claude CLI not found in PATH');
}
```

### Version Compatibility
```typescript
const versionResult = await client.getVersion();
if (versionResult.success) {
  logger.info('Claude version:', versionResult.data);
}
```

### Resource Cleanup
```typescript
// Always cleanup client on shutdown
process.on('SIGTERM', async () => {
  await client.cleanup();
  process.exit(0);
});
```

## Future Enhancements

1. **GraphQL Integration**: Direct GraphQL subscription support
2. **WebSocket Streaming**: WebSocket transport for web clients
3. **Process Pooling**: Reusable Claude process instances
4. **Context Management**: AI context persistence across sessions
5. **Authentication**: Claude API key management
6. **Metrics**: Performance monitoring and metrics collection

## Troubleshooting

### Claude CLI Not Found
- Ensure Claude CLI is installed and in PATH
- Check `which claude` command availability
- Verify PATH environment variable

### Process Timeouts
- Adjust `defaultTimeout` configuration
- Check command complexity and expected duration
- Monitor system resources during execution

### Session Issues
- Verify session ID uniqueness
- Check session cleanup intervals
- Monitor concurrent session limits

### Streaming Problems
- Validate streaming buffer configuration
- Check chunk handler implementation
- Monitor memory usage during streaming

## Maintenance Guidelines

1. **Keep Focused**: Only Claude CLI subprocess concerns
2. **Error Handling**: Always use Result pattern
3. **Resource Management**: Proper cleanup of processes and sessions
4. **Testing**: Maintain high test coverage with mocks
5. **Documentation**: Update examples for new features
6. **Performance**: Monitor subprocess overhead

## Security Considerations

1. **Command Injection**: Validate command arguments
2. **Environment Variables**: Sanitize environment data
3. **File Paths**: Validate working directory paths
4. **Process Limits**: Enforce session and process limits
5. **Cleanup**: Ensure no processes leak on shutdown
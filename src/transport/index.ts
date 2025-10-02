export { BaseTransport, MCPMessage } from './base-transport';
export { StdioTransport } from './stdio-transport';
export { SSETransport } from './sse-transport';
export { StreamableHTTPTransport } from './streamable-http-transport';

export type TransportType = 'stdio' | 'sse' | 'streamable-http';

export interface TransportConfig {
  type: TransportType;
  port?: number;
}
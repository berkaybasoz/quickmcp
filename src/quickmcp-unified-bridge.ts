#!/usr/bin/env node

import { BaseTransport, StdioTransport, SSETransport, StreamableHTTPTransport, MCPMessage, TransportType } from './transport';
import { SQLiteManager } from './database/sqlite-manager';
import { DynamicMCPExecutor } from './dynamic-mcp-executor';

class QuickMCPBridge {
  private transport: BaseTransport;
  private sqliteManager: SQLiteManager;
  private executor: DynamicMCPExecutor;
  
  constructor(transportType: TransportType, port?: number) {
    // Initialize transport based on type
    if (transportType === 'sse') {
      this.transport = new SSETransport(port);
    } else if (transportType === 'streamable-http') {
      this.transport = new StreamableHTTPTransport(port);
    } else {
      this.transport = new StdioTransport();
    }
    
    // Initialize database and executor
    this.sqliteManager = new SQLiteManager();
    this.executor = new DynamicMCPExecutor();
    
    // Set up message handler
    this.transport.onMessage(this.handleMessage.bind(this));
  }
  
  async start(port?: number): Promise<void> {
    await this.transport.start(port);
    console.error(`QuickMCP Bridge started with ${this.transport.constructor.name}`);
  }
  
  async stop(): Promise<void> {
    await this.transport.stop();
    this.sqliteManager.close();
  }
  
  private async handleMessage(message: MCPMessage): Promise<void> {
    if (!message.id && message.method) {
      // Notification - no response needed
      if (message.method === 'notifications/initialized') {
        console.error('[QuickMCP] Client initialized');
      }
      return;
    }
    
    let response: MCPMessage | null = null;
    
    try {
      switch (message.method) {
        case 'initialize':
          response = {
            jsonrpc: '2.0',
            id: message.id,
            result: {
              protocolVersion: '2024-11-05',
              serverInfo: { 
                name: 'quickmcp-unified', 
                version: '2.0.0' 
              },
              capabilities: {
                tools: { listChanged: true },
                resources: { listChanged: true },
                prompts: { listChanged: true }
              }
            }
          };
          break;
          
        case 'tools/list':
          const tools = this.sqliteManager.getAllTools();
          const formattedTools = tools.map(tool => ({
            name: `${tool.server_id}__${tool.name}`,
            description: `[${tool.server_id}] ${tool.description}`,
            inputSchema: typeof tool.inputSchema === 'string' 
              ? JSON.parse(tool.inputSchema) 
              : tool.inputSchema
          }));
          
          response = {
            jsonrpc: '2.0',
            id: message.id,
            result: { tools: formattedTools }
          };
          break;
          
        case 'resources/list':
          const resources = this.sqliteManager.getAllResources();
          const formattedResources = resources.map(resource => ({
            name: `${resource.server_id}__${resource.name}`,
            description: `[${resource.server_id}] ${resource.description}`,
            uri: resource.uri_template
          }));
          
          response = {
            jsonrpc: '2.0',
            id: message.id,
            result: { resources: formattedResources }
          };
          break;
          
        case 'tools/call':
          console.error(`[QuickMCP] Executing tool: ${message.params?.name}`);
          
          const toolResult = await this.executor.executeTool(
            message.params?.name || '',
            message.params?.arguments || {}
          );
          
          response = {
            jsonrpc: '2.0',
            id: message.id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify(toolResult, null, 2)
              }]
            }
          };
          break;
          
        case 'resources/read':
          const resourceResult = await this.executor.readResource(
            message.params?.uri || ''
          );
          
          response = {
            jsonrpc: '2.0',
            id: message.id,
            result: resourceResult
          };
          break;
          
        default:
          if (message.id) {
            response = {
              jsonrpc: '2.0',
              id: message.id,
              error: {
                code: -32601,
                message: `Method not found: ${message.method}`
              }
            };
          }
      }
      
      if (response) {
        this.transport.sendMessage(response);
      }
      
    } catch (error) {
      console.error('[QuickMCP] Error handling message:', error);
      
      if (message.id) {
        this.transport.sendMessage({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32603,
            message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
      }
    }
  }
}

// Main execution
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let transportType: TransportType = 'stdio';
  if (args.includes('--sse')) {
    transportType = 'sse';
  } else if (args.includes('--streamable-http')) {
    transportType = 'streamable-http';
  }
  const portIndex = args.indexOf('--port');
  const port = portIndex !== -1 && args[portIndex + 1] 
    ? parseInt(args[portIndex + 1]) 
    : 3001;
  
  // Create and start bridge
  const bridge = new QuickMCPBridge(transportType, port);
  
  bridge.start(port).catch(error => {
    console.error('Failed to start QuickMCP Bridge:', error);
    process.exit(1);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await bridge.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await bridge.stop();
    process.exit(0);
  });
}

export { QuickMCPBridge };
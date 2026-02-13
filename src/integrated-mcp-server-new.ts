#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { DynamicMCPExecutor } from './server/dynamic-mcp-executor';
import { PortUtils } from './server/port-utils';

export class IntegratedMCPServer {
  private server: Server;
  private app: express.Application;
  private executor: DynamicMCPExecutor;

  constructor() {
    this.executor = new DynamicMCPExecutor();

    this.server = new Server(
      {
        name: 'quickmcp-integrated-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    this.app = express();
    this.setupHandlers();
    this.setupWebRoutes();
  }

  private setupHandlers(): void {
    // List tools - dynamically from SQLite
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        const tools = await this.executor.getAllTools();
        console.error(`📋 Listed ${tools.length} dynamic tools`);

        return { tools };
      } catch (error) {
        console.error('❌ Error listing tools:', error);
        return { tools: [] };
      }
    });

    // List resources - dynamically from SQLite
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        const resources = await this.executor.getAllResources();
        //console.log(`📂 Listed ${resources.length} dynamic resources`);

        return { resources };
      } catch (error) {
        console.error('❌ Error listing resources:', error);
        return { resources: [] };
      }
    });

    // Execute tool - dynamically via database
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        //console.log(`🔧 Executing dynamic tool: ${name}`);

        const result = await this.executor.executeTool(name, args || {});

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error(`❌ Error executing tool ${request.params.name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to execute tool: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // Read resource - dynamically via database
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        const { uri } = request.params;
        //console.log(`📖 Reading dynamic resource: ${uri}`);

        // Extract resource name from URI (e.g., "serverId__resourceName://list" -> "serverId__resourceName")
        const resourceName = uri.split('://')[0];
        const result = await this.executor.readResource(resourceName);

        return result;
      } catch (error) {
        console.error(`❌ Error reading resource ${request.params.uri}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // Prompts - return empty for now
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return { prompts: [] };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      throw new McpError(ErrorCode.MethodNotFound, `Prompt not found: ${request.params.name}`);
    });
  }

  private setupWebRoutes(): void {
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.raw({ type: '*/*', limit: '50mb' }));

    // Health check
    this.app.get('/health', (req, res) => {
      const stats = this.executor.getStats();
      res.json({
        status: 'healthy',
        ...stats,
        timestamp: new Date().toISOString()
      });
    });

    // MCP STDIO endpoint for bridge
    this.app.post('/api/mcp-stdio', express.raw({ type: '*/*' }), async (req, res) => {
      try {
        let messageData: any;

        if (Buffer.isBuffer(req.body)) {
          messageData = JSON.parse(req.body.toString());
        } else if (typeof req.body === 'string') {
          messageData = JSON.parse(req.body);
        } else {
          messageData = req.body;
        }

        //console.log('🔄 Processing MCP message:', messageData.method || 'unknown');

        let response: any = null;

        switch (messageData.method) {
          case 'initialize':
            response = {
              jsonrpc: '2.0',
              id: messageData.id,
              result: {
                protocolVersion: '2024-11-05',
                serverInfo: {
                  name: 'quickmcp-integrated',
                  version: '1.0.0'
                },
                capabilities: {
                  tools: {},
                  resources: {},
                  prompts: {}
                }
              }
            };
            break;

          case 'tools/list':
            const tools = await this.executor.getAllTools();
            response = {
              jsonrpc: '2.0',
              id: messageData.id,
              result: { tools }
            };
            break;

          case 'resources/list':
            const resources = await this.executor.getAllResources();
            response = {
              jsonrpc: '2.0',
              id: messageData.id,
              result: { resources }
            };
            break;

          case 'tools/call':
            const toolResult = await this.executor.executeTool(
              messageData.params.name,
              messageData.params.arguments || {}
            );
            response = {
              jsonrpc: '2.0',
              id: messageData.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(toolResult, null, 2)
                  }
                ]
              }
            };
            break;

          case 'resources/read':
            const uri = messageData.params.uri;
            const resourceName = uri.split('://')[0];
            const resourceResult = await this.executor.readResource(resourceName);
            response = {
              jsonrpc: '2.0',
              id: messageData.id,
              result: resourceResult
            };
            break;

          case 'notifications/initialized':
            // No response for notifications
            //console.log('🔔 MCP client initialized');
            break;

          default:
            if (messageData.id) {
              response = {
                jsonrpc: '2.0',
                id: messageData.id,
                error: {
                  code: -32601,
                  message: `Method not found: ${messageData.method}`
                }
              };
            }
        }

        if (response) {
          res.json(response);
        } else {
          res.status(204).end();
        }

      } catch (error) {
        console.error('❌ Error processing MCP message:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body?.id,
          error: {
            code: -32603,
            message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
      }
    });

    // Stats endpoint
    this.app.get('/api/stats', (req, res) => {
      res.json(this.executor.getStats());
    });
  }

  async start(port?: number): Promise<void> {
    const resolvedPort = typeof port === 'number' && Number.isFinite(port) && port > 0
      ? port
      : new PortUtils(process.env).resolveServerPorts().mcpPort;

    // Start HTTP server
    const httpServer = this.app.listen(resolvedPort, () => {
      //console.log(`🚀 QuickMCP Integrated Server running on http://localhost:${port}`);

      const stats = this.executor.getStats();
      //console.log(`📊 Managing ${stats.servers} virtual servers with ${stats.tools} tools and ${stats.resources} resources`);
    });

    // Setup SSE transport for MCP - skip for now due to compatibility issues
    // const transport = new SSEServerTransport('/sse', httpServer);
    // await this.server.connect(transport);

    //console.log('✅ MCP server connected with dynamic SQLite-based execution (HTTP endpoints active)');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      //console.log('\n🔄 Shutting down QuickMCP Integrated Server...');
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      //console.log('\n🔄 Shutting down QuickMCP Integrated Server...');
      await this.cleanup();
      process.exit(0);
    });
  }

  private async cleanup(): Promise<void> {
    try {
      await this.server.close();
      await this.executor.close();
      //console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

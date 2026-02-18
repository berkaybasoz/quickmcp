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
import crypto from 'crypto';
import { createDataStore } from './database/factory';
import { IDataStore } from './database/datastore';
import { AuthMode, resolveAuthMode } from './config/auth-config';
import { verifyMcpToken } from './auth/token-utils';
import {
  getMcpTokenRecord,
  isResourceAuthorized,
  isToolAuthorized,
  McpIdentity,
  McpTokenAuthRecord
} from './auth/auth-utils';

export class IntegratedMCPServer {
  private server: Server;
  private app: express.Application;
  private executor: DynamicMCPExecutor;
  private authStore: IDataStore;
  private mcpAuthMode: AuthMode;
  private mcpIdentity: McpIdentity | null;
  private mcpTokenRecord: McpTokenAuthRecord | null;

  constructor() {
    this.executor = new DynamicMCPExecutor();
    this.authStore = createDataStore();
    this.mcpAuthMode = resolveAuthMode();
    const mcpTokenSecret = process.env.QUICKMCP_TOKEN_SECRET || process.env.AUTH_COOKIE_SECRET || 'change-me';
    const mcpToken = (process.env.QUICKMCP_TOKEN || '').trim();
    const verifiedMcpPayload = mcpToken ? verifyMcpToken(mcpToken, mcpTokenSecret) : null;
    this.mcpIdentity = verifiedMcpPayload ? {
      tokenId: verifiedMcpPayload.jti ? String(verifiedMcpPayload.jti) : '',
      username: String(verifiedMcpPayload.sub),
      workspace: String(verifiedMcpPayload.ws || verifiedMcpPayload.workspace || verifiedMcpPayload.sub),
      role: String(verifiedMcpPayload.role || 'user')
    } : null;
    const mcpTokenHash = mcpToken ? crypto.createHash('sha256').update(mcpToken).digest('hex') : '';
    this.mcpTokenRecord = getMcpTokenRecord(this.authStore, this.mcpAuthMode, mcpTokenHash);

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

  private async parseQualifiedName(name: string): Promise<[string, string]> {
    const allServerIds = (await this.authStore.getAllServers()).map((s) => s.id);
    const matchingServerIds = allServerIds
      .filter((serverId) => name.startsWith(`${serverId}__`))
      .sort((a, b) => b.length - a.length);

    if (matchingServerIds.length > 0) {
      const serverId = matchingServerIds[0];
      const itemName = name.slice(serverId.length + 2);
      if (itemName.length === 0) {
        throw new Error(`Invalid qualified name format: ${name}`);
      }
      return [serverId, itemName];
    }

    const sepIndex = name.indexOf('__');
    if (sepIndex <= 0 || sepIndex >= name.length - 2) {
      throw new Error(`Invalid qualified name format: ${name}`);
    }
    return [name.slice(0, sepIndex), name.slice(sepIndex + 2)];
  }

  private async getAuthorizedTools(tools: any[]): Promise<any[]> {
    if (this.mcpAuthMode === 'NONE') return tools;
    const out: any[] = [];
    for (const tool of tools) {
      try {
        const [serverId, toolName] = await this.parseQualifiedName(String(tool.name || ''));
        if (isToolAuthorized(this.mcpAuthMode, this.authStore, this.mcpIdentity, this.mcpTokenRecord, serverId, toolName)) {
          out.push(tool);
        }
      } catch {
        // ignore unauthorized/invalid
      }
    }
    return out;
  }

  private async getAuthorizedResources(resources: any[]): Promise<any[]> {
    if (this.mcpAuthMode === 'NONE') return resources;
    const out: any[] = [];
    for (const resource of resources) {
      try {
        const fullName = String(resource.name || '');
        const [serverId, resourceName] = await this.parseQualifiedName(fullName);
        if (isResourceAuthorized(this.mcpAuthMode, this.authStore, this.mcpIdentity, this.mcpTokenRecord, serverId, resourceName)) {
          out.push(resource);
        }
      } catch {
        // ignore unauthorized/invalid
      }
    }
    return out;
  }

  private setupHandlers(): void {
    // List tools - dynamically from SQLite
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        const tools = await this.getAuthorizedTools(await this.executor.getAllTools());
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
        const resources = await this.getAuthorizedResources(await this.executor.getAllResources());
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
        if (this.mcpAuthMode !== 'NONE') {
          const [serverId, toolName] = await this.parseQualifiedName(name);
          const allowed = isToolAuthorized(this.mcpAuthMode, this.authStore, this.mcpIdentity, this.mcpTokenRecord, serverId, toolName);
          if (!allowed) {
            throw new McpError(ErrorCode.InvalidRequest, 'Unauthorized: tool is not allowed by token policy');
          }
        }

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
        if (this.mcpAuthMode !== 'NONE') {
          const [serverId, actualResourceName] = await this.parseQualifiedName(resourceName);
          const allowed = isResourceAuthorized(this.mcpAuthMode, this.authStore, this.mcpIdentity, this.mcpTokenRecord, serverId, actualResourceName);
          if (!allowed) {
            throw new McpError(ErrorCode.InvalidRequest, 'Unauthorized: resource is not allowed by token policy');
          }
        }
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
            const tools = await this.getAuthorizedTools(await this.executor.getAllTools());
            response = {
              jsonrpc: '2.0',
              id: messageData.id,
              result: { tools }
            };
            break;

          case 'resources/list':
            const resources = await this.getAuthorizedResources(await this.executor.getAllResources());
            response = {
              jsonrpc: '2.0',
              id: messageData.id,
              result: { resources }
            };
            break;

          case 'tools/call':
            if (this.mcpAuthMode !== 'NONE') {
              const [serverId, toolName] = await this.parseQualifiedName(messageData.params.name);
              const allowed = isToolAuthorized(this.mcpAuthMode, this.authStore, this.mcpIdentity, this.mcpTokenRecord, serverId, toolName);
              if (!allowed) {
                throw new Error('Unauthorized: tool is not allowed by token policy');
              }
            }
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
            if (this.mcpAuthMode !== 'NONE') {
              const [serverId, actualResourceName] = await this.parseQualifiedName(resourceName);
              const allowed = isResourceAuthorized(this.mcpAuthMode, this.authStore, this.mcpIdentity, this.mcpTokenRecord, serverId, actualResourceName);
              if (!allowed) {
                throw new Error('Unauthorized: resource is not allowed by token policy');
              }
            }
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
      this.authStore.close();
      //console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

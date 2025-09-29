#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
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
import fs from 'fs/promises';
import path from 'path';

interface ServerInfo {
  config: any;
  serverPath: string;
  parsedData: any[];
  runtimeProcess?: any;
  runtimePort?: number;
}

class IntegratedMCPServer {
  private server: Server;
  private app: express.Application;
  private generatedServers: Map<string, ServerInfo>;

  constructor(generatedServers: Map<string, ServerInfo>) {
    this.generatedServers = generatedServers;
    this.server = new Server(
      {
        name: 'quickmcp-integrated-server',
        version: '1.0.0'
      }
    );

    this.app = express();
    this.setupHandlers();
  }


  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: any[] = [];

      // Add tools from all generated servers
      for (const [serverId, serverInfo] of this.generatedServers) {
        for (const tool of serverInfo.config.tools) {
          tools.push({
            name: `${serverId}__${tool.name}`,
            description: `[${serverInfo.config.name}] ${tool.description}`,
            inputSchema: tool.inputSchema
          });
        }
      }

      // Add QuickMCP management tools
      tools.push({
        name: 'quickmcp__list_servers',
        description: 'List all generated MCP servers',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      });

      tools.push({
        name: 'quickmcp__get_server_info',
        description: 'Get detailed information about a specific server',
        inputSchema: {
          type: 'object',
          properties: {
            serverId: {
              type: 'string',
              description: 'ID of the server to get information about'
            }
          },
          required: ['serverId']
        }
      });

      return { tools };
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources: any[] = [];

      // Add resources from all generated servers
      for (const [serverId, serverInfo] of this.generatedServers) {
        for (const resource of serverInfo.config.resources) {
          resources.push({
            uri: `quickmcp://${serverId}/${resource.uri}`,
            name: `[${serverInfo.config.name}] ${resource.name}`,
            description: resource.description,
            mimeType: resource.mimeType
          });
        }
      }

      // Add QuickMCP resources
      resources.push({
        uri: 'quickmcp://servers/list',
        name: 'QuickMCP Server List',
        description: 'List of all generated MCP servers',
        mimeType: 'application/json'
      });

      return { resources };
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts: any[] = [];

      // Add prompts from all generated servers
      for (const [serverId, serverInfo] of this.generatedServers) {
        for (const prompt of serverInfo.config.prompts) {
          prompts.push({
            name: `${serverId}__${prompt.name}`,
            description: `[${serverInfo.config.name}] ${prompt.description}`,
            arguments: prompt.arguments
          });
        }
      }

      return { prompts };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'quickmcp__list_servers') {
        const servers = Array.from(this.generatedServers.entries()).map(([id, data]) => ({
          id,
          name: data.config.name,
          description: data.config.description,
          version: data.config.version,
          toolsCount: data.config.tools.length,
          resourcesCount: data.config.resources.length,
          promptsCount: data.config.prompts.length,
          dataRowsCount: data.parsedData.reduce((acc, d) => acc + d.rows.length, 0)
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(servers, null, 2)
          }]
        };
      }

      if (name === 'quickmcp__get_server_info') {
        const serverId = args.serverId as string;
        const serverInfo = this.generatedServers.get(serverId);

        if (!serverInfo) {
          throw new McpError(ErrorCode.InvalidParams, `Server '${serverId}' not found`);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              config: serverInfo.config,
              dataPreview: serverInfo.parsedData.map(data => ({
                ...data,
                rows: data.rows.slice(0, 10) // Limit preview rows
              }))
            }, null, 2)
          }]
        };
      }

      // Handle tools from generated servers
      if (name.includes('__')) {
        const [serverId, toolName] = name.split('__', 2);
        const serverInfo = this.generatedServers.get(serverId);

        if (!serverInfo) {
          throw new McpError(ErrorCode.InvalidParams, `Server '${serverId}' not found`);
        }

        const tool = serverInfo.config.tools.find((t: any) => t.name === toolName);
        if (!tool) {
          throw new McpError(ErrorCode.MethodNotFound, `Tool '${toolName}' not found in server '${serverId}'`);
        }

        // Execute the tool handler with the server's data
        try {
          const result = await this.executeToolHandler(serverInfo, tool, args);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result)
            }]
          };
        } catch (error) {
          throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'quickmcp://servers/list') {
        const servers = Array.from(this.generatedServers.entries()).map(([id, data]) => ({
          id,
          name: data.config.name,
          description: data.config.description,
          version: data.config.version,
          toolsCount: data.config.tools.length,
          resourcesCount: data.config.resources.length,
          promptsCount: data.config.prompts.length
        }));

        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(servers, null, 2)
          }]
        };
      }

      // Handle resources from generated servers
      if (uri.startsWith('quickmcp://')) {
        const uriParts = uri.replace('quickmcp://', '').split('/');
        const serverId = uriParts[0];
        const originalUri = uriParts.slice(1).join('/');

        const serverInfo = this.generatedServers.get(serverId);
        if (!serverInfo) {
          throw new McpError(ErrorCode.InvalidParams, `Server '${serverId}' not found`);
        }

        // Find the original resource
        const resource = serverInfo.config.resources.find((r: any) => r.uri === originalUri);
        if (!resource) {
          throw new McpError(ErrorCode.InvalidParams, `Resource '${originalUri}' not found in server '${serverId}'`);
        }

        // Generate resource content based on type
        const content = await this.generateResourceContent(serverInfo, resource);

        return {
          contents: [{
            uri,
            mimeType: resource.mimeType || 'application/json',
            text: content
          }]
        };
      }

      throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${uri}`);
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name.includes('__')) {
        const [serverId, promptName] = name.split('__', 2);
        const serverInfo = this.generatedServers.get(serverId);

        if (!serverInfo) {
          throw new McpError(ErrorCode.InvalidParams, `Server '${serverId}' not found`);
        }

        const prompt = serverInfo.config.prompts.find((p: any) => p.name === promptName);
        if (!prompt) {
          throw new McpError(ErrorCode.MethodNotFound, `Prompt '${promptName}' not found in server '${serverId}'`);
        }

        // Process template with arguments
        const processedTemplate = this.processPromptTemplate(prompt.template, args || {});

        return {
          description: prompt.description,
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: processedTemplate
            }
          }]
        };
      }

      throw new McpError(ErrorCode.MethodNotFound, `Unknown prompt: ${name}`);
    });
  }

  private async executeToolHandler(serverInfo: ServerInfo, tool: any, args: any): Promise<any> {
    const DATA = serverInfo.parsedData;

    // Implement the tool handler logic based on the tool type
    const handler = tool.handler;

    if (handler.includes('searchTable')) {
      const match = handler.match(/searchTable\((\d+), args\.query, args\.limit \|\| (\d+)\)/);
      if (match) {
        const tableIndex = parseInt(match[1]);
        const defaultLimit = parseInt(match[2]);
        return this.searchTable(DATA, tableIndex, args.query, args.limit || defaultLimit);
      }
    }

    if (handler.includes('getAllFromTable')) {
      const match = handler.match(/getAllFromTable\((\d+), args\.limit \|\| (\d+)\)/);
      if (match) {
        const tableIndex = parseInt(match[1]);
        const defaultLimit = parseInt(match[2]);
        return this.getAllFromTable(DATA, tableIndex, args.limit || defaultLimit);
      }
    }

    if (handler.includes('filterTableByColumn')) {
      const match = handler.match(/filterTableByColumn\((\d+), '([^']+)', args\.value, args\.limit \|\| (\d+)\)/);
      if (match) {
        const tableIndex = parseInt(match[1]);
        const column = match[2];
        const defaultLimit = parseInt(match[3]);
        return this.filterTableByColumn(DATA, tableIndex, column, args.value, args.limit || defaultLimit);
      }
    }

    throw new Error(`Unsupported handler: ${handler}`);
  }

  private async generateResourceContent(serverInfo: ServerInfo, resource: any): Promise<string> {
    const DATA = serverInfo.parsedData;

    if (resource.uri.startsWith('schema://')) {
      const tableName = resource.uri.replace('schema://', '');
      const table = DATA.find(d => this.toSafeIdentifier(d.tableName || `table_${DATA.indexOf(d)}`) === tableName);

      if (table) {
        return JSON.stringify({
          headers: table.headers,
          metadata: table.metadata
        }, null, 2);
      }
    }

    if (resource.uri.startsWith('data://')) {
      const parts = resource.uri.replace('data://', '').split('/');
      const tableName = parts[0];
      const table = DATA.find(d => this.toSafeIdentifier(d.tableName || `table_${DATA.indexOf(d)}`) === tableName);

      if (table) {
        return JSON.stringify(table.rows.slice(0, 10), null, 2);
      }
    }

    return JSON.stringify({ message: 'Resource content not available' });
  }

  private processPromptTemplate(template: string, args: any): string {
    let processed = template;

    // Replace template variables
    for (const [key, value] of Object.entries(args)) {
      const regex = new RegExp(`\\$\\{args\\.${key}\\}`, 'g');
      processed = processed.replace(regex, String(value));
    }

    // Handle conditional blocks
    processed = processed.replace(/\{\{args\.(\w+) \? `([^`]*)` : '([^']*)'\}\}/g, (match, key, truthyText, falsyText) => {
      return args[key] ? truthyText.replace(/\\n/g, '\n') : falsyText;
    });

    return processed;
  }

  // Utility methods for data operations
  private searchTable(DATA: any[], tableIndex: number, query: string, limit: number) {
    const data = DATA[tableIndex];
    const results = data.rows.filter((row: any[]) =>
      row.some(cell =>
        cell && cell.toString().toLowerCase().includes(query.toLowerCase())
      )
    ).slice(0, limit);

    return {
      headers: data.headers,
      rows: results,
      total: results.length,
      tableName: data.tableName
    };
  }

  private getAllFromTable(DATA: any[], tableIndex: number, limit: number) {
    const data = DATA[tableIndex];
    return {
      headers: data.headers,
      rows: data.rows.slice(0, limit),
      total: Math.min(data.rows.length, limit),
      tableName: data.tableName
    };
  }

  private filterTableByColumn(DATA: any[], tableIndex: number, column: string, value: any, limit: number) {
    const data = DATA[tableIndex];
    const columnIndex = data.headers.indexOf(column);

    if (columnIndex === -1) {
      throw new Error(`Column '${column}' not found`);
    }

    const results = data.rows.filter((row: any[]) => {
      const cellValue = row[columnIndex];
      if (typeof value === 'string') {
        return cellValue && cellValue.toString().toLowerCase().includes(value.toLowerCase());
      }
      return cellValue === value;
    }).slice(0, limit);

    return {
      headers: data.headers,
      rows: results,
      total: results.length,
      tableName: data.tableName
    };
  }

  private toSafeIdentifier(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .replace(/_+/g, '_')
      .replace(/^_|_$/, '');
  }

  async start(port: number = 3001): Promise<void> {
    // Setup express middleware
    this.app.use(express.json());
    this.app.use(express.raw({ type: 'application/json', limit: '10mb' }));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        serverCount: this.generatedServers.size,
        timestamp: new Date().toISOString()
      });
    });

    // STDIO bridge endpoint for MCP - handles persistent STDIO connection
    this.app.post('/api/mcp-stdio', express.raw({ type: '*/*' }), (req, res) => {
      console.log('MCP STDIO bridge connection established');

      // Set headers for persistent connection
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let buffer = '';

      // Handle data streaming
      req.on('data', (chunk) => {
        buffer += chunk.toString();

        // Process complete lines (JSON-RPC messages)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);
              console.log('Processing MCP message:', JSON.stringify(message, null, 2));

              let response = null;

              // Handle MCP initialize request
              if (message.method === 'initialize') {
                response = {
                  jsonrpc: '2.0',
                  id: message.id,
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
              }

              // Handle tools/list request
              else if (message.method === 'tools/list') {
                const tools = [];

                // Add tools from all generated servers
                for (const [serverId, serverInfo] of this.generatedServers) {
                  for (const tool of serverInfo.config.tools) {
                    tools.push({
                      name: `${serverId}__${tool.name}`,
                      description: `[${serverInfo.config.name}] ${tool.description}`,
                      inputSchema: tool.inputSchema
                    });
                  }
                }

                // Add management tools
                tools.push({
                  name: 'quickmcp__list_servers',
                  description: 'List all generated MCP servers',
                  inputSchema: {
                    type: 'object',
                    properties: {},
                    required: []
                  }
                });

                response = {
                  jsonrpc: '2.0',
                  id: message.id,
                  result: { tools }
                };
              }

              // Handle initialized notification (no response needed)
              else if (message.method === 'notifications/initialized') {
                console.log('MCP client initialized');
                // No response for notifications
              }

              // Handle other requests with placeholder responses
              else if (message.id) {
                response = {
                  jsonrpc: '2.0',
                  id: message.id,
                  result: {}
                };
              }

              // Send response if we have one
              if (response) {
                const responseStr = JSON.stringify(response) + '\n';
                console.log('Sending response:', responseStr.trim());
                res.write(responseStr);
              }
            } catch (parseError) {
              console.error('Error parsing JSON message:', parseError, 'Line:', line);
            }
          }
        }
      });

      // Handle connection close
      req.on('end', () => {
        console.log('MCP STDIO connection ended');
        res.end();
      });

      req.on('close', () => {
        console.log('MCP STDIO connection closed');
      });

      req.on('error', (error) => {
        console.error('MCP STDIO connection error:', error);
        res.end();
      });
    });

    // Set up proper SSE endpoint for MCP
    this.app.post('/sse/message', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
      });

      let isConnected = true;

      // Handle client disconnect
      req.on('close', () => {
        isConnected = false;
        console.log('SSE client disconnected');
      });

      req.on('error', (err) => {
        isConnected = false;
        console.error('SSE connection error:', err);
      });

      // Send initial response to curl request
      if (isConnected) {
        res.write('event: message\ndata: {"jsonrpc":"2.0","result":{"protocolVersion":"2025-06-18","serverInfo":{"name":"quickmcp-integrated","version":"1.0.0"},"capabilities":{"tools":{},"resources":{},"prompts":{}}},"id":0}\n\n');
      }

      // Keep connection alive with periodic pings
      const pingInterval = setInterval(() => {
        if (isConnected) {
          try {
            res.write('event: ping\ndata: {}\n\n');
          } catch (err) {
            console.error('Error sending ping:', err);
            isConnected = false;
            clearInterval(pingInterval);
          }
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Clean up on timeout
      setTimeout(() => {
        if (isConnected) {
          try {
            res.end();
          } catch (err) {
            console.error('Error ending response:', err);
          }
          isConnected = false;
          clearInterval(pingInterval);
        }
      }, 2000); // End connection after 2 seconds for curl
    });

    // Handle OPTIONS for CORS
    this.app.options('/sse/message', (req, res) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.sendStatus(200);
    });

    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`🚀 QuickMCP Integrated Server running on http://localhost:${port}`);
        console.log(`📊 Managing ${this.generatedServers.size} MCP servers`);
        console.log(`🔗 Claude Desktop config: http://localhost:${port}/sse/message`);
        resolve();
      });
    });
  }
}

export { IntegratedMCPServer };
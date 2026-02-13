import express from 'express';
import { MCPServerConfig, ParsedData } from '../../types';

type GeneratedServerInfo = {
  config: MCPServerConfig;
  serverPath: string;
  parsedData: ParsedData[];
  runtimeProcess?: any;
  runtimePort?: number;
};

interface McpApiDeps {
  generatedServers: Map<string, GeneratedServerInfo>;
}

export class McpApi {
  constructor(private readonly deps: McpApiDeps) {}

  registerRoutes(app: express.Express): void {
    app.post('/api/mcp-stdio', this.stdioBridge);
  }

  private stdioBridge = (req: express.Request, res: express.Response): void => {
    console.log('MCP STDIO bridge connection established');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');

    let buffer = '';

    req.on('data', (chunk) => {
      buffer += chunk.toString();
      console.log('Received chunk:', chunk.toString());

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          let message: any = null;
          try {
            message = JSON.parse(line);
            console.log('Processing MCP message:', JSON.stringify(message, null, 2));

            let response = null;

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
            } else if (message.method === 'tools/list') {
              const tools = [];
              for (const [serverId, serverInfo] of this.deps.generatedServers) {
                for (const tool of serverInfo.config.tools) {
                  tools.push({
                    name: `${serverId}__${tool.name}`,
                    description: `[${serverInfo.config.name}] ${tool.description}`,
                    inputSchema: tool.inputSchema
                  });
                }
              }

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
            } else if (message.method === 'notifications/initialized') {
              // No response for notifications
            } else if (message.id) {
              response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {}
              };
            }

            if (response) {
              const responseStr = JSON.stringify(response) + '\n';
              console.log('Sending response:', responseStr.trim());
              res.write(responseStr);
            }
          } catch (error) {
            console.error('Error processing MCP message:', error);
            if (message && message.id) {
              const errorResponse = {
                jsonrpc: '2.0',
                id: message.id,
                error: {
                  code: -32603,
                  message: 'Internal error'
                }
              };
              res.write(JSON.stringify(errorResponse) + '\n');
            }
          }
        }
      }
    });

    req.on('end', () => {
      console.error('MCP stdio connection ended');
      res.end();
    });

    req.on('error', (error) => {
      console.error('MCP stdio connection error:', error);
      res.end();
    });

    req.on('close', () => {
      console.error('MCP stdio connection closed');
    });
  };
}

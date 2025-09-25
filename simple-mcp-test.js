#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} = require('@modelcontextprotocol/sdk/types.js');

const server = new Server({
  name: 'simple-test',
  version: '1.0.0'
}, {
  capabilities: {
    tools: { listChanged: true }
  }
});

// Simple test tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'test_simple',
        description: 'A simple test tool',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'A simple message'
            }
          },
          required: ['message']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'test_simple') {
    return {
      content: [{
        type: 'text',
        text: `Hello! You said: ${args.message}`
      }]
    };
  }

  throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
});

// STDIO transport
process.stdin.on('data', async (data) => {
  const input = data.toString().trim();
  if (!input) return;

  try {
    const message = JSON.parse(input);
    console.error(`[Simple] Received: ${message.method} (id: ${message.id})`);

    let response;

    switch (message.method) {
      case 'initialize':
        response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'simple-test', version: '1.0.0' },
            capabilities: { tools: { listChanged: true } }
          }
        };
        break;

      case 'tools/list':
        response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            tools: [{
              name: 'test_simple',
              description: 'A simple test tool',
              inputSchema: {
                type: 'object',
                properties: {
                  message: { type: 'string', description: 'A simple message' }
                },
                required: ['message']
              }
            }]
          }
        };
        break;

      case 'tools/call':
        response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [{
              type: 'text',
              text: `Hello! You said: ${message.params.arguments?.message || 'nothing'}`
            }]
          }
        };
        break;

      case 'notifications/initialized':
        console.error('[Simple] Client initialized');
        break;

      default:
        if (message.id) {
          response = {
            jsonrpc: '2.0',
            id: message.id,
            error: { code: -32601, message: `Method not found: ${message.method}` }
          };
        }
    }

    if (response) {
      console.error(`[Simple] Sending: ${response.result ? 'success' : 'error'}`);
      process.stdout.write(JSON.stringify(response) + '\n');
    }

  } catch (error) {
    console.error('[Simple] Error:', error.message);
  }
});

process.stdin.on('end', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

process.stdin.resume();
console.error('Simple MCP Test Server started...');
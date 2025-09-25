#!/usr/bin/env node

const http = require('http');
const { Transform } = require('stream');

class MCPBridge extends Transform {
  constructor() {
    super({ objectMode: true });
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();

    // Process complete JSON-RPC messages
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.emit('message', message);
        } catch (error) {
          console.error('Error parsing message:', error, 'Line:', line);
        }
      }
    }

    callback();
  }

  sendMessage(message) {
    this.push(JSON.stringify(message) + '\n');
  }
}

// Create bridge
const bridge = new MCPBridge();

// Handle messages from Claude Desktop (stdin)
process.stdin.pipe(bridge);

// Send responses to Claude Desktop (stdout)
bridge.pipe(process.stdout);

// Handle MCP protocol messages
bridge.on('message', async (message) => {
  console.error('Received message:', JSON.stringify(message, null, 2));

  try {
    let response = null;

    // Handle initialize request
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
      // Make HTTP request to get tools from our server
      const tools = await getToolsFromServer();
      response = {
        jsonrpc: '2.0',
        id: message.id,
        result: { tools }
      };
    }

    // Handle initialized notification (no response needed)
    else if (message.method === 'notifications/initialized') {
      console.error('MCP client initialized');
      // No response for notifications
    }

    // Handle other requests
    else if (message.id) {
      response = {
        jsonrpc: '2.0',
        id: message.id,
        result: {}
      };
    }

    // Send response if we have one
    if (response) {
      console.error('Sending response:', JSON.stringify(response));
      bridge.sendMessage(response);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    if (message.id) {
      bridge.sendMessage({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: 'Internal error: ' + error.message
        }
      });
    }
  }
});

// Function to get tools from our HTTP server
async function getToolsFromServer() {
  return new Promise(async (resolve, reject) => {
    try {
      // First get list of servers
      const servers = await new Promise((res, rej) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3000,
          path: '/api/servers',
          method: 'GET'
        }, (response) => {
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => {
            try {
              const result = JSON.parse(data);
              res(result.success ? result.data : []);
            } catch (error) {
              rej(error);
            }
          });
        });
        req.on('error', rej);
        req.end();
      });

      const tools = [];

      // For each server, get its detailed info and tools
      for (const server of servers) {
        try {
          const serverDetails = await new Promise((res, rej) => {
            const req = http.request({
              hostname: 'localhost',
              port: 3000,
              path: `/api/servers/${server.id}`,
              method: 'GET'
            }, (response) => {
              let data = '';
              response.on('data', chunk => data += chunk);
              response.on('end', () => {
                try {
                  const result = JSON.parse(data);
                  res(result.success ? result.data : null);
                } catch (error) {
                  rej(error);
                }
              });
            });
            req.on('error', rej);
            req.end();
          });

          if (serverDetails && serverDetails.config && serverDetails.config.tools) {
            // Add actual tools from server config
            for (const tool of serverDetails.config.tools) {
              tools.push({
                name: `${server.id}__${tool.name}`,
                description: `[${server.name}] ${tool.description}`,
                inputSchema: tool.inputSchema
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching details for server ${server.id}:`, error);
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

      resolve(tools);
    } catch (error) {
      reject(error);
    }
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.error('MCP Bridge shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('MCP Bridge shutting down...');
  process.exit(0);
});

console.error('MCP Bridge started, waiting for messages...');
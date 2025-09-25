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

// Handle MCP protocol messages - proxy all to QuickMCP Integrated Server
bridge.on('message', async (message) => {
  console.error('Received message:', JSON.stringify(message, null, 2));

  try {
    // Forward all messages to QuickMCP Integrated Server
    const response = await forwardToQuickMCP(message);

    // Send response back to Claude Desktop
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

// Forward messages to QuickMCP Integrated Server
async function forwardToQuickMCP(message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(message);

    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/mcp-stdio',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200 && data.trim()) {
            const response = JSON.parse(data);
            resolve(response);
          } else {
            console.error('QuickMCP server responded with:', res.statusCode, data);
            resolve(null);
          }
        } catch (err) {
          console.error('Error parsing QuickMCP response:', err);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Error connecting to QuickMCP server:', err);
      resolve(null);
    });

    req.on('timeout', () => {
      console.error('Request timeout to QuickMCP server');
      req.destroy();
      resolve(null);
    });

    req.write(postData);
    req.end();
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

console.error('MCP Bridge started, forwarding to QuickMCP Integrated Server on localhost:3001...');
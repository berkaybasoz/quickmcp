#!/usr/bin/env node

const http = require('http');

let isConnectedToQuickMCP = false;

// Test QuickMCP server connection at startup
async function testQuickMCPConnection() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => resolve(false));
    req.end();
  });
}

// Forward messages to QuickMCP server
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
    });

    let responseData = '';

    req.on('response', (res) => {
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          if (responseData.trim()) {
            const response = JSON.parse(responseData);
            resolve(response);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('Error parsing QuickMCP response:', error);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error connecting to QuickMCP server:', error);
      reject(error);
    });

    req.on('timeout', () => {
      console.error('Timeout connecting to QuickMCP server');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Process STDIO messages
process.stdin.on('data', async (data) => {
  const input = data.toString().trim();

  if (!input) return;

  try {
    const message = JSON.parse(input);
    console.error(`[Bridge] Received: ${message.method || 'unknown'} (id: ${message.id})`);

    // Test connection if not established
    if (!isConnectedToQuickMCP) {
      isConnectedToQuickMCP = await testQuickMCPConnection();
      if (!isConnectedToQuickMCP) {
        throw new Error('QuickMCP server not available on localhost:3001');
      }
      console.error('[Bridge] Connected to QuickMCP server');
    }

    // Forward to QuickMCP server
    const response = await forwardToQuickMCP(message);

    if (response) {
      console.error(`[Bridge] Sending: ${JSON.stringify(response).substring(0, 100)}...`);
      process.stdout.write(JSON.stringify(response) + '\n');
    }

  } catch (error) {
    console.error('[Bridge] Error:', error.message);

    // Send error response for requests with ID
    try {
      const message = JSON.parse(input);
      if (message.id) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32603,
            message: `Bridge error: ${error.message}`
          }
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    } catch (parseError) {
      console.error('[Bridge] Cannot parse input for error response');
    }
  }
});

process.stdin.on('end', () => {
  console.error('[Bridge] STDIN ended');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.error('[Bridge] Interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[Bridge] Terminated');
  process.exit(0);
});

// Keep process alive
process.stdin.resume();

console.error('MCP Bridge started, forwarding to QuickMCP server on localhost:3001...');
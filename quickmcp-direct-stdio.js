#!/usr/bin/env node

const path = require('path');

// Change to the correct working directory first
process.chdir('/Users/berkaybasoz/Documents/apps/quickmcp');

const { SQLiteManager } = require('./dist/database/sqlite-manager.js');

// Create SQLite manager
const sqliteManager = new SQLiteManager();

// Direct STDIO MCP implementation
process.stdin.on('data', async (data) => {
  const input = data.toString().trim();
  if (!input) return;

  try {
    const message = JSON.parse(input);
    console.error(`[QuickMCP] Received: ${message.method} (id: ${message.id})`);

    let response;

    switch (message.method) {
      case 'initialize':
        response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'quickmcp-direct', version: '1.0.0' },
            capabilities: {
              tools: { listChanged: true },
              resources: { listChanged: true },
              prompts: { listChanged: true }
            }
          }
        };
        break;

      case 'tools/list':
        try {
          const tools = sqliteManager.getAllTools();
          console.error(`[QuickMCP] Got ${tools.length} tools from SQLite`);
          const formattedTools = tools.map(tool => ({
            name: `${tool.server_id}__${tool.name}`,
            description: `[${tool.server_id}] ${tool.description}`,
            inputSchema: typeof tool.inputSchema === 'string' ? JSON.parse(tool.inputSchema) : tool.inputSchema
          }));
          console.error(`[QuickMCP] Formatted ${formattedTools.length} tools`);

          response = {
            jsonrpc: '2.0',
            id: message.id,
            result: { tools: formattedTools }
          };
        } catch (error) {
          console.error('[QuickMCP] Error getting tools:', error);
          response = {
            jsonrpc: '2.0',
            id: message.id,
            result: { tools: [] }
          };
        }
        break;

      case 'resources/list':
        try {
          const resources = sqliteManager.getAllResources();
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
        } catch (error) {
          console.error('[QuickMCP] Error getting resources:', error);
          response = {
            jsonrpc: '2.0',
            id: message.id,
            result: { resources: [] }
          };
        }
        break;

      case 'tools/call':
        try {
          console.error(`[QuickMCP] Executing tool: ${message.params.name}`);
          console.error(`[QuickMCP] Arguments:`, JSON.stringify(message.params.arguments));
          
          // Import DynamicMCPExecutor
          const { DynamicMCPExecutor } = require('./dist/dynamic-mcp-executor.js');
          const executor = new DynamicMCPExecutor();

          // Execute the tool with timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Tool execution timeout')), 10000);
          });
          
          const toolResult = await Promise.race([
            executor.executeTool(message.params.name, message.params.arguments || {}),
            timeoutPromise
          ]);

          console.error(`[QuickMCP] Tool result:`, JSON.stringify(toolResult, null, 2));

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
        } catch (error) {
          console.error(`[QuickMCP] Tool execution error:`, error);
          response = {
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32603,
              message: `Tool execution failed: ${error.message}`
            }
          };
        }
        break;

      case 'notifications/initialized':
        console.error('[QuickMCP] Client initialized');
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
      console.error(`[QuickMCP] Sending: ${response.result ? 'success' : 'error'}`);
      process.stdout.write(JSON.stringify(response) + '\n');
    }

  } catch (error) {
    console.error('[QuickMCP] Error:', error.message);

    // Send error response for requests with ID
    try {
      const message = JSON.parse(input);
      if (message.id) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32603,
            message: `Server error: ${error.message}`
          }
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    } catch (parseError) {
      console.error('[QuickMCP] Cannot parse input for error response');
    }
  }
});

process.stdin.on('end', () => {
  console.error('[QuickMCP] STDIN ended');
  sqliteManager.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.error('[QuickMCP] Interrupted');
  sqliteManager.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[QuickMCP] Terminated');
  sqliteManager.close();
  process.exit(0);
});

process.stdin.resume();
console.error('QuickMCP Direct STDIO Server started...');
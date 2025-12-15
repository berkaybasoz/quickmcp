#!/usr/bin/env node

const path = require('path');

// Use the current working directory provided by the caller.
// Do not change directories; keep paths relative to this script.

const { SQLiteManager } = require('./dist/database/sqlite-manager.js');

// Create SQLite manager
const sqliteManager = new SQLiteManager();

// Diagnostics: print environment and mssql details to help debug Claude Desktop
try {
  const resolvedDynExec = require.resolve('./dist/dynamic-mcp-executor.js');
  const mssql = require('mssql');
  const mssqlVersion = require('mssql/package.json').version;
  console.error('[QuickMCP] Node:', process.version);
  console.error('[QuickMCP] CWD:', process.cwd());
  console.error('[QuickMCP] Dynamic executor path:', resolvedDynExec);
  console.error('[QuickMCP] mssql version:', mssqlVersion);
  console.error('[QuickMCP] mssql exports:', {
    hasDefault: !!mssql.default,
    hasConnect: typeof mssql.connect,
    typeofConnectionPool: typeof (mssql.ConnectionPool),
    keys: Object.keys(mssql).slice(0, 10)
  });
} catch (e) {
  console.error('[QuickMCP] Diagnostic init error:', e && e.message);
}

// Direct STDIO MCP implementation with LSP-style framing support
let stdinBuffer = Buffer.alloc(0);
let useLspFraming = null; // null until detected; true => LSP, false => line-delimited

function sendMessage(message) {
  try {
    const json = JSON.stringify(message);
    if (useLspFraming) {
      const payload = Buffer.from(json, 'utf8');
      const header = Buffer.from(`Content-Length: ${payload.length}\r\n\r\n`, 'utf8');
      const out = Buffer.concat([header, payload]);
      process.stdout.write(out);
    } else {
      process.stdout.write(json + '\n');
    }
  } catch (e) {
    console.error('[QuickMCP] Failed to send message:', e && e.message);
  }
}

async function handleMessage(message) {
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

    case 'prompts/list':
      // Return empty prompts list for now
      response = {
        jsonrpc: '2.0',
        id: message.id,
        result: { prompts: [] }
      };
      break;

    case 'tools/call':
      try {
        console.error(`[QuickMCP] Executing tool: ${message.params.name}`);
        console.error(`[QuickMCP] Arguments:`, JSON.stringify(message.params.arguments));

        const { DynamicMCPExecutor } = require('./dist/dynamic-mcp-executor.js');
        const executor = new DynamicMCPExecutor();

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
    sendMessage(response);
  }
}

function tryParseLooseLines(bufferStr) {
  // Fallback for newline-delimited JSON (non-LSP)
  const lines = bufferStr.split(/\n+/).filter(Boolean);
  const messages = [];
  let consumed = 0;
  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      messages.push(msg);
      consumed += line.length + 1; // include one newline
    } catch (_e) {
      break; // stop at first non-JSON line
    }
  }
  return { messages, consumed };
}

process.stdin.on('data', async (data) => {
  stdinBuffer = Buffer.concat([stdinBuffer, data]);

  while (true) {
    const str = stdinBuffer.toString('utf8');
    const headerEnd = str.indexOf('\r\n\r\n');

    if (headerEnd !== -1) {
      // LSP-style framed message
      const header = str.slice(0, headerEnd);
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        // Invalid header; drop up to headerEnd+4
        console.error('[QuickMCP] Invalid header, dropping bytes');
        stdinBuffer = Buffer.from(str.slice(headerEnd + 4), 'utf8');
        continue;
      }
      const contentLength = parseInt(match[1], 10);
      const totalLength = headerEnd + 4 + contentLength;
      if (stdinBuffer.length < totalLength) {
        // wait for more data
        break;
      }
      const body = stdinBuffer.slice(headerEnd + 4, totalLength).toString('utf8');
      try {
        if (useLspFraming === null) {
          useLspFraming = true;
          console.error('[QuickMCP] Detected LSP framing (Content-Length)');
        }
        const message = JSON.parse(body);
        await handleMessage(message);
      } catch (e) {
        console.error('[QuickMCP] Error parsing framed JSON:', e && e.message);
      }
      stdinBuffer = stdinBuffer.slice(totalLength);
      continue;
    }

    // No LSP header found; try newline-delimited JSON fallback
    const { messages, consumed } = tryParseLooseLines(str);
    if (messages.length === 0) {
      // Need more data
      break;
    }
    if (useLspFraming === null) {
      useLspFraming = false;
      console.error('[QuickMCP] Detected newline-delimited JSON framing');
    }
    for (const msg of messages) {
      try {
        await handleMessage(msg);
      } catch (e) {
        console.error('[QuickMCP] Error handling message:', e && e.message);
      }
    }
    stdinBuffer = Buffer.from(str.slice(consumed), 'utf8');
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

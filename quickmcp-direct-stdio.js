#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');

// Use the current working directory provided by the caller.
// Do not change directories; keep paths relative to this script.

const { SQLiteManager } = require('./dist/database/sqlite-manager.js');

// Parse CLI flags for convenience
// Supported flags:
//   --web | -w | web         -> explicitly enable web UI (default: enabled)
//   --no-web                 -> disable web UI
//   --port=NNNN              -> set PORT for web UI
//   --data-dir=PATH          -> set QUICKMCP_DATA_DIR for sqlite
const argv = process.argv.slice(2);
const wantsWeb = argv.includes('--web') || argv.includes('-w') || argv.includes('web');
const noWeb = argv.includes('--no-web');
const portArg = argv.find(a => a.startsWith('--port='));
const dataDirArg = argv.find(a => a.startsWith('--data-dir='));
// Default behavior: Web UI enabled unless explicitly disabled
if (noWeb || process.env.QUICKMCP_ENABLE_WEB === '0' || process.env.QUICKMCP_DISABLE_WEB === '1') {
  process.env.QUICKMCP_ENABLE_WEB = '0';
} else if (wantsWeb || process.env.QUICKMCP_ENABLE_WEB === '1' || process.env.QUICKMCP_ENABLE_WEB === undefined) {
  process.env.QUICKMCP_ENABLE_WEB = '1';
}
if (portArg) {
  const val = portArg.split('=')[1];
  if (val) process.env.PORT = val;
}
if (dataDirArg) {
  const val = dataDirArg.split('=')[1];
  if (val) process.env.QUICKMCP_DATA_DIR = val;
}

// Create SQLite manager
const sqliteManager = new SQLiteManager();

// Optionally start the Web UI (Express) like `npm run dev`
// Enable by setting QUICKMCP_ENABLE_WEB=1 (and optionally PORT, QUICKMCP_DATA_DIR)
if (process.env.QUICKMCP_ENABLE_WEB === '1') {
  try {
    console.error('[QuickMCP] QUICKMCP_ENABLE_WEB=1 -> starting Web UI server...');
    // Ensure we run from a writable directory when invoked via npx (CWD may be '/')
    const canWrite = (dir) => {
      try { fs.accessSync(dir, fs.constants.W_OK); return true; } catch { return false; }
    };
    let runDir = process.cwd();
    if (runDir === '/' || !canWrite(runDir)) {
      const home = os.homedir() || os.tmpdir();
      runDir = path.join(home, '.quickmcp');
      try { fs.mkdirSync(runDir, { recursive: true }); } catch {}
      try { process.chdir(runDir); } catch {}
    }
    // Prepare uploads directory and expose as env for newer builds
    const uploadsDir = path.join(runDir, 'uploads');
    try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
    if (!process.env.QUICKMCP_UPLOAD_DIR) process.env.QUICKMCP_UPLOAD_DIR = uploadsDir;
    
    // Determine preferred port and acquire a simple lock so only one process owns the UI for that port
    const preferredPort = parseInt(process.env.PORT || '3000', 10);
    const lockPath = path.join(runDir, `ui-${preferredPort}.lock`);
    let hasLock = false;
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.closeSync(fd);
      hasLock = true;
      const cleanup = () => { try { fs.unlinkSync(lockPath); } catch {} };
      process.once('exit', cleanup);
      process.once('SIGINT', () => { cleanup(); process.exit(0); });
      process.once('SIGTERM', () => { cleanup(); process.exit(0); });
    } catch (e) {
      if (e && e.code !== 'EEXIST') {
        console.error('[QuickMCP] UI lock error (continuing without UI):', e.message || e);
      }
      // Another process holds the UI lock; skip starting UI in this process
    }

    if (!hasLock) {
      return; // do not try to start UI
    }

    // Only start Web UI if preferred port is actually free.
    const probe = net.createServer();
    probe.once('error', (err) => {
      if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) {
        // Port is busy or not permitted; skip starting Web UI to avoid crashing Claude session
        try { fs.unlinkSync(lockPath); } catch {}
        return;
      }
      // For other errors, still try starting server; better to attempt than silently skip for unknown cases
      safeStartWebServer();
    });
    probe.once('listening', () => {
      probe.close(() => {
        safeStartWebServer();
      });
    });
    try {
      // Probe on IPv6 unspecified to mirror Express default, falling back to IPv4 if needed
      probe.listen(preferredPort, '::');
    } catch (_e) {
      // If probing throws synchronously (rare), just skip UI
    }
  } catch (e) {
    console.error('[QuickMCP] Failed to start Web UI:', e && e.message);
  }
}

// Start the web server but swallow a race-condition EADDRINUSE from Express listen
function safeStartWebServer() {
  let handled = false;
  const handler = (err) => {
    if (!handled && err && err.code === 'EADDRINUSE' && err.syscall === 'listen') {
      handled = true;
      // Swallow this once so the STDIO server keeps running; another instance already owns :3000
      process.removeListener('uncaughtException', handler);
      return;
    }
    // Not our case; restore default behavior
    process.removeListener('uncaughtException', handler);
    throw err;
  };
  // Install one-time handler to catch immediate async throw from Express
  process.prependOnceListener('uncaughtException', handler);
  try {
    require('./dist/web/server.js');
  } catch (e) {
    // Synchronous load error
    process.removeListener('uncaughtException', handler);
    console.error('[QuickMCP] Failed to start Web UI:', e && e.message);
  }
  // Remove handler on next tick if nothing happened, to avoid swallowing unrelated errors later
  setImmediate(() => {
    if (!handled) {
      process.removeListener('uncaughtException', handler);
    }
  });
}

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

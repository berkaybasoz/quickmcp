#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');
const dotenv = require('dotenv');

// Load .env from script directory first (works with Claude Desktop custom CWD),
// then fallback to process CWD.
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

let logger;
try {
  ({ logger } = require('./dist/utils/logger.js'));
} catch (_) {
  logger = {
    trace: (...args) => console.error(...args),
    debug: (...args) => console.error(...args),
    info: (...args) => console.error(...args),
    warn: (...args) => console.error(...args),
    error: (...args) => console.error(...args)
  };
}

// Secure default for direct-stdio: if caller does not provide auth/deploy mode,
// enforce ONPREM semantics (AUTH_MODE=LITE) so MCP token checks are active.
if (!process.env.AUTH_MODE && !process.env.DEPLOY_MODE) {
  process.env.DEPLOY_MODE = 'ONPREM';
  logger.error('[QuickMCP] AUTH_MODE/DEPLOY_MODE not provided, defaulting DEPLOY_MODE=ONPREM (AUTH_MODE=LITE)');
}

// Use the current working directory provided by the caller.
// Do not change directories; keep paths relative to this script.

let safeCreateDataStore;
try {
  ({ safeCreateDataStore } = require('./dist/database/database-utils.js'));
} catch (_) {
  throw new Error('[QuickMCP] Missing dist/database/database-utils.js. Run `npm run build` before starting quickmcp-direct-stdio.js');
}

let resolveAuthMode;
try {
  ({ resolveAuthMode } = require('./dist/config/auth-config.js'));
} catch (_) {
  throw new Error('[QuickMCP] Missing dist/config/auth-config.js. Run `npm run build` before starting quickmcp-direct-stdio.js');
}

let DynamicMCPExecutor;
try {
  ({ DynamicMCPExecutor } = require('./dist/server/dynamic-mcp-executor.js'));
} catch (_) {
  throw new Error('[QuickMCP] Missing dist/server/dynamic-mcp-executor.js. Run `npm run build` before starting quickmcp-direct-stdio.js');
}

let McpCoreService;
try {
  ({ McpCoreService } = require('./dist/mcp-core/McpCoreService.js'));
} catch (_) {
  throw new Error('[QuickMCP] Missing dist/mcp-core/McpCoreService.js. Run `npm run build` before starting quickmcp-direct-stdio.js');
}

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

const dataStore = safeCreateDataStore({ logger: (...args) => logger.error(...args) });
const executor = new DynamicMCPExecutor();

const mcpAuthMode = resolveAuthMode();
const mcpTokenSecret = process.env.QUICKMCP_TOKEN_SECRET || process.env.AUTH_COOKIE_SECRET || 'change-me';
const mcpToken = (process.env.QUICKMCP_TOKEN || '').trim();
let startupAuthError = null;
let mcpCore;
try {
  mcpCore = new McpCoreService({
    executor,
    authStore: dataStore,
    authMode: mcpAuthMode,
    tokenSecret: mcpTokenSecret,
    defaultToken: mcpToken
  });
} catch (error) {
  startupAuthError = error && error.message ? String(error.message) : 'Invalid MCP token';
  mcpCore = new McpCoreService({
    executor,
    authStore: dataStore,
    authMode: mcpAuthMode,
    tokenSecret: mcpTokenSecret,
    defaultToken: ''
  });
}

logger.error(`[QuickMCP] MCP auth mode: ${mcpAuthMode}`);
logger.error(`[QuickMCP] MCP token present: ${mcpToken ? 'yes' : 'no'}`);
if (startupAuthError) {
  logger.error('[QuickMCP] Provided MCP token is invalid/revoked/expired for current workspace.');
}

// Optionally start the Web UI (Express) like `npm run dev`
// Enable by setting QUICKMCP_ENABLE_WEB=1 (and optionally PORT, QUICKMCP_DATA_DIR)
if (process.env.QUICKMCP_ENABLE_WEB === '1') {
  try {
    logger.error('[QuickMCP] QUICKMCP_ENABLE_WEB=1 -> starting Web UI server...');
    // Ensure we run from a writable directory when invoked via npx (CWD may be '/')
    const canWrite = (dir) => {
      try { fs.accessSync(dir, fs.constants.W_OK); return true; } catch { return false; }
    };
    let runDir = process.cwd();
    if (runDir === '/' || !canWrite(runDir)) {
      const home = os.homedir() || os.tmpdir();
      runDir = path.join(home, '.quickmcp');
      try { fs.mkdirSync(runDir, { recursive: true }); } catch {}
      // NOTE: Disabled intentionally.
      // Do not change process CWD here; changing CWD causes SQLite/database path drift
      // between different launch modes (dev, npx, stdio).
      // try { process.chdir(runDir); } catch {}
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
        logger.error('[QuickMCP] UI lock error (continuing without UI):', e.message || e);
      }
      // Another process holds the UI lock; skip starting UI in this process
    }

    if (!hasLock) {
      logger.error('[QuickMCP] UI lock held by another process; skipping Web UI in this process');
    } else {
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
    }
  } catch (e) {
    logger.error('[QuickMCP] Failed to start Web UI:', e && e.message);
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
    require('./dist/server/server.js');
  } catch (e) {
    // Synchronous load error
    process.removeListener('uncaughtException', handler);
    logger.error('[QuickMCP] Failed to start Web UI:', e && e.message);
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
  const resolvedDynExec = require.resolve('./dist/server/dynamic-mcp-executor.js');
  const mssql = require('mssql');
  const mssqlVersion = require('mssql/package.json').version;
  logger.error('[QuickMCP] Node:', process.version);
  logger.error('[QuickMCP] CWD:', process.cwd());
  logger.error('[QuickMCP] Dynamic executor path:', resolvedDynExec);
  logger.error('[QuickMCP] mssql version:', mssqlVersion);
  logger.error('[QuickMCP] mssql exports:', {
    hasDefault: !!mssql.default,
    hasConnect: typeof mssql.connect,
    typeofConnectionPool: typeof (mssql.ConnectionPool),
    keys: Object.keys(mssql).slice(0, 10)
  });
} catch (e) {
  logger.error('[QuickMCP] Diagnostic init error:', e && e.message);
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
    logger.error('[QuickMCP] Failed to send message:', e && e.message);
  }
}

async function handleMessage(message) {
  logger.error(`[QuickMCP] Received: ${message.method} (id: ${message.id})`);

  if (startupAuthError && message.method !== 'initialize' && message.method !== 'notifications/initialized') {
    const authErrorResponse = {
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32001,
        message: startupAuthError
      }
    };
    logger.error('[QuickMCP] Sending: auth-error');
    sendMessage(authErrorResponse);
    return;
  }

  try {
    let authContext;
    try {
      authContext = await mcpCore.resolveAuthContextFromSources({});
    } catch (authError) {
      logger.error('[QuickMCP] Failed to resolve auth context:', authError && authError.message ? authError.message : String(authError));
      authContext = { identity: null, tokenRecord: null };
    }
    const response = await mcpCore.processJsonRpcMessage(message, authContext);
    if (response) {
      logger.error(`[QuickMCP] Sending: ${response.result ? 'success' : 'error'}`);
      sendMessage(response);
    }
  } catch (error) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32603,
        message: `Internal error: ${error && error.message ? error.message : 'Unknown error'}`
      }
    };
    logger.error('[QuickMCP] Sending: error');
    sendMessage(errorResponse);
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
        logger.error('[QuickMCP] Invalid header, dropping bytes');
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
          logger.error('[QuickMCP] Detected LSP framing (Content-Length)');
        }
        const message = JSON.parse(body);
        await handleMessage(message);
      } catch (e) {
        logger.error('[QuickMCP] Error parsing framed JSON:', e && e.message);
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
      logger.error('[QuickMCP] Detected newline-delimited JSON framing');
    }
    for (const msg of messages) {
      try {
        await handleMessage(msg);
      } catch (e) {
        logger.error('[QuickMCP] Error handling message:', e && e.message);
      }
    }
    stdinBuffer = Buffer.from(str.slice(consumed), 'utf8');
  }
});

process.stdin.on('end', () => {
  logger.error('[QuickMCP] STDIN ended');
  try { executor.close && executor.close(); } catch (_) {}
  try { dataStore.close && dataStore.close(); } catch (_) {}
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.error('[QuickMCP] Interrupted');
  try { executor.close && executor.close(); } catch (_) {}
  try { dataStore.close && dataStore.close(); } catch (_) {}
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.error('[QuickMCP] Terminated');
  try { executor.close && executor.close(); } catch (_) {}
  try { dataStore.close && dataStore.close(); } catch (_) {}
  process.exit(0);
});

process.stdin.resume();
logger.error('QuickMCP Direct STDIO Server started...');

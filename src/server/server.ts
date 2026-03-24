import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { existsSync } from 'fs';
import { DataSourceParser } from '../parsers';
import { MCPServerGenerator } from '../generators/MCPServerGenerator';
import { MCPTestRunner } from '../client/MCPTestRunner';
import {
  MCPServerConfig,
  ParsedData,
} from '../types';
import { fork } from 'child_process';
import { IntegratedMCPServer } from '../integrated-mcp-server-new';
import { createDataStore, getDataProvider } from '../database/factory';
import { IDataStore } from '../database/datastore';
import { AuthMode, getAuthAccessTtlSeconds, parseAuthAdminUsers, getAuthCookieSecret, getAuthDefaultUsername, getAuthRefreshTtlSeconds, resolveAuthMode, validateAuthDataProviderCompatibility } from '../config/auth-config';
import { AUTH_COOKIE_NAMES, isSecureCookieEnv, verifyAccessToken } from '../auth/token-utils';
import { getRsaPublicKey } from '../auth/jwks-provider';
import { AppUserRole, AuthUtils } from '../auth/auth-utils';
import { ConfigApi } from './api/configApi';
import { AuthApi } from './api/authApi';
import { HealthApi } from './api/healthApi';
import { DirectoryApi } from './api/directoryApi';
import { ParseApi } from './api/parseApi';
import { GenerateApi } from './api/generateApi';
import { ServerApi } from './api/serverApi';
import { NameApi } from './api/nameApi';
import { DatabaseApi } from './api/databaseApi';
import { McpApi } from './api/mcpApi';
import { IndexApi } from './api/indexApi';
import { LogsApi } from './api/logsApi';
import { AskApi } from './api/askApi';
import { PreferenceApi } from './api/preferenceApi';
import { FaviconApi } from './api/faviconApi';
import { PortUtils } from './port-utils';
import { getAuthProperty } from './api/authProperty';
import { logger } from '../utils/logger';
import { resolveAppVersion } from '../utils/version-util';
import { DynamicMCPExecutor } from './dynamic-mcp-executor';
import { McpCoreService, McpAuthContext } from '../mcp-core/McpCoreService';
const app = express();
type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;
type AuthenticatedRequest = Request & { authUser?: string; authWorkspace?: string; authRole?: AppUserRole };

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enforce a single canonical host in production so OAuth token binding
// and MCP requests use the same origin (www vs non-www drift breaks bearer attach).
const configuredAppBaseUrl = (process.env.APP_BASE_URL || '').trim();
const redirectSkipDomainSuffix = String(process.env.QUICKMCP_REDIRECT_SKIP_DOMAIN_SUFFIX || '').trim().toLowerCase();
let canonicalHost = '';
let canonicalProto = 'https';
try {
  if (configuredAppBaseUrl) {
    const u = new URL(configuredAppBaseUrl);
    canonicalHost = u.host.toLowerCase();
    canonicalProto = (u.protocol || 'https:').replace(':', '');
  }
} catch {}

const ALLOWED_ORIGINS = [
  'https://chatgpt.com',
  'https://chat.openai.com',
  'https://claude.ai',
  ...(configuredAppBaseUrl ? [configuredAppBaseUrl.replace(/\/+$/, '')] : [])
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o + '/'))) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'MCP-Protocol-Version', 'x-mcp-token'],
  exposedHeaders: ['WWW-Authenticate'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
}));

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!canonicalHost) return next();
  const host = String(req.headers.host || '').toLowerCase();
  const isLocal = host.startsWith('localhost:') || host.startsWith('127.0.0.1:');
  const shouldSkipBySuffix = redirectSkipDomainSuffix ? host.endsWith(redirectSkipDomainSuffix) : false;
  if (shouldSkipBySuffix) return next();
  if (!host || isLocal || host === canonicalHost) return next();

  const target = `${canonicalProto}://${canonicalHost}${req.originalUrl || req.url}`;
  res.redirect(308, target);
});

const dataProvider = getDataProvider();
const deployMode = String(process.env.DEPLOY_MODE || 'ONPREM').trim().toUpperCase();
const authMode = resolveAuthMode();
const authCookieSecret = getAuthCookieSecret();
const authDefaultUsername = getAuthDefaultUsername();
const authAdminUsers = parseAuthAdminUsers();
const authAccessTtlSec = getAuthAccessTtlSeconds();
const authRefreshTtlSec = getAuthRefreshTtlSeconds();
const authProperty = getAuthProperty(process.env);

validateAuthDataProviderCompatibility(dataProvider, authMode);

const cookieSecure = isSecureCookieEnv(process.env.NODE_ENV);
const accessCookieName = AUTH_COOKIE_NAMES.access;
const refreshCookieName = AUTH_COOKIE_NAMES.refresh;

const parser = new DataSourceParser();
// Lazily initialize heavy/native-backed services to avoid startup failure
let generator: MCPServerGenerator | null = null;
let dataStore: IDataStore | null = null;
const testRunner = new MCPTestRunner();
// Store generated servers in memory (in production, use a database)
const generatedServers = new Map<string, {
  config: MCPServerConfig;
  serverPath: string;
  parsedData: ParsedData[];
  runtimeProcess?: any;
  runtimePort?: number;
}>();

function ensureGenerator(): MCPServerGenerator {
  if (!generator) {
    generator = new MCPServerGenerator();
  }
  return generator;
}

function ensureDataStore(): IDataStore {
  if (!dataStore) {
    dataStore = createDataStore();
  }
  return dataStore;
}

function resolveSpaDistDir(currentDir: string): string | null {
  const candidates = [
    path.join(process.cwd(), 'web-spa', 'dist'),
    path.join(process.cwd(), 'dist', 'web-spa', 'dist'),
    path.join(currentDir, '..', '..', 'web-spa', 'dist'),
    path.join(currentDir, '..', '..', '..', 'web-spa', 'dist'),
    path.join('/var', 'task', 'web-spa', 'dist'),
    path.join('/var', 'task', 'user', 'web-spa', 'dist')
  ];

  for (const dir of candidates) {
    if (existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }

  return null;
}

const authUtils = new AuthUtils({
  authMode,
  authDefaultUsername,
  authCookieSecret,
  authAccessTtlSec,
  authRefreshTtlSec,
  accessCookieName,
  refreshCookieName,
  authAdminUsers,
  cookieSecure,
  ensureDataStore
});
const normalizeUsername = authUtils.normalizeUsername.bind(authUtils);
const hashPassword = authUtils.hashPassword.bind(authUtils);
const verifyPassword = authUtils.verifyPassword.bind(authUtils);
const createMcpToken = authUtils.createMcpToken.bind(authUtils);
const getUserRole = authUtils.getUserRole.bind(authUtils);
const parseCookies = authUtils.parseCookies.bind(authUtils);
const setCookie = authUtils.setCookie.bind(authUtils);
const clearCookie = authUtils.clearCookie.bind(authUtils);
const seedLiteAdminsAsync = authUtils.seedLiteAdminsAsync.bind(authUtils);
const getEffectiveUsername = authUtils.getEffectiveUsername.bind(authUtils);
const publicDir = authUtils.resolvePublicDir(__dirname);
const spaDistDir = resolveSpaDistDir(__dirname);
const spaIndexFile = spaDistDir ? path.join(spaDistDir, 'index.html') : null;
const applyNoneModeAuth = authUtils.applyNoneModeAuth.bind(authUtils);
const isNoneMode = authUtils.isNoneMode.bind(authUtils);
const buildServerId = authUtils.buildServerId.bind(authUtils);
const isPublicPath = authUtils.isPublicPath.bind(authUtils);
const getAuthenticatedUser = authUtils.getAuthenticatedUser.bind(authUtils);
const resolveAuthContext = authUtils.resolveAuthContextAsync.bind(authUtils);
const requireAdminApi = authUtils.requireAdminApiAsync.bind(authUtils);
const applyAuthenticatedRequestContextAsync = authUtils.applyAuthenticatedRequestContextAsync.bind(authUtils);
const healthApi = new HealthApi();
const directoryApi = new DirectoryApi();
const parseApi = new ParseApi(parser);
const generateApi = new GenerateApi({
  parser,
  ensureGenerator,
  ensureDataStore,
  getEffectiveUsername,
  buildServerId
});
const serverApi = new ServerApi({
  ensureGenerator,
  ensureDataStore,
  getEffectiveUsername,
  generatedServers,
  startRuntimeMCPServer,
  publicDir,
  spaIndexFile
});
const nameApi = new NameApi({
  ensureDataStore,
  getEffectiveUsername
});
const databaseApi = new DatabaseApi({ publicDir });
const mcpApi = new McpApi({ generatedServers });
const indexApi = new IndexApi({
  publicDir,
  spaIndexFile,
  authMode,
  resolveAuthContext
});
const authApi = new AuthApi({
  deployMode,
  authMode,
  authAdminUsers,
  authCookieSecret,
  authAccessTtlSec,
  authRefreshTtlSec,
  accessCookieName,
  refreshCookieName,
  publicDir,
  spaIndexFile,
  resolveAuthContext,
  requireAdminApi,
  ensureDataStore,
  normalizeUsername,
  createMcpToken,
  hashPassword,
  verifyPassword,
  getUserRole,
  parseCookies,
  setCookie,
  clearCookie,
  getAuthenticatedUser,
  getAuthProperty: () => authProperty
});
const logsApi = new LogsApi(ensureDataStore());
const askApi = new AskApi({
  ensureDataStore,
  resolveAuthContext,
  deployMode
});
const preferenceApi = new PreferenceApi({
  ensureDataStore,
  resolveAuthContext
});
const faviconApi = new FaviconApi({ publicDir });
const portUtils = new PortUtils(process.env);
const { port: PORT, mcpPort: MCP_PORT } = portUtils.resolveServerPorts();
const configApi = new ConfigApi(authMode, authProperty.providerUrl, MCP_PORT);

const mcpCore = new McpCoreService({
  executor: new DynamicMCPExecutor(),
  authStore: ensureDataStore(),
  authMode,
  deployMode,
  tokenSecret: process.env.QUICKMCP_TOKEN_SECRET || process.env.AUTH_COOKIE_SECRET || 'change-me',
  defaultToken: (process.env.QUICKMCP_TOKEN || '').trim(),
  rsaPublicKey: getRsaPublicKey()
});

function parseCookieHeader(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  return raw.split(';').reduce((acc, part) => {
    const [name, ...rest] = part.trim().split('=');
    if (!name) return acc;
    acc[name] = decodeURIComponent(rest.join('=') || '');
    return acc;
  }, {} as Record<string, string>);
}

function truncateForLog(input: string, maxLen = 4000): string {
  if (input.length <= maxLen) return input;
  return `${input.slice(0, maxLen)}...[truncated:${input.length - maxLen}]`;
}

function safeStringifyForLog(value: unknown): string {
  try {
    return truncateForLog(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function buildCookieFallbackAuthContext(req: Request): McpAuthContext | null {
  const cookies = parseCookieHeader(String(req.headers.cookie || ''));
  const access = String(cookies[AUTH_COOKIE_NAMES.access] || '').trim();
  if (!access) return null;
  const payload = verifyAccessToken(access, authCookieSecret);
  if (!payload?.sub) return null;

  const username = String(payload.sub);
  const workspace = String(payload.ws || payload.sub);
  const role = String(payload.role || 'user');
  return {
    identity: {
      tokenId: 'cookie-session',
      username,
      workspace,
      role
    },
    tokenRecord: {
      id: 'cookie-session',
      tokenName: 'cookie-session',
      workspaceId: workspace,
      subjectUsername: username,
      allowAllServers: true,
      allowAllTools: true,
      allowAllResources: true,
      serverIds: [],
      allowedTools: [],
      allowedResources: [],
      serverRules: {},
      toolRules: {},
      resourceRules: {},
      neverExpires: true,
      expiresAt: null,
      revokedAt: null
    }
  };
}

async function resolveMcpAuthContext(req: Request): Promise<McpAuthContext> {
  logger.info(
    `[MCP] transport host=${String(req.headers.host || '')} ua=${String(req.headers['user-agent'] || '').slice(0, 80)} cookie=${req.headers.cookie ? '1' : '0'}`
  );
  const mcpAuth = await mcpCore.resolveAuthContextFromSources({
    authorization: String(req.headers.authorization || ''),
    xMcpToken: String(req.headers['x-mcp-token'] || ''),
    queryToken: String(req.query.token || req.query.access_token || ''),
    bodyToken: String((req.body as any)?.token || (req.body as any)?.access_token || (req.body as any)?.params?.access_token || '')
  });
  if (mcpAuth.identity) return mcpAuth;
  if (authMode === 'NONE') return mcpAuth;
  const cookieFallback = buildCookieFallbackAuthContext(req);
  return cookieFallback || mcpAuth;
}

function buildMcpWwwAuthenticate(req: Request): string {
  const configuredBase = String(authProperty.appBaseUrl || '').trim().replace(/\/+$/, '');
  const host = String(req.headers.host || '').trim();
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const runtimeBase = host ? `${proto}://${host}` : '';
  const base = configuredBase || runtimeBase;
  const normalizedBase = base.replace(/\/+$/, '');
  const metadataUrl = `${normalizedBase}/mcp/.well-known/oauth-protected-resource`;
  const resource = `${normalizedBase}/mcp`;
  return `Bearer resource_metadata="${metadataUrl}", resource="${resource}", scope="mcp", error="insufficient_scope", error_description="You need to login to continue"`;
}

function sendMcpAuthRequired(
  res: Response,
  id: string | number | null,
  challenge: string,
  text: string
): void {
  logger.info(`[MCP] auth challenge jsonrpc_id=${String(id)} www-authenticate=${challenge}`);
  res.setHeader('WWW-Authenticate', challenge);
  res.status(401).json({
    jsonrpc: '2.0',
    id,
    result: {
      content: [{ type: 'text', text }],
      _meta: { 'mcp/www_authenticate': [challenge] },
      isError: true
    }
  });
}

function isMcpAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = String(error.message || '').toLowerCase();
  return msg.includes('unauthorized')
    || msg.includes('invalid mcp token')
    || msg.includes('bearer token required')
    || msg.includes('insufficient_scope');
}

async function handleMcpJsonRpc(req: Request, res: Response): Promise<void> {
  try {
    const bodyPreview = Buffer.isBuffer(req.body)
      ? truncateForLog(req.body.toString('utf8'))
      : safeStringifyForLog(req.body);
    logger.info(`[MCP] debug headers=${safeStringifyForLog(req.headers)}`);
    logger.info(`[MCP] debug body=${bodyPreview}`);

    // Detect empty probe (no JSON-RPC body — typically Python aiohttp after OAuth)
    const isEmptyProbe = !req.body
      || (typeof req.body === 'object' && !Buffer.isBuffer(req.body) && Object.keys(req.body as object).length === 0);

    if (isEmptyProbe && authMode !== 'NONE') {
      const challenge = buildMcpWwwAuthenticate(req);
      const authContext = await resolveMcpAuthContext(req);
      if (!authContext.identity) {
        logger.info(`[MCP] probe: no token → 401 challenge www-authenticate=${challenge}`);
        res.setHeader('WWW-Authenticate', challenge);
        res.status(401).end();
        return;
      }
      logger.info(`[MCP] probe: authenticated user=${authContext.identity.username}`);
      res.status(200).json({ status: 'ok' });
      return;
    }

    const message = mcpCore.parseIncomingMessage(req.body);
    const authContext = await resolveMcpAuthContext(req);
    const method = String((message as any)?.method || '');
    
    const protectedMethods = new Set([
      'tools/call',
      'resources/read',
      'prompts/get'
    ]);

    if (authMode !== 'NONE' && !authContext.identity && protectedMethods.has(method)) {
      const challenge = buildMcpWwwAuthenticate(req);
      sendMcpAuthRequired(
        res,
        (message as any)?.id ?? null,
        challenge,
        'Authentication required: no access token provided.'
      );
      return;
    }

    let response: any | null = null;
    try {
      response = await mcpCore.processJsonRpcMessage(message, authContext);
    } catch (error) {
      if (authMode !== 'NONE' && isMcpAuthError(error)) {
        const challenge = buildMcpWwwAuthenticate(req);
        sendMcpAuthRequired(
          res,
          (message as any)?.id ?? null,
          challenge,
          'Authentication required: no access token provided.'
        );
        return;
      }
      throw error;
    }
    if (!response) {
      res.status(204).end();
      return;
    }
    const protocolVersion = String((message as any)?.params?.protocolVersion || '2025-11-25');
    res.setHeader('mcp-protocol-version', protocolVersion);
    res.setHeader('x-quickmcp-random-no', randomUUID());

    res.json(response);
  } catch (error) {
    logger.error('[MCP] /mcp request failed', error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: (req.body as any)?.id ?? null,
      error: {
        code: -32603,
        message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    });
  }
}
async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  if (isNoneMode()) {
    applyNoneModeAuth(req);
    next();
    return;
  }

  if (isPublicPath(req.path)) {
    next();
    return;
  }

  if (!await applyAuthenticatedRequestContextAsync(req, res)) {
    return;
  }
  next();
}

function startRuntimeMCPServer(serverId: string, serverPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const serverInfo = generatedServers.get(serverId);
    if (!serverInfo) {
      reject(new Error('Server not found'));
      return;
    }

    // Kill existing process if running
    if (serverInfo.runtimeProcess) {
      serverInfo.runtimeProcess.kill();
    }

    const port = portUtils.getNextPort();
    const serverDir = path.dirname(serverPath);

    //console.log(`Starting runtime MCP server for ${serverId} on port ${port}`);

    // Fork the MCP server process
    const mcpProcess = fork(serverPath, [], {
      cwd: serverDir,
      env: {
        ...process.env,
        MCP_PORT: port.toString()
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    mcpProcess.on('message', (message) => {
      if (message === 'ready') {
        //console.log(`MCP Server ${serverId} ready on port ${port}`);
        resolve(port);
      }
    });

    mcpProcess.on('error', (error) => {
      logger.error(`MCP Server ${serverId} error:`, error);
      reject(error);
    });

    mcpProcess.on('exit', (code) => {
      //console.log(`MCP Server ${serverId} exited with code ${code}`);
      if (serverInfo.runtimeProcess === mcpProcess) {
        serverInfo.runtimeProcess = undefined;
        serverInfo.runtimePort = undefined;
      }
    });

    // Update server info
    serverInfo.runtimeProcess = mcpProcess;
    serverInfo.runtimePort = port;

    // Fallback timeout
    setTimeout(() => {
      if (serverInfo.runtimePort === port) {
        resolve(port);
      }
    }, 3000);
  });
}

seedLiteAdminsAsync().catch((error) => {
  logger.error('Failed to seed admin users:', error);
});

app.use((req, res, next) => {
  authMiddleware(req as AuthenticatedRequest, res, next).catch(next);
});
faviconApi.registerRoutes(app);
app.use(express.static(publicDir, { index: false }));
if (spaDistDir && spaIndexFile) {
  app.use(express.static(spaDistDir, { index: false }));
}

configApi.registerRoutes(app);
healthApi.registerRoutes(app);
directoryApi.registerRoutes(app);
parseApi.registerRoutes(app);
generateApi.registerRoutes(app);
serverApi.registerRoutes(app);
nameApi.registerRoutes(app);
databaseApi.registerRoutes(app);
mcpApi.registerRoutes(app);
authApi.registerRoutes(app);
logsApi.registerRoutes(app);
askApi.registerRoutes(app);
preferenceApi.registerRoutes(app);

// Serverless/Vercel path: expose integrated MCP HTTP transport directly on the main app.
app.get('/mcp', (req, res) => {
  if (authMode !== 'NONE') {
    const challenge = buildMcpWwwAuthenticate(req);
    res.setHeader('WWW-Authenticate', challenge);
    res.status(401).end();
    return;
  }
  res.status(200).json({ ok: true, transport: 'streamable-http', endpoint: '/mcp' });
});
app.post('/mcp', (req, res) => {
  handleMcpJsonRpc(req, res).catch((error) => {
    logger.error('[MCP] /mcp unhandled error', error);
    res.status(500).json({ error: 'Internal error' });
  });
});
app.delete('/mcp', (_req, res) => {
  res.status(204).end();
});
indexApi.registerRoutes(app);

export function startServer(): void {
  console.error('[quickmcp] startup config');
  console.error(`[quickmcp] APP_VERSION=${resolveAppVersion()}`);
  console.error(`[quickmcp] DEPLOY_MODE=${process.env.DEPLOY_MODE || '(unset)'}`);
  console.error(`[quickmcp] AUTH_MODE=${authMode}`);
  console.error(`[quickmcp] DATA_PROVIDER=${dataProvider}`);
  if (authMode === 'SUPABASE_GOOGLE') {
    console.error(`[quickmcp] SUPABASE_URL=${authProperty.providerUrl || '(unset)'}`);
    console.error(`[quickmcp] SUPABASE_ANON_KEY=${authProperty.publicKey ? '(set)' : '(unset)'}`);
    console.error(`[quickmcp] APP_BASE_URL=${authProperty.appBaseUrl}`);
  }
  console.error(`[quickmcp] PORT=${PORT}`);
  console.error(`[quickmcp] MCP_PORT=${MCP_PORT}`);

  // Initialize integrated MCP server (optional in environments without native deps)
  let integratedMCPServer: IntegratedMCPServer | null = null;
  try {
    integratedMCPServer = new IntegratedMCPServer();
  } catch (error) {
    logger.error('⚠️ Skipping IntegratedMCPServer initialization:', error instanceof Error ? error.message : error);
  }

  app.listen(PORT, async () => {
    if (integratedMCPServer) {
      try {
        await integratedMCPServer.start(MCP_PORT);
      } catch (error) {
        logger.error('❌ Failed to start integrated MCP server:', error);
      }
    }
  });
}

export default app;

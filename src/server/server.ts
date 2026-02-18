import express from 'express';
import cors from 'cors';
import path from 'path';
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
import { PortUtils } from './port-utils';
import { getAuthProperty } from './api/authProperty';

const app = express();
type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;
type AuthenticatedRequest = Request & { authUser?: string; authWorkspace?: string; authRole?: AppUserRole };

app.use(cors());
app.use(express.json());

const dataProvider = getDataProvider();
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
const applyNoneModeAuth = authUtils.applyNoneModeAuth.bind(authUtils);
const isNoneMode = authUtils.isNoneMode.bind(authUtils);
const buildServerId = authUtils.buildServerId.bind(authUtils);
const isPublicPath = authUtils.isPublicPath.bind(authUtils);
const getAuthenticatedUser = authUtils.getAuthenticatedUser.bind(authUtils);
const resolveAuthContext = authUtils.resolveAuthContext.bind(authUtils);
const requireAdminApi = authUtils.requireAdminApi.bind(authUtils);
const applyAuthenticatedRequestContextAsync = authUtils.applyAuthenticatedRequestContextAsync.bind(authUtils);
const configApi = new ConfigApi(authMode, authProperty.providerUrl);
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
  publicDir
});
const nameApi = new NameApi({
  ensureDataStore,
  getEffectiveUsername
});
const databaseApi = new DatabaseApi({ publicDir });
const mcpApi = new McpApi({ generatedServers });
const indexApi = new IndexApi({ publicDir });
const authApi = new AuthApi({
  authMode,
  authAdminUsers,
  authCookieSecret,
  authAccessTtlSec,
  authRefreshTtlSec,
  accessCookieName,
  refreshCookieName,
  publicDir,
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
const portUtils = new PortUtils(process.env);

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
      console.error(`MCP Server ${serverId} error:`, error);
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
  console.error('Failed to seed admin users:', error);
});

app.use((req, res, next) => {
  authMiddleware(req as AuthenticatedRequest, res, next).catch(next);
});
app.use(express.static(publicDir));

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
indexApi.registerRoutes(app);

const { port: PORT, mcpPort: MCP_PORT } = portUtils.resolveServerPorts();

export function startServer(): void {
  console.log('[quickmcp] startup config');
  console.log(`[quickmcp] DEPLOY_MODE=${process.env.DEPLOY_MODE || '(unset)'}`);
  console.log(`[quickmcp] AUTH_MODE=${authMode}`);
  console.log(`[quickmcp] DATA_PROVIDER=${dataProvider}`);
  if (authMode === 'SUPABASE_GOOGLE') {
    console.log(`[quickmcp] SUPABASE_URL=${authProperty.providerUrl || '(unset)'}`);
    console.log(`[quickmcp] SUPABASE_ANON_KEY=${authProperty.publicKey ? '(set)' : '(unset)'}`);
    console.log(`[quickmcp] APP_BASE_URL=${authProperty.appBaseUrl}`);
  }
  console.log(`[quickmcp] PORT=${PORT}`);
  console.log(`[quickmcp] MCP_PORT=${MCP_PORT}`);

  // Initialize integrated MCP server (optional in environments without native deps)
  let integratedMCPServer: IntegratedMCPServer | null = null;
  try {
    integratedMCPServer = new IntegratedMCPServer();
  } catch (error) {
    console.error('⚠️ Skipping IntegratedMCPServer initialization:', error instanceof Error ? error.message : error);
  }

  app.listen(PORT, async () => {
    if (integratedMCPServer) {
      try {
        await integratedMCPServer.start(MCP_PORT);
      } catch (error) {
        console.error('❌ Failed to start integrated MCP server:', error);
      }
    }
  });
}

export default app;

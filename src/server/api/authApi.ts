import express from 'express';
import path from 'path';
import { AppUserRole, AuthContext, CreateMcpTokenResult } from '../../auth/auth-utils';
import { AuthMode, LiteAdminUser } from '../../config/auth-config';
import { IDataStore, McpTokenPolicyScope } from '../../database/datastore';
import { createAccessToken, createRefreshToken, hashRefreshToken } from '../../auth/token-utils';
import { AuthProperty } from './authProperty';

type AuthenticatedRequest = express.Request & { authUser?: string; authWorkspace?: string; authRole?: AppUserRole };

interface AuthApiDeps {
  authMode: AuthMode;
  authAdminUsers: LiteAdminUser[];
  authCookieSecret: string;
  authAccessTtlSec: number;
  authRefreshTtlSec: number;
  accessCookieName: string;
  refreshCookieName: string;
  publicDir: string;
  resolveAuthContext: (req: AuthenticatedRequest, res?: express.Response) => AuthContext | null;
  requireAdminApi: (req: AuthenticatedRequest, res: express.Response) => AuthContext | null;
  ensureDataStore: () => IDataStore;
  normalizeUsername: (value: unknown) => string;
  createMcpToken: (username: string, workspaceId: string, role: AppUserRole, ttlSec?: number) => CreateMcpTokenResult;
  hashPassword: (password: string) => string;
  verifyPassword: (password: string, expectedHash: string) => boolean;
  getUserRole: (username: string, workspaceId?: string) => AppUserRole;
  parseCookies: (req: express.Request) => Record<string, string>;
  setCookie: (res: express.Response, name: string, value: string, maxAgeSec: number) => void;
  clearCookie: (res: express.Response, name: string) => void;
  getAuthenticatedUser: (req: express.Request) => string | null;
  getAuthProperty: () => AuthProperty;
}

export class AuthApi {
  constructor(private readonly deps: AuthApiDeps) {}

  private resolveAppBaseUrl(req: express.Request): string {
    const configured = this.deps.getAuthProperty().appBaseUrl.trim();
    const host = (req.get('x-forwarded-host') || req.get('host') || '').trim();
    const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').trim();
    const requestOrigin = host ? `${proto}://${host}` : '';

    if (!configured) return requestOrigin;
    if (!requestOrigin) return configured;

    const requestHost = host.toLowerCase();
    const isLocalRequest = requestHost.startsWith('localhost:') || requestHost.startsWith('127.0.0.1:');

    try {
      const configuredHost = new URL(configured).host.toLowerCase();
      if (isLocalRequest && configuredHost !== requestHost) {
        return requestOrigin;
      }
    } catch {
      return requestOrigin;
    }

    return configured;
  }

  private normalizeTriStateRules(raw: any, workspaceId: string, prefix: string): Record<string, boolean | null> {
    const input = raw && typeof raw === 'object' ? raw : {};
    const out: Record<string, boolean | null> = {};
    for (const [key, value] of Object.entries(input)) {
      const id = String(key || '').trim();
      if (!id || !id.startsWith(prefix === 'server' ? `${workspaceId}__` : `${workspaceId}__`)) continue;
      if (value === true || value === 'allow' || value === 'true' || value === 1 || value === '1') out[id] = true;
      else if (value === false || value === 'deny' || value === 'false' || value === -1 || value === '-1') out[id] = false;
      else out[id] = null;
    }
    return out;
  }

  private normalizePolicyMap(
    raw: any,
    kind: 'user' | 'server' | 'tool',
    workspaceId: string,
    usersInWorkspace: Set<string>
  ): Record<string, boolean | null> {
    const input = raw && typeof raw === 'object' ? raw : {};
    const out: Record<string, boolean | null> = {};
    for (const [key, value] of Object.entries(input)) {
      const id = String(key || '').trim();
      if (!id) continue;

      if (kind === 'user' && !usersInWorkspace.has(id)) continue;
      if ((kind === 'server' || kind === 'tool') && !id.startsWith(`${workspaceId}__`)) continue;

      if (value === true || value === 'allow' || value === 'true' || value === 1 || value === '1') out[id] = true;
      else if (value === false || value === 'deny' || value === 'false' || value === 0 || value === '0') out[id] = false;
      else out[id] = null;
    }
    return out;
  }

  private applyPolicyMap(
    store: IDataStore,
    scopeType: McpTokenPolicyScope,
    map: Record<string, boolean | null>
  ): void {
    for (const [id, decision] of Object.entries(map)) {
      store.setMcpTokenPolicy(scopeType, id, decision);
    }
  }

  registerRoutes(app: express.Express): void {
    app.get('/api/auth/me', this.getMe);
    app.get('/api/auth/roles', this.getRoles);
    app.get('/api/auth/users', this.getUsers);

    app.get('/api/authorization/config', this.getAuthorizationConfig);
    app.get('/api/authorization/context', this.getAuthorizationContext);
    app.get('/api/authorization/token-policy', this.getAuthorizationTokenPolicy);
    app.post('/api/authorization/token-policy', this.updateAuthorizationTokenPolicy);
    app.get('/api/authorization/servers', this.getAuthorizationServers);
    app.post('/api/authorization/servers/:id', this.updateAuthorizationServer);
    app.post('/api/authorization/mcp-token', this.createAuthorizationMcpToken);
    app.get('/api/authorization/tokens', this.getAuthorizationTokens);
    app.get('/api/authorization/tokens/:id', this.getAuthorizationTokenById);
    app.delete('/api/authorization/tokens/:id', this.deleteAuthorizationToken);

    app.post('/api/auth/users', this.createUser);
    app.patch('/api/auth/users/:username/role', this.updateUserRole);
    app.post('/api/auth/login', this.login);
    app.get('/api/auth/supabase/start', this.supabaseStart);
    app.post('/api/auth/supabase/session', this.supabaseSession);
    app.post('/api/auth/refresh', this.refresh);
    app.post('/api/auth/logout', this.logout);

    app.get('/login', this.getLoginPage);
    app.get('/users', this.getUsersPage);
    app.get('/authorization', this.getAuthorizationPage);
  }

  private getMe = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    res.json({
      success: true,
      data: {
        username: ctx.username,
        workspaceId: ctx.workspaceId,
        authMode: this.deps.authMode,
        role: ctx.role,
        isAdmin: ctx.role === 'admin'
      }
    });
  };

  private getRoles = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    res.json({
      success: true,
      data: {
        roles: [
          { id: 'admin', name: 'Admin', description: 'Can manage users and all servers.' },
          { id: 'user', name: 'User', description: 'Can use the app and manage own servers.' }
        ],
        currentUser: { username: ctx.username, workspaceId: ctx.workspaceId, role: ctx.role, isAdmin: ctx.role === 'admin' }
      }
    });
  };

  private getUsers = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const actor = this.deps.requireAdminApi(req, res);
    if (!actor) return;
    try {
      const users = this.deps.ensureDataStore().getAllUsersByWorkspace(actor.workspaceId);
      res.json({ success: true, data: { users, requestedBy: actor.username, workspaceId: actor.workspaceId } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to load users' });
    }
  };

  private getAuthorizationConfig = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    res.json({
      success: true,
      data: {
        authMode: this.deps.authMode,
        mcpTokenRequired: this.deps.authMode !== 'NONE',
        username: ctx.username,
        workspaceId: ctx.workspaceId
      }
    });
  };

  private getAuthorizationContext = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const store = this.deps.ensureDataStore();
      const users = (ctx.role === 'admin'
        ? store.getAllUsersByWorkspace(ctx.workspaceId)
        : store.getAllUsersByWorkspace(ctx.workspaceId).filter((u) => u.username === ctx.username)
      ).map((u) => ({ username: u.username, role: u.role }));

      const servers = store.getAllServersByOwner(ctx.workspaceId).map((server) => {
        const tools = store.getToolsForServer(server.id).map((t) => `${server.id}__${t.name}`);
        const resources = store.getResourcesForServer(server.id).map((r) => `${server.id}__${r.name}`);
        const rawType = (server.sourceConfig as any)?.type;
        const type = typeof rawType === 'string' ? rawType : 'unknown';
        return { id: server.id, name: server.name, type, tools, resources };
      });

      res.json({ success: true, data: { workspaceId: ctx.workspaceId, users, servers } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to load authorization context' });
    }
  };

  private getAuthorizationServers = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const store = this.deps.ensureDataStore();
      const servers = store.getAllServersByOwner(ctx.workspaceId);
      const data = servers.map((server) => {
        const cfg = store.getServerAuthConfig(server.id);
        return {
          id: server.id,
          name: server.name,
          ownerUsername: server.ownerUsername,
          requireMcpToken: cfg ? cfg.requireMcpToken : true
        };
      });
      res.json({ success: true, data: { servers: data } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to load authorization settings' });
    }
  };

  private getAuthorizationTokenPolicy = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const actor = this.deps.requireAdminApi(req, res);
    if (!actor) return;

    try {
      const store = this.deps.ensureDataStore();
      const users = store.getAllUsersByWorkspace(actor.workspaceId).map((u) => u.username);
      const servers = store.getAllServersByOwner(actor.workspaceId).map((s) => s.id);
      const tools = servers.flatMap((serverId) => store.getToolsForServer(serverId).map((t) => `${serverId}__${t.name}`));

      const globalPolicy = store.getMcpTokenPolicy('global', '*');
      const userPolicies = store.listMcpTokenPolicies('user');
      const serverPolicies = store.listMcpTokenPolicies('server');
      const toolPolicies = store.listMcpTokenPolicies('tool');

      const userRules: Record<string, boolean | null> = {};
      const serverRules: Record<string, boolean | null> = {};
      const toolRules: Record<string, boolean | null> = {};

      for (const username of users) userRules[username] = null;
      for (const id of servers) serverRules[id] = null;
      for (const id of tools) toolRules[id] = null;

      userPolicies
        .filter((p) => users.includes(p.scopeId))
        .forEach((p) => { userRules[p.scopeId] = p.requireMcpToken; });
      serverPolicies
        .filter((p) => p.scopeId.startsWith(`${actor.workspaceId}__`))
        .forEach((p) => { serverRules[p.scopeId] = p.requireMcpToken; });
      toolPolicies
        .filter((p) => p.scopeId.startsWith(`${actor.workspaceId}__`))
        .forEach((p) => { toolRules[p.scopeId] = p.requireMcpToken; });

      res.json({
        success: true,
        data: {
          globalRequireMcpToken: globalPolicy ? globalPolicy.requireMcpToken : true,
          userRules,
          serverRules,
          toolRules
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to load token policy' });
    }
  };

  private updateAuthorizationTokenPolicy = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const actor = this.deps.requireAdminApi(req, res);
    if (!actor) return;

    try {
      const store = this.deps.ensureDataStore();
      const users = store.getAllUsersByWorkspace(actor.workspaceId).map((u) => u.username);
      const usersSet = new Set(users);

      const globalRequireMcpToken = req.body?.globalRequireMcpToken !== false;
      const userRules = this.normalizePolicyMap(req.body?.userRules, 'user', actor.workspaceId, usersSet);
      const serverRules = this.normalizePolicyMap(req.body?.serverRules, 'server', actor.workspaceId, usersSet);
      const toolRules = this.normalizePolicyMap(req.body?.toolRules, 'tool', actor.workspaceId, usersSet);

      store.setMcpTokenPolicy('global', '*', globalRequireMcpToken);
      this.applyPolicyMap(store, 'user', userRules);
      this.applyPolicyMap(store, 'server', serverRules);
      this.applyPolicyMap(store, 'tool', toolRules);

      res.json({
        success: true,
        data: {
          globalRequireMcpToken,
          userRules,
          serverRules,
          toolRules
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update token policy' });
    }
  };

  private updateAuthorizationServer = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const serverId = String(req.params.id || '').trim();
    const requireMcpToken = req.body?.requireMcpToken !== false;
    if (!serverId) {
      res.status(400).json({ success: false, error: 'Server id is required' });
      return;
    }

    try {
      const store = this.deps.ensureDataStore();
      const server = store.getServerForOwner(serverId, ctx.workspaceId);
      if (!server) {
        res.status(404).json({ success: false, error: 'Server not found for current user' });
        return;
      }
      store.setServerAuthConfig(serverId, requireMcpToken);
      res.json({ success: true, data: { serverId, requireMcpToken } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update authorization settings' });
    }
  };

  private createAuthorizationMcpToken = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const store = this.deps.ensureDataStore();
    const tokenName = String(req.body?.tokenName || '').trim();
    if (!tokenName) {
      res.status(400).json({ success: false, error: 'Token name is required' });
      return;
    }
    const subjectUsername = this.deps.normalizeUsername(req.body?.subjectUsername) || ctx.username;
    if (ctx.role !== 'admin' && subjectUsername !== ctx.username) {
      res.status(403).json({ success: false, error: 'Only admin can generate token for other users' });
      return;
    }
    const subjectUser = store.getUserInWorkspace(subjectUsername, ctx.workspaceId);
    if (!subjectUser) {
      res.status(404).json({ success: false, error: 'Selected user is not in this workspace' });
      return;
    }

    const neverExpires = req.body?.neverExpires === true;
    const rawTtlHours = Number(req.body?.ttlHours);
    const ttlHours = neverExpires ? null : (Number.isFinite(rawTtlHours) && rawTtlHours > 0 ? Math.min(rawTtlHours, 24 * 3650) : 24 * 30);
    const serverRules = this.normalizeTriStateRules(req.body?.serverRules, ctx.workspaceId, 'server');
    const toolRules = this.normalizeTriStateRules(req.body?.toolRules, ctx.workspaceId, 'tool');
    const resourceRules = this.normalizeTriStateRules(req.body?.resourceRules, ctx.workspaceId, 'resource');

    // Backward-compatible fields derived from tri-state maps.
    const serverAllows = Object.entries(serverRules).filter(([, v]) => v === true).map(([k]) => k);
    const serverDenies = Object.entries(serverRules).filter(([, v]) => v === false).map(([k]) => k);
    const toolAllows = Object.entries(toolRules).filter(([, v]) => v === true).map(([k]) => k);
    const toolDenies = Object.entries(toolRules).filter(([, v]) => v === false).map(([k]) => k);
    const resourceAllows = Object.entries(resourceRules).filter(([, v]) => v === true).map(([k]) => k);
    const resourceDenies = Object.entries(resourceRules).filter(([, v]) => v === false).map(([k]) => k);

    const allowAllServers = serverAllows.length === 0 && serverDenies.length === 0;
    const allowAllTools = toolAllows.length === 0 && toolDenies.length === 0;
    const allowAllResources = resourceAllows.length === 0 && resourceDenies.length === 0;
    const serverIds = serverAllows;
    const allowedTools = toolAllows;
    const allowedResources = resourceAllows;

    const tokenPack = this.deps.createMcpToken(
      subjectUser.username,
      subjectUser.workspaceId,
      subjectUser.role,
      ttlHours ? ttlHours * 3600 : undefined
    );

    store.createMcpToken({
      id: tokenPack.tokenId,
      tokenName,
      workspaceId: subjectUser.workspaceId,
      subjectUsername: subjectUser.username,
      createdBy: ctx.username,
      tokenHash: tokenPack.tokenHash,
      tokenValue: tokenPack.token,
      allowAllServers,
      allowAllTools,
      allowAllResources,
      serverIds,
      allowedTools,
      allowedResources,
      serverRules,
      toolRules,
      resourceRules,
      neverExpires,
      expiresAt: tokenPack.expiresAt
    });

    res.json({
      success: true,
      data: {
        id: tokenPack.tokenId,
        tokenName,
        token: tokenPack.token,
        expiresAt: tokenPack.expiresAt,
        neverExpires,
        subjectUsername: subjectUser.username,
        workspaceId: subjectUser.workspaceId
      }
    });
  };

  private getAuthorizationTokens = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const tokens = this.deps.ensureDataStore()
      .getMcpTokensByWorkspace(ctx.workspaceId)
      .filter((t) => ctx.role === 'admin' || t.subjectUsername === ctx.username)
      .map((t) => ({
        id: t.id,
        tokenName: t.tokenName,
        subjectUsername: t.subjectUsername,
        createdBy: t.createdBy,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
        neverExpires: t.neverExpires,
        revokedAt: t.revokedAt,
        allowAllServers: t.allowAllServers,
        allowAllTools: t.allowAllTools,
        allowAllResources: t.allowAllResources,
        serverRules: t.serverRules || {},
        toolRules: t.toolRules || {},
        resourceRules: t.resourceRules || {}
      }));

    res.json({ success: true, data: { tokens } });
  };

  private getAuthorizationTokenById = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const token = this.deps.ensureDataStore().getMcpTokenById(String(req.params.id || ''));
    if (!token || token.workspaceId !== ctx.workspaceId || (ctx.role !== 'admin' && token.subjectUsername !== ctx.username)) {
      res.status(404).json({ success: false, error: 'Token not found' });
      return;
    }
    res.json({
      success: true,
      data: {
        id: token.id,
        tokenName: token.tokenName,
        token: token.tokenValue,
        subjectUsername: token.subjectUsername,
        createdBy: token.createdBy,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        neverExpires: token.neverExpires,
        revokedAt: token.revokedAt,
        allowAllServers: token.allowAllServers,
        allowAllTools: token.allowAllTools,
        allowAllResources: token.allowAllResources,
        serverRules: token.serverRules || {},
        toolRules: token.toolRules || {},
        resourceRules: token.resourceRules || {}
      }
    });
  };

  private deleteAuthorizationToken = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const token = this.deps.ensureDataStore().getMcpTokenById(String(req.params.id || ''));
    if (!token || token.workspaceId !== ctx.workspaceId || (ctx.role !== 'admin' && token.subjectUsername !== ctx.username)) {
      res.status(404).json({ success: false, error: 'Token not found' });
      return;
    }

    this.deps.ensureDataStore().revokeMcpToken(token.id);
    res.json({ success: true });
  };

  private createUser = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const actor = this.deps.requireAdminApi(req, res);
    if (!actor) return;

    const username = this.deps.normalizeUsername(req.body?.username);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const roleInput = typeof req.body?.role === 'string' ? req.body.role.trim().toLowerCase() : 'user';
    const role: AppUserRole = roleInput === 'admin' ? 'admin' : 'user';

    if (!username) {
      res.status(400).json({ success: false, error: 'Username is required' });
      return;
    }
    if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username)) {
      res.status(400).json({ success: false, error: 'Username must be 3-64 chars and contain only letters, numbers, dot, underscore, or dash' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      return;
    }

    try {
      const store = this.deps.ensureDataStore();
      if (store.getUserInWorkspace(username, actor.workspaceId)) {
        res.status(409).json({ success: false, error: `User "${username}" already exists` });
        return;
      }
      store.createUser(username, this.deps.hashPassword(password), role, actor.workspaceId);
      res.status(201).json({
        success: true,
        data: {
          user: { username, role, workspaceId: actor.workspaceId },
          createdBy: actor.username
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create user' });
    }
  };

  private updateUserRole = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const actor = this.deps.requireAdminApi(req, res);
    if (!actor) return;

    const targetUsername = this.deps.normalizeUsername(req.params.username);
    const roleInput = typeof req.body?.role === 'string' ? req.body.role.trim().toLowerCase() : '';
    const role: AppUserRole = roleInput === 'admin' ? 'admin' : 'user';

    if (!targetUsername) {
      res.status(400).json({ success: false, error: 'Username is required' });
      return;
    }

    const store = this.deps.ensureDataStore();
    const target = store.getUserInWorkspace(targetUsername, actor.workspaceId);
    if (!target) {
      res.status(404).json({ success: false, error: 'User not found in current workspace' });
      return;
    }

    store.updateUserRole(targetUsername, actor.workspaceId, role);
    res.json({ success: true, data: { user: { username: targetUsername, workspaceId: actor.workspaceId, role } } });
  };

  private login = async (req: express.Request, res: express.Response): Promise<void> => {
    if (this.deps.authMode === 'NONE') {
      res.status(400).json({ success: false, error: 'Login is disabled when AUTH_MODE=NONE' });
      return;
    }
    if (this.deps.authMode === 'SUPABASE_GOOGLE') {
      res.status(400).json({ success: false, error: 'Use Google Sign-In for SUPABASE_GOOGLE mode' });
      return;
    }

    const username = this.deps.normalizeUsername(req.body?.username);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Username and password are required' });
      return;
    }

    let authenticatedUsername = '';
    let authenticatedWorkspaceId = '';
    let authenticatedRole: AppUserRole = 'user';
    try {
      const storeUser = this.deps.ensureDataStore().getUser(username);
      if (storeUser && this.deps.verifyPassword(password, storeUser.passwordHash)) {
        authenticatedUsername = storeUser.username;
        authenticatedWorkspaceId = storeUser.workspaceId || storeUser.username;
        authenticatedRole = storeUser.role;
      } else {
        const legacyAdmin = this.deps.authAdminUsers.find((item) => item.username === username && item.password === password);
        if (legacyAdmin) {
          authenticatedUsername = legacyAdmin.username;
          authenticatedWorkspaceId = legacyAdmin.username;
          authenticatedRole = 'admin';
          this.deps.ensureDataStore().upsertUser(legacyAdmin.username, this.deps.hashPassword(legacyAdmin.password), 'admin', legacyAdmin.username);
        }
      }
    } catch (error) {
      console.error('Login datastore error:', error);
    }

    if (!authenticatedUsername) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }
    if (!authenticatedWorkspaceId) authenticatedWorkspaceId = authenticatedUsername;

    this.issueSession(res, authenticatedUsername, authenticatedWorkspaceId, authenticatedRole);

    res.json({
      success: true,
      data: {
        username: authenticatedUsername,
        workspaceId: authenticatedWorkspaceId,
        role: authenticatedRole,
        isAdmin: authenticatedRole === 'admin'
      }
    });
  };

  private issueSession(
    res: express.Response,
    username: string,
    workspaceId: string,
    role: AppUserRole
  ): void {
    const accessToken = createAccessToken(
      username,
      this.deps.authCookieSecret,
      this.deps.authAccessTtlSec,
      workspaceId,
      role
    );
    const refreshToken = createRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken, this.deps.authCookieSecret);
    const refreshExpiresAt = new Date(Date.now() + this.deps.authRefreshTtlSec * 1000).toISOString();

    this.deps.ensureDataStore().saveRefreshToken(refreshTokenHash, username, refreshExpiresAt);
    this.deps.setCookie(res, this.deps.accessCookieName, accessToken, this.deps.authAccessTtlSec);
    this.deps.setCookie(res, this.deps.refreshCookieName, refreshToken, this.deps.authRefreshTtlSec);
  }

  private normalizeSupabaseUsername(email?: string, userId?: string): string {
    const raw = String(email || '').trim().toLowerCase();
    if (raw) {
      const local = raw.split('@')[0] || raw;
      const sanitized = local.replace(/[^a-z0-9._-]/g, '_').slice(0, 64);
      if (sanitized.length >= 3) return sanitized;
    }
    const fallback = String(userId || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_').slice(0, 64);
    return fallback || 'user';
  }

  private resolveSupabaseRole(username: string, email?: string): AppUserRole {
    const authProperty = this.deps.getAuthProperty();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const isAdminEmail = authProperty.adminEmails.some((v) => v.toLowerCase() === normalizedEmail);
    const isLegacyAdmin = this.deps.authAdminUsers.some((u) => u.username === username || u.username === normalizedEmail);
    return (isAdminEmail || isLegacyAdmin) ? 'admin' : 'user';
  }

  private supabaseStart = (req: express.Request, res: express.Response): Promise<void> => {
    const authProperty = this.deps.getAuthProperty();
    if (this.deps.authMode !== 'SUPABASE_GOOGLE') {
      res.status(400).json({ success: false, error: 'Supabase login is only available when AUTH_MODE=SUPABASE_GOOGLE' });
      return;
    }
    if (!authProperty.providerUrl) {
      res.status(500).json({ success: false, error: 'SUPABASE_URL is not configured' });
      return;
    }

    const next = typeof req.query.next === 'string' && req.query.next.startsWith('/') ? req.query.next : '/';
    const appBaseUrl = this.resolveAppBaseUrl(req);
    const redirectTo = `${appBaseUrl.replace(/\/+$/, '')}/login?supabase=callback&next=${encodeURIComponent(next)}`;
    const authorizeUrl = `${authProperty.providerUrl.replace(/\/+$/, '')}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
    res.redirect(authorizeUrl);
  };

  private supabaseSession = async (req: express.Request, res: express.Response): Promise<void> => {
    const authProperty = this.deps.getAuthProperty();
    if (this.deps.authMode !== 'SUPABASE_GOOGLE') {
      res.status(400).json({ success: false, error: 'Supabase session endpoint is only available when AUTH_MODE=SUPABASE_GOOGLE' });
      return;
    }
    if (!authProperty.providerUrl || !authProperty.publicKey) {
      res.status(500).json({ success: false, error: 'SUPABASE_URL or SUPABASE_ANON_KEY is not configured' });
      return;
    }

    const accessToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken.trim() : '';
    if (!accessToken) {
      res.status(400).json({ success: false, error: 'accessToken is required' });
      return;
    }

    try {
      const userRes = await fetch(`${authProperty.providerUrl.replace(/\/+$/, '')}/auth/v1/user`, {
        headers: {
          apikey: authProperty.publicKey,
          Authorization: `Bearer ${accessToken}`
        }
      });
      const userPayload: any = await userRes.json().catch(() => ({}));
      if (!userRes.ok || !userPayload?.id) {
        res.status(401).json({ success: false, error: userPayload?.msg || userPayload?.error_description || 'Invalid Supabase access token' });
        return;
      }

      const email = typeof userPayload?.email === 'string' ? userPayload.email : '';
      const username = this.normalizeSupabaseUsername(email, userPayload?.id);
      const workspaceId = username;
      const role = this.resolveSupabaseRole(username, email);

      this.deps.ensureDataStore().upsertUser(
        username,
        this.deps.hashPassword(`supabase:${userPayload.id}`),
        role,
        workspaceId
      );
      this.issueSession(res, username, workspaceId, role);

      res.json({
        success: true,
        data: {
          username,
          workspaceId,
          role,
          isAdmin: role === 'admin'
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to validate Supabase session' });
    }
  };

  private refresh = async (req: express.Request, res: express.Response): Promise<void> => {
    if (this.deps.authMode === 'NONE') {
      res.status(400).json({ success: false, error: 'Refresh endpoint is not available when AUTH_MODE=NONE' });
      return;
    }

    const cookies = this.deps.parseCookies(req);
    const refreshToken = cookies[this.deps.refreshCookieName];
    if (!refreshToken) {
      res.status(401).json({ success: false, error: 'Missing refresh token' });
      return;
    }

    const refreshTokenHash = hashRefreshToken(refreshToken, this.deps.authCookieSecret);
    const record = this.deps.ensureDataStore().getRefreshToken(refreshTokenHash);
    if (!record || record.revokedAt || new Date(record.expiresAt).getTime() <= Date.now()) {
      if (record && !record.revokedAt) this.deps.ensureDataStore().revokeRefreshToken(refreshTokenHash);
      this.deps.clearCookie(res, this.deps.accessCookieName);
      this.deps.clearCookie(res, this.deps.refreshCookieName);
      res.status(401).json({ success: false, error: 'Refresh token is invalid or expired' });
      return;
    }

    this.deps.ensureDataStore().revokeRefreshToken(refreshTokenHash);
    const newRefreshToken = createRefreshToken();
    const newRefreshHash = hashRefreshToken(newRefreshToken, this.deps.authCookieSecret);
    const refreshExpiresAt = new Date(Date.now() + this.deps.authRefreshTtlSec * 1000).toISOString();
    this.deps.ensureDataStore().saveRefreshToken(newRefreshHash, record.username, refreshExpiresAt);

    const refreshedUser = this.deps.ensureDataStore().getUser(record.username);
    const refreshedWorkspaceId = refreshedUser?.workspaceId || record.username;
    const refreshedRole = (refreshedUser?.role || this.deps.getUserRole(record.username, refreshedWorkspaceId)) as AppUserRole;
    const newAccessToken = createAccessToken(
      record.username,
      this.deps.authCookieSecret,
      this.deps.authAccessTtlSec,
      refreshedWorkspaceId,
      refreshedRole
    );

    this.deps.setCookie(res, this.deps.accessCookieName, newAccessToken, this.deps.authAccessTtlSec);
    this.deps.setCookie(res, this.deps.refreshCookieName, newRefreshToken, this.deps.authRefreshTtlSec);
    res.json({ success: true, data: { username: record.username } });
  };

  private logout = async (req: express.Request, res: express.Response): Promise<void> => {
    const cookies = this.deps.parseCookies(req);
    const refreshToken = cookies[this.deps.refreshCookieName];
    if (refreshToken) {
      const refreshTokenHash = hashRefreshToken(refreshToken, this.deps.authCookieSecret);
      this.deps.ensureDataStore().revokeRefreshToken(refreshTokenHash);
    }
    this.deps.clearCookie(res, this.deps.accessCookieName);
    this.deps.clearCookie(res, this.deps.refreshCookieName);
    res.json({ success: true });
  };

  private getLoginPage = (req: express.Request, res: express.Response): void => {
    if (this.deps.authMode === 'NONE') {
      res.redirect('/');
      return;
    }
    if (this.deps.getAuthenticatedUser(req)) {
      res.redirect('/');
      return;
    }
    res.sendFile(path.join(this.deps.publicDir, 'login.html'));
  };

  private getUsersPage = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'users.html'));
  };

  private getAuthorizationPage = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'authorization.html'));
  };
}

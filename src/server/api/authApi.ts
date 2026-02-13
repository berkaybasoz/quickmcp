import express from 'express';
import path from 'path';
import { AppUserRole, AuthContext, CreateMcpTokenResult } from '../../auth/auth-utils';
import { AuthMode, LiteAdminUser } from '../../config/auth-config';
import { IDataStore } from '../../database/datastore';
import { createAccessToken, createRefreshToken, hashRefreshToken } from '../../auth/token-utils';

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
}

export class AuthApi {
  constructor(private readonly deps: AuthApiDeps) {}

  registerRoutes(app: express.Express): void {
    app.get('/api/auth/me', this.getMe);
    app.get('/api/auth/roles', this.getRoles);
    app.get('/api/auth/users', this.getUsers);

    app.get('/api/authorization/config', this.getAuthorizationConfig);
    app.get('/api/authorization/context', this.getAuthorizationContext);
    app.get('/api/authorization/servers', this.getAuthorizationServers);
    app.post('/api/authorization/servers/:id', this.updateAuthorizationServer);
    app.post('/api/authorization/mcp-token', this.createAuthorizationMcpToken);
    app.get('/api/authorization/tokens', this.getAuthorizationTokens);
    app.get('/api/authorization/tokens/:id', this.getAuthorizationTokenById);
    app.delete('/api/authorization/tokens/:id', this.deleteAuthorizationToken);

    app.post('/api/auth/users', this.createUser);
    app.patch('/api/auth/users/:username/role', this.updateUserRole);
    app.post('/api/auth/login', this.login);
    app.post('/api/auth/refresh', this.refresh);
    app.post('/api/auth/logout', this.logout);

    app.get('/login', this.getLoginPage);
    app.get('/users', this.getUsersPage);
    app.get('/authorization', this.getAuthorizationPage);
  }

  private getMe = (req: AuthenticatedRequest, res: express.Response): void => {
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

  private getRoles = (req: AuthenticatedRequest, res: express.Response): void => {
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

  private getUsers = (req: AuthenticatedRequest, res: express.Response): void => {
    const actor = this.deps.requireAdminApi(req, res);
    if (!actor) return;
    try {
      const users = this.deps.ensureDataStore().getAllUsersByWorkspace(actor.workspaceId);
      res.json({ success: true, data: { users, requestedBy: actor.username, workspaceId: actor.workspaceId } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to load users' });
    }
  };

  private getAuthorizationConfig = (req: AuthenticatedRequest, res: express.Response): void => {
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

  private getAuthorizationContext = (req: AuthenticatedRequest, res: express.Response): void => {
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
        return { id: server.id, name: server.name, tools, resources };
      });

      res.json({ success: true, data: { workspaceId: ctx.workspaceId, users, servers } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to load authorization context' });
    }
  };

  private getAuthorizationServers = (req: AuthenticatedRequest, res: express.Response): void => {
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

  private updateAuthorizationServer = (req: AuthenticatedRequest, res: express.Response): void => {
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

  private createAuthorizationMcpToken = (req: AuthenticatedRequest, res: express.Response): void => {
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
    const allowAllServers = req.body?.allowAllServers === true;
    const allowAllTools = req.body?.allowAllTools !== false;
    const allowAllResources = req.body?.allowAllResources !== false;

    const serverIdsInput = Array.isArray(req.body?.serverIds) ? req.body.serverIds : [];
    const serverIds = allowAllServers
      ? []
      : serverIdsInput.map((v: any) => String(v || '').trim()).filter((v: string) => v.length > 0 && v.startsWith(`${ctx.workspaceId}__`));

    const allowedTools = (Array.isArray(req.body?.allowedTools) ? req.body.allowedTools : [])
      .map((v: any) => String(v || '').trim())
      .filter((v: string) => v.length > 0);
    const allowedResources = (Array.isArray(req.body?.allowedResources) ? req.body.allowedResources : [])
      .map((v: any) => String(v || '').trim())
      .filter((v: string) => v.length > 0);

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

  private getAuthorizationTokens = (req: AuthenticatedRequest, res: express.Response): void => {
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
        allowAllResources: t.allowAllResources
      }));

    res.json({ success: true, data: { tokens } });
  };

  private getAuthorizationTokenById = (req: AuthenticatedRequest, res: express.Response): void => {
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
        allowAllResources: token.allowAllResources
      }
    });
  };

  private deleteAuthorizationToken = (req: AuthenticatedRequest, res: express.Response): void => {
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

  private createUser = (req: AuthenticatedRequest, res: express.Response): void => {
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

  private updateUserRole = (req: AuthenticatedRequest, res: express.Response): void => {
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

  private login = (req: express.Request, res: express.Response): void => {
    if (this.deps.authMode === 'NONE') {
      res.status(400).json({ success: false, error: 'Login is disabled when AUTH_MODE=NONE' });
      return;
    }
    if (this.deps.authMode === 'SUPABASE_GOOGLE') {
      res.status(501).json({ success: false, error: 'SUPABASE_GOOGLE auth flow is not implemented in this build' });
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

    const accessToken = createAccessToken(
      authenticatedUsername,
      this.deps.authCookieSecret,
      this.deps.authAccessTtlSec,
      authenticatedWorkspaceId,
      authenticatedRole
    );
    const refreshToken = createRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken, this.deps.authCookieSecret);
    const refreshExpiresAt = new Date(Date.now() + this.deps.authRefreshTtlSec * 1000).toISOString();

    this.deps.ensureDataStore().saveRefreshToken(refreshTokenHash, authenticatedUsername, refreshExpiresAt);
    this.deps.setCookie(res, this.deps.accessCookieName, accessToken, this.deps.authAccessTtlSec);
    this.deps.setCookie(res, this.deps.refreshCookieName, refreshToken, this.deps.authRefreshTtlSec);

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

  private refresh = (req: express.Request, res: express.Response): void => {
    if (this.deps.authMode !== 'LITE') {
      res.status(400).json({ success: false, error: 'Refresh endpoint is only available when AUTH_MODE=LITE' });
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

  private logout = (req: express.Request, res: express.Response): void => {
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

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { AppUserRole, AuthContext, CreateMcpTokenResult } from '../../auth/auth-utils';
import { AuthMode, LiteAdminUser } from '../../config/auth-config';
import { IDataStore, McpTokenPolicyScope } from '../../database/datastore';
import { createAccessToken, createRefreshToken, hashRefreshToken, verifyAccessToken } from '../../auth/token-utils';
import { AuthProperty } from './authProperty';
import { logger } from '../../utils/logger';
type AuthenticatedRequest = express.Request & { authUser?: string; authWorkspace?: string; authRole?: AppUserRole };

interface AuthApiDeps {
  deployMode: string;
  authMode: AuthMode;
  authAdminUsers: LiteAdminUser[];
  authCookieSecret: string;
  authAccessTtlSec: number;
  authRefreshTtlSec: number;
  accessCookieName: string;
  refreshCookieName: string;
  publicDir: string;
  resolveAuthContext: (req: AuthenticatedRequest, res?: express.Response) => Promise<AuthContext | null>;
  requireAdminApi: (req: AuthenticatedRequest, res: express.Response) => Promise<AuthContext | null>;
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

type OAuthPendingRequest = {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256' | 'plain';
  createdAt: number;
};

type OAuthAuthorizationCode = {
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256' | 'plain';
  username: string;
  workspaceId: string;
  role: AppUserRole;
  expiresAt: number;
};

type OAuthClientRegistration = {
  clientId: string;
  redirectUris: string[];
  clientName: string;
  tokenEndpointAuthMethod: 'none';
  createdAt: number;
};

export class AuthApi {
  private readonly oauthRequestCookieName = 'quickmcp_oauth_req';
  private readonly oauthCodeTtlMs = 5 * 60 * 1000;
  private readonly oauthAccessTokenTtlSec = Number(process.env.QUICKMCP_OAUTH_ACCESS_TTL_SEC || '3600');
  private readonly oauthClients = new Map<string, OAuthClientRegistration>();

  constructor(private readonly deps: AuthApiDeps) {}

  private isSaasMode(): boolean {
    return String(this.deps.deployMode || '').trim().toUpperCase() === 'SAAS';
  }

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
      const isLocalConfigured = configuredHost.startsWith('localhost:') || configuredHost.startsWith('127.0.0.1:');
      if (isLocalRequest && configuredHost !== requestHost) {
        return requestOrigin;
      }
      if (!isLocalRequest && isLocalConfigured) {
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
  ): Promise<void> {
    const writes: Promise<void>[] = [];
    for (const [id, decision] of Object.entries(map)) {
      writes.push(store.setMcpTokenPolicy(scopeType, id, decision));
    }
    return Promise.all(writes).then(() => undefined);
  }

  registerRoutes(app: express.Express): void {
    app.get('/.well-known/oauth-authorization-server', this.getOAuthAuthorizationServerMetadata);
    app.post('/oauth/register', this.oauthRegister);
    app.get('/oauth/authorize', this.oauthAuthorize);
    app.get('/oauth/authorize/complete', this.oauthAuthorizeComplete);
    app.post('/oauth/token', this.oauthToken);

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

  private normalizeOAuthCodeChallengeMethod(value: string): 'S256' | 'plain' {
    const normalized = String(value || '').trim().toUpperCase();
    return normalized === 'PLAIN' ? 'plain' : 'S256';
  }

  private toBase64Url(input: string): string {
    return Buffer.from(input, 'utf8').toString('base64url');
  }

  private fromBase64Url(input: string): string {
    return Buffer.from(input, 'base64url').toString('utf8');
  }

  private signOAuthState(payloadEncoded: string): string {
    return crypto.createHmac('sha256', this.deps.authCookieSecret).update(payloadEncoded).digest('base64url');
  }

  private encodeOAuthPendingRequest(payload: OAuthPendingRequest): string {
    const encoded = this.toBase64Url(JSON.stringify(payload));
    const sig = this.signOAuthState(encoded);
    return `${encoded}.${sig}`;
  }

  private decodeOAuthPendingRequest(raw: string): OAuthPendingRequest | null {
    const value = String(raw || '').trim();
    const dot = value.lastIndexOf('.');
    if (dot <= 0 || dot >= value.length - 1) return null;
    const encoded = value.slice(0, dot);
    const sig = value.slice(dot + 1);
    const expected = this.signOAuthState(encoded);
    if (sig !== expected) return null;
    try {
      const parsed = JSON.parse(this.fromBase64Url(encoded));
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        clientId: String((parsed as any).clientId || ''),
        redirectUri: String((parsed as any).redirectUri || ''),
        state: String((parsed as any).state || ''),
        scope: String((parsed as any).scope || ''),
        codeChallenge: String((parsed as any).codeChallenge || ''),
        codeChallengeMethod: this.normalizeOAuthCodeChallengeMethod(String((parsed as any).codeChallengeMethod || 'S256')),
        createdAt: Number((parsed as any).createdAt || 0)
      };
    } catch {
      return null;
    }
  }

  private encodeOAuthCode(record: OAuthAuthorizationCode): string {
    const encoded = this.toBase64Url(JSON.stringify(record));
    const sig = this.signOAuthState(encoded);
    return `${encoded}.${sig}`;
  }

  private decodeOAuthCode(code: string): OAuthAuthorizationCode | null {
    const value = String(code || '').trim();
    const dot = value.lastIndexOf('.');
    if (dot <= 0 || dot >= value.length - 1) return null;
    const encoded = value.slice(0, dot);
    const sig = value.slice(dot + 1);
    const expected = this.signOAuthState(encoded);
    if (sig !== expected) return null;
    try {
      const parsed = JSON.parse(this.fromBase64Url(encoded));
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed as OAuthAuthorizationCode;
    } catch {
      return null;
    }
  }

  private createAuthorizationCode(record: Omit<OAuthAuthorizationCode, 'expiresAt'>): string {
    const payload: OAuthAuthorizationCode = {
      ...record,
      expiresAt: Date.now() + this.oauthCodeTtlMs
    };
    return this.encodeOAuthCode(payload);
  }

  private appendQueryParam(urlStr: string, key: string, value: string): string {
    try {
      const url = new URL(urlStr);
      url.searchParams.set(key, value);
      return url.toString();
    } catch {
      const sep = urlStr.includes('?') ? '&' : '?';
      return `${urlStr}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    }
  }

  private normalizeRedirectUri(urlStr: string): string {
    try {
      const u = new URL(urlStr);
      const path = u.pathname !== '/' ? u.pathname.replace(/\/+$/, '') : '/';
      const port = u.port ? `:${u.port}` : '';
      return `${u.protocol}//${u.hostname}${port}${path}${u.search}`;
    } catch {
      return String(urlStr || '').trim();
    }
  }

  private redirectOAuthError(res: express.Response, redirectUri: string, state: string, error: string, errorDescription: string): void {
    let location = this.appendQueryParam(redirectUri, 'error', error);
    location = this.appendQueryParam(location, 'error_description', errorDescription);
    if (state) location = this.appendQueryParam(location, 'state', state);
    res.redirect(location);
  }

  private getOAuthAuthorizationServerMetadata = (req: express.Request, res: express.Response): void => {
    const issuer = this.resolveAppBaseUrl(req).replace(/\/+$/, '');
    res.json({
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      registration_endpoint: `${issuer}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      token_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256', 'plain']
    });
  };

  private oauthRegister = (req: express.Request, res: express.Response): void => {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const redirectUrisRaw = (body as any).redirect_uris;
    const redirectUris = Array.isArray(redirectUrisRaw)
      ? redirectUrisRaw.map((v: any) => String(v || '').trim()).filter(Boolean)
      : [];
    const clientName = String((body as any).client_name || 'QuickMCP ChatGPT Client').trim();

    if (redirectUris.length === 0) {
      res.status(400).json({ error: 'invalid_client_metadata', error_description: 'redirect_uris is required' });
      return;
    }
    if (redirectUris.some((uri) => !/^https?:\/\//i.test(uri))) {
      res.status(400).json({ error: 'invalid_redirect_uri', error_description: 'redirect_uris must be absolute URLs' });
      return;
    }

    const clientId = `quickmcp_${crypto.randomBytes(16).toString('hex')}`;
    const createdAt = Math.floor(Date.now() / 1000);
    this.oauthClients.set(clientId, {
      clientId,
      redirectUris,
      clientName,
      tokenEndpointAuthMethod: 'none',
      createdAt
    });

    res.status(201).json({
      client_id: clientId,
      client_id_issued_at: createdAt,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none'
    });
  };

  private oauthAuthorize = (req: express.Request, res: express.Response): void => {
    const responseType = String(req.query.response_type || '').trim();
    const clientId = String(req.query.client_id || 'chatgpt').trim();
    const redirectUri = String(req.query.redirect_uri || '').trim();
    const state = String(req.query.state || '').trim();
    const scope = String(req.query.scope || '').trim();
    const codeChallenge = String(req.query.code_challenge || '').trim();
    const codeChallengeMethod = this.normalizeOAuthCodeChallengeMethod(String(req.query.code_challenge_method || 'S256'));

    if (responseType !== 'code') {
      if (redirectUri) {
        this.redirectOAuthError(res, redirectUri, state, 'unsupported_response_type', 'response_type must be code');
      } else {
        res.status(400).json({ error: 'unsupported_response_type', error_description: 'response_type must be code' });
      }
      return;
    }
    if (!redirectUri) {
      res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri is required' });
      return;
    }
    if (clientId) {
      const registeredClient = this.oauthClients.get(clientId);
      if (registeredClient && !registeredClient.redirectUris.includes(redirectUri)) {
        this.redirectOAuthError(res, redirectUri, state, 'invalid_request', 'redirect_uri is not registered for client_id');
        return;
      }
    }
    if (!codeChallenge) {
      this.redirectOAuthError(res, redirectUri, state, 'invalid_request', 'code_challenge is required');
      return;
    }

    const pending: OAuthPendingRequest = {
      clientId,
      redirectUri,
      state,
      scope,
      codeChallenge,
      codeChallengeMethod,
      createdAt: Date.now()
    };
    const encoded = this.encodeOAuthPendingRequest(pending);
    this.deps.setCookie(res, this.oauthRequestCookieName, encoded, 10 * 60);
    res.redirect('/oauth/authorize/complete');
  };

  private oauthAuthorizeComplete = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const cookies = this.deps.parseCookies(req);
    const rawPending = cookies[this.oauthRequestCookieName];
    const pending = this.decodeOAuthPendingRequest(rawPending || '');
    if (!pending || !pending.redirectUri) {
      res.status(400).json({ error: 'invalid_request', error_description: 'Missing or invalid OAuth authorization request' });
      return;
    }
    if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
      this.deps.clearCookie(res, this.oauthRequestCookieName);
      this.redirectOAuthError(res, pending.redirectUri, pending.state, 'invalid_request', 'OAuth authorization request expired');
      return;
    }

    const ctx = await this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      const next = '/oauth/authorize/complete';
      res.redirect(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    const code = this.createAuthorizationCode({
      clientId: pending.clientId,
      redirectUri: pending.redirectUri,
      scope: pending.scope,
      codeChallenge: pending.codeChallenge,
      codeChallengeMethod: pending.codeChallengeMethod,
      username: ctx.username,
      workspaceId: ctx.workspaceId,
      role: ctx.role
    });
    this.deps.clearCookie(res, this.oauthRequestCookieName);

    let location = this.appendQueryParam(pending.redirectUri, 'code', code);
    if (pending.state) location = this.appendQueryParam(location, 'state', pending.state);
    res.redirect(location);
  };

  private oauthToken = async (req: express.Request, res: express.Response): Promise<void> => {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const grantType = String((body as any).grant_type || '').trim();
    const code = String((body as any).code || '').trim();
    const redirectUri = String((body as any).redirect_uri || '').trim();
    const clientId = String((body as any).client_id || '').trim();
    const codeVerifier = String((body as any).code_verifier || '').trim();
    const requestId = crypto.randomBytes(6).toString('hex');
    logger.info(`[oauth/token:${requestId}] request grant_type=${grantType || '(empty)'} client_id=${clientId || '(empty)'}`);

    if (grantType !== 'authorization_code') {
      logger.warn(`[oauth/token:${requestId}] rejected unsupported grant_type`);
      res.status(400).json({ error: 'unsupported_grant_type', error_description: 'grant_type must be authorization_code' });
      return;
    }
    if (!code) {
      logger.warn(`[oauth/token:${requestId}] rejected missing code`);
      res.status(400).json({ error: 'invalid_request', error_description: 'code is required' });
      return;
    }

    const record = this.decodeOAuthCode(code);
    if (!record || record.expiresAt <= Date.now()) {
      logger.warn(`[oauth/token:${requestId}] invalid or expired code`);
      res.status(400).json({ error: 'invalid_grant', error_description: 'authorization code is invalid or expired' });
      return;
    }
    if (redirectUri && this.normalizeRedirectUri(record.redirectUri) !== this.normalizeRedirectUri(redirectUri)) {
      logger.warn(`[oauth/token:${requestId}] redirect mismatch expected=${record.redirectUri} got=${redirectUri}`);
      res.status(400).json({ error: 'invalid_grant', error_description: 'redirect_uri does not match authorization request' });
      return;
    }
    if (clientId && record.clientId && record.clientId !== clientId) {
      // Some clients can rotate/re-register IDs between registration and callback retries.
      // Do not hard-fail here; rely on redirect_uri + PKCE for validation.
      logger.warn(`[oauth/token:${requestId}] client_id mismatch expected=${record.clientId} got=${clientId}`);
    }

    if (record.codeChallenge) {
      if (!codeVerifier) {
        logger.warn(`[oauth/token:${requestId}] missing code_verifier`);
        res.status(400).json({ error: 'invalid_request', error_description: 'code_verifier is required' });
        return;
      }
      const computed = record.codeChallengeMethod === 'plain'
        ? codeVerifier
        : crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      if (computed !== record.codeChallenge) {
        logger.warn(`[oauth/token:${requestId}] invalid code_verifier`);
        res.status(400).json({ error: 'invalid_grant', error_description: 'code_verifier is invalid' });
        return;
      }
    }

    const ttlSec = Number.isFinite(this.oauthAccessTokenTtlSec) && this.oauthAccessTokenTtlSec > 0
      ? Math.floor(this.oauthAccessTokenTtlSec)
      : 3600;
    const tokenPack = this.deps.createMcpToken(record.username, record.workspaceId, record.role, ttlSec);

    try {
      const store = this.deps.ensureDataStore();
      await store.createMcpToken({
        id: tokenPack.tokenId,
        tokenName: `oauth:${clientId || 'chatgpt'}`,
        workspaceId: record.workspaceId,
        subjectUsername: record.username,
        createdBy: record.username,
        tokenHash: tokenPack.tokenHash,
        tokenValue: tokenPack.token,
        allowAllServers: true,
        allowAllTools: true,
        allowAllResources: true,
        serverIds: [],
        allowedTools: [],
        allowedResources: [],
        serverRules: {},
        toolRules: {},
        resourceRules: {},
        neverExpires: false,
        expiresAt: tokenPack.expiresAt
      });
    } catch (err) {
      logger.warn(`[oauth/token:${requestId}] failed to persist token: ${err instanceof Error ? err.message : String(err)}`);
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    logger.info(`[oauth/token:${requestId}] success user=${record.username} ws=${record.workspaceId}`);
    res.json({
      access_token: tokenPack.token,
      token_type: 'Bearer',
      expires_in: ttlSec,
      scope: record.scope || 'mcp'
    });
  };

  private getMe = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = await this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const cookies = this.deps.parseCookies(req);
    const accessToken = cookies[this.deps.accessCookieName];
    const payload = accessToken ? verifyAccessToken(accessToken, this.deps.authCookieSecret) : null;
    let storeUser: any = null;
    try {
      storeUser = await this.deps.ensureDataStore().getUser(ctx.username);
    } catch {}
    const createdDate = payload?.createdDate || storeUser?.createdAt || '';
    const lastSignInDate = payload?.lastSignInDate || (payload?.iat ? new Date(payload.iat * 1000).toISOString() : '');
    res.json({
      success: true,
      data: {
        username: ctx.username,
        displayName: payload?.displayName || ctx.username,
        workspaceId: ctx.workspaceId,
        authMode: this.deps.authMode,
        email: payload?.email || '',
        avatarUrl: payload?.avatarUrl || '',
        createdDate,
        lastSignInDate,
        role: ctx.role,
        isAdmin: ctx.role === 'admin'
      }
    });
  };

  private getRoles = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = await this.deps.resolveAuthContext(req, res);
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
    if (this.isSaasMode()) {
      res.status(404).json({ success: false, error: 'Users API is not available in SAAS mode' });
      return;
    }
    const actor = await this.deps.requireAdminApi(req, res);
    if (!actor) return;
    try {
      const users = await this.deps.ensureDataStore().getAllUsersByWorkspace(actor.workspaceId);
      res.json({ success: true, data: { users, requestedBy: actor.username, workspaceId: actor.workspaceId } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to load users' });
    }
  };

  private getAuthorizationConfig = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = await this.deps.resolveAuthContext(req, res);
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
    const ctx = await this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const store = this.deps.ensureDataStore();
      const workspaceUsers = await store.getAllUsersByWorkspace(ctx.workspaceId);
      const users = (ctx.role === 'admin'
        ? workspaceUsers
        : workspaceUsers.filter((u) => u.username === ctx.username)
      ).map((u) => ({ username: u.username, role: u.role }));

      const serverRows = await store.getAllServersByOwner(ctx.workspaceId);
      const servers = await Promise.all(serverRows.map(async (server) => {
        const tools = (await store.getToolsForServer(server.id)).map((t) => `${server.id}__${t.name}`);
        const resources = (await store.getResourcesForServer(server.id)).map((r) => `${server.id}__${r.name}`);
        const rawType = (server.sourceConfig as any)?.type;
        const type = typeof rawType === 'string' ? rawType : 'unknown';
        return { id: server.id, name: server.name, type, tools, resources };
      }));

      res.json({ success: true, data: { workspaceId: ctx.workspaceId, users, servers } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to load authorization context' });
    }
  };

  private getAuthorizationServers = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = await this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const store = this.deps.ensureDataStore();
      const servers = await store.getAllServersByOwner(ctx.workspaceId);
      const data = await Promise.all(servers.map(async (server) => {
        const cfg = await store.getServerAuthConfig(server.id);
        return {
          id: server.id,
          name: server.name,
          ownerUsername: server.ownerUsername,
          requireMcpToken: cfg ? cfg.requireMcpToken : true
        };
      }));
      res.json({ success: true, data: { servers: data } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to load authorization settings' });
    }
  };

  private getAuthorizationTokenPolicy = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const actor = await this.deps.requireAdminApi(req, res);
    if (!actor) return;

    try {
      const store = this.deps.ensureDataStore();
      const users = (await store.getAllUsersByWorkspace(actor.workspaceId)).map((u) => u.username);
      const servers = (await store.getAllServersByOwner(actor.workspaceId)).map((s) => s.id);
      const toolsByServer = await Promise.all(servers.map((serverId) => store.getToolsForServer(serverId)));
      const tools = servers.flatMap((serverId, index) => toolsByServer[index].map((t) => `${serverId}__${t.name}`));

      const globalPolicy = await store.getMcpTokenPolicy('global', '*');
      const userPolicies = await store.listMcpTokenPolicies('user');
      const serverPolicies = await store.listMcpTokenPolicies('server');
      const toolPolicies = await store.listMcpTokenPolicies('tool');

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
    const actor = await this.deps.requireAdminApi(req, res);
    if (!actor) return;

    try {
      const store = this.deps.ensureDataStore();
      const users = (await store.getAllUsersByWorkspace(actor.workspaceId)).map((u) => u.username);
      const usersSet = new Set(users);

      const globalRequireMcpToken = req.body?.globalRequireMcpToken !== false;
      const userRules = this.normalizePolicyMap(req.body?.userRules, 'user', actor.workspaceId, usersSet);
      const serverRules = this.normalizePolicyMap(req.body?.serverRules, 'server', actor.workspaceId, usersSet);
      const toolRules = this.normalizePolicyMap(req.body?.toolRules, 'tool', actor.workspaceId, usersSet);

      await store.setMcpTokenPolicy('global', '*', globalRequireMcpToken);
      await this.applyPolicyMap(store, 'user', userRules);
      await this.applyPolicyMap(store, 'server', serverRules);
      await this.applyPolicyMap(store, 'tool', toolRules);

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
    const ctx = await this.deps.resolveAuthContext(req, res);
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
      const server = await store.getServerForOwner(serverId, ctx.workspaceId);
      if (!server) {
        res.status(404).json({ success: false, error: 'Server not found for current user' });
        return;
      }
      await store.setServerAuthConfig(serverId, requireMcpToken);
      res.json({ success: true, data: { serverId, requireMcpToken } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update authorization settings' });
    }
  };

  private createAuthorizationMcpToken = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = await this.deps.resolveAuthContext(req, res);
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
    const subjectUser = await store.getUserInWorkspace(subjectUsername, ctx.workspaceId);
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

    await store.createMcpToken({
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
    const ctx = await this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const tokens = (await this.deps.ensureDataStore()
      .getMcpTokensByWorkspace(ctx.workspaceId))
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
    const ctx = await this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const token = await this.deps.ensureDataStore().getMcpTokenById(String(req.params.id || ''));
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
    const ctx = await this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const token = await this.deps.ensureDataStore().getMcpTokenById(String(req.params.id || ''));
    if (!token || token.workspaceId !== ctx.workspaceId || (ctx.role !== 'admin' && token.subjectUsername !== ctx.username)) {
      res.status(404).json({ success: false, error: 'Token not found' });
      return;
    }

    await this.deps.ensureDataStore().revokeMcpToken(token.id);
    res.json({ success: true });
  };

  private createUser = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    if (this.isSaasMode()) {
      res.status(404).json({ success: false, error: 'User management is not available in SAAS mode' });
      return;
    }
    const actor = await this.deps.requireAdminApi(req, res);
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
      if (await store.getUserInWorkspace(username, actor.workspaceId)) {
        res.status(409).json({ success: false, error: `User "${username}" already exists` });
        return;
      }
      await store.createUser(username, this.deps.hashPassword(password), role, actor.workspaceId);
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
    if (this.isSaasMode()) {
      res.status(404).json({ success: false, error: 'User management is not available in SAAS mode' });
      return;
    }
    const actor = await this.deps.requireAdminApi(req, res);
    if (!actor) return;

    const targetUsername = this.deps.normalizeUsername(req.params.username);
    const roleInput = typeof req.body?.role === 'string' ? req.body.role.trim().toLowerCase() : '';
    const role: AppUserRole = roleInput === 'admin' ? 'admin' : 'user';

    if (!targetUsername) {
      res.status(400).json({ success: false, error: 'Username is required' });
      return;
    }

    const store = this.deps.ensureDataStore();
    const target = await store.getUserInWorkspace(targetUsername, actor.workspaceId);
    if (!target) {
      res.status(404).json({ success: false, error: 'User not found in current workspace' });
      return;
    }

    await store.updateUserRole(targetUsername, actor.workspaceId, role);
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
      const storeUser = await this.deps.ensureDataStore().getUser(username);
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
          await this.deps.ensureDataStore().upsertUser(legacyAdmin.username, this.deps.hashPassword(legacyAdmin.password), 'admin', legacyAdmin.username);
        }
      }
    } catch (error) {
      logger.error('Login datastore error:', error);
    }

    if (!authenticatedUsername) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }
    if (!authenticatedWorkspaceId) authenticatedWorkspaceId = authenticatedUsername;

    await this.issueSession(res, authenticatedUsername, authenticatedWorkspaceId, authenticatedRole, {
      displayName: authenticatedUsername
    });

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

  private async issueSession(
    res: express.Response,
    username: string,
    workspaceId: string,
    role: AppUserRole,
    profile?: { displayName?: string; email?: string; avatarUrl?: string; createdDate?: string; lastSignInDate?: string }
  ): Promise<void> {
    const accessToken = createAccessToken(
      username,
      this.deps.authCookieSecret,
      this.deps.authAccessTtlSec,
      workspaceId,
      role,
      profile?.displayName || username,
      profile?.email,
      profile?.avatarUrl,
      profile?.createdDate,
      profile?.lastSignInDate
    );
    const refreshToken = createRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken, this.deps.authCookieSecret);
    const refreshExpiresAt = new Date(Date.now() + this.deps.authRefreshTtlSec * 1000).toISOString();

    await this.deps.ensureDataStore().saveRefreshToken(refreshTokenHash, username, refreshExpiresAt);
    this.deps.setCookie(res, this.deps.accessCookieName, accessToken, this.deps.authAccessTtlSec);
    this.deps.setCookie(res, this.deps.refreshCookieName, refreshToken, this.deps.authRefreshTtlSec);
  }

  private normalizeSupabaseUsername(email?: string, userId?: string): string {
    const raw = String(email || '').trim().toLowerCase();
    if (raw) {
      const localPart = (raw.split('@')[0] || '').trim().toLowerCase();
      const normalizedLocal = localPart.replace(/[^a-z0-9._-]/g, '_');
      const shortHash = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 8);
      const maxBaseLen = 64 - (shortHash.length + 1);
      const fallbackBase = raw.replace(/[^a-z0-9._-]/g, '_');
      const baseSource = normalizedLocal.length >= 3 ? normalizedLocal : fallbackBase;
      const base = baseSource.slice(0, Math.max(3, maxBaseLen));
      const candidate = `${base}_${shortHash}`;
      if (candidate.length >= 3) return candidate.slice(0, 64);
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
      const avatarUrl = typeof userPayload?.user_metadata?.avatar_url === 'string'
        ? userPayload.user_metadata.avatar_url
        : '';
      const displayNameRaw = userPayload?.user_metadata?.full_name
        || userPayload?.user_metadata?.name
        || userPayload?.user_metadata?.preferred_username
        || '';
      const displayName = String(displayNameRaw || '').trim();
      const createdDate = typeof userPayload?.created_at === 'string'
        ? userPayload.created_at
        : (typeof userPayload?.createdAt === 'string'
          ? userPayload.createdAt
          : (typeof userPayload?.identities?.[0]?.created_at === 'string'
            ? userPayload.identities[0].created_at
            : ''));
      const lastSignInDate = typeof userPayload?.last_sign_in_at === 'string'
        ? userPayload.last_sign_in_at
        : (typeof userPayload?.lastSignInAt === 'string'
          ? userPayload.lastSignInAt
          : (typeof userPayload?.identities?.[0]?.last_sign_in_at === 'string'
            ? userPayload.identities[0].last_sign_in_at
            : new Date().toISOString()));
      const username = this.normalizeSupabaseUsername(email, userPayload?.id);
      const workspaceId = username;
      const role = this.resolveSupabaseRole(username, email);

      await this.deps.ensureDataStore().upsertUser(
        username,
        this.deps.hashPassword(`supabase:${userPayload.id}`),
        role,
        workspaceId
      );
      await this.issueSession(res, username, workspaceId, role, {
        displayName: displayName || username,
        email,
        avatarUrl,
        createdDate,
        lastSignInDate
      });

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
    const currentAccessToken = cookies[this.deps.accessCookieName];
    const currentPayload = currentAccessToken
      ? verifyAccessToken(currentAccessToken, this.deps.authCookieSecret)
      : null;
    if (!refreshToken) {
      res.status(401).json({ success: false, error: 'Missing refresh token' });
      return;
    }

    const refreshTokenHash = hashRefreshToken(refreshToken, this.deps.authCookieSecret);
    const record = await this.deps.ensureDataStore().getRefreshToken(refreshTokenHash);
    if (!record || record.revokedAt || new Date(record.expiresAt).getTime() <= Date.now()) {
      if (record && !record.revokedAt) await this.deps.ensureDataStore().revokeRefreshToken(refreshTokenHash);
      this.deps.clearCookie(res, this.deps.accessCookieName);
      this.deps.clearCookie(res, this.deps.refreshCookieName);
      res.status(401).json({ success: false, error: 'Refresh token is invalid or expired' });
      return;
    }

    await this.deps.ensureDataStore().revokeRefreshToken(refreshTokenHash);
    const newRefreshToken = createRefreshToken();
    const newRefreshHash = hashRefreshToken(newRefreshToken, this.deps.authCookieSecret);
    const refreshExpiresAt = new Date(Date.now() + this.deps.authRefreshTtlSec * 1000).toISOString();
    await this.deps.ensureDataStore().saveRefreshToken(newRefreshHash, record.username, refreshExpiresAt);

    const refreshedUser = await this.deps.ensureDataStore().getUser(record.username);
    const refreshedWorkspaceId = refreshedUser?.workspaceId || record.username;
    const refreshedRole = (refreshedUser?.role || this.deps.getUserRole(record.username, refreshedWorkspaceId)) as AppUserRole;
    const newAccessToken = createAccessToken(
      record.username,
      this.deps.authCookieSecret,
      this.deps.authAccessTtlSec,
      refreshedWorkspaceId,
      refreshedRole,
      currentPayload?.displayName || record.username,
      currentPayload?.email,
      currentPayload?.avatarUrl,
      currentPayload?.createdDate,
      currentPayload?.lastSignInDate
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
      await this.deps.ensureDataStore().revokeRefreshToken(refreshTokenHash);
    }
    this.deps.clearCookie(res, this.deps.accessCookieName);
    this.deps.clearCookie(res, this.deps.refreshCookieName);
    res.json({ success: true });
  };

  private getLoginPage = async (req: express.Request, res: express.Response): Promise<void> => {
    if (this.deps.authMode === 'NONE') {
      res.redirect('/');
      return;
    }
    const ctx = await this.deps.resolveAuthContext(req as AuthenticatedRequest, res);
    if (ctx) {
      res.redirect('/');
      return;
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.sendFile(path.join(this.deps.publicDir, 'login.html'));
  };

  private getUsersPage = (_req: express.Request, res: express.Response): void => {
    if (this.isSaasMode()) {
      res.status(404).send('Not Found');
      return;
    }
    res.sendFile(path.join(this.deps.publicDir, 'users.html'));
  };

  private getAuthorizationPage = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'authorization.html'));
  };
}

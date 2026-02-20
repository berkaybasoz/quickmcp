import crypto from 'crypto';
import express from 'express';
import fsSync from 'fs';
import path from 'path';
import { IDataStore } from '../database/datastore';
import { AuthMode, LiteAdminUser } from '../config/auth-config';
import { createAccessToken, createRefreshToken, hashRefreshToken, verifyAccessToken } from './token-utils';

export type AppUserRole = 'admin' | 'user';
export type AuthContext = { username: string; workspaceId: string; role: AppUserRole };

export interface CreateMcpTokenResult {
  token: string;
  expiresAt: string | null;
  tokenHash: string;
  tokenId: string;
}

export interface AuthUtilsConfig {
  authMode: AuthMode;
  authDefaultUsername: string;
  authCookieSecret: string;
  authAccessTtlSec: number;
  authRefreshTtlSec: number;
  accessCookieName: string;
  refreshCookieName: string;
  authAdminUsers: LiteAdminUser[];
  cookieSecure: boolean;
  ensureDataStore: () => IDataStore;
}

export type McpIdentity = {
  tokenId: string;
  username: string;
  workspace: string;
  role: string;
};

export type McpTokenAuthRecord = {
  id: string;
  tokenName: string;
  workspaceId: string;
  subjectUsername: string;
  allowAllServers: boolean;
  allowAllTools: boolean;
  allowAllResources: boolean;
  serverIds: string[];
  allowedTools: string[];
  allowedResources: string[];
  serverRules: Record<string, boolean | null>;
  toolRules: Record<string, boolean | null>;
  resourceRules: Record<string, boolean | null>;
  neverExpires: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
};

export class AuthUtils {
  private readonly authMode: AuthMode;
  private readonly authDefaultUsername: string;
  private readonly authCookieSecret: string;
  private readonly authAccessTtlSec: number;
  private readonly authRefreshTtlSec: number;
  private readonly accessCookieName: string;
  private readonly refreshCookieName: string;
  private readonly authAdminUsers: LiteAdminUser[];
  private readonly cookieSecure: boolean;
  private readonly ensureDataStore: () => IDataStore;

  constructor(config: AuthUtilsConfig) {
    this.authMode = config.authMode;
    this.authDefaultUsername = config.authDefaultUsername;
    this.authCookieSecret = config.authCookieSecret;
    this.authAccessTtlSec = config.authAccessTtlSec;
    this.authRefreshTtlSec = config.authRefreshTtlSec;
    this.accessCookieName = config.accessCookieName;
    this.refreshCookieName = config.refreshCookieName;
    this.authAdminUsers = config.authAdminUsers;
    this.cookieSecure = config.cookieSecure;
    this.ensureDataStore = config.ensureDataStore;
  }

  normalizeUsername(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  isNoneMode(): boolean {
    return this.authMode === 'NONE';
  }

  hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  verifyPassword(password: string, expectedHash: string): boolean {
    return this.hashPassword(password) === expectedHash;
  }

  createMcpToken(
    username: string,
    workspaceId: string,
    role: AppUserRole,
    ttlSec?: number
  ): CreateMcpTokenResult {
    const nowSec = Math.floor(Date.now() / 1000);
    const tokenId = crypto.randomUUID();
    const hasExpiry = typeof ttlSec === 'number' && Number.isFinite(ttlSec) && ttlSec > 0;
    const payload = {
      jti: tokenId,
      sub: username,
      ws: workspaceId,
      role,
      typ: 'quickmcp-mcp',
      iat: nowSec,
      ...(hasExpiry ? { exp: nowSec + Number(ttlSec) } : {})
    };

    const payloadEncoded = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.signMcpToken(payloadEncoded);
    const token = `${payloadEncoded}.${signature}`;
    return {
      token,
      expiresAt: hasExpiry ? new Date((nowSec + Number(ttlSec)) * 1000).toISOString() : null,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      tokenId
    };
  }

  getUserRole(username: string, workspaceId?: string): AppUserRole {
    if (!username) return 'user';
    if (this.authMode === 'NONE') return 'admin';
    void workspaceId;
    return this.authAdminUsers.some((item) => item.username === username) ? 'admin' : 'user';
  }

  isAdminUser(username: string, workspaceId?: string): boolean {
    return this.getUserRole(username, workspaceId) === 'admin';
  }

  parseCookies(req: express.Request): Record<string, string> {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return {};
    return cookieHeader.split(';').reduce((acc, cookie) => {
      const [rawName, ...rest] = cookie.trim().split('=');
      if (!rawName) return acc;
      acc[rawName] = decodeURIComponent(rest.join('='));
      return acc;
    }, {} as Record<string, string>);
  }

  setCookie(res: express.Response, name: string, value: string, maxAgeSec: number): void {
    const parts = [
      `${name}=${encodeURIComponent(value)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${maxAgeSec}`
    ];
    if (this.cookieSecure) {
      parts.push('Secure');
    }
    res.append('Set-Cookie', parts.join('; '));
  }

  clearCookie(res: express.Response, name: string): void {
    const parts = [`${name}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
    if (this.cookieSecure) {
      parts.push('Secure');
    }
    res.append('Set-Cookie', parts.join('; '));
  }

  getEffectiveUsername(req: { authWorkspace?: string; authUser?: string }): string {
    if (this.authMode === 'NONE') return this.authDefaultUsername;
    return req.authWorkspace || req.authUser || '';
  }

  getNoneModeAuthContext(): AuthContext {
    return {
      username: this.authDefaultUsername,
      workspaceId: this.authDefaultUsername,
      role: 'admin'
    };
  }

  applyNoneModeAuth(req: { authUser?: string; authWorkspace?: string; authRole?: AppUserRole }): void {
    const ctx = this.getNoneModeAuthContext();
    req.authUser = ctx.username;
    req.authWorkspace = ctx.workspaceId;
    req.authRole = ctx.role;
  }

  resolvePublicDir(currentDir: string): string {
    const candidates = [
      path.join(process.cwd(), 'src', 'web', 'public'),
      path.join(process.cwd(), 'dist', 'web', 'public'),
      path.join(currentDir, 'public'),
      path.join(currentDir, '..', 'web', 'public'),
      path.join(currentDir, '..', '..', 'src', 'web', 'public')
    ];

    for (const dir of candidates) {
      if (fsSync.existsSync(dir)) {
        return dir;
      }
    }

    return candidates[0];
  }

  buildServerId(ownerUsername: string, serverName: string): string {
    return `${ownerUsername}__${serverName}`;
  }

  isPublicPath(pathname: string): boolean {
    if (pathname.startsWith('/api/auth')) return true;
    if (pathname === '/login') return true;
    if (pathname === '/' || pathname === '/landing' || pathname === '/pricing') return true;
    if (pathname.startsWith('/images/')) return true;
    if (
      pathname.endsWith('.js') ||
      pathname.endsWith('.css') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.ico')
    ) {
      return true;
    }
    return false;
  }

  getAuthenticatedUser(req: express.Request): string | null {
    if (this.authMode === 'NONE') return this.authDefaultUsername;
    const cookies = this.parseCookies(req);
    const accessToken = cookies[this.accessCookieName];
    if (!accessToken) return null;
    const payload = verifyAccessToken(accessToken, this.authCookieSecret);
    return payload?.sub || null;
  }

  async getUserRoleAsync(username: string, workspaceId?: string): Promise<AppUserRole> {
    if (!username) return 'user';
    if (this.authMode === 'NONE') return 'admin';

    try {
      const user = workspaceId
        ? await this.ensureDataStore().getUserInWorkspace(username, workspaceId)
        : await this.ensureDataStore().getUser(username);
      if (user?.role === 'admin') return 'admin';
    } catch {}

    return this.authAdminUsers.some((item) => item.username === username) ? 'admin' : 'user';
  }

  async seedLiteAdminsAsync(): Promise<void> {
    if (this.authMode !== 'LITE') return;
    if (this.authAdminUsers.length === 0) return;

    const store = this.ensureDataStore();
    for (const admin of this.authAdminUsers) {
      const username = this.normalizeUsername(admin.username);
      if (!username || !admin.password) continue;
      await store.upsertUser(username, this.hashPassword(admin.password), 'admin', username);
    }
  }

  async tryRefreshAuthAsync(req: express.Request, res: express.Response): Promise<string | null> {
    if (this.authMode === 'NONE') {
      return null;
    }

    const cookies = this.parseCookies(req);
    const refreshToken = cookies[this.refreshCookieName];
    if (!refreshToken) {
      return null;
    }

    const refreshTokenHash = hashRefreshToken(refreshToken, this.authCookieSecret);
    const store = this.ensureDataStore();
    const record = await store.getRefreshToken(refreshTokenHash);
    if (!record) {
      return null;
    }

    if (record.revokedAt || new Date(record.expiresAt).getTime() <= Date.now()) {
      if (!record.revokedAt) {
        await store.revokeRefreshToken(refreshTokenHash);
      }
      this.clearCookie(res, this.accessCookieName);
      this.clearCookie(res, this.refreshCookieName);
      return null;
    }

    await store.revokeRefreshToken(refreshTokenHash);
    const newRefreshToken = createRefreshToken();
    const newRefreshHash = hashRefreshToken(newRefreshToken, this.authCookieSecret);
    const refreshExpiresAt = new Date(Date.now() + this.authRefreshTtlSec * 1000).toISOString();
    await store.saveRefreshToken(newRefreshHash, record.username, refreshExpiresAt);

    const refreshedUser = await store.getUser(record.username);
    const refreshedWorkspaceId = refreshedUser?.workspaceId || record.username;
    const refreshedRole = refreshedUser?.role || await this.getUserRoleAsync(record.username, refreshedWorkspaceId);
    const newAccessToken = createAccessToken(
      record.username,
      this.authCookieSecret,
      this.authAccessTtlSec,
      refreshedWorkspaceId,
      refreshedRole
    );
    this.setCookie(res, this.accessCookieName, newAccessToken, this.authAccessTtlSec);
    this.setCookie(res, this.refreshCookieName, newRefreshToken, this.authRefreshTtlSec);
    return record.username;
  }

  async resolveAuthContextAsync(
    req: express.Request & { authUser?: string },
    res?: express.Response
  ): Promise<AuthContext | null> {
    if (this.authMode === 'NONE') {
      return this.getNoneModeAuthContext();
    }

    const username = req.authUser
      || this.getAuthenticatedUser(req)
      || (res ? await this.tryRefreshAuthAsync(req, res) : null)
      || '';
    if (!username) return null;

    const payload = (() => {
      const cookies = this.parseCookies(req);
      const accessToken = cookies[this.accessCookieName];
      return accessToken ? verifyAccessToken(accessToken, this.authCookieSecret) : null;
    })();

    const user = await this.ensureDataStore().getUser(username);
    if (!user) {
      if (res) {
        this.clearCookie(res, this.accessCookieName);
        this.clearCookie(res, this.refreshCookieName);
      }
      return null;
    }
    const workspaceId = (payload?.ws || user?.workspaceId || username).trim();
    const role = await this.getUserRoleAsync(username, workspaceId);
    return { username, workspaceId, role };
  }

  async requireAdminApiAsync(
    req: express.Request & { authUser?: string },
    res: express.Response
  ): Promise<AuthContext | null> {
    const ctx = await this.resolveAuthContextAsync(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return null;
    }
    if (ctx.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin role is required' });
      return null;
    }
    return ctx;
  }

  async applyAuthenticatedRequestContextAsync(
    req: express.Request & { authUser?: string; authWorkspace?: string; authRole?: AppUserRole },
    res: express.Response
  ): Promise<boolean> {
    const username = this.getAuthenticatedUser(req);
    const effectiveUser = username || await this.tryRefreshAuthAsync(req, res);
    if (!effectiveUser) {
      if (req.path.startsWith('/api/')) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      } else {
        res.redirect('/login');
      }
      return false;
    }

    req.authUser = effectiveUser;
    const ctx = await this.resolveAuthContextAsync(req, res);
    if (!ctx) {
      if (req.path.startsWith('/api/')) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      } else {
        res.redirect('/login');
      }
      return false;
    }
    req.authWorkspace = ctx.workspaceId;
    req.authRole = ctx.role;
    return true;
  }

  private base64UrlEncode(input: string): string {
    return Buffer.from(input, 'utf8').toString('base64url');
  }

  private signMcpToken(payloadEncoded: string): string {
    const secret = process.env.QUICKMCP_TOKEN_SECRET || this.authCookieSecret;
    return crypto.createHmac('sha256', secret).update(payloadEncoded).digest('base64url');
  }
}

export function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeRuleMap(value: unknown): Record<string, boolean | null> {
  let obj: Record<string, unknown> = {};
  if (value && typeof value === 'object') {
    obj = value as Record<string, unknown>;
  } else if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      obj = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    } catch {
      obj = {};
    }
  }
  const out: Record<string, boolean | null> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = String(k || '').trim();
    if (!key) continue;
    if (v === true || v === 'allow' || v === 'true' || v === 1 || v === '1') out[key] = true;
    else if (v === false || v === 'deny' || v === 'false' || v === -1 || v === '-1') out[key] = false;
    else out[key] = null;
  }
  return out;
}

export function getMcpTokenRecord(
  dataStore: { getMcpTokenByHash?: (tokenHash: string) => any },
  mcpAuthMode: AuthMode,
  mcpTokenHash: string
): McpTokenAuthRecord | null {
  if (mcpAuthMode === 'NONE') return null;
  if (!mcpTokenHash || typeof dataStore.getMcpTokenByHash !== 'function') return null;
  try {
    const row = dataStore.getMcpTokenByHash(mcpTokenHash);
    if (!row) return null;
    return {
      id: row.id,
      tokenName: String(row.tokenName || row.token_name || ''),
      workspaceId: String(row.workspaceId || row.workspace_id || ''),
      subjectUsername: String(row.subjectUsername || row.subject_username || ''),
      allowAllServers: row.allowAllServers === true || Number(row.allow_all_servers) === 1,
      allowAllTools: row.allowAllTools === true || Number(row.allow_all_tools) === 1,
      allowAllResources: row.allowAllResources === true || Number(row.allow_all_resources) === 1,
      serverIds: normalizeStringArray(row.serverIds || row.server_ids_json),
      allowedTools: normalizeStringArray(row.allowedTools || row.allowed_tools_json),
      allowedResources: normalizeStringArray(row.allowedResources || row.allowed_resources_json),
      serverRules: normalizeRuleMap(row.serverRules || row.server_rules_json || {}),
      toolRules: normalizeRuleMap(row.toolRules || row.tool_rules_json || {}),
      resourceRules: normalizeRuleMap(row.resourceRules || row.resource_rules_json || {}),
      neverExpires: row.neverExpires === true || Number(row.never_expires) === 1,
      expiresAt: row.expiresAt ? String(row.expiresAt) : (row.expires_at ? String(row.expires_at) : null),
      revokedAt: row.revokedAt ? String(row.revokedAt) : (row.revoked_at ? String(row.revoked_at) : null)
    };
  } catch {
    return null;
  }
}

export function isMcpAuthorizedGlobally(
  mcpAuthMode: AuthMode,
  mcpIdentity: McpIdentity | null,
  mcpTokenRecord: McpTokenAuthRecord | null
): boolean {
  if (mcpAuthMode === 'NONE') return true;
  if (!mcpIdentity || !mcpTokenRecord) return false;
  if (mcpTokenRecord.revokedAt) return false;
  if (mcpTokenRecord.id && mcpIdentity.tokenId && mcpTokenRecord.id !== mcpIdentity.tokenId) return false;
  if (mcpTokenRecord.subjectUsername !== mcpIdentity.username) return false;
  if (mcpTokenRecord.workspaceId !== mcpIdentity.workspace) return false;
  if (!mcpTokenRecord.neverExpires && mcpTokenRecord.expiresAt) {
    const expiresMs = Date.parse(mcpTokenRecord.expiresAt);
    if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) return false;
  }
  return true;
}

export function parseServerOwner(serverId: string): string {
  const idx = String(serverId || '').indexOf('__');
  if (idx <= 0) return '';
  return String(serverId).slice(0, idx);
}

export function isServerOwnedByCurrentIdentity(
  mcpAuthMode: AuthMode,
  mcpIdentity: McpIdentity | null,
  mcpTokenRecord: McpTokenAuthRecord | null,
  serverId: string
): boolean {
  if (mcpAuthMode === 'NONE') return true;
  if (!mcpIdentity || !mcpTokenRecord) return false;
  const owner = parseServerOwner(serverId);
  return owner === mcpIdentity.workspace || owner === mcpIdentity.username;
}

export function getServerRequireMcpToken(
  mcpAuthMode: AuthMode,
  dataStore: {
    getServerAuthConfig?: (serverId: string) => any;
    getMcpTokenPolicy?: (scopeType: 'global' | 'user' | 'server' | 'tool', scopeId: string) => any;
  },
  serverId: string
): boolean {
  if (mcpAuthMode === 'NONE') return false;
  let requireToken = true;
  try {
    const globalCfg = typeof dataStore.getMcpTokenPolicy === 'function'
      ? dataStore.getMcpTokenPolicy('global', '*')
      : null;
    if (globalCfg) {
      requireToken = globalCfg.requireMcpToken !== false;
    }
    const owner = parseServerOwner(serverId);
    if (owner && typeof dataStore.getMcpTokenPolicy === 'function') {
      const userCfg = dataStore.getMcpTokenPolicy('user', owner);
      if (userCfg) {
        requireToken = userCfg.requireMcpToken !== false;
      }
    }
    if (typeof dataStore.getMcpTokenPolicy === 'function') {
      const serverCfg = dataStore.getMcpTokenPolicy('server', serverId);
      if (serverCfg) {
        return serverCfg.requireMcpToken !== false;
      }
    }
    if (typeof dataStore.getServerAuthConfig === 'function') {
      const legacyCfg = dataStore.getServerAuthConfig(serverId);
      if (legacyCfg) {
        return legacyCfg.requireMcpToken !== false;
      }
    }
  } catch {}
  return requireToken;
}

function getToolRequireMcpToken(
  mcpAuthMode: AuthMode,
  dataStore: {
    getServerAuthConfig?: (serverId: string) => any;
    getMcpTokenPolicy?: (scopeType: 'global' | 'user' | 'server' | 'tool', scopeId: string) => any;
  },
  serverId: string,
  toolName: string
): boolean {
  const inherited = getServerRequireMcpToken(mcpAuthMode, dataStore, serverId);
  if (mcpAuthMode === 'NONE') return false;
  if (typeof dataStore.getMcpTokenPolicy !== 'function') return inherited;
  try {
    const toolCfg = dataStore.getMcpTokenPolicy('tool', `${serverId}__${toolName}`);
    if (!toolCfg) return inherited;
    return toolCfg.requireMcpToken !== false;
  } catch {
    return inherited;
  }
}

export function isServerAuthorized(
  mcpAuthMode: AuthMode,
  dataStore: {
    getServerAuthConfig?: (serverId: string) => any;
    getMcpTokenPolicy?: (scopeType: 'global' | 'user' | 'server' | 'tool', scopeId: string) => any;
  },
  mcpIdentity: McpIdentity | null,
  mcpTokenRecord: McpTokenAuthRecord | null,
  serverId: string
): boolean {
  if (mcpAuthMode === 'NONE') return true;
  const requireToken = getServerRequireMcpToken(mcpAuthMode, dataStore, serverId);
  if (!requireToken) return true;

  if (!isMcpAuthorizedGlobally(mcpAuthMode, mcpIdentity, mcpTokenRecord)) return false;
  if (!isServerOwnedByCurrentIdentity(mcpAuthMode, mcpIdentity, mcpTokenRecord, serverId)) return false;
  if (mcpTokenRecord && mcpTokenRecord.serverRules && Object.prototype.hasOwnProperty.call(mcpTokenRecord.serverRules, serverId)) {
    const decision = mcpTokenRecord.serverRules[serverId];
    if (decision === false) return false;
    if (decision === true) return true;
  }
  if (mcpTokenRecord && !mcpTokenRecord.allowAllServers) {
    if (!mcpTokenRecord.serverIds.includes(serverId)) return false;
  }
  return true;
}

export function isToolAuthorized(
  mcpAuthMode: AuthMode,
  dataStore: {
    getServerAuthConfig?: (serverId: string) => any;
    getMcpTokenPolicy?: (scopeType: 'global' | 'user' | 'server' | 'tool', scopeId: string) => any;
  },
  mcpIdentity: McpIdentity | null,
  mcpTokenRecord: McpTokenAuthRecord | null,
  serverId: string,
  toolName: string
): boolean {
  const requireToken = getToolRequireMcpToken(mcpAuthMode, dataStore, serverId, toolName);
  if (!requireToken) return true;
  if (!isMcpAuthorizedGlobally(mcpAuthMode, mcpIdentity, mcpTokenRecord)) return false;
  if (!isServerOwnedByCurrentIdentity(mcpAuthMode, mcpIdentity, mcpTokenRecord, serverId)) return false;
  const full = `${serverId}__${toolName}`;
  if (mcpAuthMode !== 'NONE' && mcpTokenRecord) {
    if (mcpTokenRecord.toolRules && Object.prototype.hasOwnProperty.call(mcpTokenRecord.toolRules, full)) {
      const decision = mcpTokenRecord.toolRules[full];
      if (decision === false) return false;
      if (decision === true) return true;
    }
    if (!mcpTokenRecord.allowAllTools) {
      return mcpTokenRecord.allowedTools.includes(full);
    }
    return true;
  }
  return true;
}

export function isResourceAuthorized(
  mcpAuthMode: AuthMode,
  dataStore: {
    getServerAuthConfig?: (serverId: string) => any;
    getMcpTokenPolicy?: (scopeType: 'global' | 'user' | 'server' | 'tool', scopeId: string) => any;
  },
  mcpIdentity: McpIdentity | null,
  mcpTokenRecord: McpTokenAuthRecord | null,
  serverId: string,
  resourceName: string
): boolean {
  if (!isServerAuthorized(mcpAuthMode, dataStore, mcpIdentity, mcpTokenRecord, serverId)) return false;
  const full = `${serverId}__${resourceName}`;
  if (mcpAuthMode !== 'NONE' && mcpTokenRecord) {
    if (mcpTokenRecord.resourceRules && Object.prototype.hasOwnProperty.call(mcpTokenRecord.resourceRules, full)) {
      const decision = mcpTokenRecord.resourceRules[full];
      if (decision === false) return false;
      if (decision === true) return true;
    }
    if (!mcpTokenRecord.allowAllResources) {
      return mcpTokenRecord.allowedResources.includes(full);
    }
    return true;
  }
  return true;
}

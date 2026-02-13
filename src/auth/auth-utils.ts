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

    try {
      const user = workspaceId
        ? this.ensureDataStore().getUserInWorkspace(username, workspaceId)
        : this.ensureDataStore().getUser(username);
      if (user?.role === 'admin') return 'admin';
    } catch {}

    return this.authAdminUsers.some((item) => item.username === username) ? 'admin' : 'user';
  }

  isAdminUser(username: string, workspaceId?: string): boolean {
    return this.getUserRole(username, workspaceId) === 'admin';
  }

  seedLiteAdmins(): void {
    if (this.authMode !== 'LITE') return;
    if (this.authAdminUsers.length === 0) return;

    const store = this.ensureDataStore();
    for (const admin of this.authAdminUsers) {
      const username = this.normalizeUsername(admin.username);
      if (!username || !admin.password) continue;
      store.upsertUser(username, this.hashPassword(admin.password), 'admin', username);
    }
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
    const distPublicDir = path.join(currentDir, 'public');
    const distWebPublicDir = path.join(currentDir, '..', 'web', 'public');
    const srcPublicDir = path.join(currentDir, '..', '..', 'src', 'web', 'public');
    if (fsSync.existsSync(srcPublicDir)) return srcPublicDir;
    if (fsSync.existsSync(distPublicDir)) return distPublicDir;
    return distWebPublicDir;
  }

  buildServerId(ownerUsername: string, serverName: string): string {
    return `${ownerUsername}__${serverName}`;
  }

  isPublicPath(pathname: string): boolean {
    if (pathname.startsWith('/api/auth')) return true;
    if (pathname === '/login') return true;
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

  tryRefreshAuth(req: express.Request, res: express.Response): string | null {
    if (this.authMode !== 'LITE') {
      return null;
    }

    const cookies = this.parseCookies(req);
    const refreshToken = cookies[this.refreshCookieName];
    if (!refreshToken) {
      return null;
    }

    const refreshTokenHash = hashRefreshToken(refreshToken, this.authCookieSecret);
    const record = this.ensureDataStore().getRefreshToken(refreshTokenHash);
    if (!record || record.revokedAt || new Date(record.expiresAt).getTime() <= Date.now()) {
      if (record && !record.revokedAt) {
        this.ensureDataStore().revokeRefreshToken(refreshTokenHash);
      }
      this.clearCookie(res, this.accessCookieName);
      this.clearCookie(res, this.refreshCookieName);
      return null;
    }

    this.ensureDataStore().revokeRefreshToken(refreshTokenHash);
    const newRefreshToken = createRefreshToken();
    const newRefreshHash = hashRefreshToken(newRefreshToken, this.authCookieSecret);
    const refreshExpiresAt = new Date(Date.now() + this.authRefreshTtlSec * 1000).toISOString();
    this.ensureDataStore().saveRefreshToken(newRefreshHash, record.username, refreshExpiresAt);

    const refreshedUser = this.ensureDataStore().getUser(record.username);
    const refreshedWorkspaceId = refreshedUser?.workspaceId || record.username;
    const refreshedRole = refreshedUser?.role || this.getUserRole(record.username, refreshedWorkspaceId);
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

  resolveAuthContext(
    req: express.Request & { authUser?: string },
    res?: express.Response
  ): AuthContext | null {
    if (this.authMode === 'NONE') {
      return this.getNoneModeAuthContext();
    }

    const username = req.authUser || this.getAuthenticatedUser(req) || (res ? this.tryRefreshAuth(req, res) : null) || '';
    if (!username) return null;

    const payload = (() => {
      const cookies = this.parseCookies(req);
      const accessToken = cookies[this.accessCookieName];
      return accessToken ? verifyAccessToken(accessToken, this.authCookieSecret) : null;
    })();

    const user = this.ensureDataStore().getUser(username);
    const workspaceId = (payload?.ws || user?.workspaceId || username).trim();
    const role = this.getUserRole(username, workspaceId);
    return { username, workspaceId, role };
  }

  requireAdminApi(
    req: express.Request & { authUser?: string },
    res: express.Response
  ): AuthContext | null {
    const ctx = this.resolveAuthContext(req, res);
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

  applyAuthenticatedRequestContext(
    req: express.Request & { authUser?: string; authWorkspace?: string; authRole?: AppUserRole },
    res: express.Response
  ): boolean {
    const username = this.getAuthenticatedUser(req);
    const effectiveUser = username || this.tryRefreshAuth(req, res);
    if (!effectiveUser) {
      if (req.path.startsWith('/api/')) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      } else {
        res.redirect('/login');
      }
      return false;
    }

    req.authUser = effectiveUser;
    const ctx = this.resolveAuthContext(req, res);
    if (ctx) {
      req.authWorkspace = ctx.workspaceId;
      req.authRole = ctx.role;
    }
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

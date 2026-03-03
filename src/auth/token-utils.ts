import crypto from 'crypto';

export const AUTH_COOKIE_NAMES = {
  access: 'quickmcp_access',
  refresh: 'quickmcp_refresh'
} as const;

export function isSecureCookieEnv(nodeEnv: string | undefined): boolean {
  return nodeEnv === 'production';
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(message: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(message).digest('base64url');
}

export interface AccessTokenPayload {
  sub: string;
  ws?: string;
  role?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  createdDate?: string;
  lastSignInDate?: string;
  exp: number;
  iat: number;
}

export interface McpTokenPayload {
  jti?: string;
  sub: string;
  ws?: string;
  workspace?: string;
  role?: string;
  typ?: string;
  iss?: string;
  aud?: string;
  scope?: string;
  iat?: number;
  exp?: number;
}

export function createAccessToken(
  username: string,
  secret: string,
  ttlSeconds: number,
  workspaceId?: string,
  role?: string,
  displayName?: string,
  email?: string,
  avatarUrl?: string,
  createdDate?: string,
  lastSignInDate?: string
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    sub: username,
    ws: workspaceId,
    role,
    displayName,
    email,
    avatarUrl,
    createdDate,
    lastSignInDate,
    iat: nowSec,
    exp: nowSec + ttlSeconds
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadEncoded, secret);
  return `${payloadEncoded}.${signature}`;
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload | null {
  const [payloadEncoded, signature] = token.split('.');
  if (!payloadEncoded || !signature) {
    return null;
  }

  const expected = sign(payloadEncoded, secret);
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadEncoded)) as AccessTokenPayload;
    if (!payload?.sub || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function verifyMcpToken(token: string, secret: string): McpTokenPayload | null {
  const parts = token.split('.');

  let payloadEncoded: string;
  let signingInput: string;
  let signature: string;

  if (parts.length === 3) {
    // Standard 3-part JWT: header.payload.signature
    [, payloadEncoded, signature] = parts;
    signingInput = `${parts[0]}.${parts[1]}`;
  } else if (parts.length === 2) {
    // Legacy 2-part format: payload.signature
    [payloadEncoded, signature] = parts;
    signingInput = parts[0];
  } else {
    return null;
  }

  if (!payloadEncoded || !signature) {
    return null;
  }

  const expected = sign(signingInput, secret);
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadEncoded)) as McpTokenPayload;
    if (!payload?.sub) {
      return null;
    }
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function verifyMcpTokenRS256(token: string, publicKey: crypto.KeyObject): McpTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerEncoded, payloadEncoded, signatureEncoded] = parts;

  try {
    const header = JSON.parse(Buffer.from(headerEncoded, 'base64url').toString('utf8'));
    if (header.alg !== 'RS256') return null;
  } catch {
    return null;
  }

  const signingInput = `${headerEncoded}.${payloadEncoded}`;
  const sigBuf = Buffer.from(signatureEncoded, 'base64url');
  const valid = crypto.verify('sha256', Buffer.from(signingInput), publicKey, sigBuf);
  if (!valid) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8')) as McpTokenPayload;
    if (!payload?.sub) return null;
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashRefreshToken(refreshToken: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(refreshToken).digest('hex');
}

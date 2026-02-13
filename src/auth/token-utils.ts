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
  exp: number;
  iat: number;
}

export function createAccessToken(username: string, secret: string, ttlSeconds: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    sub: username,
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

export function createRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashRefreshToken(refreshToken: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(refreshToken).digest('hex');
}

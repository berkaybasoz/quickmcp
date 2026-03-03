import crypto from 'crypto';
import { logger } from '../utils/logger';

export type JwkSet = { keys: object[] };

let rsaPrivateKey: crypto.KeyObject;
let rsaPublicKey: crypto.KeyObject;
let kid: string;

function deriveKid(publicKey: crypto.KeyObject): string {
  const der = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
  return crypto.createHash('sha256').update(der).digest('hex').slice(0, 16);
}

function initKeys(): void {
  const envKey = (process.env.QUICKMCP_RSA_PRIVATE_KEY || '').trim();
  if (envKey) {
    try {
      const pem = Buffer.from(envKey, 'base64').toString('utf8');
      rsaPrivateKey = crypto.createPrivateKey(pem);
      rsaPublicKey = crypto.createPublicKey(rsaPrivateKey);
      kid = (process.env.QUICKMCP_RSA_KID || '').trim() || deriveKid(rsaPublicKey);
      logger.info('[jwks] RSA key loaded from QUICKMCP_RSA_PRIVATE_KEY');
      return;
    } catch (err) {
      logger.warn(`[jwks] Failed to load RSA key from env: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  logger.warn('[jwks] QUICKMCP_RSA_PRIVATE_KEY not set — generating ephemeral RSA key pair. Access tokens will be invalidated on restart. Set QUICKMCP_RSA_PRIVATE_KEY for stable keys.');
  const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  rsaPrivateKey = pair.privateKey;
  rsaPublicKey = pair.publicKey;
  kid = deriveKid(rsaPublicKey);
}

initKeys();

export function getRsaPrivateKey(): crypto.KeyObject {
  return rsaPrivateKey;
}

export function getRsaPublicKey(): crypto.KeyObject {
  return rsaPublicKey;
}

export function getKid(): string {
  return kid;
}

export function getJwks(): JwkSet {
  const jwk = rsaPublicKey.export({ format: 'jwk' }) as Record<string, unknown>;
  return {
    keys: [{ ...jwk, use: 'sig', alg: 'RS256', kid }]
  };
}

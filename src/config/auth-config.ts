export type AuthMode = 'NONE' | 'LITE' | 'SUPABASE_GOOGLE';
export type DataProvider = 'SQLITE' | 'JDBC' | 'SUPABASE';
export type DeployMode = 'ONPREM' | 'SAAS';

export interface LiteAdminUser {
  username: string;
  password: string;
}

function mapLegacyAuthProvider(value: string | undefined): AuthMode | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'NONE') return 'NONE';
  if (normalized === 'LITE') return 'LITE';
  return null;
}

function resolveDeployMode(): DeployMode | null {
  const value = process.env.DEPLOY_MODE?.trim().toUpperCase();
  if (value === 'ONPREM' || value === 'SAAS') {
    return value;
  }
  return null;
}

export function resolveAuthMode(): AuthMode {
  const direct = process.env.AUTH_MODE?.trim().toUpperCase();
  if (direct === 'NONE' || direct === 'LITE' || direct === 'SUPABASE_GOOGLE') {
    return direct;
  }

  const legacy = mapLegacyAuthProvider(process.env.AUTH_PROVIDER);
  if (legacy) {
    console.warn('[DEPRECATED] AUTH_PROVIDER is deprecated. Use AUTH_MODE instead.');
    return legacy;
  }

  const deployMode = resolveDeployMode();
  if (deployMode === 'ONPREM') {
    return 'LITE';
  }
  if (deployMode === 'SAAS') {
    return 'SUPABASE_GOOGLE';
  }

  return 'NONE';
}

export function resolveDataProvider(): DataProvider {
  const direct = process.env.DATA_PROVIDER?.trim().toUpperCase();
  if (direct === 'SQLITE' || direct === 'JDBC' || direct === 'SUPABASE') {
    return direct;
  }

  const deployMode = resolveDeployMode();
  if (deployMode === 'ONPREM') {
    return 'SQLITE';
  }
  if (deployMode === 'SAAS') {
    return 'SUPABASE';
  }

  return 'SQLITE';
}

export function getAuthDefaultUsername(): string {
  return (process.env.AUTH_DEFAULT_USERNAME || 'guest').trim() || 'guest';
}

export function parseAuthAdminUsers(): LiteAdminUser[] {
  const raw = (process.env.AUTH_ADMIN_USERS || '').trim();
  if (!raw) {
    console.warn('AUTH_ADMIN_USERS is not set. No LITE admin users loaded.');
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('AUTH_ADMIN_USERS must be a JSON array');
    }

    const users = parsed
      .map((item: any) => ({
        username: typeof item?.username === 'string' ? item.username.trim() : '',
        password: typeof item?.password === 'string' ? item.password : ''
      }))
      .filter((item: LiteAdminUser) => item.username.length > 0 && item.password.length > 0);

    if (users.length === 0) {
      console.warn('AUTH_ADMIN_USERS is set but no valid users parsed.');
    }
    return users;
  } catch (error) {
    console.warn('AUTH_ADMIN_USERS parse failed:', error instanceof Error ? error.message : error);
    return [];
  }
}

export function getAuthCookieSecret(): string {
  return process.env.AUTH_COOKIE_SECRET || 'change-me';
}

export function getAuthAccessTtlSeconds(): number {
  const raw = Number(process.env.AUTH_ACCESS_TOKEN_TTL_SEC || '900');
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 900;
}

export function getAuthRefreshTtlSeconds(): number {
  const raw = Number(process.env.AUTH_REFRESH_TOKEN_TTL_SEC || '2592000');
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 2592000;
}

export function validateAuthDataProviderCompatibility(dataProvider: string, authMode: AuthMode): void {
  if (authMode === 'SUPABASE_GOOGLE' && dataProvider !== 'SUPABASE') {
    throw new Error('AUTH_MODE=SUPABASE_GOOGLE requires DATA_PROVIDER=SUPABASE');
  }
}

class SupabaseAuthProperty {
  constructor(
    public readonly supabaseUrl: string,
    public readonly supabaseAnonKey: string,
    public readonly supabaseAdminEmails: string[],
    public readonly appBaseUrl: string
  ) {}
}

export class AuthProperty {
  constructor(private readonly provider: SupabaseAuthProperty) {}

  get providerUrl(): string {
    return this.provider.supabaseUrl;
  }

  get publicKey(): string {
    return this.provider.supabaseAnonKey;
  }

  get adminEmails(): string[] {
    return this.provider.supabaseAdminEmails;
  }

  get appBaseUrl(): string {
    return this.provider.appBaseUrl;
  }
}

export function getAuthProperty(env: NodeJS.ProcessEnv = process.env): AuthProperty {
  const supabaseUrl = (env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const supabaseAnonKey = (env.SUPABASE_ANON_KEY || '').trim();
  const supabaseAdminEmails = (env.SUPABASE_ADMIN_EMAILS || '')
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  const appBaseUrl = (env.APP_BASE_URL || '').trim() || `http://localhost:${env.PORT || 3000}`;

  return new AuthProperty(
    new SupabaseAuthProperty(
      supabaseUrl,
      supabaseAnonKey,
      supabaseAdminEmails,
      appBaseUrl
    )
  );
}

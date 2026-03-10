export class Constant {
  static readonly AuthMode = class AuthMode {
    static readonly NONE = 'NONE' as const;
    static readonly LITE = 'LITE' as const;
    static readonly SUPABASE_GOOGLE = 'SUPABASE_GOOGLE' as const;
  };

  static readonly TokenMode = class TokenMode {
    static readonly RSA = 'RSA' as const;
    static readonly LOCAL = 'LOCAL' as const;
  };

  static readonly Roles = class Roles {
    static readonly USER = 'user' as const;
    static readonly ADMIN = 'admin' as const;
  };
}

export type TokenMode = typeof Constant.TokenMode.RSA | typeof Constant.TokenMode.LOCAL;

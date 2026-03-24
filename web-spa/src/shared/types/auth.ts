export type AuthMe = {
  username?: string;
  displayName?: string;
  email?: string;
  role?: string;
  authMode?: string;
};

export type AuthConfig = {
  deployMode?: string;
  isSaasMode?: boolean;
  authMode?: string;
};

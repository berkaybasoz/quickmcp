export type AuthMe = {
  username?: string;
  displayName?: string;
  email?: string;
  role?: string;
  authMode?: string;
  workspaceId?: string;
  avatarUrl?: string;
  createdDate?: string;
  lastSignInDate?: string;
  isAdmin?: boolean;
};

export type AuthConfig = {
  deployMode?: string;
  isSaasMode?: boolean;
  authMode?: string;
};

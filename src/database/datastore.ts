export interface ServerConfig {
  id: string;
  name: string;
  version: string;
  ownerUsername: string;
  sourceConfig: {
    type: string;
    [key: string]: unknown;
  };
  createdAt: string;
}

export interface ToolDefinition {
  server_id: string;
  name: string;
  description: string;
  inputSchema: any;
  sqlQuery: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
}

export interface ResourceDefinition {
  server_id: string;
  name: string;
  description: string;
  uri_template: string;
  sqlQuery: string;
}

export interface RefreshTokenRecord {
  tokenHash: string;
  username: string;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
}

export type UserRole = 'admin' | 'user';

export interface UserRecord {
  username: string;
  workspaceId: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface ServerAuthConfig {
  serverId: string;
  requireMcpToken: boolean;
  updatedAt: string;
}

export type McpTokenPolicyScope = 'global' | 'user' | 'server' | 'tool';

export interface McpTokenPolicyRecord {
  scopeType: McpTokenPolicyScope;
  scopeId: string;
  requireMcpToken: boolean;
  updatedAt: string;
}

export interface McpTokenRecord {
  id: string;
  tokenName: string;
  workspaceId: string;
  subjectUsername: string;
  createdBy: string;
  tokenHash: string;
  tokenValue: string;
  allowAllServers: boolean;
  allowAllTools: boolean;
  allowAllResources: boolean;
  serverIds: string[];
  allowedTools: string[];
  allowedResources: string[];
  serverRules?: Record<string, boolean | null>;
  toolRules?: Record<string, boolean | null>;
  resourceRules?: Record<string, boolean | null>;
  neverExpires: boolean;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface McpTokenCreateInput {
  id: string;
  tokenName: string;
  workspaceId: string;
  subjectUsername: string;
  createdBy: string;
  tokenHash: string;
  tokenValue: string;
  allowAllServers: boolean;
  allowAllTools: boolean;
  allowAllResources: boolean;
  serverIds: string[];
  allowedTools: string[];
  allowedResources: string[];
  serverRules?: Record<string, boolean | null>;
  toolRules?: Record<string, boolean | null>;
  resourceRules?: Record<string, boolean | null>;
  neverExpires: boolean;
  expiresAt: string | null;
}

export interface IDataStore {
  saveServer(server: ServerConfig): Promise<void>;
  getServer(serverId: string): Promise<ServerConfig | null>;
  getServerForOwner(serverId: string, ownerUsername: string): Promise<ServerConfig | null>;
  getAllServers(): Promise<ServerConfig[]>;
  getAllServersByOwner(ownerUsername: string): Promise<ServerConfig[]>;
  serverNameExistsForOwner(serverName: string, ownerUsername: string): Promise<boolean>;
  deleteServer(serverId: string): Promise<void>;

  saveTools(tools: ToolDefinition[]): Promise<void>;
  getToolsForServer(serverId: string): Promise<ToolDefinition[]>;
  getAllTools(): Promise<ToolDefinition[]>;

  saveResources(resources: ResourceDefinition[]): Promise<void>;
  getResourcesForServer(serverId: string): Promise<ResourceDefinition[]>;
  getAllResources(): Promise<ResourceDefinition[]>;

  saveRefreshToken(tokenHash: string, username: string, expiresAt: string): Promise<void>;
  getRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  revokeAllRefreshTokensForUser(username: string): Promise<void>;

  getUser(username: string): Promise<UserRecord | null>;
  getUserInWorkspace(username: string, workspaceId: string): Promise<UserRecord | null>;
  getAllUsers(): Promise<Array<Omit<UserRecord, 'passwordHash'>>>;
  getAllUsersByWorkspace(workspaceId: string): Promise<Array<Omit<UserRecord, 'passwordHash'>>>;
  createUser(username: string, passwordHash: string, role: UserRole, workspaceId: string): Promise<void>;
  upsertUser(username: string, passwordHash: string, role: UserRole, workspaceId: string): Promise<void>;
  updateUserRole(username: string, workspaceId: string, role: UserRole): Promise<void>;

  getServerAuthConfig(serverId: string): Promise<ServerAuthConfig | null>;
  setServerAuthConfig(serverId: string, requireMcpToken: boolean): Promise<void>;
  getMcpTokenPolicy(scopeType: McpTokenPolicyScope, scopeId: string): Promise<McpTokenPolicyRecord | null>;
  listMcpTokenPolicies(scopeType?: McpTokenPolicyScope): Promise<McpTokenPolicyRecord[]>;
  setMcpTokenPolicy(scopeType: McpTokenPolicyScope, scopeId: string, requireMcpToken: boolean | null): Promise<void>;

  createMcpToken(input: McpTokenCreateInput): Promise<void>;
  getMcpTokenByHash(tokenHash: string): Promise<McpTokenRecord | null>;
  getMcpTokenById(id: string): Promise<McpTokenRecord | null>;
  getMcpTokensByWorkspace(workspaceId: string): Promise<McpTokenRecord[]>;
  revokeMcpToken(id: string): Promise<void>;

  close(): Promise<void>;
  getStats(): Promise<{ servers: number; tools: number; resources: number }>;
}

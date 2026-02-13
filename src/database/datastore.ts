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
  neverExpires: boolean;
  expiresAt: string | null;
}

export interface IDataStore {
  saveServer(server: ServerConfig): void;
  getServer(serverId: string): ServerConfig | null;
  getServerForOwner(serverId: string, ownerUsername: string): ServerConfig | null;
  getAllServers(): ServerConfig[];
  getAllServersByOwner(ownerUsername: string): ServerConfig[];
  serverNameExistsForOwner(serverName: string, ownerUsername: string): boolean;
  deleteServer(serverId: string): void;

  saveTools(tools: ToolDefinition[]): void;
  getToolsForServer(serverId: string): ToolDefinition[];
  getAllTools(): ToolDefinition[];

  saveResources(resources: ResourceDefinition[]): void;
  getResourcesForServer(serverId: string): ResourceDefinition[];
  getAllResources(): ResourceDefinition[];

  saveRefreshToken(tokenHash: string, username: string, expiresAt: string): void;
  getRefreshToken(tokenHash: string): RefreshTokenRecord | null;
  revokeRefreshToken(tokenHash: string): void;
  revokeAllRefreshTokensForUser(username: string): void;

  getUser(username: string): UserRecord | null;
  getUserInWorkspace(username: string, workspaceId: string): UserRecord | null;
  getAllUsers(): Array<Omit<UserRecord, 'passwordHash'>>;
  getAllUsersByWorkspace(workspaceId: string): Array<Omit<UserRecord, 'passwordHash'>>;
  createUser(username: string, passwordHash: string, role: UserRole, workspaceId: string): void;
  upsertUser(username: string, passwordHash: string, role: UserRole, workspaceId: string): void;
  updateUserRole(username: string, workspaceId: string, role: UserRole): void;

  getServerAuthConfig(serverId: string): ServerAuthConfig | null;
  setServerAuthConfig(serverId: string, requireMcpToken: boolean): void;

  createMcpToken(input: McpTokenCreateInput): void;
  getMcpTokenByHash(tokenHash: string): McpTokenRecord | null;
  getMcpTokenById(id: string): McpTokenRecord | null;
  getMcpTokensByWorkspace(workspaceId: string): McpTokenRecord[];
  revokeMcpToken(id: string): void;

  close(): void;
  getStats(): { servers: number; tools: number; resources: number };
}

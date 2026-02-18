import { IDataStore, RefreshTokenRecord, ResourceDefinition, ServerConfig, ToolDefinition, UserRecord, UserRole, ServerAuthConfig, McpTokenCreateInput, McpTokenRecord, McpTokenPolicyRecord, McpTokenPolicyScope } from './datastore';

export class JdbcDataStore implements IDataStore {
  constructor() {
    throw new Error('DATA_PROVIDER=JDBC is not implemented yet. Use DATA_PROVIDER=SQLITE for now.');
  }

  async saveServer(_server: ServerConfig): Promise<void> { throw new Error('Not implemented'); }
  async getServer(_serverId: string): Promise<ServerConfig | null> { throw new Error('Not implemented'); }
  async getServerForOwner(_serverId: string, _ownerUsername: string): Promise<ServerConfig | null> { throw new Error('Not implemented'); }
  async getAllServers(): Promise<ServerConfig[]> { throw new Error('Not implemented'); }
  async getAllServersByOwner(_ownerUsername: string): Promise<ServerConfig[]> { throw new Error('Not implemented'); }
  async serverNameExistsForOwner(_serverName: string, _ownerUsername: string): Promise<boolean> { throw new Error('Not implemented'); }
  async deleteServer(_serverId: string): Promise<void> { throw new Error('Not implemented'); }

  async saveTools(_tools: ToolDefinition[]): Promise<void> { throw new Error('Not implemented'); }
  async getToolsForServer(_serverId: string): Promise<ToolDefinition[]> { throw new Error('Not implemented'); }
  async getAllTools(): Promise<ToolDefinition[]> { throw new Error('Not implemented'); }

  async saveResources(_resources: ResourceDefinition[]): Promise<void> { throw new Error('Not implemented'); }
  async getResourcesForServer(_serverId: string): Promise<ResourceDefinition[]> { throw new Error('Not implemented'); }
  async getAllResources(): Promise<ResourceDefinition[]> { throw new Error('Not implemented'); }

  async saveRefreshToken(_tokenHash: string, _username: string, _expiresAt: string): Promise<void> { throw new Error('Not implemented'); }
  async getRefreshToken(_tokenHash: string): Promise<RefreshTokenRecord | null> { throw new Error('Not implemented'); }
  async revokeRefreshToken(_tokenHash: string): Promise<void> { throw new Error('Not implemented'); }
  async revokeAllRefreshTokensForUser(_username: string): Promise<void> { throw new Error('Not implemented'); }

  async getUser(_username: string): Promise<UserRecord | null> { throw new Error('Not implemented'); }
  async getUserInWorkspace(_username: string, _workspaceId: string): Promise<UserRecord | null> { throw new Error('Not implemented'); }
  async getAllUsers(): Promise<Array<Omit<UserRecord, 'passwordHash'>>> { throw new Error('Not implemented'); }
  async getAllUsersByWorkspace(_workspaceId: string): Promise<Array<Omit<UserRecord, 'passwordHash'>>> { throw new Error('Not implemented'); }
  async createUser(_username: string, _passwordHash: string, _role: UserRole, _workspaceId: string): Promise<void> { throw new Error('Not implemented'); }
  async upsertUser(_username: string, _passwordHash: string, _role: UserRole, _workspaceId: string): Promise<void> { throw new Error('Not implemented'); }
  async updateUserRole(_username: string, _workspaceId: string, _role: UserRole): Promise<void> { throw new Error('Not implemented'); }
  async getServerAuthConfig(_serverId: string): Promise<ServerAuthConfig | null> { throw new Error('Not implemented'); }
  async setServerAuthConfig(_serverId: string, _requireMcpToken: boolean): Promise<void> { throw new Error('Not implemented'); }
  async getMcpTokenPolicy(_scopeType: McpTokenPolicyScope, _scopeId: string): Promise<McpTokenPolicyRecord | null> { throw new Error('Not implemented'); }
  async listMcpTokenPolicies(_scopeType?: McpTokenPolicyScope): Promise<McpTokenPolicyRecord[]> { throw new Error('Not implemented'); }
  async setMcpTokenPolicy(_scopeType: McpTokenPolicyScope, _scopeId: string, _requireMcpToken: boolean | null): Promise<void> { throw new Error('Not implemented'); }
  async createMcpToken(_input: McpTokenCreateInput): Promise<void> { throw new Error('Not implemented'); }
  async getMcpTokenByHash(_tokenHash: string): Promise<McpTokenRecord | null> { throw new Error('Not implemented'); }
  async getMcpTokenById(_id: string): Promise<McpTokenRecord | null> { throw new Error('Not implemented'); }
  async getMcpTokensByWorkspace(_workspaceId: string): Promise<McpTokenRecord[]> { throw new Error('Not implemented'); }
  async revokeMcpToken(_id: string): Promise<void> { throw new Error('Not implemented'); }

  async close(): Promise<void> {}
  async getStats(): Promise<{ servers: number; tools: number; resources: number }> { throw new Error('Not implemented'); }
}

import { IDataStore, RefreshTokenRecord, ResourceDefinition, ServerConfig, ToolDefinition, UserRecord, UserRole, ServerAuthConfig, McpTokenCreateInput, McpTokenRecord } from './datastore';

export class SupabaseDataStore implements IDataStore {
  constructor() {
    throw new Error('DATA_PROVIDER=SUPABASE is not implemented yet in this build.');
  }

  saveServer(_server: ServerConfig): void { throw new Error('Not implemented'); }
  getServer(_serverId: string): ServerConfig | null { throw new Error('Not implemented'); }
  getServerForOwner(_serverId: string, _ownerUsername: string): ServerConfig | null { throw new Error('Not implemented'); }
  getAllServers(): ServerConfig[] { throw new Error('Not implemented'); }
  getAllServersByOwner(_ownerUsername: string): ServerConfig[] { throw new Error('Not implemented'); }
  serverNameExistsForOwner(_serverName: string, _ownerUsername: string): boolean { throw new Error('Not implemented'); }
  deleteServer(_serverId: string): void { throw new Error('Not implemented'); }

  saveTools(_tools: ToolDefinition[]): void { throw new Error('Not implemented'); }
  getToolsForServer(_serverId: string): ToolDefinition[] { throw new Error('Not implemented'); }
  getAllTools(): ToolDefinition[] { throw new Error('Not implemented'); }

  saveResources(_resources: ResourceDefinition[]): void { throw new Error('Not implemented'); }
  getResourcesForServer(_serverId: string): ResourceDefinition[] { throw new Error('Not implemented'); }
  getAllResources(): ResourceDefinition[] { throw new Error('Not implemented'); }

  saveRefreshToken(_tokenHash: string, _username: string, _expiresAt: string): void { throw new Error('Not implemented'); }
  getRefreshToken(_tokenHash: string): RefreshTokenRecord | null { throw new Error('Not implemented'); }
  revokeRefreshToken(_tokenHash: string): void { throw new Error('Not implemented'); }
  revokeAllRefreshTokensForUser(_username: string): void { throw new Error('Not implemented'); }

  getUser(_username: string): UserRecord | null { throw new Error('Not implemented'); }
  getUserInWorkspace(_username: string, _workspaceId: string): UserRecord | null { throw new Error('Not implemented'); }
  getAllUsers(): Array<Omit<UserRecord, 'passwordHash'>> { throw new Error('Not implemented'); }
  getAllUsersByWorkspace(_workspaceId: string): Array<Omit<UserRecord, 'passwordHash'>> { throw new Error('Not implemented'); }
  createUser(_username: string, _passwordHash: string, _role: UserRole, _workspaceId: string): void { throw new Error('Not implemented'); }
  upsertUser(_username: string, _passwordHash: string, _role: UserRole, _workspaceId: string): void { throw new Error('Not implemented'); }
  updateUserRole(_username: string, _workspaceId: string, _role: UserRole): void { throw new Error('Not implemented'); }
  getServerAuthConfig(_serverId: string): ServerAuthConfig | null { throw new Error('Not implemented'); }
  setServerAuthConfig(_serverId: string, _requireMcpToken: boolean): void { throw new Error('Not implemented'); }
  createMcpToken(_input: McpTokenCreateInput): void { throw new Error('Not implemented'); }
  getMcpTokenByHash(_tokenHash: string): McpTokenRecord | null { throw new Error('Not implemented'); }
  getMcpTokenById(_id: string): McpTokenRecord | null { throw new Error('Not implemented'); }
  getMcpTokensByWorkspace(_workspaceId: string): McpTokenRecord[] { throw new Error('Not implemented'); }
  revokeMcpToken(_id: string): void { throw new Error('Not implemented'); }

  close(): void {}
  getStats(): { servers: number; tools: number; resources: number } { throw new Error('Not implemented'); }
}

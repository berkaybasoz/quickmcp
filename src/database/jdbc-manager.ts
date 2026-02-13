import { IDataStore, RefreshTokenRecord, ResourceDefinition, ServerConfig, ToolDefinition } from './datastore';

export class JdbcDataStore implements IDataStore {
  constructor() {
    throw new Error('DATA_PROVIDER=JDBC is not implemented yet. Use DATA_PROVIDER=SQLITE for now.');
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

  close(): void {}
  getStats(): { servers: number; tools: number; resources: number } { throw new Error('Not implemented'); }
}

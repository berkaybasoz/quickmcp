export interface ServerConfig {
  id: string;
  name: string;
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

  close(): void;
  getStats(): { servers: number; tools: number; resources: number };
}

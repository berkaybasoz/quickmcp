import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { IDataStore, ResourceDefinition, ServerConfig, ToolDefinition, RefreshTokenRecord } from './datastore';

export class SQLiteManager implements IDataStore {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    const projectRoot = path.resolve(__dirname, '..', '..');
    const configuredDir = process.env.QUICKMCP_DATA_DIR;
    const dbDir = configuredDir
      ? (path.isAbsolute(configuredDir)
          ? configuredDir
          : path.join(projectRoot, configuredDir))
      : path.join(projectRoot, 'data');

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.dbPath = path.join(dbDir, 'quickmcp.sqlite');
    this.db = new Database(this.dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner_username TEXT NOT NULL DEFAULT 'guest',
        source_config TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        input_schema TEXT NOT NULL,
        sql_query TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (server_id) REFERENCES servers (id) ON DELETE CASCADE,
        UNIQUE(server_id, name)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        uri_template TEXT NOT NULL,
        sql_query TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (server_id) REFERENCES servers (id) ON DELETE CASCADE,
        UNIQUE(server_id, name)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        token_hash TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        revoked_at TEXT
      )
    `);

    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_servers_owner ON servers(owner_username)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(username)`);
  }

  saveServer(server: ServerConfig): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO servers (id, name, owner_username, source_config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      server.id,
      server.name,
      server.ownerUsername,
      JSON.stringify(server.sourceConfig),
      server.createdAt
    );
  }

  private mapServerRow(row: any): ServerConfig {
    let parsedConfig: any = {};
    try {
      parsedConfig = JSON.parse(row.source_config);
    } catch {
      parsedConfig = {};
    }

    return {
      id: row.id,
      name: row.name,
      ownerUsername: row.owner_username || 'guest',
      sourceConfig: parsedConfig,
      createdAt: row.created_at
    };
  }

  getServer(serverId: string): ServerConfig | null {
    const stmt = this.db.prepare('SELECT * FROM servers WHERE id = ?');
    const row = stmt.get(serverId) as any;
    return row ? this.mapServerRow(row) : null;
  }

  getServerForOwner(serverId: string, ownerUsername: string): ServerConfig | null {
    const stmt = this.db.prepare('SELECT * FROM servers WHERE id = ? AND owner_username = ?');
    const row = stmt.get(serverId, ownerUsername) as any;
    return row ? this.mapServerRow(row) : null;
  }

  getAllServers(): ServerConfig[] {
    const stmt = this.db.prepare('SELECT * FROM servers ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map((row) => this.mapServerRow(row));
  }

  getAllServersByOwner(ownerUsername: string): ServerConfig[] {
    const stmt = this.db.prepare('SELECT * FROM servers WHERE owner_username = ? ORDER BY created_at DESC');
    const rows = stmt.all(ownerUsername) as any[];
    return rows.map((row) => this.mapServerRow(row));
  }

  serverNameExistsForOwner(serverName: string, ownerUsername: string): boolean {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM servers WHERE name = ? AND owner_username = ?');
    const row = stmt.get(serverName, ownerUsername) as any;
    return (row?.count || 0) > 0;
  }

  deleteServer(serverId: string): void {
    const stmt = this.db.prepare('DELETE FROM servers WHERE id = ?');
    stmt.run(serverId);
  }

  saveTools(tools: ToolDefinition[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tools (server_id, name, description, input_schema, sql_query, operation)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((items: ToolDefinition[]) => {
      for (const tool of items) {
        stmt.run(
          tool.server_id,
          tool.name,
          tool.description,
          JSON.stringify(tool.inputSchema),
          tool.sqlQuery,
          tool.operation
        );
      }
    });

    transaction(tools);
  }

  getToolsForServer(serverId: string): ToolDefinition[] {
    const stmt = this.db.prepare('SELECT * FROM tools WHERE server_id = ?');
    const rows = stmt.all(serverId) as any[];

    return rows.map(row => ({
      server_id: row.server_id,
      name: row.name,
      description: row.description,
      inputSchema: JSON.parse(row.input_schema),
      sqlQuery: row.sql_query,
      operation: row.operation as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
    }));
  }

  getAllTools(): ToolDefinition[] {
    const stmt = this.db.prepare('SELECT * FROM tools ORDER BY server_id, name');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      server_id: row.server_id,
      name: row.name,
      description: row.description,
      inputSchema: JSON.parse(row.input_schema),
      sqlQuery: row.sql_query,
      operation: row.operation as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
    }));
  }

  saveResources(resources: ResourceDefinition[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO resources (server_id, name, description, uri_template, sql_query)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((items: ResourceDefinition[]) => {
      for (const resource of items) {
        stmt.run(
          resource.server_id,
          resource.name,
          resource.description,
          resource.uri_template,
          resource.sqlQuery
        );
      }
    });

    transaction(resources);
  }

  getResourcesForServer(serverId: string): ResourceDefinition[] {
    const stmt = this.db.prepare('SELECT * FROM resources WHERE server_id = ?');
    const rows = stmt.all(serverId) as any[];

    return rows.map(row => ({
      server_id: row.server_id,
      name: row.name,
      description: row.description,
      uri_template: row.uri_template,
      sqlQuery: row.sql_query
    }));
  }

  getAllResources(): ResourceDefinition[] {
    const stmt = this.db.prepare('SELECT * FROM resources ORDER BY server_id, name');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      server_id: row.server_id,
      name: row.name,
      description: row.description,
      uri_template: row.uri_template,
      sqlQuery: row.sql_query
    }));
  }

  saveRefreshToken(tokenHash: string, username: string, expiresAt: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO refresh_tokens (token_hash, username, expires_at, created_at, revoked_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, NULL)
    `);
    stmt.run(tokenHash, username, expiresAt);
  }

  getRefreshToken(tokenHash: string): RefreshTokenRecord | null {
    const stmt = this.db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?');
    const row = stmt.get(tokenHash) as any;
    if (!row) {
      return null;
    }

    return {
      tokenHash: row.token_hash,
      username: row.username,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      revokedAt: row.revoked_at || null
    };
  }

  revokeRefreshToken(tokenHash: string): void {
    const stmt = this.db.prepare(`
      UPDATE refresh_tokens
      SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
      WHERE token_hash = ?
    `);
    stmt.run(tokenHash);
  }

  revokeAllRefreshTokensForUser(username: string): void {
    const stmt = this.db.prepare(`
      UPDATE refresh_tokens
      SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
      WHERE username = ? AND revoked_at IS NULL
    `);
    stmt.run(username);
  }

  close(): void {
    this.db.close();
  }

  getStats(): { servers: number; tools: number; resources: number } {
    const serversCount = this.db.prepare('SELECT COUNT(*) as count FROM servers').get() as any;
    const toolsCount = this.db.prepare('SELECT COUNT(*) as count FROM tools').get() as any;
    const resourcesCount = this.db.prepare('SELECT COUNT(*) as count FROM resources').get() as any;

    return {
      servers: serversCount.count,
      tools: toolsCount.count,
      resources: resourcesCount.count
    };
  }
}

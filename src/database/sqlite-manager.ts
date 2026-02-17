import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { IDataStore, ResourceDefinition, ServerConfig, ToolDefinition, RefreshTokenRecord, UserRecord, UserRole, ServerAuthConfig, McpTokenCreateInput, McpTokenRecord, McpTokenPolicyRecord, McpTokenPolicyScope } from './datastore';

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
        version TEXT NOT NULL DEFAULT '1.0.0',
        owner_username TEXT NOT NULL DEFAULT 'guest',
        source_config TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const serverCols = this.db.prepare(`PRAGMA table_info(servers)`).all() as any[];
    const hasVersion = serverCols.some((col) => col.name === 'version');
    if (!hasVersion) {
      this.db.exec(`ALTER TABLE servers ADD COLUMN version TEXT NOT NULL DEFAULT '1.0.0'`);
    }

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

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL DEFAULT 'default',
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const userCols = this.db.prepare(`PRAGMA table_info(users)`).all() as any[];
    const hasWorkspaceId = userCols.some((col) => col.name === 'workspace_id');
    if (!hasWorkspaceId) {
      this.db.exec(`ALTER TABLE users ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'default'`);
    }
    this.db.exec(`UPDATE users SET workspace_id = username WHERE workspace_id IS NULL OR workspace_id = '' OR workspace_id = 'default'`);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS server_auth_config (
        server_id TEXT PRIMARY KEY,
        require_mcp_token INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (server_id) REFERENCES servers (id) ON DELETE CASCADE
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_tokens (
        id TEXT PRIMARY KEY,
        token_name TEXT NOT NULL DEFAULT '',
        workspace_id TEXT NOT NULL,
        subject_username TEXT NOT NULL,
        created_by TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        token_value TEXT NOT NULL,
        allow_all_servers INTEGER NOT NULL DEFAULT 1,
        allow_all_tools INTEGER NOT NULL DEFAULT 1,
        allow_all_resources INTEGER NOT NULL DEFAULT 1,
        server_ids_json TEXT NOT NULL DEFAULT '[]',
        allowed_tools_json TEXT NOT NULL DEFAULT '[]',
        allowed_resources_json TEXT NOT NULL DEFAULT '[]',
        server_rules_json TEXT NOT NULL DEFAULT '{}',
        tool_rules_json TEXT NOT NULL DEFAULT '{}',
        resource_rules_json TEXT NOT NULL DEFAULT '{}',
        never_expires INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        revoked_at TEXT
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_token_policies (
        scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'user', 'server', 'tool')),
        scope_id TEXT NOT NULL,
        require_mcp_token INTEGER NOT NULL CHECK (require_mcp_token IN (0, 1)),
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (scope_type, scope_id)
      )
    `);

    const mcpCols = this.db.prepare(`PRAGMA table_info(mcp_tokens)`).all() as any[];
    const hasTokenName = mcpCols.some((col) => col.name === 'token_name');
    const hasAllowAllTools = mcpCols.some((col) => col.name === 'allow_all_tools');
    const hasAllowAllResources = mcpCols.some((col) => col.name === 'allow_all_resources');
    const hasAllowedTools = mcpCols.some((col) => col.name === 'allowed_tools_json');
    const hasAllowedResources = mcpCols.some((col) => col.name === 'allowed_resources_json');
    const hasServerRules = mcpCols.some((col) => col.name === 'server_rules_json');
    const hasToolRules = mcpCols.some((col) => col.name === 'tool_rules_json');
    const hasResourceRules = mcpCols.some((col) => col.name === 'resource_rules_json');
    if (!hasTokenName) this.db.exec(`ALTER TABLE mcp_tokens ADD COLUMN token_name TEXT NOT NULL DEFAULT ''`);
    if (!hasAllowAllTools) this.db.exec(`ALTER TABLE mcp_tokens ADD COLUMN allow_all_tools INTEGER NOT NULL DEFAULT 1`);
    if (!hasAllowAllResources) this.db.exec(`ALTER TABLE mcp_tokens ADD COLUMN allow_all_resources INTEGER NOT NULL DEFAULT 1`);
    if (!hasAllowedTools) this.db.exec(`ALTER TABLE mcp_tokens ADD COLUMN allowed_tools_json TEXT NOT NULL DEFAULT '[]'`);
    if (!hasAllowedResources) this.db.exec(`ALTER TABLE mcp_tokens ADD COLUMN allowed_resources_json TEXT NOT NULL DEFAULT '[]'`);
    if (!hasServerRules) this.db.exec(`ALTER TABLE mcp_tokens ADD COLUMN server_rules_json TEXT NOT NULL DEFAULT '{}'`);
    if (!hasToolRules) this.db.exec(`ALTER TABLE mcp_tokens ADD COLUMN tool_rules_json TEXT NOT NULL DEFAULT '{}'`);
    if (!hasResourceRules) this.db.exec(`ALTER TABLE mcp_tokens ADD COLUMN resource_rules_json TEXT NOT NULL DEFAULT '{}'`);

    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_servers_owner ON servers(owner_username)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(username)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_users_workspace ON users(workspace_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_server_auth_required ON server_auth_config(require_mcp_token)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_mcp_tokens_workspace ON mcp_tokens(workspace_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_mcp_tokens_hash ON mcp_tokens(token_hash)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_mcp_token_policies_scope ON mcp_token_policies(scope_type)`);
  }

  saveServer(server: ServerConfig): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO servers (id, name, version, owner_username, source_config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      server.id,
      server.name,
      server.version || '1.0.0',
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
      version: row.version || '1.0.0',
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

  getUser(username: string): UserRecord | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    const row = stmt.get(username) as any;
    if (!row) {
      return null;
    }

    return {
      username: row.username,
      workspaceId: row.workspace_id || row.username,
      passwordHash: row.password_hash,
      role: row.role as UserRole,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  getUserInWorkspace(username: string, workspaceId: string): UserRecord | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ? AND workspace_id = ?');
    const row = stmt.get(username, workspaceId) as any;
    if (!row) {
      return null;
    }
    return {
      username: row.username,
      workspaceId: row.workspace_id || row.username,
      passwordHash: row.password_hash,
      role: row.role as UserRole,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  getAllUsers(): Array<Omit<UserRecord, 'passwordHash'>> {
    const stmt = this.db.prepare('SELECT username, workspace_id, role, created_at, updated_at FROM users ORDER BY username');
    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      username: row.username,
      workspaceId: row.workspace_id || row.username,
      role: row.role as UserRole,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  getAllUsersByWorkspace(workspaceId: string): Array<Omit<UserRecord, 'passwordHash'>> {
    const stmt = this.db.prepare('SELECT username, workspace_id, role, created_at, updated_at FROM users WHERE workspace_id = ? ORDER BY username');
    const rows = stmt.all(workspaceId) as any[];
    return rows.map((row) => ({
      username: row.username,
      workspaceId: row.workspace_id || row.username,
      role: row.role as UserRole,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  createUser(username: string, passwordHash: string, role: UserRole, workspaceId: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO users (username, workspace_id, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    stmt.run(username, workspaceId, passwordHash, role);
  }

  upsertUser(username: string, passwordHash: string, role: UserRole, workspaceId: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO users (username, workspace_id, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(username) DO UPDATE SET
        workspace_id = excluded.workspace_id,
        password_hash = excluded.password_hash,
        role = excluded.role,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(username, workspaceId, passwordHash, role);
  }

  updateUserRole(username: string, workspaceId: string, role: UserRole): void {
    const stmt = this.db.prepare(`
      UPDATE users
      SET role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE username = ? AND workspace_id = ?
    `);
    stmt.run(role, username, workspaceId);
  }

  getServerAuthConfig(serverId: string): ServerAuthConfig | null {
    const policy = this.getMcpTokenPolicy('server', serverId);
    if (policy) {
      return {
        serverId,
        requireMcpToken: policy.requireMcpToken,
        updatedAt: policy.updatedAt
      };
    }

    const stmt = this.db.prepare('SELECT server_id, require_mcp_token, updated_at FROM server_auth_config WHERE server_id = ?');
    const row = stmt.get(serverId) as any;
    if (!row) {
      return null;
    }
    return {
      serverId: row.server_id,
      requireMcpToken: Number(row.require_mcp_token) === 1,
      updatedAt: row.updated_at
    };
  }

  setServerAuthConfig(serverId: string, requireMcpToken: boolean): void {
    const stmt = this.db.prepare(`
      INSERT INTO server_auth_config (server_id, require_mcp_token, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(server_id) DO UPDATE SET
        require_mcp_token = excluded.require_mcp_token,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(serverId, requireMcpToken ? 1 : 0);
    this.setMcpTokenPolicy('server', serverId, requireMcpToken);
  }

  private mapMcpTokenPolicyRow(row: any): McpTokenPolicyRecord {
    return {
      scopeType: row.scope_type as McpTokenPolicyScope,
      scopeId: String(row.scope_id),
      requireMcpToken: Number(row.require_mcp_token) === 1,
      updatedAt: String(row.updated_at)
    };
  }

  getMcpTokenPolicy(scopeType: McpTokenPolicyScope, scopeId: string): McpTokenPolicyRecord | null {
    const stmt = this.db.prepare(`
      SELECT scope_type, scope_id, require_mcp_token, updated_at
      FROM mcp_token_policies
      WHERE scope_type = ? AND scope_id = ?
    `);
    const row = stmt.get(scopeType, scopeId) as any;
    return row ? this.mapMcpTokenPolicyRow(row) : null;
  }

  listMcpTokenPolicies(scopeType?: McpTokenPolicyScope): McpTokenPolicyRecord[] {
    const stmt = scopeType
      ? this.db.prepare(`
          SELECT scope_type, scope_id, require_mcp_token, updated_at
          FROM mcp_token_policies
          WHERE scope_type = ?
          ORDER BY updated_at DESC
        `)
      : this.db.prepare(`
          SELECT scope_type, scope_id, require_mcp_token, updated_at
          FROM mcp_token_policies
          ORDER BY updated_at DESC
        `);
    const rows = (scopeType ? stmt.all(scopeType) : stmt.all()) as any[];
    return rows.map((row) => this.mapMcpTokenPolicyRow(row));
  }

  setMcpTokenPolicy(scopeType: McpTokenPolicyScope, scopeId: string, requireMcpToken: boolean | null): void {
    if (!scopeId) return;
    if (requireMcpToken === null) {
      const del = this.db.prepare('DELETE FROM mcp_token_policies WHERE scope_type = ? AND scope_id = ?');
      del.run(scopeType, scopeId);
      return;
    }
    const upsert = this.db.prepare(`
      INSERT INTO mcp_token_policies (scope_type, scope_id, require_mcp_token, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(scope_type, scope_id) DO UPDATE SET
        require_mcp_token = excluded.require_mcp_token,
        updated_at = CURRENT_TIMESTAMP
    `);
    upsert.run(scopeType, scopeId, requireMcpToken ? 1 : 0);
  }

  private mapMcpTokenRow(row: any): McpTokenRecord {
    return {
      id: row.id,
      tokenName: row.token_name || '',
      workspaceId: row.workspace_id,
      subjectUsername: row.subject_username,
      createdBy: row.created_by,
      tokenHash: row.token_hash,
      tokenValue: row.token_value,
      allowAllServers: Number(row.allow_all_servers) === 1,
      allowAllTools: Number(row.allow_all_tools) === 1,
      allowAllResources: Number(row.allow_all_resources) === 1,
      serverIds: JSON.parse(row.server_ids_json || '[]'),
      allowedTools: JSON.parse(row.allowed_tools_json || '[]'),
      allowedResources: JSON.parse(row.allowed_resources_json || '[]'),
      serverRules: JSON.parse(row.server_rules_json || '{}'),
      toolRules: JSON.parse(row.tool_rules_json || '{}'),
      resourceRules: JSON.parse(row.resource_rules_json || '{}'),
      neverExpires: Number(row.never_expires) === 1,
      expiresAt: row.expires_at || null,
      createdAt: row.created_at,
      revokedAt: row.revoked_at || null
    };
  }

  createMcpToken(input: McpTokenCreateInput): void {
    const stmt = this.db.prepare(`
      INSERT INTO mcp_tokens (
        id, token_name, workspace_id, subject_username, created_by, token_hash, token_value,
        allow_all_servers, allow_all_tools, allow_all_resources,
        server_ids_json, allowed_tools_json, allowed_resources_json,
        server_rules_json, tool_rules_json, resource_rules_json,
        never_expires, expires_at, created_at, revoked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)
    `);
    stmt.run(
      input.id,
      input.tokenName,
      input.workspaceId,
      input.subjectUsername,
      input.createdBy,
      input.tokenHash,
      input.tokenValue,
      input.allowAllServers ? 1 : 0,
      input.allowAllTools ? 1 : 0,
      input.allowAllResources ? 1 : 0,
      JSON.stringify(input.serverIds || []),
      JSON.stringify(input.allowedTools || []),
      JSON.stringify(input.allowedResources || []),
      JSON.stringify(input.serverRules || {}),
      JSON.stringify(input.toolRules || {}),
      JSON.stringify(input.resourceRules || {}),
      input.neverExpires ? 1 : 0,
      input.expiresAt
    );
  }

  getMcpTokenByHash(tokenHash: string): McpTokenRecord | null {
    const stmt = this.db.prepare('SELECT * FROM mcp_tokens WHERE token_hash = ?');
    const row = stmt.get(tokenHash) as any;
    return row ? this.mapMcpTokenRow(row) : null;
  }

  getMcpTokenById(id: string): McpTokenRecord | null {
    const stmt = this.db.prepare('SELECT * FROM mcp_tokens WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapMcpTokenRow(row) : null;
  }

  getMcpTokensByWorkspace(workspaceId: string): McpTokenRecord[] {
    const stmt = this.db.prepare('SELECT * FROM mcp_tokens WHERE workspace_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(workspaceId) as any[];
    return rows.map((row) => this.mapMcpTokenRow(row));
  }

  revokeMcpToken(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE mcp_tokens
      SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
      WHERE id = ?
    `);
    stmt.run(id);
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

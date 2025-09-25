import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface ServerConfig {
  id: string;
  name: string;
  dbConfig: {
    type: 'mssql' | 'mysql' | 'postgresql';
    server: string;
    port: number;
    database: string;
    username: string;
    password: string;
    encrypt?: boolean;
    trustServerCertificate?: boolean;
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

export class SQLiteManager {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    // Create database directory if it doesn't exist
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.dbPath = path.join(dbDir, 'quickmcp.sqlite');
    this.db = new Database(this.dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    // Servers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        db_config TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tools table
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

    // Resources table
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

    console.log('✅ SQLite database initialized:', this.dbPath);
  }

  // Server operations
  saveServer(server: ServerConfig): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO servers (id, name, db_config, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      server.id,
      server.name,
      JSON.stringify(server.dbConfig),
      server.createdAt
    );
  }

  getServer(serverId: string): ServerConfig | null {
    const stmt = this.db.prepare('SELECT * FROM servers WHERE id = ?');
    const row = stmt.get(serverId) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      dbConfig: JSON.parse(row.db_config),
      createdAt: row.created_at
    };
  }

  getAllServers(): ServerConfig[] {
    const stmt = this.db.prepare('SELECT * FROM servers ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      dbConfig: JSON.parse(row.db_config),
      createdAt: row.created_at
    }));
  }

  deleteServer(serverId: string): void {
    const stmt = this.db.prepare('DELETE FROM servers WHERE id = ?');
    stmt.run(serverId);
  }

  // Tool operations
  saveTools(tools: ToolDefinition[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tools (server_id, name, description, input_schema, sql_query, operation)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((tools: ToolDefinition[]) => {
      for (const tool of tools) {
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

  // Resource operations
  saveResources(resources: ResourceDefinition[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO resources (server_id, name, description, uri_template, sql_query)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((resources: ResourceDefinition[]) => {
      for (const resource of resources) {
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

  // Cleanup
  close(): void {
    this.db.close();
  }

  // Statistics
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
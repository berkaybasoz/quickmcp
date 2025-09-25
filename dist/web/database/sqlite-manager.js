"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteManager = void 0;
const better_sqlite3_1 = require("better-sqlite3");
const path_1 = require("path");
const fs_1 = require("fs");
class SQLiteManager {
    constructor() {
        // Create database directory if it doesn't exist
        const dbDir = path_1.default.join(process.cwd(), 'data');
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        this.dbPath = path_1.default.join(dbDir, 'quickmcp.sqlite');
        this.db = new better_sqlite3_1.default(this.dbPath);
        this.initializeTables();
    }
    initializeTables() {
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
    saveServer(server) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO servers (id, name, db_config, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
        stmt.run(server.id, server.name, JSON.stringify(server.dbConfig), server.createdAt);
    }
    getServer(serverId) {
        const stmt = this.db.prepare('SELECT * FROM servers WHERE id = ?');
        const row = stmt.get(serverId);
        if (!row)
            return null;
        return {
            id: row.id,
            name: row.name,
            dbConfig: JSON.parse(row.db_config),
            createdAt: row.created_at
        };
    }
    getAllServers() {
        const stmt = this.db.prepare('SELECT * FROM servers ORDER BY created_at DESC');
        const rows = stmt.all();
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            dbConfig: JSON.parse(row.db_config),
            createdAt: row.created_at
        }));
    }
    deleteServer(serverId) {
        const stmt = this.db.prepare('DELETE FROM servers WHERE id = ?');
        stmt.run(serverId);
    }
    // Tool operations
    saveTools(tools) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tools (server_id, name, description, input_schema, sql_query, operation)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const transaction = this.db.transaction((tools) => {
            for (const tool of tools) {
                stmt.run(tool.server_id, tool.name, tool.description, JSON.stringify(tool.inputSchema), tool.sqlQuery, tool.operation);
            }
        });
        transaction(tools);
    }
    getToolsForServer(serverId) {
        const stmt = this.db.prepare('SELECT * FROM tools WHERE server_id = ?');
        const rows = stmt.all(serverId);
        return rows.map(row => ({
            server_id: row.server_id,
            name: row.name,
            description: row.description,
            inputSchema: JSON.parse(row.input_schema),
            sqlQuery: row.sql_query,
            operation: row.operation
        }));
    }
    getAllTools() {
        const stmt = this.db.prepare('SELECT * FROM tools ORDER BY server_id, name');
        const rows = stmt.all();
        return rows.map(row => ({
            server_id: row.server_id,
            name: row.name,
            description: row.description,
            inputSchema: JSON.parse(row.input_schema),
            sqlQuery: row.sql_query,
            operation: row.operation
        }));
    }
    // Resource operations
    saveResources(resources) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO resources (server_id, name, description, uri_template, sql_query)
      VALUES (?, ?, ?, ?, ?)
    `);
        const transaction = this.db.transaction((resources) => {
            for (const resource of resources) {
                stmt.run(resource.server_id, resource.name, resource.description, resource.uri_template, resource.sqlQuery);
            }
        });
        transaction(resources);
    }
    getResourcesForServer(serverId) {
        const stmt = this.db.prepare('SELECT * FROM resources WHERE server_id = ?');
        const rows = stmt.all(serverId);
        return rows.map(row => ({
            server_id: row.server_id,
            name: row.name,
            description: row.description,
            uri_template: row.uri_template,
            sqlQuery: row.sql_query
        }));
    }
    getAllResources() {
        const stmt = this.db.prepare('SELECT * FROM resources ORDER BY server_id, name');
        const rows = stmt.all();
        return rows.map(row => ({
            server_id: row.server_id,
            name: row.name,
            description: row.description,
            uri_template: row.uri_template,
            sqlQuery: row.sql_query
        }));
    }
    // Cleanup
    close() {
        this.db.close();
    }
    // Statistics
    getStats() {
        const serversCount = this.db.prepare('SELECT COUNT(*) as count FROM servers').get();
        const toolsCount = this.db.prepare('SELECT COUNT(*) as count FROM tools').get();
        const resourcesCount = this.db.prepare('SELECT COUNT(*) as count FROM resources').get();
        return {
            servers: serversCount.count,
            tools: toolsCount.count,
            resources: resourcesCount.count
        };
    }
}
exports.SQLiteManager = SQLiteManager;

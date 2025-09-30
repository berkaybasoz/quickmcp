"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteManager = void 0;
var better_sqlite3_1 = __importDefault(require("better-sqlite3"));
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var SQLiteManager = /** @class */ (function () {
    function SQLiteManager() {
        // Create database directory if it doesn't exist
        var dbDir = path_1.default.join(process.cwd(), 'data');
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        this.dbPath = path_1.default.join(dbDir, 'quickmcp.sqlite');
        this.db = new better_sqlite3_1.default(this.dbPath);
        this.initializeTables();
    }
    SQLiteManager.prototype.initializeTables = function () {
        // Servers table
        this.db.exec("\n      CREATE TABLE IF NOT EXISTS servers (\n        id TEXT PRIMARY KEY,\n        name TEXT NOT NULL,\n        db_config TEXT NOT NULL,\n        created_at TEXT NOT NULL,\n        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n      )\n    ");
        // Tools table
        this.db.exec("\n      CREATE TABLE IF NOT EXISTS tools (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        server_id TEXT NOT NULL,\n        name TEXT NOT NULL,\n        description TEXT NOT NULL,\n        input_schema TEXT NOT NULL,\n        sql_query TEXT NOT NULL,\n        operation TEXT NOT NULL CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),\n        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (server_id) REFERENCES servers (id) ON DELETE CASCADE,\n        UNIQUE(server_id, name)\n      )\n    ");
        // Resources table
        this.db.exec("\n      CREATE TABLE IF NOT EXISTS resources (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        server_id TEXT NOT NULL,\n        name TEXT NOT NULL,\n        description TEXT NOT NULL,\n        uri_template TEXT NOT NULL,\n        sql_query TEXT NOT NULL,\n        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (server_id) REFERENCES servers (id) ON DELETE CASCADE,\n        UNIQUE(server_id, name)\n      )\n    ");
        console.error('✅ SQLite database initialized:', this.dbPath);
    };
    // Server operations
    SQLiteManager.prototype.saveServer = function (server) {
        var stmt = this.db.prepare("\n      INSERT OR REPLACE INTO servers (id, name, db_config, created_at, updated_at)\n      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)\n    ");
        stmt.run(server.id, server.name, JSON.stringify(server.dbConfig), server.createdAt);
    };
    SQLiteManager.prototype.getServer = function (serverId) {
        var stmt = this.db.prepare('SELECT * FROM servers WHERE id = ?');
        var row = stmt.get(serverId);
        if (!row)
            return null;
        return {
            id: row.id,
            name: row.name,
            dbConfig: JSON.parse(row.db_config),
            createdAt: row.created_at
        };
    };
    SQLiteManager.prototype.getAllServers = function () {
        var stmt = this.db.prepare('SELECT * FROM servers ORDER BY created_at DESC');
        var rows = stmt.all();
        return rows.map(function (row) { return ({
            id: row.id,
            name: row.name,
            dbConfig: JSON.parse(row.db_config),
            createdAt: row.created_at
        }); });
    };
    SQLiteManager.prototype.deleteServer = function (serverId) {
        var stmt = this.db.prepare('DELETE FROM servers WHERE id = ?');
        stmt.run(serverId);
    };
    // Tool operations
    SQLiteManager.prototype.saveTools = function (tools) {
        var stmt = this.db.prepare("\n      INSERT OR REPLACE INTO tools (server_id, name, description, input_schema, sql_query, operation)\n      VALUES (?, ?, ?, ?, ?, ?)\n    ");
        var transaction = this.db.transaction(function (tools) {
            for (var _i = 0, tools_1 = tools; _i < tools_1.length; _i++) {
                var tool = tools_1[_i];
                stmt.run(tool.server_id, tool.name, tool.description, JSON.stringify(tool.inputSchema), tool.sqlQuery, tool.operation);
            }
        });
        transaction(tools);
    };
    SQLiteManager.prototype.getToolsForServer = function (serverId) {
        var stmt = this.db.prepare('SELECT * FROM tools WHERE server_id = ?');
        var rows = stmt.all(serverId);
        return rows.map(function (row) { return ({
            server_id: row.server_id,
            name: row.name,
            description: row.description,
            inputSchema: JSON.parse(row.input_schema),
            sqlQuery: row.sql_query,
            operation: row.operation
        }); });
    };
    SQLiteManager.prototype.getAllTools = function () {
        var stmt = this.db.prepare('SELECT * FROM tools ORDER BY server_id, name');
        var rows = stmt.all();
        return rows.map(function (row) { return ({
            server_id: row.server_id,
            name: row.name,
            description: row.description,
            inputSchema: JSON.parse(row.input_schema),
            sqlQuery: row.sql_query,
            operation: row.operation
        }); });
    };
    // Resource operations
    SQLiteManager.prototype.saveResources = function (resources) {
        var stmt = this.db.prepare("\n      INSERT OR REPLACE INTO resources (server_id, name, description, uri_template, sql_query)\n      VALUES (?, ?, ?, ?, ?)\n    ");
        var transaction = this.db.transaction(function (resources) {
            for (var _i = 0, resources_1 = resources; _i < resources_1.length; _i++) {
                var resource = resources_1[_i];
                stmt.run(resource.server_id, resource.name, resource.description, resource.uri_template, resource.sqlQuery);
            }
        });
        transaction(resources);
    };
    SQLiteManager.prototype.getResourcesForServer = function (serverId) {
        var stmt = this.db.prepare('SELECT * FROM resources WHERE server_id = ?');
        var rows = stmt.all(serverId);
        return rows.map(function (row) { return ({
            server_id: row.server_id,
            name: row.name,
            description: row.description,
            uri_template: row.uri_template,
            sqlQuery: row.sql_query
        }); });
    };
    SQLiteManager.prototype.getAllResources = function () {
        var stmt = this.db.prepare('SELECT * FROM resources ORDER BY server_id, name');
        var rows = stmt.all();
        return rows.map(function (row) { return ({
            server_id: row.server_id,
            name: row.name,
            description: row.description,
            uri_template: row.uri_template,
            sqlQuery: row.sql_query
        }); });
    };
    // Cleanup
    SQLiteManager.prototype.close = function () {
        this.db.close();
    };
    // Statistics
    SQLiteManager.prototype.getStats = function () {
        var serversCount = this.db.prepare('SELECT COUNT(*) as count FROM servers').get();
        var toolsCount = this.db.prepare('SELECT COUNT(*) as count FROM tools').get();
        var resourcesCount = this.db.prepare('SELECT COUNT(*) as count FROM resources').get();
        return {
            servers: serversCount.count,
            tools: toolsCount.count,
            resources: resourcesCount.count
        };
    };
    return SQLiteManager;
}());
exports.SQLiteManager = SQLiteManager;

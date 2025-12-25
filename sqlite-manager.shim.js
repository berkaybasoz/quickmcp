// Runtime fallback shim for SQLiteManager when dist/database/sqlite-manager.js is missing
const path = require('path');
const fs = require('fs');
let Database;
try { Database = require('better-sqlite3'); } catch (_) { Database = null; }

class SQLiteManager {
  constructor() {
    const projectRoot = path.resolve(__dirname);
    const configuredDir = process.env.QUICKMCP_DATA_DIR;
    const dbDir = configuredDir
      ? (path.isAbsolute(configuredDir) ? configuredDir : path.join(projectRoot, configuredDir))
      : path.join(projectRoot, 'data');
    try { fs.mkdirSync(dbDir, { recursive: true }); } catch {}
    this.dbPath = path.join(dbDir, 'quickmcp.sqlite');
    this.db = null;
    if (Database) {
      try { this.db = new Database(this.dbPath); } catch (_) { this.db = null; }
    }
  }
  getAllTools() {
    if (!this.db) return [];
    try {
      const rows = this.db.prepare('SELECT * FROM tools ORDER BY server_id, name').all();
      return rows.map(row => ({
        server_id: row.server_id,
        name: row.name,
        description: row.description,
        inputSchema: JSON.parse(row.input_schema || '{}'),
        sqlQuery: row.sql_query,
        operation: row.operation,
      }));
    } catch (_) { return []; }
  }
  getAllResources() {
    if (!this.db) return [];
    try {
      const rows = this.db.prepare('SELECT * FROM resources ORDER BY server_id, name').all();
      return rows.map(row => ({
        server_id: row.server_id,
        name: row.name,
        description: row.description,
        uri_template: row.uri_template,
        sqlQuery: row.sql_query,
      }));
    } catch (_) { return []; }
  }
  close() { try { this.db && this.db.close && this.db.close(); } catch (_) {} }
}

module.exports = { SQLiteManager };


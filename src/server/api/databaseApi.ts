import express from 'express';
import path from 'path';
import Database from 'better-sqlite3';

interface DatabaseApiDeps {
  publicDir: string;
}

export class DatabaseApi {
  constructor(private readonly deps: DatabaseApiDeps) {}

  registerRoutes(app: express.Express): void {
    app.get('/database-tables', this.getDatabaseTablesPage);
    app.get('/api/database/tables', this.getDatabaseTables);
    app.get('/api/database/tables/:tableName', this.getDatabaseTableDetails);
  }

  private getDatabaseTablesPage = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'database-tables.html'));
  };

  private getDatabaseTables = (_req: express.Request, res: express.Response): void => {
    try {
      const dbPath = path.join(process.cwd(), 'data', 'quickmcp.sqlite');
      const db = new Database(dbPath);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as any[];

      const tablesInfo = tables.map((table) => {
        const tableName = table.name;
        const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
        const rowCountResult = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
        const rowCount = rowCountResult?.count || 0;
        const sampleData = db.prepare(`SELECT * FROM ${tableName} LIMIT 5`).all() as any[];

        return {
          name: tableName,
          columns: columns.map((col) => ({
            name: col.name,
            type: col.type,
            notnull: col.notnull === 1,
            pk: col.pk === 1
          })),
          rowCount,
          sampleData
        };
      });

      db.close();
      res.json({
        success: true,
        data: {
          dbPath,
          tables: tablesInfo
        }
      });
    } catch (error) {
      console.error('Database tables error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  private getDatabaseTableDetails = (req: express.Request, res: express.Response): express.Response | void => {
    try {
      const tableName = req.params.tableName;
      const dbPath = path.join(process.cwd(), 'data', 'quickmcp.sqlite');

      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid table name'
        });
      }

      const db = new Database(dbPath);
      const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
      if (!tableExists) {
        db.close();
        return res.status(404).json({
          success: false,
          error: 'Table not found'
        });
      }

      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
      const rowCountResult = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
      const rowCount = rowCountResult?.count || 0;
      const sampleData = db.prepare(`SELECT * FROM ${tableName} LIMIT 10`).all() as any[];

      db.close();
      res.json({
        success: true,
        data: {
          name: tableName,
          columns: columns.map((col) => ({
            name: col.name,
            type: col.type,
            notnull: col.notnull === 1,
            pk: col.pk === 1
          })),
          rowCount,
          sampleData
        }
      });
    } catch (error) {
      console.error('Table details error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

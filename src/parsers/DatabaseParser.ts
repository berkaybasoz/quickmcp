import mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import sqlite3 from 'sqlite3';
import * as sql from 'mssql';
import { DatabaseConnection, ParsedData } from '../types';

export class DatabaseParser {
  async parse(connection: DatabaseConnection, tableName?: string): Promise<ParsedData[]> {
    switch (connection.type) {
      case 'mysql':
        return this.parseMySql(connection, tableName);
      case 'postgresql':
        return this.parsePostgreSql(connection, tableName);
      case 'sqlite':
        return this.parseSqlite(connection, tableName);
      case 'mssql':
        return this.parseMsSql(connection, tableName);
      default:
        throw new Error(`Unsupported database type: ${connection.type}`);
    }
  }

  async getTables(connection: DatabaseConnection): Promise<string[]> {
    switch (connection.type) {
      case 'mysql':
        return this.getMySqlTables(connection);
      case 'postgresql':
        return this.getPostgreSqlTables(connection);
      case 'sqlite':
        return this.getSqliteTables(connection);
      case 'mssql':
        return this.getMsSqlTables(connection);
      default:
        throw new Error(`Unsupported database type: ${connection.type}`);
    }
  }

  private async parseMySql(connection: DatabaseConnection, tableName?: string): Promise<ParsedData[]> {
    const conn = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database
    });

    try {
      const tables = tableName ? [tableName] : await this.getMySqlTables(connection);
      const results: ParsedData[] = [];

      for (const table of tables) {
        const [rows] = await conn.execute(`SELECT * FROM \`${table}\` LIMIT 1000`);
        const [columns] = await conn.execute(
          `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
          [connection.database, table]
        );

        const headers = (columns as any[]).map(col => col.COLUMN_NAME);
        const dataTypes: Record<string, string> = {};
        (columns as any[]).forEach((col: any) => {
          dataTypes[col.COLUMN_NAME] = this.mapMySqlType(col.DATA_TYPE);
        });

        const rowsArray = (rows as any[]).map((row: any) => headers.map((header: string) => row[header]));

        results.push({
          headers,
          rows: rowsArray,
          metadata: {
            rowCount: rowsArray.length,
            columnCount: headers.length,
            dataTypes
          }
        });
      }

      return results;
    } finally {
      await conn.end();
    }
  }

  private async parsePostgreSql(connection: DatabaseConnection, tableName?: string): Promise<ParsedData[]> {
    const client = new PgClient({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database
    });

    await client.connect();

    try {
      const tables = tableName ? [tableName] : await this.getPostgreSqlTables(connection);
      const results: ParsedData[] = [];

      for (const table of tables) {
        const dataResult = await client.query(`SELECT * FROM "${table}" LIMIT 1000`);
        const columnsResult = await client.query(
          `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
          [table]
        );

        const headers = columnsResult.rows.map(col => col.column_name);
        const dataTypes: Record<string, string> = {};
        columnsResult.rows.forEach(col => {
          dataTypes[col.column_name] = this.mapPostgreSqlType(col.data_type);
        });

        const rowsArray = dataResult.rows.map(row => headers.map(header => row[header]));

        results.push({
          headers,
          rows: rowsArray,
          metadata: {
            rowCount: rowsArray.length,
            columnCount: headers.length,
            dataTypes
          }
        });
      }

      return results;
    } finally {
      await client.end();
    }
  }

  private async parseSqlite(connection: DatabaseConnection, tableName?: string): Promise<ParsedData[]> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(connection.database);

      db.serialize(async () => {
        try {
          const tables = tableName ? [tableName] : await this.getSqliteTables(connection);
          const results: ParsedData[] = [];

          for (const table of tables) {
            const rows = await new Promise<any[]>((res, rej) => {
              db.all(`SELECT * FROM "${table}" LIMIT 1000`, (err, rows) => {
                if (err) rej(err);
                else res(rows);
              });
            });

            const columns = await new Promise<any[]>((res, rej) => {
              db.all(`PRAGMA table_info("${table}")`, (err, cols) => {
                if (err) rej(err);
                else res(cols);
              });
            });

            if (rows.length > 0) {
              const headers = Object.keys(rows[0]);
              const dataTypes: Record<string, string> = {};
              columns.forEach((col: any) => {
                dataTypes[col.name] = this.mapSqliteType(col.type);
              });

              const rowsArray = rows.map(row => headers.map(header => row[header]));

              results.push({
                headers,
                rows: rowsArray,
                metadata: {
                  rowCount: rowsArray.length,
                  columnCount: headers.length,
                  dataTypes
                }
              });
            }
          }

          resolve(results);
        } catch (error) {
          reject(error);
        }
      });

      db.close();
    });
  }

  private async getMySqlTables(connection: DatabaseConnection): Promise<string[]> {
    const conn = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database
    });

    try {
      const [rows] = await conn.execute('SHOW TABLES');
      return (rows as any[]).map(row => Object.values(row)[0] as string);
    } finally {
      await conn.end();
    }
  }

  private async getPostgreSqlTables(connection: DatabaseConnection): Promise<string[]> {
    const client = new PgClient({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database
    });

    await client.connect();

    try {
      const result = await client.query(
        "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"
      );
      return result.rows.map(row => row.tablename);
    } finally {
      await client.end();
    }
  }

  private async getSqliteTables(connection: DatabaseConnection): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(connection.database);

      db.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve((rows as any[]).map(row => row.name));
          }
        }
      );

      db.close();
    });
  }

  private mapMySqlType(type: string): string {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('bigint')) return 'integer';
    if (lowerType.includes('decimal') || lowerType.includes('float') || lowerType.includes('double')) return 'number';
    if (lowerType.includes('bool') || lowerType.includes('tinyint(1)')) return 'boolean';
    if (lowerType.includes('date') || lowerType.includes('time')) return 'date';
    return 'string';
  }

  private mapPostgreSqlType(type: string): string {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType === 'bigint' || lowerType === 'smallint') return 'integer';
    if (lowerType.includes('numeric') || lowerType.includes('decimal') || lowerType === 'real' || lowerType === 'double precision') return 'number';
    if (lowerType === 'boolean') return 'boolean';
    if (lowerType.includes('timestamp') || lowerType === 'date' || lowerType === 'time') return 'date';
    return 'string';
  }

  private mapSqliteType(type: string): string {
    const lowerType = type.toLowerCase();
    if (lowerType === 'integer') return 'integer';
    if (lowerType === 'real' || lowerType === 'numeric') return 'number';
    if (lowerType === 'boolean') return 'boolean';
    if (lowerType === 'date' || lowerType === 'datetime') return 'date';
    return 'string';
  }

  private async parseMsSql(connection: DatabaseConnection, tableName?: string): Promise<ParsedData[]> {
    const config: sql.config = {
      server: connection.host!,
      port: connection.port || 1433,
      user: connection.username!,
      password: connection.password!,
      database: connection.database,
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    };

    try {
      await sql.connect(config);

      const tables = tableName ? [tableName] : await this.getMsSqlTables(connection);
      const results: ParsedData[] = [];

      for (const table of tables) {
        const request = new sql.Request();
        const dataResult = await request.query(`SELECT TOP 1000 * FROM [${table}]`);
        const columnsResult = await request.query(`
          SELECT COLUMN_NAME, DATA_TYPE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${table}'
        `);

        const headers = columnsResult.recordset.map((col: any) => col.COLUMN_NAME);
        const dataTypes: Record<string, string> = {};
        columnsResult.recordset.forEach((col: any) => {
          dataTypes[col.COLUMN_NAME] = this.mapMsSqlType(col.DATA_TYPE);
        });

        const rowsArray = dataResult.recordset.map((row: any) =>
          headers.map((header: string) => row[header])
        );

        results.push({
          headers,
          rows: rowsArray,
          metadata: {
            rowCount: rowsArray.length,
            columnCount: headers.length,
            dataTypes
          }
        });
      }

      return results;
    } catch (error) {
      throw error;
    }
  }

  private async getMsSqlTables(connection: DatabaseConnection): Promise<string[]> {
    const config: sql.config = {
      server: connection.host!,
      port: connection.port || 1433,
      user: connection.username!,
      password: connection.password!,
      database: connection.database,
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    };

    try {
      await sql.connect(config);
      const request = new sql.Request();
      const result = await request.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
      `);
      return result.recordset.map((row: any) => row.TABLE_NAME);
    } catch (error) {
      throw error;
    }
  }

  private mapMsSqlType(type: string): string {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType === 'bigint' || lowerType === 'smallint' || lowerType === 'tinyint') return 'integer';
    if (lowerType.includes('decimal') || lowerType.includes('numeric') || lowerType === 'float' || lowerType === 'real' || lowerType === 'money') return 'number';
    if (lowerType === 'bit') return 'boolean';
    if (lowerType.includes('date') || lowerType.includes('time')) return 'date';
    if (lowerType === 'uniqueidentifier') return 'string';
    return 'string';
  }
}
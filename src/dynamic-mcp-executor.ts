import { SQLiteManager, ServerConfig, ToolDefinition, ResourceDefinition } from './database/sqlite-manager.js';
import * as sql from 'mssql';
import mysql from 'mysql2/promise';
import { Pool } from 'pg';

interface DatabaseConnection {
  type: 'mssql' | 'mysql' | 'postgresql';
  connection: any;
  config: any;
}

export class DynamicMCPExecutor {
  private sqliteManager: SQLiteManager;
  private dbConnections: Map<string, DatabaseConnection> = new Map();

  constructor() {
    this.sqliteManager = new SQLiteManager();
  }

  async getAllTools(): Promise<any[]> {
    const tools = this.sqliteManager.getAllTools();

    return tools.slice(0, 3).map(tool => ({
      name: `${tool.server_id}__${tool.name}`,
      description: `[${tool.server_id}] ${tool.description}`,
      inputSchema: typeof tool.inputSchema === 'string' ? JSON.parse(tool.inputSchema) : tool.inputSchema
    }));
  }

  async getAllResources(): Promise<any[]> {
    const resources = this.sqliteManager.getAllResources();

    return resources.map(resource => ({
      name: `${resource.server_id}__${resource.name}`,
      description: `[${resource.server_id}] ${resource.description}`,
      uri: resource.uri_template
    }));
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    try {
      // Parse tool name: "serverId__toolName"
      const parts = toolName.split('__');
      if (parts.length !== 2) {
        throw new Error(`Invalid tool name format: ${toolName}`);
      }

      const [serverId, actualToolName] = parts;

      // Get tool definition from JSON database
      const tools = this.sqliteManager.getToolsForServer(serverId);
      const tool = tools.find(t => t.name === actualToolName);

      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      // Get server config from JSON database
      const serverConfig = this.sqliteManager.getServer(serverId);
      if (!serverConfig) {
        throw new Error(`Server not found: ${serverId}`);
      }

      // Get or create database connection
      const dbConnection = await this.getOrCreateConnection(serverId, serverConfig.dbConfig);

      // Execute the SQL query
      const result = await this.executeQuery(dbConnection, tool.sqlQuery, args, tool.operation);

      console.log(`✅ Executed tool ${toolName} successfully`);
      return {
        success: true,
        data: result,
        rowCount: Array.isArray(result) ? result.length : (result.rowsAffected || 0)
      };

    } catch (error) {
      console.error(`❌ Error executing tool ${toolName}:`, error);
      throw error;
    }
  }

  async readResource(resourceName: string): Promise<any> {
    try {
      // Parse resource name: "serverId__resourceName"
      const parts = resourceName.split('__');
      if (parts.length !== 2) {
        throw new Error(`Invalid resource name format: ${resourceName}`);
      }

      const [serverId, actualResourceName] = parts;

      // Get resource definition from JSON database
      const resources = this.sqliteManager.getResourcesForServer(serverId);
      const resource = resources.find(r => r.name === actualResourceName);

      if (!resource) {
        throw new Error(`Resource not found: ${resourceName}`);
      }

      // Get server config from JSON database
      const serverConfig = this.sqliteManager.getServer(serverId);
      if (!serverConfig) {
        throw new Error(`Server not found: ${serverId}`);
      }

      // Get or create database connection
      const dbConnection = await this.getOrCreateConnection(serverId, serverConfig.dbConfig);

      // Execute the SQL query
      const result = await this.executeQuery(dbConnection, resource.sqlQuery, {}, 'SELECT');

      console.log(`✅ Read resource ${resourceName} successfully`);
      return {
        contents: [{
          uri: resource.uri_template,
          mimeType: 'application/json',
          text: JSON.stringify(result, null, 2)
        }]
      };

    } catch (error) {
      console.error(`❌ Error reading resource ${resourceName}:`, error);
      throw error;
    }
  }

  private async getOrCreateConnection(serverId: string, dbConfig: any): Promise<DatabaseConnection> {
    if (this.dbConnections.has(serverId)) {
      return this.dbConnections.get(serverId)!;
    }

    let connection: any;
    let dbConnection: DatabaseConnection;

    try {
      switch (dbConfig.type) {
        case 'mssql':
          connection = new sql.ConnectionPool({
            server: dbConfig.server,
            port: dbConfig.port || 1433,
            database: dbConfig.database,
            user: dbConfig.username,
            password: dbConfig.password,
            options: {
              encrypt: dbConfig.encrypt || false,
              trustServerCertificate: dbConfig.trustServerCertificate || true
            }
          });

          await connection.connect();
          console.log(`🔗 Connected to MSSQL database for server ${serverId}`);
          break;

        case 'mysql':
          connection = mysql.createConnection({
            host: dbConfig.server,
            port: dbConfig.port || 3306,
            database: dbConfig.database,
            user: dbConfig.username,
            password: dbConfig.password
          });

          await connection.connect();
          console.log(`🔗 Connected to MySQL database for server ${serverId}`);
          break;

        case 'postgresql':
          connection = new Pool({
            host: dbConfig.server,
            port: dbConfig.port || 5432,
            database: dbConfig.database,
            user: dbConfig.username,
            password: dbConfig.password
          });

          // Test connection
          await connection.query('SELECT 1');
          console.log(`🔗 Connected to PostgreSQL database for server ${serverId}`);
          break;

        default:
          throw new Error(`Unsupported database type: ${dbConfig.type}`);
      }

      dbConnection = {
        type: dbConfig.type,
        connection,
        config: dbConfig
      };

      this.dbConnections.set(serverId, dbConnection);
      return dbConnection;

    } catch (error) {
      console.error(`❌ Failed to connect to database for server ${serverId}:`, error);
      throw error;
    }
  }

  private async executeQuery(dbConnection: DatabaseConnection, sqlQuery: string, args: any, operation: string): Promise<any> {
    const { type, connection } = dbConnection;

    try {
      switch (type) {
        case 'mssql':
          const request = connection.request();

          // Extract all @param references from the SQL query
          const paramRegex = /@(\w+)/g;
          let match;
          const sqlParams = new Set();
          while ((match = paramRegex.exec(sqlQuery)) !== null) {
            sqlParams.add(match[1]);
          }

          // Add all SQL parameters, using provided values or NULL
          for (const paramName of sqlParams) {
            const value = args[paramName];
            if (value !== undefined && value !== null) {
              request.input(paramName, value);
            } else {
              request.input(paramName, null);
            }
          }

          const result = await request.query(sqlQuery);

          if (operation === 'SELECT') {
            return result.recordset;
          } else {
            return { rowsAffected: result.rowsAffected[0] };
          }

        case 'mysql':
          const [rows] = await connection.execute(sqlQuery, Object.values(args).filter(v => v !== undefined && v !== null));

          if (operation === 'SELECT') {
            return rows;
          } else {
            return { rowsAffected: (rows as any).affectedRows };
          }

        case 'postgresql':
          const values = Object.values(args).filter(v => v !== undefined && v !== null);
          const pgResult = await connection.query(sqlQuery, values);

          if (operation === 'SELECT') {
            return pgResult.rows;
          } else {
            return { rowsAffected: pgResult.rowCount };
          }

        default:
          throw new Error(`Unsupported database type: ${type}`);
      }
    } catch (error) {
      console.error(`❌ Database query failed:`, error);
      throw error;
    }
  }

  getStats(): any {
    return {
      ...this.sqliteManager.getStats(),
      activeConnections: this.dbConnections.size
    };
  }

  async close(): Promise<void> {
    // Close all database connections
    for (const [serverId, dbConnection] of this.dbConnections.entries()) {
      try {
        switch (dbConnection.type) {
          case 'mssql':
            await dbConnection.connection.close();
            break;
          case 'mysql':
            await dbConnection.connection.end();
            break;
          case 'postgresql':
            await dbConnection.connection.end();
            break;
        }
        console.log(`🔌 Closed database connection for server ${serverId}`);
      } catch (error) {
        console.error(`❌ Error closing connection for server ${serverId}:`, error);
      }
    }

    this.dbConnections.clear();
    this.sqliteManager.close();
  }
}
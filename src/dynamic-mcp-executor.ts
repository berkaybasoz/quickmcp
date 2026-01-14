import { SQLiteManager, ServerConfig, ToolDefinition, ResourceDefinition } from './database/sqlite-manager';
import sql from 'mssql';
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

    return tools.map(tool => ({
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
      const [serverId, actualToolName] = this.parseToolName(toolName);
      const tool = this.getTool(serverId, actualToolName);
      const serverConfig = this.getServerConfig(serverId);
      const queryConfig = this.parseQueryConfig(tool.sqlQuery);

      if (queryConfig?.type === 'rest') {
        return await this.executeRestCall(queryConfig, args);
      }

      if (queryConfig?.type === 'webpage') {
        return await this.executeWebpageFetch(queryConfig);
      }

      if (queryConfig?.type === 'curl') {
        return await this.executeCurlRequest(queryConfig, args);
      }

      return await this.executeDatabaseQuery(serverId, serverConfig, tool, args);

    } catch (error) {
      console.error(`❌ Error executing tool ${toolName}:`, error);
      throw error;
    }
  }

  private parseToolName(toolName: string): [string, string] {
    const parts = toolName.split('__');
    if (parts.length !== 2) {
      throw new Error(`Invalid tool name format: ${toolName}`);
    }
    return [parts[0], parts[1]];
  }

  private getTool(serverId: string, toolName: string): ToolDefinition {
    const tools = this.sqliteManager.getToolsForServer(serverId);
    const tool = tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${serverId}__${toolName}`);
    }
    return tool;
  }

  private getServerConfig(serverId: string): any {
    const serverConfig = this.sqliteManager.getServer(serverId);
    if (!serverConfig) {
      throw new Error(`Server not found: ${serverId}`);
    }
    return serverConfig;
  }

  private parseQueryConfig(sqlQuery: string): any {
    try {
      return JSON.parse(sqlQuery);
    } catch {
      return null;
    }
  }

  private async executeRestCall(queryConfig: any, args: any): Promise<any> {
    const { baseUrl, method, path } = queryConfig;
    const url = `${baseUrl}${path}`;
    console.error(`🌐 REST API call: ${method} ${url}`);

    const fetchOptions: any = {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    if (method !== 'GET' && Object.keys(args).length > 0) {
      fetchOptions.body = JSON.stringify(args);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    console.error(`✅ REST API response: ${response.status}`);
    return {
      success: true,
      data: Array.isArray(data) ? data : [data],
      rowCount: Array.isArray(data) ? data.length : 1
    };
  }

  private async executeWebpageFetch(queryConfig: any): Promise<any> {
    const url = queryConfig.url;
    console.error(`🌐 Fetching webpage: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QuickMCP/1.0; +https://github.com/berkaybasoz/quickmcp)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    console.error(`✅ Fetched ${html.length} characters from ${url}`);
    return {
      success: true,
      data: [{
        url: url,
        html_content: html,
        content_length: html.length,
        status: response.status,
        content_type: response.headers.get('content-type') || 'unknown'
      }],
      rowCount: 1
    };
  }

  private async executeCurlRequest(queryConfig: any, args: any): Promise<any> {
    // Start with base config and override with runtime args
    const finalConfig = { ...queryConfig, ...args };
    
    const { url, method, headers, body } = finalConfig;

    if (!url) {
        throw new Error('URL is missing in cURL request configuration');
    }

    //console.error(`🚀 cURL Request: ${method || 'GET'} ${url}`);

    const fetchOptions: RequestInit = {
        method: method || 'GET',
        headers: headers || {},
    };

    if (body && Object.keys(body).length > 0 && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(body);
        // Ensure content-type is set for JSON body
        (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');
    
    let responseData: any;
    if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
    } else {
        responseData = await response.text();
    }

    console.error(`✅ cURL Response: ${response.status}`);
    
    if (!response.ok) {
        console.error(`❌ cURL request failed with status ${response.status}:`, responseData);
        // Still return a structured response for the tool output
        return {
            success: false,
            error: `Request failed with status ${response.status}`,
            data: [{
                status: response.status,
                response: responseData
            }],
            rowCount: 1
        };
    }

    const dataArray = Array.isArray(responseData) ? responseData : [responseData];

    return {
        success: true,
        data: dataArray,
        rowCount: dataArray.length
    };
  }

  private async executeDatabaseQuery(serverId: string, serverConfig: any, tool: ToolDefinition, args: any): Promise<any> {
    const dbConnection = await this.getOrCreateConnection(serverId, serverConfig.dbConfig);
    const result = await this.executeQuery(dbConnection, tool.sqlQuery, args, tool.operation);

    console.error(`✅ Executed tool ${serverId}__${tool.name} successfully`);
    return {
      success: true,
      data: result,
      rowCount: Array.isArray(result) ? result.length : (result.rowsAffected || 0)
    };
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

      console.error(`✅ Read resource ${resourceName} successfully`);
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
          connection = await sql.connect({
            server: dbConfig.host,
            port: dbConfig.port || 1433,
            database: dbConfig.database,
            user: dbConfig.username,
            password: dbConfig.password,
            options: {
              encrypt: dbConfig.encrypt || false,
              trustServerCertificate: dbConfig.trustServerCertificate ?? true
            }
          });

          console.error(`🔗 Connected to MSSQL database for server ${serverId}`);
          break;

        case 'mysql':
          connection = mysql.createConnection({
            host: dbConfig.host,
            port: dbConfig.port || 3306,
            database: dbConfig.database,
            user: dbConfig.username,
            password: dbConfig.password
          });

          await connection.connect();
          console.error(`🔗 Connected to MySQL database for server ${serverId}`);
          break;

        case 'postgresql':
          connection = new Pool({
            host: dbConfig.host,
            port: dbConfig.port || 5432,
            database: dbConfig.database,
            user: dbConfig.username,
            password: dbConfig.password
          });

          // Test connection
          await connection.query('SELECT 1');
          console.error(`🔗 Connected to PostgreSQL database for server ${serverId}`);
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

          // For SQL Server, handle data type compatibility issues
          // If no filter parameters are provided (all are null), simplify the query
          const hasActiveFilters = Array.from(sqlParams).some((paramName: string) => {
            if (paramName === 'limit' || paramName === 'offset') return false;
            const value = args[paramName];
            return value !== undefined && value !== null;
          });

          let modifiedQuery = sqlQuery;
          if (!hasActiveFilters && operation === 'SELECT') {
            // Remove complex WHERE clause that causes ntext compatibility issues
            modifiedQuery = sqlQuery.replace(/WHERE.*?(?=ORDER BY|GROUP BY|HAVING|$)/gi, '');
          }

          // Always add all SQL parameters, using provided values or defaults
          for (const paramName of sqlParams) {
            const paramNameStr = paramName as string;
            let value = args[paramNameStr];
            
            // Set defaults for limit and offset if not provided
            if (paramNameStr === 'limit' && (value === undefined || value === null)) {
              value = 100;
            } else if (paramNameStr === 'offset' && (value === undefined || value === null)) {
              value = 0;
            }
            
            if (value !== undefined && value !== null) {
              request.input(paramNameStr, value);
            } else {
              request.input(paramNameStr, null);
            }
          }

          const result = await request.query(modifiedQuery);

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
        console.error(`🔌 Closed database connection for server ${serverId}`);
      } catch (error) {
        console.error(`❌ Error closing connection for server ${serverId}:`, error);
      }
    }

    this.dbConnections.clear();
    this.sqliteManager.close();
  }
}

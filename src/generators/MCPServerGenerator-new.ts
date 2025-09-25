import { SQLiteManager, ServerConfig, ToolDefinition, ResourceDefinition } from '../database/sqlite-manager.js';

interface ParsedColumn {
  name: string;
  type: string;
  nullable: boolean;
}

interface ParsedData {
  [tableName: string]: any[];
}

export class MCPServerGenerator {
  private sqliteManager: SQLiteManager;

  constructor() {
    this.sqliteManager = new SQLiteManager();
  }

  async generateServer(
    serverId: string,
    serverName: string,
    parsedData: ParsedData,
    dbConfig: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🚀 Generating virtual MCP server: ${serverId}`);

      // Create server config
      const serverConfig: ServerConfig = {
        id: serverId,
        name: serverName,
        dbConfig: dbConfig,
        createdAt: new Date().toISOString()
      };

      // Save server to SQLite database only
      this.sqliteManager.saveServer(serverConfig);
      console.log(`✅ Server config saved to SQLite database: ${serverId}`);

      // Generate and save tools
      const tools = this.generateToolsForData(serverId, parsedData, dbConfig);
      if (tools.length > 0) {
        this.sqliteManager.saveTools(tools);
        console.log(`✅ Generated ${tools.length} tools for server ${serverId}`);
      }

      // Generate and save resources
      const resources = this.generateResourcesForData(serverId, parsedData, dbConfig);
      if (resources.length > 0) {
        this.sqliteManager.saveResources(resources);
        console.log(`✅ Generated ${resources.length} resources for server ${serverId}`);
      }

      return {
        success: true,
        message: `Virtual MCP server '${serverId}' created successfully with ${tools.length} tools and ${resources.length} resources`
      };
    } catch (error) {
      console.error(`❌ Error generating server ${serverId}:`, error);
      return {
        success: false,
        message: `Failed to generate server: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private generateToolsForData(serverId: string, parsedData: ParsedData, dbConfig: any): ToolDefinition[] {
    const tools: ToolDefinition[] = [];

    for (const [tableName, rows] of Object.entries(parsedData)) {
      if (!rows || rows.length === 0) continue;

      const columns = this.analyzeColumns(rows);
      const cleanTableName = this.sanitizeName(tableName);

      // GET tool
      tools.push({
        server_id: serverId,
        name: `get_${cleanTableName}`,
        description: `Get records from ${tableName} table`,
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of records to return',
              default: 100,
              minimum: 1,
              maximum: 1000
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip',
              default: 0,
              minimum: 0
            },
            ...this.generateFilterProperties(columns)
          },
          required: []
        },
        sqlQuery: this.generateSelectQuery(tableName, columns, dbConfig.type),
        operation: 'SELECT'
      });

      // CREATE tool
      tools.push({
        server_id: serverId,
        name: `create_${cleanTableName}`,
        description: `Create a new record in ${tableName} table`,
        inputSchema: {
          type: 'object',
          properties: this.generateInputProperties(columns, true),
          required: columns.filter(col => !col.nullable && col.name.toLowerCase() !== 'id').map(col => col.name)
        },
        sqlQuery: this.generateInsertQuery(tableName, columns, dbConfig.type),
        operation: 'INSERT'
      });

      // UPDATE tool
      if (columns.some(col => col.name.toLowerCase() === 'id')) {
        tools.push({
          server_id: serverId,
          name: `update_${cleanTableName}`,
          description: `Update a record in ${tableName} table`,
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: ['string', 'number'],
                description: 'ID of the record to update'
              },
              ...this.generateInputProperties(columns, false)
            },
            required: ['id']
          },
          sqlQuery: this.generateUpdateQuery(tableName, columns, dbConfig.type),
          operation: 'UPDATE'
        });

        // DELETE tool
        tools.push({
          server_id: serverId,
          name: `delete_${cleanTableName}`,
          description: `Delete a record from ${tableName} table`,
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: ['string', 'number'],
                description: 'ID of the record to delete'
              }
            },
            required: ['id']
          },
          sqlQuery: this.generateDeleteQuery(tableName, dbConfig.type),
          operation: 'DELETE'
        });
      }
    }

    return tools;
  }

  private generateResourcesForData(serverId: string, parsedData: ParsedData, dbConfig: any): ResourceDefinition[] {
    const resources: ResourceDefinition[] = [];

    for (const [tableName, rows] of Object.entries(parsedData)) {
      if (!rows || rows.length === 0) continue;

      const cleanTableName = this.sanitizeName(tableName);

      resources.push({
        server_id: serverId,
        name: `${cleanTableName}_list`,
        description: `List all records from ${tableName} table`,
        uri_template: `${cleanTableName}://list`,
        sqlQuery: this.generateSelectQuery(tableName, this.analyzeColumns(rows), dbConfig.type, false)
      });
    }

    return resources;
  }

  private analyzeColumns(rows: any[]): ParsedColumn[] {
    if (!rows || rows.length === 0) return [];

    const firstRow = rows[0];
    const columns: ParsedColumn[] = [];

    for (const [key, value] of Object.entries(firstRow)) {
      let type = 'string';

      if (typeof value === 'number') {
        type = Number.isInteger(value) ? 'integer' : 'number';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      } else if (value instanceof Date) {
        type = 'string'; // Dates are handled as strings in JSON
      } else if (value === null || value === undefined) {
        // Check other rows to determine type
        for (let i = 1; i < Math.min(rows.length, 10); i++) {
          const otherValue = rows[i][key];
          if (otherValue !== null && otherValue !== undefined) {
            if (typeof otherValue === 'number') {
              type = Number.isInteger(otherValue) ? 'integer' : 'number';
            } else if (typeof otherValue === 'boolean') {
              type = 'boolean';
            }
            break;
          }
        }
      }

      columns.push({
        name: key,
        type: type,
        nullable: rows.some(row => row[key] === null || row[key] === undefined)
      });
    }

    return columns;
  }

  private generateFilterProperties(columns: ParsedColumn[]): any {
    const properties: any = {};

    for (const column of columns) {
      const baseType = column.type === 'integer' ? 'number' : column.type;
      properties[`filter_${column.name}`] = {
        type: baseType,
        description: `Filter by ${column.name}`
      };
    }

    return properties;
  }

  private generateInputProperties(columns: ParsedColumn[], isCreate: boolean): any {
    const properties: any = {};

    for (const column of columns) {
      // Skip ID field for create operations
      if (isCreate && column.name.toLowerCase() === 'id') continue;

      const baseType = column.type === 'integer' ? 'number' : column.type;
      properties[column.name] = {
        type: column.nullable ? [baseType, 'null'] : baseType,
        description: `${column.name} field`
      };
    }

    return properties;
  }

  private generateSelectQuery(tableName: string, columns: ParsedColumn[], dbType: string, withParams: boolean = true): string {
    const columnList = columns.map(col => `[${col.name}]`).join(', ');
    let query = `SELECT ${columnList} FROM [${tableName}]`;

    if (withParams) {
      const whereConditions = columns.map(col =>
        `(@filter_${col.name} IS NULL OR [${col.name}] = @filter_${col.name})`
      ).join(' AND ');

      query += ` WHERE ${whereConditions}`;

      if (dbType === 'mssql') {
        // Use TOP for SQL Server to avoid OFFSET/FETCH complexity
        // Replace SELECT with SELECT TOP
        query = query.replace('SELECT ', 'SELECT TOP (@limit) ');
      } else {
        query += ' LIMIT @limit OFFSET @offset';
      }
    }

    return query;
  }

  private generateInsertQuery(tableName: string, columns: ParsedColumn[], dbType: string): string {
    const insertColumns = columns.filter(col => col.name.toLowerCase() !== 'id');
    const columnNames = insertColumns.map(col => `[${col.name}]`).join(', ');
    const paramNames = insertColumns.map(col => `@${col.name}`).join(', ');

    return `INSERT INTO [${tableName}] (${columnNames}) VALUES (${paramNames})`;
  }

  private generateUpdateQuery(tableName: string, columns: ParsedColumn[], dbType: string): string {
    const updateColumns = columns.filter(col => col.name.toLowerCase() !== 'id');
    const setClause = updateColumns.map(col => `[${col.name}] = @${col.name}`).join(', ');

    return `UPDATE [${tableName}] SET ${setClause} WHERE [Id] = @id`;
  }

  private generateDeleteQuery(tableName: string, dbType: string): string {
    return `DELETE FROM [${tableName}] WHERE [Id] = @id`;
  }

  private sanitizeName(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Public methods for management
  getAllServers(): ServerConfig[] {
    return this.sqliteManager.getAllServers();
  }

  getServer(serverId: string): ServerConfig | null {
    return this.sqliteManager.getServer(serverId);
  }

  deleteServer(serverId: string): void {
    this.sqliteManager.deleteServer(serverId);
    console.log(`🗑️ Deleted server from SQLite database: ${serverId}`);
  }

  getAllTools(): ToolDefinition[] {
    return this.sqliteManager.getAllTools();
  }

  getToolsForServer(serverId: string): ToolDefinition[] {
    return this.sqliteManager.getToolsForServer(serverId);
  }

  getAllResources(): ResourceDefinition[] {
    return this.sqliteManager.getAllResources();
  }

  getResourcesForServer(serverId: string): ResourceDefinition[] {
    return this.sqliteManager.getResourcesForServer(serverId);
  }

  getStats(): { servers: number; tools: number; resources: number } {
    return this.sqliteManager.getStats();
  }

  close(): void {
    this.sqliteManager.close();
  }
}
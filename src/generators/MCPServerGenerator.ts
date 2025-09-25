import { MCPServerConfig, ParsedData, MCPTool, MCPResource, MCPPrompt } from '../types';

export class MCPServerGenerator {
  generateServer(config: MCPServerConfig, parsedData: ParsedData[]): string {
    const isDatabaseConnection = config.dataSource.type === 'database';
    const isMSSQLConnection = isDatabaseConnection && config.dataSource.connection?.type === 'mssql';

    const serverCode = `#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import * as sql from 'mssql';

class ${this.toPascalCase(config.name)}Server {
  private server: Server;
  private pool: sql.ConnectionPool;

  constructor() {
    // Database configuration - all servers now use MSSQL
    const dbConfig = {
      user: '${config.dataSource.connection?.username || 'sa'}',
      password: '${config.dataSource.connection?.password || 'StrongPassword123!'}',
      database: '${config.dataSource.connection?.database || 'exceptionmonitor'}',
      server: '${config.dataSource.connection?.host || 'localhost'}',
      port: ${config.dataSource.connection?.port || 1434},
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      },
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };

    this.pool = new sql.ConnectionPool(dbConfig);
    this.server = new Server(
      {
        name: '${config.name}',
        version: '${config.version}',
        description: '${config.description}'
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        ${config.tools.map(tool => this.generateToolDefinition(tool)).join(',\n        ')}
      ]
    }));

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        ${config.resources.map(resource => this.generateResourceDefinition(resource)).join(',\n        ')}
      ]
    }));

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        ${config.prompts.map(prompt => this.generatePromptDefinition(prompt)).join(',\n        ')}
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        ${config.tools.map(tool => this.generateToolHandler(tool, config)).join('\n        ')}
        default:
          throw new McpError(ErrorCode.MethodNotFound, \`Unknown tool: \${name}\`);
      }
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        ${config.resources.map(resource => this.generateResourceHandler(resource)).join('\n        ')}
        default:
          throw new McpError(ErrorCode.InvalidParams, \`Unknown resource: \${uri}\`);
      }
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        ${config.prompts.map(prompt => this.generatePromptHandler(prompt)).join('\n        ')}
        default:
          throw new McpError(ErrorCode.MethodNotFound, \`Unknown prompt: \${name}\`);
      }
    });
  }

${this.generateUtilityMethods(config, parsedData)}

  private toSafeIdentifier(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  async run() {
    // Initialize database connection - all servers now use MSSQL
    try {
      await this.pool.connect();
      console.error('✅ Database connection established');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }
    // Check if we should run as TCP server for runtime mode
    const port = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT) : null;

    if (port) {
      // TCP Server mode for runtime
      const { SSEServerTransport } = await import('@modelcontextprotocol/sdk/server/sse.js');
      const transport = new SSEServerTransport(\`/message\`, this.server);

      const express = await import('express');
      const app = express.default();

      app.use(express.json());
      app.use('/sse', transport.handler);

      app.listen(port, () => {
        console.error(\`${config.name} MCP server running on http://localhost:\${port}\`);
      });
    } else {
      // Standard stdio mode
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('${config.name} MCP server running on stdio');
    }
  }
}

const server = new ${this.toPascalCase(config.name)}Server();
server.run().catch(console.error);
`;

    return serverCode;
  }

  generatePackageJson(config: MCPServerConfig): string {
    const dependencies: any = {
      "@modelcontextprotocol/sdk": "^0.4.0",
      "express": "^4.18.0",
      "mssql": "^11.0.1"  // All servers now use MSSQL
    };

    return JSON.stringify({
      name: `mcp-server-${config.name.toLowerCase()}`,
      version: config.version,
      description: config.description,
      type: "module",
      main: "index.js",
      scripts: {
        build: "tsc",
        start: "node dist/index.js",
        dev: "tsx index.ts",
        "start:runtime": "MCP_PORT=3001 tsx index.ts"
      },
      dependencies,
      devDependencies: {
        typescript: "^5.0.0",
        "@types/node": "^20.0.0",
        "@types/express": "^4.17.0",
        "tsx": "^4.0.0"
      }
    }, null, 2);
  }

  generateConfigFromData(name: string, description: string, parsedData: ParsedData[]): MCPServerConfig {
    const tools: MCPTool[] = [];
    const resources: MCPResource[] = [];
    const prompts: MCPPrompt[] = [];

    parsedData.forEach((data, tableIndex) => {
      const tableName = data.tableName || `table_${tableIndex}`;
      const safeTableName = this.toSafeIdentifier(tableName);

      // Generate search tool
      tools.push({
        name: `search_${safeTableName}`,
        description: `Search records in ${tableName}`,
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            limit: { type: "number", description: "Maximum number of results", default: 10 }
          },
          required: ["query"]
        },
        handler: `searchTable(${tableIndex}, args.query, args.limit || 10)`
      });

      // Generate get all tool
      tools.push({
        name: `get_all_${safeTableName}`,
        description: `Get all records from ${tableName}`,
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Maximum number of results", default: 100 }
          }
        },
        handler: `getAllFromTable(${tableIndex}, args.limit || 100)`
      });

      // Generate filter tool for each column
      data.headers.forEach(header => {
        const columnType = data.metadata.dataTypes[header];
        const filterSchema = this.getFilterSchema(columnType);
        const safeHeaderName = this.toSafeIdentifier(header);

        tools.push({
          name: `filter_${safeTableName}_by_${safeHeaderName}`,
          description: `Filter ${tableName} by ${header}`,
          inputSchema: {
            type: "object",
            properties: {
              value: filterSchema,
              limit: { type: "number", description: "Maximum number of results", default: 50 }
            },
            required: ["value"]
          },
          handler: `filterTableByColumn(${tableIndex}, '${header}', args.value, args.limit || 50)`
        });
      });

      // Generate resource for table schema
      resources.push({
        uri: `schema://${safeTableName}`,
        name: `${tableName} Schema`,
        description: `Schema information for ${tableName}`,
        mimeType: "application/json"
      });

      // Generate resource for sample data
      resources.push({
        uri: `data://${safeTableName}/sample`,
        name: `${tableName} Sample Data`,
        description: `Sample data from ${tableName}`,
        mimeType: "application/json"
      });

      // Generate analysis prompt
      prompts.push({
        name: `analyze_${safeTableName}`,
        description: `Analyze data patterns in ${tableName}`,
        arguments: [
          { name: "focus", description: "What aspect to focus on", required: false }
        ],
        template: `Analyze the data in ${tableName}. The table has ${data.metadata.rowCount} rows and ${data.metadata.columnCount} columns.
Columns: ${data.headers.join(', ')}

{{args.focus ? \`Focus on: \${args.focus}\` : 'Provide a general analysis of the data patterns, distributions, and any interesting insights.'}}`
      });
    });

    return {
      name,
      description,
      version: "1.0.0",
      dataSource: { type: 'json', name, data: [] },
      tools,
      resources,
      prompts
    };
  }

  private generateDataStorage(parsedData: ParsedData[]): string {
    return `const DATA = ${JSON.stringify(parsedData, null, 2)};`;
  }

  private generateToolDefinition(tool: MCPTool): string {
    return `{
          name: '${tool.name}',
          description: '${tool.description}',
          inputSchema: ${JSON.stringify(tool.inputSchema, null, 10)}
        }`;
  }

  private generateResourceDefinition(resource: MCPResource): string {
    return `{
          uri: '${resource.uri}',
          name: '${resource.name}',
          description: '${resource.description}'${resource.mimeType ? `, mimeType: '${resource.mimeType}'` : ''}
        }`;
  }

  private generatePromptDefinition(prompt: MCPPrompt): string {
    return `{
          name: '${prompt.name}',
          description: '${prompt.description}',
          arguments: ${JSON.stringify(prompt.arguments, null, 10)}
        }`;
  }

  private generateToolHandler(tool: MCPTool, config: MCPServerConfig): string {
    const isDatabaseConnection = config.dataSource.type === 'database';
    const isMSSQLConnection = isDatabaseConnection && config.dataSource.connection?.type === 'mssql';

    if (isMSSQLConnection && (tool.handler.includes('getAllFromTable') ||
                             tool.handler.includes('searchTable') ||
                             tool.handler.includes('filterTableByColumn'))) {
      // Add await for database methods
      const asyncHandler = tool.handler.replace(/(\w+)\((.*?)\)/g, 'await this.$1($2)');
      return `case '${tool.name}':
          return { content: [{ type: 'text', text: JSON.stringify(${asyncHandler}) }] };`;
    } else {
      return `case '${tool.name}':
          return { content: [{ type: 'text', text: JSON.stringify(${tool.handler}) }] };`;
    }
  }

  private generateResourceHandler(resource: MCPResource): string {
    const uriParts = resource.uri.split('://');
    const resourceType = uriParts[0];
    const resourcePath = uriParts[1];

    if (resourceType === 'schema') {
      // Find table index by matching the resource path with actual table names
      return `case '${resource.uri}':
          const schemaTableIndex = DATA.findIndex(table =>
            this.toSafeIdentifier(table.tableName || \`table_\${DATA.indexOf(table)}\`) === '${resourcePath}'
          );
          return {
            contents: [{
              uri: '${resource.uri}',
              mimeType: 'application/json',
              text: JSON.stringify({
                headers: DATA[schemaTableIndex].headers,
                metadata: DATA[schemaTableIndex].metadata
              }, null, 2)
            }]
          };`;
    } else if (resourceType === 'data') {
      const [tableName, dataType] = resourcePath.split('/');
      return `case '${resource.uri}':
          const dataTableIndex = DATA.findIndex(table =>
            this.toSafeIdentifier(table.tableName || \`table_\${DATA.indexOf(table)}\`) === '${tableName}'
          );
          return {
            contents: [{
              uri: '${resource.uri}',
              mimeType: 'application/json',
              text: JSON.stringify(DATA[dataTableIndex].rows.slice(0, 10), null, 2)
            }]
          };`;
    }

    return `case '${resource.uri}':
          return {
            contents: [{
              uri: '${resource.uri}',
              mimeType: '${resource.mimeType || 'text/plain'}',
              text: 'Resource data'
            }]
          };`;
  }

  private generatePromptHandler(prompt: MCPPrompt): string {
    const escapedTemplate = prompt.template.replace(/`/g, '\\`').replace(/\${/g, '\\${');
    return `case '${prompt.name}':
          return {
            description: '${prompt.description}',
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: \`${escapedTemplate}\`
              }
            }]
          };`;
  }

  private generateUtilityMethods(config: MCPServerConfig, parsedData: ParsedData[]): string {
    // All servers now use MSSQL database connections - no static data
    return this.generateMSSQLUtilityMethods(parsedData);
  }

  private generateStaticUtilityMethods(): string {
    // Static methods removed - all servers now use database connections
    return `
  // Static utility methods are deprecated - using database connections only
  private searchTable() { throw new Error('Static methods removed - use database connection'); }
  private getAllFromTable() { throw new Error('Static methods removed - use database connection'); }
  private filterTableByColumn() { throw new Error('Static methods removed - use database connection'); }
`;
  }

  private generateMSSQLUtilityMethods(parsedData: ParsedData[]): string {
    const tableNames = parsedData.map(data => data.tableName);
    const tableNamesArray = tableNames.map(name => `'${name}'`).join(', ');

    return `
  private async searchTable(tableIndex: number, query: string, limit: number) {
    const tableNames = [${tableNamesArray}];
    const tableName = tableNames[tableIndex];

    try {
      await this.pool.connect();
      const request = this.pool.request();

      // Get table columns for dynamic search
      const columnsResult = await request.query(\`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '\${tableName}'
        AND DATA_TYPE IN ('varchar', 'nvarchar', 'text', 'ntext', 'char', 'nchar')
      \`);

      const textColumns = columnsResult.recordset.map(row => row.COLUMN_NAME);

      if (textColumns.length === 0) {
        return { headers: [], rows: [], total: 0 };
      }

      const searchConditions = textColumns.map(col => \\\`\\\${col} LIKE @query\\\`).join(' OR ');
      const searchQuery = \\\`SELECT TOP (\\\${limit}) * FROM \\\${tableName} WHERE \\\${searchConditions} ORDER BY (SELECT NULL)\\\`;

      const searchRequest = this.pool.request();
      searchRequest.input('query', sql.NVarChar, \`%\${query}%\`);
      const result = await searchRequest.query(searchQuery);

      const headers = Object.keys(result.recordset[0] || {});
      const rows = result.recordset.map(row => headers.map(header => row[header]));

      return {
        headers: headers,
        rows: rows,
        total: rows.length
      };
    } catch (error) {
      console.error('Database search error:', error);
      return { headers: [], rows: [], total: 0 };
    }
  }

  private async getAllFromTable(tableIndex: number, limit: number) {
    const tableNames = [${tableNamesArray}];
    const tableName = tableNames[tableIndex];

    try {
      await this.pool.connect();
      const request = this.pool.request();
      const query = \\\`SELECT TOP (\\\${limit}) * FROM \\\${tableName} ORDER BY (SELECT NULL)\\\`;
      const result = await request.query(query);

      const headers = Object.keys(result.recordset[0] || {});
      const rows = result.recordset.map(row => headers.map(header => row[header]));

      return {
        headers: headers,
        rows: rows,
        total: rows.length
      };
    } catch (error) {
      console.error('Database error:', error);
      return { headers: [], rows: [], total: 0 };
    }
  }

  private async filterTableByColumn(tableIndex: number, column: string, value: any, limit: number) {
    const tableNames = [${tableNamesArray}];
    const tableName = tableNames[tableIndex];

    try {
      await this.pool.connect();
      const request = this.pool.request();

      let query: string;
      if (typeof value === 'string') {
        query = \\\`SELECT TOP (\\\${limit}) * FROM \\\${tableName} WHERE \\\${column} LIKE @value ORDER BY (SELECT NULL)\\\`;
        request.input('value', sql.NVarChar, \`%\${value}%\`);
      } else if (typeof value === 'boolean') {
        query = \`SELECT TOP (\${limit}) * FROM \${tableName} WHERE \${column} = @value ORDER BY (SELECT NULL)\`;
        request.input('value', sql.Bit, value);
      } else {
        query = \`SELECT TOP (\${limit}) * FROM \${tableName} WHERE \${column} = @value ORDER BY (SELECT NULL)\`;
        request.input('value', value);
      }

      const result = await request.query(query);
      const headers = Object.keys(result.recordset[0] || {});
      const rows = result.recordset.map(row => headers.map(header => row[header]));

      return {
        headers: headers,
        rows: rows,
        total: rows.length
      };
    } catch (error) {
      console.error('Database error:', error);
      return { headers: [], rows: [], total: 0 };
    }
  }`;
  }

  private getFilterSchema(columnType: string): any {
    switch (columnType) {
      case 'integer':
        return { type: "number", description: "Integer value to filter by" };
      case 'number':
        return { type: "number", description: "Number value to filter by" };
      case 'boolean':
        return { type: "boolean", description: "Boolean value to filter by" };
      case 'date':
        return { type: "string", description: "Date value to filter by (ISO format)" };
      default:
        return { type: "string", description: "String value to search for" };
    }
  }

  private toSafeIdentifier(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
      .replace(/^(.)/, (char) => char.toUpperCase());
  }
}
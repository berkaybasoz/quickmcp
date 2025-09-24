"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServerGenerator = void 0;
class MCPServerGenerator {
    generateServer(config, parsedData) {
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

${this.generateDataStorage(parsedData)}

class ${this.toPascalCase(config.name)}Server {
  private server: Server;

  constructor() {
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
        ${config.tools.map(tool => this.generateToolHandler(tool)).join('\n        ')}
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

${this.generateUtilityMethods(parsedData)}

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('${config.name} MCP server running on stdio');
  }
}

const server = new ${this.toPascalCase(config.name)}Server();
server.run().catch(console.error);
`;
        return serverCode;
    }
    generatePackageJson(config) {
        return JSON.stringify({
            name: `mcp-server-${config.name.toLowerCase()}`,
            version: config.version,
            description: config.description,
            type: "module",
            main: "index.js",
            scripts: {
                build: "tsc",
                start: "node dist/index.js"
            },
            dependencies: {
                "@modelcontextprotocol/sdk": "^0.4.0"
            },
            devDependencies: {
                typescript: "^5.0.0",
                "@types/node": "^20.0.0"
            }
        }, null, 2);
    }
    generateConfigFromData(name, description, parsedData) {
        const tools = [];
        const resources = [];
        const prompts = [];
        parsedData.forEach((data, tableIndex) => {
            const tableName = `table_${tableIndex}`;
            // Generate search tool
            tools.push({
                name: `search_${tableName}`,
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
                name: `get_all_${tableName}`,
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
                tools.push({
                    name: `filter_${tableName}_by_${header.toLowerCase()}`,
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
                uri: `schema://${tableName}`,
                name: `${tableName} Schema`,
                description: `Schema information for ${tableName}`,
                mimeType: "application/json"
            });
            // Generate resource for sample data
            resources.push({
                uri: `data://${tableName}/sample`,
                name: `${tableName} Sample Data`,
                description: `Sample data from ${tableName}`,
                mimeType: "application/json"
            });
            // Generate analysis prompt
            prompts.push({
                name: `analyze_${tableName}`,
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
    generateDataStorage(parsedData) {
        return `const DATA = ${JSON.stringify(parsedData, null, 2)};`;
    }
    generateToolDefinition(tool) {
        return `{
          name: '${tool.name}',
          description: '${tool.description}',
          inputSchema: ${JSON.stringify(tool.inputSchema, null, 10)}
        }`;
    }
    generateResourceDefinition(resource) {
        return `{
          uri: '${resource.uri}',
          name: '${resource.name}',
          description: '${resource.description}'${resource.mimeType ? `, mimeType: '${resource.mimeType}'` : ''}
        }`;
    }
    generatePromptDefinition(prompt) {
        return `{
          name: '${prompt.name}',
          description: '${prompt.description}',
          arguments: ${JSON.stringify(prompt.arguments, null, 10)}
        }`;
    }
    generateToolHandler(tool) {
        return `case '${tool.name}':
          return { content: [{ type: 'text', text: JSON.stringify(${tool.handler}) }] };`;
    }
    generateResourceHandler(resource) {
        const uriParts = resource.uri.split('://');
        const resourceType = uriParts[0];
        const resourcePath = uriParts[1];
        if (resourceType === 'schema') {
            const tableIndex = resourcePath.replace('table_', '');
            return `case '${resource.uri}':
          return {
            contents: [{
              uri: '${resource.uri}',
              mimeType: 'application/json',
              text: JSON.stringify({
                headers: DATA[${tableIndex}].headers,
                metadata: DATA[${tableIndex}].metadata
              }, null, 2)
            }]
          };`;
        }
        else if (resourceType === 'data') {
            const [tableName, dataType] = resourcePath.split('/');
            const tableIndex = tableName.replace('table_', '');
            return `case '${resource.uri}':
          return {
            contents: [{
              uri: '${resource.uri}',
              mimeType: 'application/json',
              text: JSON.stringify(DATA[${tableIndex}].rows.slice(0, 10), null, 2)
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
    generatePromptHandler(prompt) {
        return `case '${prompt.name}':
          return {
            description: '${prompt.description}',
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: \`${prompt.template}\`
              }
            }]
          };`;
    }
    generateUtilityMethods(parsedData) {
        return `
  private searchTable(tableIndex: number, query: string, limit: number) {
    const data = DATA[tableIndex];
    const results = data.rows.filter(row =>
      row.some(cell =>
        cell && cell.toString().toLowerCase().includes(query.toLowerCase())
      )
    ).slice(0, limit);

    return {
      headers: data.headers,
      rows: results,
      total: results.length
    };
  }

  private getAllFromTable(tableIndex: number, limit: number) {
    const data = DATA[tableIndex];
    return {
      headers: data.headers,
      rows: data.rows.slice(0, limit),
      total: Math.min(data.rows.length, limit)
    };
  }

  private filterTableByColumn(tableIndex: number, column: string, value: any, limit: number) {
    const data = DATA[tableIndex];
    const columnIndex = data.headers.indexOf(column);

    if (columnIndex === -1) {
      throw new Error(\`Column '\${column}' not found\`);
    }

    const results = data.rows.filter(row => {
      const cellValue = row[columnIndex];
      if (typeof value === 'string') {
        return cellValue && cellValue.toString().toLowerCase().includes(value.toLowerCase());
      }
      return cellValue === value;
    }).slice(0, limit);

    return {
      headers: data.headers,
      rows: results,
      total: results.length
    };
  }`;
    }
    getFilterSchema(columnType) {
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
    toPascalCase(str) {
        return str
            .replace(/[-_\\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
            .replace(/^(.)/, (char) => char.toUpperCase());
    }
}
exports.MCPServerGenerator = MCPServerGenerator;
//# sourceMappingURL=MCPServerGenerator.js.map
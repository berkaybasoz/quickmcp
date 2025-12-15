#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const DatabaseParser_1 = require("./parsers/DatabaseParser");
const MCPServerGenerator_1 = require("./generators/MCPServerGenerator");
class QuickMCPServer {
    constructor() {
        this.currentConnection = null;
        this.currentParsedData = [];
        this.server = new index_js_1.Server({
            name: 'quickmcp-generator',
            version: '1.0.0'
        });
        this.dbParser = new DatabaseParser_1.DatabaseParser();
        this.generator = new MCPServerGenerator_1.MCPServerGenerator();
        this.setupHandlers();
    }
    setupHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'connect_database',
                    description: 'Connect to a database (MySQL, PostgreSQL, SQLite, MSSQL)',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['mysql', 'postgresql', 'sqlite', 'mssql'],
                                description: 'Database type'
                            },
                            host: {
                                type: 'string',
                                description: 'Database host (not required for SQLite)'
                            },
                            port: {
                                type: 'number',
                                description: 'Database port (not required for SQLite)'
                            },
                            database: {
                                type: 'string',
                                description: 'Database name or file path for SQLite'
                            },
                            username: {
                                type: 'string',
                                description: 'Database username (not required for SQLite)'
                            },
                            password: {
                                type: 'string',
                                description: 'Database password (not required for SQLite)'
                            }
                        },
                        required: ['type', 'database']
                    }
                },
                {
                    name: 'list_tables',
                    description: 'List all tables in the currently connected database',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        additionalProperties: false
                    }
                },
                {
                    name: 'parse_database',
                    description: 'Parse and analyze all data from the connected database',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tableNames: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Specific table names to parse (optional - if empty, parses all tables)'
                            }
                        }
                    }
                },
                {
                    name: 'generate_mcp_server',
                    description: 'Generate an MCP server from the currently parsed data',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                description: 'Name for the MCP server'
                            },
                            description: {
                                type: 'string',
                                description: 'Description of the MCP server'
                            },
                            version: {
                                type: 'string',
                                description: 'Version of the MCP server',
                                default: '1.0.0'
                            }
                        },
                        required: ['name']
                    }
                }
            ]
        }));
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'connect_database':
                        return await this.connectDatabase(args);
                    case 'list_tables':
                        return await this.listTables();
                    case 'parse_database':
                        return await this.parseDatabase(args);
                    case 'generate_mcp_server':
                        return await this.generateMCPServer(args);
                    default:
                        throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Tool execution failed: ${error?.message || error}`);
            }
        });
    }
    async connectDatabase(args) {
        try {
            const connection = {
                type: args.type,
                host: args.host,
                port: args.port,
                database: args.database,
                username: args.username,
                password: args.password
            };
            // Test the connection by trying to get tables
            await this.dbParser.getTables(connection);
            this.currentConnection = connection;
            this.currentParsedData = []; // Reset parsed data when connecting to new DB
            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully connected to ${connection.type} database: ${connection.database}`
                    }
                ]
            };
        }
        catch (error) {
            throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Failed to connect to database: ${error?.message || error}`);
        }
    }
    async listTables() {
        if (!this.currentConnection) {
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, 'No database connection. Use connect_database first.');
        }
        try {
            const tables = await this.dbParser.getTables(this.currentConnection);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Found ${tables.length} tables in ${this.currentConnection.database}:\n\n${tables.map(table => `• ${table}`).join('\n')}`
                    }
                ]
            };
        }
        catch (error) {
            throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Failed to list tables: ${error?.message || error}`);
        }
    }
    async parseDatabase(args) {
        if (!this.currentConnection) {
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, 'No database connection. Use connect_database first.');
        }
        try {
            // For now, parse all tables if no specific tables specified
            this.currentParsedData = await this.dbParser.parse(this.currentConnection);
            const summary = this.currentParsedData.map(data => ({
                tableName: data.tableName || 'Unknown',
                rows: data.metadata.rowCount,
                columns: data.metadata.columnCount,
                columnNames: data.headers
            }));
            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully parsed ${this.currentParsedData.length} table(s):\n\n${JSON.stringify(summary, null, 2)}\n\nData is ready for MCP server generation. Use generate_mcp_server to create a server.`
                    }
                ]
            };
        }
        catch (error) {
            throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Failed to parse database: ${error?.message || error}`);
        }
    }
    async generateMCPServer(args) {
        if (this.currentParsedData.length === 0) {
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, 'No parsed data available. Use parse_database first.');
        }
        try {
            // Create a mock MCP server config
            const config = {
                name: args.name,
                description: args.description || `MCP Server for ${this.currentConnection?.database}`,
                version: args.version || '1.0.0',
                dataSource: {
                    type: 'database',
                    name: `Database (${this.currentConnection?.type})`,
                    connection: this.currentConnection || undefined
                },
                tools: this.generateBasicTools(),
                resources: this.generateBasicResources(),
                prompts: this.generateBasicPrompts()
            };
            // Convert ParsedData[] to ParsedData format expected by generator
            const parsedDataForGenerator = {};
            this.currentParsedData.forEach(data => {
                const tableName = data.tableName || `table_${Date.now()}`;
                // Convert rows array to objects using headers
                parsedDataForGenerator[tableName] = data.rows.map(row => {
                    const obj = {};
                    data.headers.forEach((header, index) => {
                        obj[header] = row[index];
                    });
                    return obj;
                });
            });
            // Generate the server using the new virtual method
            const result = await this.generator.generateServer(args.name, config.name, parsedDataForGenerator, this.currentConnection);
            const totalRows = this.currentParsedData.reduce((sum, data) => sum + data.metadata.rowCount, 0);
            return {
                content: [
                    {
                        type: 'text',
                        text: result.success ?
                            `Successfully generated virtual MCP server "${args.name}"!\n\n${result.message}\n\nGenerated:\n• ${config.tools.length} tools\n• ${config.resources.length} resources\n• ${config.prompts.length} prompts\n• ${totalRows} total data rows\n\nServer is now available as a virtual MCP server in the integrated system.` :
                            `Failed to generate MCP server: ${result.message}`
                    }
                ]
            };
        }
        catch (error) {
            throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Failed to generate MCP server: ${error?.message || error}`);
        }
    }
    generateBasicTools() {
        const tools = [];
        this.currentParsedData.forEach(data => {
            const tableName = data.tableName || 'data';
            tools.push({
                name: `get_${tableName.toLowerCase()}_data`,
                description: `Get data from ${tableName} table`,
                inputSchema: {
                    type: 'object',
                    properties: {
                        limit: { type: 'number', description: 'Maximum number of rows to return' },
                        offset: { type: 'number', description: 'Number of rows to skip' }
                    }
                },
                handler: `this.getTableData('${tableName}', args)`
            });
        });
        return tools;
    }
    generateBasicResources() {
        return this.currentParsedData.map((data, index) => ({
            uri: `schema://table_${index}`,
            name: `${data.tableName || 'Data'} Schema`,
            description: `Schema information for ${data.tableName || 'data'} table`,
            mimeType: 'application/json'
        }));
    }
    generateBasicPrompts() {
        const prompts = [];
        this.currentParsedData.forEach(data => {
            const tableName = data.tableName || 'data';
            prompts.push({
                name: `analyze_${tableName.toLowerCase()}`,
                description: `Analyze and summarize ${tableName} data`,
                arguments: [
                    { name: 'focus', description: 'What aspect to focus on in the analysis' }
                ],
                template: `Please analyze the ${tableName} data focusing on {{focus}}. The table has ${data.metadata.rowCount} rows and includes columns: ${data.headers.join(', ')}.`
            });
        });
        return prompts;
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error('QuickMCP Generator server running on stdio');
    }
}
const server = new QuickMCPServer();
server.run().catch(console.error);
//# sourceMappingURL=mcp-server.js.map
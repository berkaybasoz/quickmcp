"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServerGenerator = void 0;
const sqlite_manager_js_1 = require("../database/sqlite-manager.js");
class MCPServerGenerator {
    constructor() {
        this.sqliteManager = new sqlite_manager_js_1.SQLiteManager();
    }
    async generateServer(serverId, serverName, parsedData, dbConfig) {
        try {
            console.log(`🚀 Generating virtual MCP server: ${serverId}`);
            // Create server config
            console.log(`📝 Creating server config with serverId: "${serverId}", serverName: "${serverName}"`);
            const serverConfig = {
                id: serverId,
                name: serverName,
                dbConfig: dbConfig,
                createdAt: new Date().toISOString()
            };
            console.log('📄 Server config created:', JSON.stringify(serverConfig, null, 2));
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
        }
        catch (error) {
            console.error(`❌ Error generating server ${serverId}:`, error);
            return {
                success: false,
                message: `Failed to generate server: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    generateToolsForData(serverId, parsedData, dbConfig) {
        const tools = [];
        for (const [tableName, rows] of Object.entries(parsedData)) {
            if (!rows || rows.length === 0)
                continue;
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
            // COUNT tool
            tools.push({
                server_id: serverId,
                name: `count_${cleanTableName}`,
                description: `Get total count of records in ${tableName} table`,
                inputSchema: {
                    type: 'object',
                    properties: this.generateFilterProperties(columns),
                    required: []
                },
                sqlQuery: this.generateCountQuery(tableName, columns, dbConfig.type),
                operation: 'SELECT'
            });
        }
        return tools;
    }
    generateResourcesForData(serverId, parsedData, dbConfig) {
        const resources = [];
        for (const [tableName, rows] of Object.entries(parsedData)) {
            if (!rows || rows.length === 0)
                continue;
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
    analyzeColumns(rows) {
        if (!rows || rows.length === 0)
            return [];
        const firstRow = rows[0];
        const columns = [];
        for (const [key, value] of Object.entries(firstRow)) {
            let type = 'string';
            if (typeof value === 'number') {
                type = Number.isInteger(value) ? 'integer' : 'number';
            }
            else if (typeof value === 'boolean') {
                type = 'boolean';
            }
            else if (value instanceof Date) {
                type = 'string'; // Dates are handled as strings in JSON
            }
            else if (value === null || value === undefined) {
                // Check other rows to determine type
                for (let i = 1; i < Math.min(rows.length, 10); i++) {
                    const otherValue = rows[i][key];
                    if (otherValue !== null && otherValue !== undefined) {
                        if (typeof otherValue === 'number') {
                            type = Number.isInteger(otherValue) ? 'integer' : 'number';
                        }
                        else if (typeof otherValue === 'boolean') {
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
    generateFilterProperties(columns) {
        const properties = {};
        for (const column of columns) {
            const baseType = column.type === 'integer' ? 'number' : column.type;
            properties[`filter_${column.name}`] = {
                type: baseType,
                description: `Filter by ${column.name}`
            };
        }
        return properties;
    }
    generateInputProperties(columns, isCreate) {
        const properties = {};
        for (const column of columns) {
            // Skip ID field for create operations
            if (isCreate && column.name.toLowerCase() === 'id')
                continue;
            const baseType = column.type === 'integer' ? 'number' : column.type;
            properties[column.name] = {
                type: baseType,
                description: `${column.name} field`
            };
            // For nullable fields, make them not required instead of using union types
            if (column.nullable && !isCreate) {
                // Optional field - will not be added to required array
            }
        }
        return properties;
    }
    generateSelectQuery(tableName, columns, dbType, withParams = true) {
        const columnList = columns.map(col => `[${col.name}]`).join(', ');
        let query = `SELECT ${columnList} FROM [${tableName}]`;
        if (withParams) {
            // Filter out problematic columns for WHERE clause (e.g., ntext columns in SQL Server)
            const filterableColumns = columns.filter(col => {
                // For SQL Server, exclude large text columns that can't be compared
                if (dbType === 'mssql') {
                    // Skip columns that might be ntext, text, or image types
                    // These are typically identified by their string type and large content
                    return true; // We'll handle this at parameter level instead
                }
                return true;
            });
            const whereConditions = filterableColumns.map(col => `(@filter_${col.name} IS NULL OR [${col.name}] = @filter_${col.name})`).join(' AND ');
            query += ` WHERE ${whereConditions}`;
            // Add ORDER BY clause for consistent pagination
            // Find the first suitable column for ordering (prefer id, created_at, or first column)
            const orderColumn = columns.find(col => col.name.toLowerCase() === 'id' ||
                col.name.toLowerCase().includes('created') ||
                col.name.toLowerCase().includes('timestamp')) || columns[0];
            if (orderColumn) {
                query += ` ORDER BY [${orderColumn.name}]`;
            }
            if (dbType === 'mssql') {
                // Use OFFSET/FETCH for proper pagination with ORDER BY
                query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
            }
            else {
                query += ' LIMIT @limit OFFSET @offset';
            }
        }
        return query;
    }
    generateInsertQuery(tableName, columns, dbType) {
        const insertColumns = columns.filter(col => col.name.toLowerCase() !== 'id');
        const columnNames = insertColumns.map(col => `[${col.name}]`).join(', ');
        const paramNames = insertColumns.map(col => `@${col.name}`).join(', ');
        return `INSERT INTO [${tableName}] (${columnNames}) VALUES (${paramNames})`;
    }
    generateUpdateQuery(tableName, columns, dbType) {
        const updateColumns = columns.filter(col => col.name.toLowerCase() !== 'id');
        const setClause = updateColumns.map(col => `[${col.name}] = @${col.name}`).join(', ');
        return `UPDATE [${tableName}] SET ${setClause} WHERE [Id] = @id`;
    }
    generateDeleteQuery(tableName, dbType) {
        return `DELETE FROM [${tableName}] WHERE [Id] = @id`;
    }
    generateCountQuery(tableName, columns, dbType) {
        let query = `SELECT COUNT(*) as total_count FROM [${tableName}]`;
        // Filter out problematic columns for WHERE clause (e.g., ntext columns in SQL Server)
        const filterableColumns = columns.filter(col => {
            // For SQL Server, exclude large text columns that can't be compared
            if (dbType === 'mssql') {
                // Skip columns that might be ntext, text, or image types
                // These are typically identified by their string type and large content
                return true; // We'll handle this at parameter level instead
            }
            return true;
        });
        const whereConditions = filterableColumns.map(col => `(@filter_${col.name} IS NULL OR [${col.name}] = @filter_${col.name})`).join(' AND ');
        query += ` WHERE ${whereConditions}`;
        return query;
    }
    sanitizeName(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_|_$/g, '');
    }
    // Public methods for management
    getAllServers() {
        return this.sqliteManager.getAllServers();
    }
    getServer(serverId) {
        return this.sqliteManager.getServer(serverId);
    }
    deleteServer(serverId) {
        this.sqliteManager.deleteServer(serverId);
        console.log(`🗑️ Deleted server from SQLite database: ${serverId}`);
    }
    getAllTools() {
        return this.sqliteManager.getAllTools();
    }
    getToolsForServer(serverId) {
        return this.sqliteManager.getToolsForServer(serverId);
    }
    getAllResources() {
        return this.sqliteManager.getAllResources();
    }
    getResourcesForServer(serverId) {
        return this.sqliteManager.getResourcesForServer(serverId);
    }
    getStats() {
        return this.sqliteManager.getStats();
    }
    close() {
        this.sqliteManager.close();
    }
}
exports.MCPServerGenerator = MCPServerGenerator;
//# sourceMappingURL=MCPServerGenerator.js.map
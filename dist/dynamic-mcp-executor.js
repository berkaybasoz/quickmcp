"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicMCPExecutor = void 0;
const sqlite_manager_js_1 = require("./database/sqlite-manager.js");
const sql = __importStar(require("mssql"));
const promise_1 = __importDefault(require("mysql2/promise"));
const pg_1 = require("pg");
class DynamicMCPExecutor {
    constructor() {
        this.dbConnections = new Map();
        this.sqliteManager = new sqlite_manager_js_1.SQLiteManager();
    }
    async getAllTools() {
        const tools = this.sqliteManager.getAllTools();
        return tools.map(tool => ({
            name: `${tool.server_id}__${tool.name}`,
            description: `[${tool.server_id}] ${tool.description}`,
            inputSchema: typeof tool.inputSchema === 'string' ? JSON.parse(tool.inputSchema) : tool.inputSchema
        }));
    }
    async getAllResources() {
        const resources = this.sqliteManager.getAllResources();
        return resources.map(resource => ({
            name: `${resource.server_id}__${resource.name}`,
            description: `[${resource.server_id}] ${resource.description}`,
            uri: resource.uri_template
        }));
    }
    async executeTool(toolName, args) {
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
            console.error(`✅ Executed tool ${toolName} successfully`);
            return {
                success: true,
                data: result,
                rowCount: Array.isArray(result) ? result.length : (result.rowsAffected || 0)
            };
        }
        catch (error) {
            console.error(`❌ Error executing tool ${toolName}:`, error);
            throw error;
        }
    }
    async readResource(resourceName) {
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
        }
        catch (error) {
            console.error(`❌ Error reading resource ${resourceName}:`, error);
            throw error;
        }
    }
    async getOrCreateConnection(serverId, dbConfig) {
        if (this.dbConnections.has(serverId)) {
            return this.dbConnections.get(serverId);
        }
        let connection;
        let dbConnection;
        try {
            switch (dbConfig.type) {
                case 'mssql':
                    connection = new sql.ConnectionPool({
                        server: dbConfig.host,
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
                    console.error(`🔗 Connected to MSSQL database for server ${serverId}`);
                    break;
                case 'mysql':
                    connection = promise_1.default.createConnection({
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
                    connection = new pg_1.Pool({
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
        }
        catch (error) {
            console.error(`❌ Failed to connect to database for server ${serverId}:`, error);
            throw error;
        }
    }
    async executeQuery(dbConnection, sqlQuery, args, operation) {
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
                    const hasActiveFilters = Array.from(sqlParams).some((paramName) => {
                        if (paramName === 'limit' || paramName === 'offset')
                            return false;
                        const value = args[paramName];
                        return value !== undefined && value !== null;
                    });
                    let modifiedQuery = sqlQuery;
                    if (!hasActiveFilters && operation === 'SELECT') {
                        // Remove complex WHERE clause that causes ntext compatibility issues
                        modifiedQuery = sqlQuery.replace(/WHERE.*?(?=ORDER BY|GROUP BY|HAVING|$)/gi, '');
                        // Still add the limit parameter for SQL Server
                        if (sqlQuery.includes('SELECT TOP')) {
                            request.input('limit', args.limit || 100);
                        }
                    }
                    else {
                        // Add all SQL parameters, using provided values or NULL
                        for (const paramName of sqlParams) {
                            const paramNameStr = paramName;
                            const value = args[paramNameStr];
                            if (value !== undefined && value !== null) {
                                request.input(paramNameStr, value);
                            }
                            else {
                                request.input(paramNameStr, null);
                            }
                        }
                    }
                    const result = await request.query(modifiedQuery);
                    if (operation === 'SELECT') {
                        return result.recordset;
                    }
                    else {
                        return { rowsAffected: result.rowsAffected[0] };
                    }
                case 'mysql':
                    const [rows] = await connection.execute(sqlQuery, Object.values(args).filter(v => v !== undefined && v !== null));
                    if (operation === 'SELECT') {
                        return rows;
                    }
                    else {
                        return { rowsAffected: rows.affectedRows };
                    }
                case 'postgresql':
                    const values = Object.values(args).filter(v => v !== undefined && v !== null);
                    const pgResult = await connection.query(sqlQuery, values);
                    if (operation === 'SELECT') {
                        return pgResult.rows;
                    }
                    else {
                        return { rowsAffected: pgResult.rowCount };
                    }
                default:
                    throw new Error(`Unsupported database type: ${type}`);
            }
        }
        catch (error) {
            console.error(`❌ Database query failed:`, error);
            throw error;
        }
    }
    getStats() {
        return {
            ...this.sqliteManager.getStats(),
            activeConnections: this.dbConnections.size
        };
    }
    async close() {
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
            }
            catch (error) {
                console.error(`❌ Error closing connection for server ${serverId}:`, error);
            }
        }
        this.dbConnections.clear();
        this.sqliteManager.close();
    }
}
exports.DynamicMCPExecutor = DynamicMCPExecutor;
//# sourceMappingURL=dynamic-mcp-executor.js.map
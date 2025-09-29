"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cors_1 = require("cors");
const multer_1 = require("multer");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const parsers_1 = require("../parsers");
const MCPServerGenerator_new_1 = require("../generators/MCPServerGenerator-new");
const MCPTestRunner_1 = require("../client/MCPTestRunner");
const child_process_1 = require("child_process");
const integrated_mcp_server_new_1 = require("../integrated-mcp-server-new");
const sqlite_manager_1 = require("../database/sqlite-manager");
const better_sqlite3_1 = require("better-sqlite3");
const app = (0, express_1.default)();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
const parser = new parsers_1.DataSourceParser();
const generator = new MCPServerGenerator_new_1.MCPServerGenerator();
const testRunner = new MCPTestRunner_1.MCPTestRunner();
const sqliteManager = new sqlite_manager_1.SQLiteManager();
let nextAvailablePort = 3001;
function getNextPort() {
    return nextAvailablePort++;
}
function startRuntimeMCPServer(serverId, serverPath) {
    return new Promise((resolve, reject) => {
        const serverInfo = generatedServers.get(serverId);
        if (!serverInfo) {
            reject(new Error('Server not found'));
            return;
        }
        // Kill existing process if running
        if (serverInfo.runtimeProcess) {
            serverInfo.runtimeProcess.kill();
        }
        const port = getNextPort();
        const serverDir = path_1.default.dirname(serverPath);
        console.error(`Starting runtime MCP server for ${serverId} on port ${port}`);
        // Fork the MCP server process
        const mcpProcess = (0, child_process_1.fork)(serverPath, [], {
            cwd: serverDir,
            env: {
                ...process.env,
                MCP_PORT: port.toString()
            },
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
        mcpProcess.on('message', (message) => {
            if (message === 'ready') {
                console.error(`MCP Server ${serverId} ready on port ${port}`);
                resolve(port);
            }
        });
        mcpProcess.on('error', (error) => {
            console.error(`MCP Server ${serverId} error:`, error);
            reject(error);
        });
        mcpProcess.on('exit', (code) => {
            console.error(`MCP Server ${serverId} exited with code ${code}`);
            if (serverInfo.runtimeProcess === mcpProcess) {
                serverInfo.runtimeProcess = undefined;
                serverInfo.runtimePort = undefined;
            }
        });
        // Update server info
        serverInfo.runtimeProcess = mcpProcess;
        serverInfo.runtimePort = port;
        // Fallback timeout
        setTimeout(() => {
            if (serverInfo.runtimePort === port) {
                resolve(port);
            }
        }, 3000);
    });
}
// Store generated servers in memory (in production, use a database)
const generatedServers = new Map();
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Parse data source endpoint
app.post('/api/parse', upload.single('file'), async (req, res) => {
    try {
        const { type, connection } = req.body;
        const file = req.file;
        let dataSource;
        if (type === 'database') {
            dataSource = {
                type: 'database',
                name: `Database (${connection.type})`,
                connection: JSON.parse(connection)
            };
        }
        else if (file) {
            dataSource = {
                type: type,
                name: file.originalname,
                filePath: file.path
            };
        }
        else {
            throw new Error('No file or connection provided');
        }
        const parsedData = await parser.parse(dataSource);
        res.json({
            success: true,
            data: {
                dataSource,
                parsedData: parsedData.map(data => ({
                    ...data,
                    rows: data.rows.slice(0, 10) // Limit preview rows
                }))
            }
        });
    }
    catch (error) {
        console.error('Parse error:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Generate MCP server endpoint
app.post('/api/generate', async (req, res) => {
    try {
        const { name, description, dataSource } = req.body;
        // Check if server with this name already exists
        const existingServer = generator.getServer(name);
        if (existingServer) {
            return res.status(400).json({
                success: false,
                error: `MCP Server with name "${name}" already exists. Please choose a different name.`
            });
        }
        // Re-parse the data source to get full data
        const parsedData = await parser.parse(dataSource);
        // Convert to the format expected by new generator
        const parsedDataObject = {};
        parsedData.forEach((data, index) => {
            const tableName = data.tableName || `table_${index}`;
            parsedDataObject[tableName] = data.rows.map(row => {
                const obj = {};
                data.headers.forEach((header, i) => {
                    obj[header] = row[i];
                });
                return obj;
            });
        });
        // Generate virtual server (saves to SQLite database)
        const result = await generator.generateServer(name, // serverId
        name, // serverName (use the name from form as server name)
        parsedDataObject, dataSource.connection || { type: 'csv', server: 'local', database: name });
        if (result.success) {
            res.json({
                success: true,
                data: {
                    serverId: name,
                    message: result.message
                }
            });
        }
        else {
            res.status(400).json({
                success: false,
                error: result.message
            });
        }
    }
    catch (error) {
        console.error('Generation error:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// List generated servers endpoint
app.get('/api/servers', (req, res) => {
    const allServers = generator.getAllServers();
    const servers = allServers.map(server => {
        const tools = generator.getToolsForServer(server.id);
        const resources = generator.getResourcesForServer(server.id);
        return {
            id: server.id,
            name: server.name,
            description: `${server.name} - Virtual MCP Server (${server.dbConfig.type})`,
            version: "1.0.0",
            toolsCount: tools.length,
            resourcesCount: resources.length,
            promptsCount: 0,
            dataRowsCount: 0
        };
    });
    res.json({ success: true, data: servers });
});
// Check if server name is available endpoint
app.get('/api/servers/check-name/:name', (req, res) => {
    const serverName = req.params.name;
    const existingServer = generator.getServer(serverName);
    const isAvailable = !existingServer;
    res.json({
        success: true,
        available: isAvailable,
        message: isAvailable ?
            `Server name "${serverName}" is available` :
            `Server name "${serverName}" already exists`
    });
});
// Get server details endpoint
app.get('/api/servers/:id', (req, res) => {
    const server = generator.getServer(req.params.id);
    if (!server) {
        return res.status(404).json({
            success: false,
            error: 'Server not found'
        });
    }
    const tools = generator.getToolsForServer(server.id);
    const resources = generator.getResourcesForServer(server.id);
    res.json({
        success: true,
        data: {
            config: {
                name: server.name,
                description: `${server.name} - Virtual MCP Server (${server.dbConfig.type})`,
                version: "1.0.0",
                tools: tools.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                    operation: tool.operation
                })),
                resources: resources.map(resource => ({
                    name: resource.name,
                    description: resource.description,
                    uri_template: resource.uri_template
                })),
                prompts: []
            },
            parsedData: []
        }
    });
});
// Test server endpoint
app.post('/api/servers/:id/test', async (req, res) => {
    try {
        const serverInfo = generatedServers.get(req.params.id);
        if (!serverInfo) {
            return res.status(404).json({
                success: false,
                error: 'Server not found'
            });
        }
        const { testSuite, customRequest } = req.body;
        if (customRequest) {
            // Run a single custom test
            const testCase = {
                name: 'Custom Test',
                description: 'Custom test request',
                request: customRequest
            };
            const result = await testRunner.runTestCase(testCase);
            res.json({
                success: true,
                data: result
            });
        }
        else if (testSuite) {
            // Run a full test suite
            const result = await testRunner.runTestSuite(serverInfo.serverPath, testSuite);
            res.json({
                success: true,
                data: result
            });
        }
        else {
            // Generate and run auto test suite
            const autoTestSuite = await testRunner.generateTestSuite(serverInfo.serverPath, serverInfo.config.name);
            const result = await testRunner.runTestSuite(serverInfo.serverPath, autoTestSuite);
            res.json({
                success: true,
                data: result
            });
        }
    }
    catch (error) {
        console.error('Test error:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Delete server endpoint
app.delete('/api/servers/:id', async (req, res) => {
    try {
        const serverId = req.params.id;
        console.error(`Attempting to delete server with ID: ${serverId}`);
        // Check if server exists in JSON database
        const existingServer = generator.getServer(serverId);
        if (!existingServer) {
            console.error(`Server with ID "${serverId}" not found in database`);
            return res.status(404).json({
                success: false,
                error: `Server with ID "${serverId}" not found`
            });
        }
        // Delete from JSON database (primary storage)
        generator.deleteServer(serverId);
        console.error(`Deleted server "${serverId}" from JSON database`);
        // Also check and remove from in-memory store if exists
        const serverInfo = generatedServers.get(serverId);
        if (serverInfo) {
            // Remove server files
            const serverDir = path_1.default.dirname(serverInfo.serverPath);
            await promises_1.default.rm(serverDir, { recursive: true, force: true });
            console.error(`Removed server files from ${serverDir}`);
        }
        // Remove from memory
        generatedServers.delete(req.params.id);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete error:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Start runtime server endpoint
app.post('/api/servers/:id/start-runtime', async (req, res) => {
    try {
        const serverInfo = generatedServers.get(req.params.id);
        if (!serverInfo) {
            return res.status(404).json({
                success: false,
                error: 'Server not found'
            });
        }
        const port = await startRuntimeMCPServer(req.params.id, serverInfo.serverPath);
        res.json({
            success: true,
            data: {
                serverId: req.params.id,
                port,
                endpoint: `http://localhost:${port}`,
                claudeConfig: {
                    [serverInfo.config.name]: {
                        command: "curl",
                        args: ["-X", "POST", `http://localhost:${port}/sse/message`],
                        env: {
                            MCP_TRANSPORT: "sse"
                        }
                    }
                }
            }
        });
    }
    catch (error) {
        console.error('Runtime start error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Stop runtime server endpoint
app.post('/api/servers/:id/stop-runtime', (req, res) => {
    const serverInfo = generatedServers.get(req.params.id);
    if (!serverInfo) {
        return res.status(404).json({
            success: false,
            error: 'Server not found'
        });
    }
    if (serverInfo.runtimeProcess) {
        serverInfo.runtimeProcess.kill();
        serverInfo.runtimeProcess = undefined;
        serverInfo.runtimePort = undefined;
    }
    res.json({ success: true });
});
// Export server endpoint
app.get('/api/servers/:id/export', (req, res) => {
    const serverInfo = generatedServers.get(req.params.id);
    if (!serverInfo) {
        return res.status(404).json({
            success: false,
            error: 'Server not found'
        });
    }
    const serverDir = path_1.default.dirname(serverInfo.serverPath);
    const archiveName = `${serverInfo.config.name}-mcp-server.zip`;
    // In a real implementation, you'd create a zip file here
    res.json({
        success: true,
        data: {
            downloadUrl: `/api/servers/${req.params.id}/download`,
            filename: archiveName
        }
    });
});
// Serve the main HTML page
// Serve specific HTML files for different routes
app.get('/manage-servers', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public', 'manage-servers.html'));
});
app.get('/test-servers', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public', 'test-servers.html'));
});
app.get('/database-tables', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public', 'database-tables.html'));
});
app.get('/how-to-use', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public', 'how-to-use.html'));
});
// Database tables API endpoints
app.get('/api/database/tables', (req, res) => {
    try {
        // Get database path
        const dbPath = path_1.default.join(process.cwd(), 'data', 'quickmcp.sqlite');
        // Open database connection
        const db = new better_sqlite3_1.default(dbPath);
        // Get all table names
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
        const tablesInfo = tables.map(table => {
            const tableName = table.name;
            // Get column information
            const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
            // Get row count
            const rowCountResult = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
            const rowCount = rowCountResult?.count || 0;
            // Get sample data (first 5 rows)
            const sampleData = db.prepare(`SELECT * FROM ${tableName} LIMIT 5`).all();
            return {
                name: tableName,
                columns: columns.map(col => ({
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
    }
    catch (error) {
        console.error('Database tables error:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get specific table details
app.get('/api/database/tables/:tableName', (req, res) => {
    try {
        const tableName = req.params.tableName;
        const dbPath = path_1.default.join(process.cwd(), 'data', 'quickmcp.sqlite');
        // Validate table name to prevent SQL injection
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid table name'
            });
        }
        const db = new better_sqlite3_1.default(dbPath);
        // Check if table exists
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
        if (!tableExists) {
            db.close();
            return res.status(404).json({
                success: false,
                error: 'Table not found'
            });
        }
        // Get column information
        const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
        // Get row count
        const rowCountResult = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
        const rowCount = rowCountResult?.count || 0;
        // Get sample data (first 10 rows)
        const sampleData = db.prepare(`SELECT * FROM ${tableName} LIMIT 10`).all();
        db.close();
        res.json({
            success: true,
            data: {
                name: tableName,
                columns: columns.map(col => ({
                    name: col.name,
                    type: col.type,
                    notnull: col.notnull === 1,
                    pk: col.pk === 1
                })),
                rowCount,
                sampleData
            }
        });
    }
    catch (error) {
        console.error('Table details error:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// STDIO bridge endpoint for MCP
app.post('/api/mcp-stdio', (req, res) => {
    console.error('MCP STDIO bridge connection established');
    // Set headers for keeping connection alive
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    let buffer = '';
    req.on('data', (chunk) => {
        buffer += chunk.toString();
        console.error('Received chunk:', chunk.toString());
        // Process complete JSON-RPC messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        for (const line of lines) {
            if (line.trim()) {
                try {
                    const message = JSON.parse(line);
                    console.error('Processing MCP message:', JSON.stringify(message, null, 2));
                    let response = null;
                    // Handle MCP initialize request
                    if (message.method === 'initialize') {
                        response = {
                            jsonrpc: '2.0',
                            id: message.id,
                            result: {
                                protocolVersion: '2024-11-05',
                                serverInfo: {
                                    name: 'quickmcp-integrated',
                                    version: '1.0.0'
                                },
                                capabilities: {
                                    tools: {},
                                    resources: {},
                                    prompts: {}
                                }
                            }
                        };
                    }
                    // Handle tools/list request
                    else if (message.method === 'tools/list') {
                        const tools = [];
                        // Add tools from all generated servers
                        for (const [serverId, serverInfo] of generatedServers) {
                            for (const tool of serverInfo.config.tools) {
                                tools.push({
                                    name: `${serverId}__${tool.name}`,
                                    description: `[${serverInfo.config.name}] ${tool.description}`,
                                    inputSchema: tool.inputSchema
                                });
                            }
                        }
                        // Add management tools
                        tools.push({
                            name: 'quickmcp__list_servers',
                            description: 'List all generated MCP servers',
                            inputSchema: {
                                type: 'object',
                                properties: {},
                                required: []
                            }
                        });
                        response = {
                            jsonrpc: '2.0',
                            id: message.id,
                            result: { tools }
                        };
                    }
                    // Handle initialized notification (no response needed)
                    else if (message.method === 'notifications/initialized') {
                        console.error('MCP client initialized');
                        // No response for notifications
                    }
                    // Handle other requests with placeholder responses
                    else if (message.id) {
                        response = {
                            jsonrpc: '2.0',
                            id: message.id,
                            result: {}
                        };
                    }
                    // Send response if we have one
                    if (response) {
                        const responseStr = JSON.stringify(response) + '\n';
                        console.error('Sending response:', responseStr.trim());
                        res.write(responseStr);
                        res.flush && res.flush();
                    }
                }
                catch (error) {
                    console.error('Error processing MCP message:', error);
                    if (message && message.id) {
                        const errorResponse = {
                            jsonrpc: '2.0',
                            id: message.id,
                            error: {
                                code: -32603,
                                message: 'Internal error'
                            }
                        };
                        res.write(JSON.stringify(errorResponse) + '\n');
                        res.flush && res.flush();
                    }
                }
            }
        }
    });
    req.on('end', () => {
        console.error('MCP stdio connection ended');
        res.end();
    });
    req.on('error', (error) => {
        console.error('MCP stdio connection error:', error);
        res.end();
    });
    req.on('close', () => {
        console.error('MCP stdio connection closed');
    });
});
// Serve index.html for root and any other routes
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public', 'index.html'));
});
const PORT = process.env.PORT || 3000;
const MCP_PORT = 3001;
// Initialize integrated MCP server
const integratedMCPServer = new integrated_mcp_server_new_1.IntegratedMCPServer();
app.listen(PORT, async () => {
    console.error(`🌐 MCP Server Generator running on http://localhost:${PORT}`);
    // Start integrated MCP server
    try {
        await integratedMCPServer.start(MCP_PORT);
        console.error(`🔗 Add to Claude Desktop config:`);
        console.error(`{`);
        console.error(`  "quickmcp-integrated": {`);
        console.error(`    "command": "curl",`);
        console.error(`    "args": ["-X", "POST", "http://localhost:${MCP_PORT}/sse/message"],`);
        console.error(`    "env": {`);
        console.error(`      "MCP_TRANSPORT": "sse"`);
        console.error(`    }`);
        console.error(`  }`);
        console.error(`}`);
    }
    catch (error) {
        console.error('❌ Failed to start integrated MCP server:', error);
    }
});
exports.default = app;

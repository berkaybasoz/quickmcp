"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const parsers_1 = require("../parsers");
const MCPServerGenerator_1 = require("../generators/MCPServerGenerator");
const MCPTestRunner_1 = require("../client/MCPTestRunner");
const child_process_1 = require("child_process");
const integrated_mcp_server_new_1 = require("../integrated-mcp-server-new");
const sqlite_manager_1 = require("../database/sqlite-manager");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const app = (0, express_1.default)();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Prefer the new UI under src/web/public if bundled, otherwise fall back to dist/web/public
const distPublicDir = path_1.default.join(__dirname, 'public');
const srcPublicDir = path_1.default.join(__dirname, '..', '..', 'src', 'web', 'public');
const publicDir = fs_1.default.existsSync(srcPublicDir) ? srcPublicDir : distPublicDir;
app.use(express_1.default.static(publicDir));
const parser = new parsers_1.DataSourceParser();
const generator = new MCPServerGenerator_1.MCPServerGenerator();
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
        //console.log(`Starting runtime MCP server for ${serverId} on port ${port}`);
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
                //console.log(`MCP Server ${serverId} ready on port ${port}`);
                resolve(port);
            }
        });
        mcpProcess.on('error', (error) => {
            console.error(`MCP Server ${serverId} error:`, error);
            reject(error);
        });
        mcpProcess.on('exit', (code) => {
            //console.log(`MCP Server ${serverId} exited with code ${code}`);
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
        const { name, description, version, dataSource, selectedTables, parsedData } = req.body;
        console.log('🔍 Generate request received:');
        console.log('- Name:', name);
        console.log('- Selected tables:', selectedTables?.length || 0);
        console.log('- Parsed data tables:', parsedData?.length || 0);
        // Check if server with this name already exists
        const existingServer = generator.getServer(name);
        if (existingServer) {
            return res.status(400).json({
                success: false,
                error: `MCP Server with name "${name}" already exists. Please choose a different name.`
            });
        }
        // Use provided parsed data or re-parse if not available
        const fullParsedData = parsedData || await parser.parse(dataSource);
        // Convert to the format expected by new generator
        const parsedDataObject = {};
        fullParsedData.forEach((data, index) => {
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
        console.log(`🎯 API calling generateServer with name: "${name}"`);
        const result = await generator.generateServer(name, // serverId
        name, // serverName (use the name from form as server name)
        parsedDataObject, dataSource.connection || { type: 'csv', server: 'local', database: name }, selectedTables // selectedTables configuration
        );
        if (result.success) {
            // Get counts for display
            const tools = generator.getToolsForServer(name);
            const resources = generator.getResourcesForServer(name);
            res.json({
                success: true,
                data: {
                    serverId: name,
                    message: result.message,
                    toolsCount: tools.length,
                    resourcesCount: resources.length,
                    promptsCount: 0 // We don't generate prompts yet
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
// Get server data endpoint - provides sample data from database
app.get('/api/servers/:id/data', async (req, res) => {
    try {
        const serverId = req.params.id;
        const limit = parseInt(req.query.limit) || 10;
        const server = generator.getServer(serverId);
        if (!server) {
            return res.status(404).json({
                success: false,
                error: 'Server not found'
            });
        }
        // Use the DynamicMCPExecutor to get data from first available SELECT tool
        const { DynamicMCPExecutor } = require('../dynamic-mcp-executor.js');
        const executor = new DynamicMCPExecutor();
        const tools = generator.getToolsForServer(serverId);
        const selectTool = tools.find(tool => tool.operation === 'SELECT');
        if (!selectTool) {
            return res.json({
                success: true,
                data: []
            });
        }
        // Execute the first SELECT tool to get sample data
        const result = await executor.executeTool(`${serverId}__${selectTool.name}`, { limit: limit });
        if (result.success && result.data) {
            // Transform the data to match expected format
            const sampleData = Array.isArray(result.data) ? result.data : [];
            res.json({
                success: true,
                data: sampleData.slice(0, limit)
            });
        }
        else {
            res.json({
                success: true,
                data: []
            });
        }
    }
    catch (error) {
        console.error('Error getting server data:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Test server endpoint
app.post('/api/servers/:id/test', async (req, res) => {
    try {
        // Get server from SQLite database
        const server = sqliteManager.getServer(req.params.id);
        if (!server) {
            return res.status(404).json({
                success: false,
                error: 'Server not found'
            });
        }
        // Get tools for this server
        const tools = sqliteManager.getToolsForServer(req.params.id);
        // Check if this is a custom test or auto test
        const { runAll, testType, toolName, parameters } = req.body;
        // For custom tool test
        if (testType === 'tools/call' && toolName) {
            try {
                const { DynamicMCPExecutor } = require('../dynamic-mcp-executor.js');
                const executor = new DynamicMCPExecutor();
                // Find the specific tool
                const tool = tools.find(t => t.name === toolName);
                if (!tool) {
                    return res.status(404).json({
                        success: false,
                        error: `Tool "${toolName}" not found`
                    });
                }
                const result = await executor.executeTool(`${req.params.id}__${toolName}`, parameters || {});
                res.json({
                    success: true,
                    data: {
                        tool: toolName,
                        status: 'success',
                        description: tool.description,
                        parameters: parameters || {},
                        result: result.success ? 'Tool executed successfully' : result,
                        rowCount: result.rowCount || 0
                    }
                });
                return;
            }
            catch (error) {
                res.json({
                    success: true,
                    data: {
                        tool: toolName,
                        status: 'error',
                        description: tools.find(t => t.name === toolName)?.description || '',
                        parameters: parameters || {},
                        error: error instanceof Error ? error.message : 'Unknown error'
                    }
                });
                return;
            }
        }
        // For auto test, run a sample of available tools
        const testResults = [];
        // Test either all tools or just a quick sample
        const toolsToTest = runAll ? tools : tools.slice(0, 3);
        for (const tool of toolsToTest) {
            try {
                // Use DynamicMCPExecutor to test the tool
                const { DynamicMCPExecutor } = require('../dynamic-mcp-executor.js');
                const executor = new DynamicMCPExecutor();
                // Prepare test parameters based on tool schema
                const testParams = {};
                if (tool.inputSchema && typeof tool.inputSchema === 'object' && tool.inputSchema.properties) {
                    for (const [paramName, paramDef] of Object.entries(tool.inputSchema.properties)) {
                        if (paramName === 'limit')
                            testParams[paramName] = 5;
                        else if (paramName === 'offset')
                            testParams[paramName] = 0;
                        // Add other default test values as needed
                    }
                }
                const result = await executor.executeTool(`${req.params.id}__${tool.name}`, testParams);
                testResults.push({
                    tool: tool.name,
                    status: 'success',
                    description: tool.description,
                    parameters: testParams,
                    result: result.success ? 'Tool executed successfully' : result,
                    rowCount: result.rowCount || 0
                });
            }
            catch (error) {
                testResults.push({
                    tool: tool.name,
                    status: 'error',
                    description: tool.description,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        res.json({
            success: true,
            data: {
                serverName: server.name,
                toolsCount: tools.length,
                testsRun: testResults.length,
                results: testResults
            }
        });
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
        console.log(`Attempting to delete server with ID: ${serverId}`);
        // Check if server exists in JSON database
        const existingServer = generator.getServer(serverId);
        if (!existingServer) {
            console.log(`Server with ID "${serverId}" not found in database`);
            return res.status(404).json({
                success: false,
                error: `Server with ID "${serverId}" not found`
            });
        }
        // Delete from JSON database (primary storage)
        generator.deleteServer(serverId);
        console.log(`Deleted server "${serverId}" from JSON database`);
        // Also check and remove from in-memory store if exists
        const serverInfo = generatedServers.get(serverId);
        if (serverInfo) {
            // Remove server files
            const serverDir = path_1.default.dirname(serverInfo.serverPath);
            await promises_1.default.rm(serverDir, { recursive: true, force: true });
            console.log(`Removed server files from ${serverDir}`);
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
    res.sendFile(path_1.default.join(publicDir, 'manage-servers.html'));
});
app.get('/test-servers', (req, res) => {
    res.sendFile(path_1.default.join(publicDir, 'test-servers.html'));
});
app.get('/database-tables', (req, res) => {
    res.sendFile(path_1.default.join(publicDir, 'database-tables.html'));
});
app.get('/how-to-use', (req, res) => {
    res.sendFile(path_1.default.join(publicDir, 'how-to-use.html'));
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
    console.log('MCP STDIO bridge connection established');
    // Set headers for keeping connection alive
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    let buffer = '';
    req.on('data', (chunk) => {
        buffer += chunk.toString();
        console.log('Received chunk:', chunk.toString());
        // Process complete JSON-RPC messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        for (const line of lines) {
            if (line.trim()) {
                let message = null;
                try {
                    message = JSON.parse(line);
                    console.log('Processing MCP message:', JSON.stringify(message, null, 2));
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
                        //console.log('MCP client initialized');
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
                        console.log('Sending response:', responseStr.trim());
                        res.write(responseStr);
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
    res.sendFile(path_1.default.join(publicDir, 'index.html'));
});
const PORT = process.env.PORT || 3000;
const MCP_PORT = 3001;
// Initialize integrated MCP server
const integratedMCPServer = new integrated_mcp_server_new_1.IntegratedMCPServer();
app.listen(PORT, async () => {
    //console.error(`🌐 MCP Server Generator running on http://localhost:${PORT}`);
    // Start integrated MCP server
    try {
        await integratedMCPServer.start(MCP_PORT);
        // Configuration info is now available in the How to Use page
    }
    catch (error) {
        console.error('❌ Failed to start integrated MCP server:', error);
    }
});
exports.default = app;
//# sourceMappingURL=server.js.map
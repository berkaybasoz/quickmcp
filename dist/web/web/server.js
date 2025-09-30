"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var cors_1 = __importDefault(require("cors"));
var multer_1 = __importDefault(require("multer"));
var path_1 = __importDefault(require("path"));
var promises_1 = __importDefault(require("fs/promises"));
var parsers_1 = require("../parsers");
var MCPServerGenerator_1 = require("../generators/MCPServerGenerator");
var MCPTestRunner_1 = require("../client/MCPTestRunner");
var child_process_1 = require("child_process");
var integrated_mcp_server_new_1 = require("../integrated-mcp-server-new");
var sqlite_manager_1 = require("../database/sqlite-manager");
var better_sqlite3_1 = __importDefault(require("better-sqlite3"));
var app = (0, express_1.default)();
var upload = (0, multer_1.default)({ dest: 'uploads/' });
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
var parser = new parsers_1.DataSourceParser();
var generator = new MCPServerGenerator_1.MCPServerGenerator();
var testRunner = new MCPTestRunner_1.MCPTestRunner();
var sqliteManager = new sqlite_manager_1.SQLiteManager();
var nextAvailablePort = 3001;
function getNextPort() {
    return nextAvailablePort++;
}
function startRuntimeMCPServer(serverId, serverPath) {
    return new Promise(function (resolve, reject) {
        var serverInfo = generatedServers.get(serverId);
        if (!serverInfo) {
            reject(new Error('Server not found'));
            return;
        }
        // Kill existing process if running
        if (serverInfo.runtimeProcess) {
            serverInfo.runtimeProcess.kill();
        }
        var port = getNextPort();
        var serverDir = path_1.default.dirname(serverPath);
        console.log("Starting runtime MCP server for ".concat(serverId, " on port ").concat(port));
        // Fork the MCP server process
        var mcpProcess = (0, child_process_1.fork)(serverPath, [], {
            cwd: serverDir,
            env: __assign(__assign({}, process.env), { MCP_PORT: port.toString() }),
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
        mcpProcess.on('message', function (message) {
            if (message === 'ready') {
                console.log("MCP Server ".concat(serverId, " ready on port ").concat(port));
                resolve(port);
            }
        });
        mcpProcess.on('error', function (error) {
            console.error("MCP Server ".concat(serverId, " error:"), error);
            reject(error);
        });
        mcpProcess.on('exit', function (code) {
            console.log("MCP Server ".concat(serverId, " exited with code ").concat(code));
            if (serverInfo.runtimeProcess === mcpProcess) {
                serverInfo.runtimeProcess = undefined;
                serverInfo.runtimePort = undefined;
            }
        });
        // Update server info
        serverInfo.runtimeProcess = mcpProcess;
        serverInfo.runtimePort = port;
        // Fallback timeout
        setTimeout(function () {
            if (serverInfo.runtimePort === port) {
                resolve(port);
            }
        }, 3000);
    });
}
// Store generated servers in memory (in production, use a database)
var generatedServers = new Map();
// Health check endpoint
app.get('/api/health', function (req, res) {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Parse data source endpoint
app.post('/api/parse', upload.single('file'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, type, connection, file, dataSource, parsedData, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, type = _a.type, connection = _a.connection;
                file = req.file;
                dataSource = void 0;
                if (type === 'database') {
                    dataSource = {
                        type: 'database',
                        name: "Database (".concat(connection.type, ")"),
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
                return [4 /*yield*/, parser.parse(dataSource)];
            case 1:
                parsedData = _b.sent();
                res.json({
                    success: true,
                    data: {
                        dataSource: dataSource,
                        parsedData: parsedData.map(function (data) { return (__assign(__assign({}, data), { rows: data.rows.slice(0, 10) // Limit preview rows
                         })); })
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                console.error('Parse error:', error_1);
                res.status(400).json({
                    success: false,
                    error: error_1 instanceof Error ? error_1.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Generate MCP server endpoint
app.post('/api/generate', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_1, description, version, dataSource, selectedTables, parsedData, existingServer, fullParsedData, _b, parsedDataObject_1, result, tools, resources, error_2;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 4, , 5]);
                _a = req.body, name_1 = _a.name, description = _a.description, version = _a.version, dataSource = _a.dataSource, selectedTables = _a.selectedTables, parsedData = _a.parsedData;
                console.log('🔍 Generate request received:');
                console.log('- Name:', name_1);
                console.log('- Selected tables:', (selectedTables === null || selectedTables === void 0 ? void 0 : selectedTables.length) || 0);
                console.log('- Parsed data tables:', (parsedData === null || parsedData === void 0 ? void 0 : parsedData.length) || 0);
                existingServer = generator.getServer(name_1);
                if (existingServer) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: "MCP Server with name \"".concat(name_1, "\" already exists. Please choose a different name.")
                        })];
                }
                _b = parsedData;
                if (_b) return [3 /*break*/, 2];
                return [4 /*yield*/, parser.parse(dataSource)];
            case 1:
                _b = (_c.sent());
                _c.label = 2;
            case 2:
                fullParsedData = _b;
                parsedDataObject_1 = {};
                fullParsedData.forEach(function (data, index) {
                    var tableName = data.tableName || "table_".concat(index);
                    parsedDataObject_1[tableName] = data.rows.map(function (row) {
                        var obj = {};
                        data.headers.forEach(function (header, i) {
                            obj[header] = row[i];
                        });
                        return obj;
                    });
                });
                // Generate virtual server (saves to SQLite database)
                console.log("\uD83C\uDFAF API calling generateServer with name: \"".concat(name_1, "\""));
                return [4 /*yield*/, generator.generateServer(name_1, // serverId
                    name_1, // serverName (use the name from form as server name)
                    parsedDataObject_1, dataSource.connection || { type: 'csv', server: 'local', database: name_1 }, selectedTables // selectedTables configuration
                    )];
            case 3:
                result = _c.sent();
                if (result.success) {
                    tools = generator.getToolsForServer(name_1);
                    resources = generator.getResourcesForServer(name_1);
                    res.json({
                        success: true,
                        data: {
                            serverId: name_1,
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
                return [3 /*break*/, 5];
            case 4:
                error_2 = _c.sent();
                console.error('Generation error:', error_2);
                res.status(400).json({
                    success: false,
                    error: error_2 instanceof Error ? error_2.message : 'Unknown error'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// List generated servers endpoint
app.get('/api/servers', function (req, res) {
    var allServers = generator.getAllServers();
    var servers = allServers.map(function (server) {
        var tools = generator.getToolsForServer(server.id);
        var resources = generator.getResourcesForServer(server.id);
        return {
            id: server.id,
            name: server.name,
            description: "".concat(server.name, " - Virtual MCP Server (").concat(server.dbConfig.type, ")"),
            version: "1.0.0",
            toolsCount: tools.length,
            resourcesCount: resources.length,
            promptsCount: 0,
        };
    });
    res.json({ success: true, data: servers });
});
// Check if server name is available endpoint
app.get('/api/servers/check-name/:name', function (req, res) {
    var serverName = req.params.name;
    var existingServer = generator.getServer(serverName);
    var isAvailable = !existingServer;
    res.json({
        success: true,
        available: isAvailable,
        message: isAvailable ?
            "Server name \"".concat(serverName, "\" is available") :
            "Server name \"".concat(serverName, "\" already exists")
    });
});
// Get server details endpoint
app.get('/api/servers/:id', function (req, res) {
    var server = generator.getServer(req.params.id);
    if (!server) {
        return res.status(404).json({
            success: false,
            error: 'Server not found'
        });
    }
    var tools = generator.getToolsForServer(server.id);
    var resources = generator.getResourcesForServer(server.id);
    res.json({
        success: true,
        data: {
            config: {
                name: server.name,
                description: "".concat(server.name, " - Virtual MCP Server (").concat(server.dbConfig.type, ")"),
                version: "1.0.0",
                tools: tools.map(function (tool) { return ({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                    operation: tool.operation
                }); }),
                resources: resources.map(function (resource) { return ({
                    name: resource.name,
                    description: resource.description,
                    uri_template: resource.uri_template
                }); }),
                prompts: []
            },
            parsedData: []
        }
    });
});
// Get server data endpoint - provides sample data from database
app.get('/api/servers/:id/data', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var serverId, limit, server, DynamicMCPExecutor, executor, tools, selectTool, result, sampleData, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                serverId = req.params.id;
                limit = parseInt(req.query.limit) || 10;
                server = generator.getServer(serverId);
                if (!server) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Server not found'
                        })];
                }
                DynamicMCPExecutor = require('../dynamic-mcp-executor.js').DynamicMCPExecutor;
                executor = new DynamicMCPExecutor();
                tools = generator.getToolsForServer(serverId);
                selectTool = tools.find(function (tool) { return tool.operation === 'SELECT'; });
                if (!selectTool) {
                    return [2 /*return*/, res.json({
                            success: true,
                            data: []
                        })];
                }
                return [4 /*yield*/, executor.executeTool("".concat(serverId, "__").concat(selectTool.name), { limit: limit })];
            case 1:
                result = _a.sent();
                if (result.success && result.data) {
                    sampleData = Array.isArray(result.data) ? result.data : [];
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
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('Error getting server data:', error_3);
                res.status(400).json({
                    success: false,
                    error: error_3 instanceof Error ? error_3.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Test server endpoint
app.post('/api/servers/:id/test', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var server, tools, testResults, toolsToTest, _i, toolsToTest_1, tool, DynamicMCPExecutor, executor, testParams, _a, _b, _c, paramName, paramDef, result, error_4, error_5;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 7, , 8]);
                server = sqliteManager.getServer(req.params.id);
                if (!server) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Server not found'
                        })];
                }
                tools = sqliteManager.getToolsForServer(req.params.id);
                testResults = [];
                toolsToTest = tools.slice(0, 3);
                _i = 0, toolsToTest_1 = toolsToTest;
                _d.label = 1;
            case 1:
                if (!(_i < toolsToTest_1.length)) return [3 /*break*/, 6];
                tool = toolsToTest_1[_i];
                _d.label = 2;
            case 2:
                _d.trys.push([2, 4, , 5]);
                DynamicMCPExecutor = require('../dynamic-mcp-executor.js').DynamicMCPExecutor;
                executor = new DynamicMCPExecutor();
                testParams = {};
                if (tool.inputSchema && typeof tool.inputSchema === 'object' && tool.inputSchema.properties) {
                    for (_a = 0, _b = Object.entries(tool.inputSchema.properties); _a < _b.length; _a++) {
                        _c = _b[_a], paramName = _c[0], paramDef = _c[1];
                        if (paramName === 'limit')
                            testParams[paramName] = 5;
                        else if (paramName === 'offset')
                            testParams[paramName] = 0;
                        // Add other default test values as needed
                    }
                }
                return [4 /*yield*/, executor.executeTool("".concat(req.params.id, "__").concat(tool.name), testParams)];
            case 3:
                result = _d.sent();
                testResults.push({
                    tool: tool.name,
                    status: 'success',
                    description: tool.description,
                    parameters: testParams,
                    result: result.success ? 'Tool executed successfully' : result,
                    rowCount: result.rowCount || 0
                });
                return [3 /*break*/, 5];
            case 4:
                error_4 = _d.sent();
                testResults.push({
                    tool: tool.name,
                    status: 'error',
                    description: tool.description,
                    error: error_4 instanceof Error ? error_4.message : 'Unknown error'
                });
                return [3 /*break*/, 5];
            case 5:
                _i++;
                return [3 /*break*/, 1];
            case 6:
                res.json({
                    success: true,
                    data: {
                        serverName: server.name,
                        toolsCount: tools.length,
                        testsRun: testResults.length,
                        results: testResults
                    }
                });
                return [3 /*break*/, 8];
            case 7:
                error_5 = _d.sent();
                console.error('Test error:', error_5);
                res.status(400).json({
                    success: false,
                    error: error_5 instanceof Error ? error_5.message : 'Unknown error'
                });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// Delete server endpoint
app.delete('/api/servers/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var serverId, existingServer, serverInfo, serverDir, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                serverId = req.params.id;
                console.log("Attempting to delete server with ID: ".concat(serverId));
                existingServer = generator.getServer(serverId);
                if (!existingServer) {
                    console.log("Server with ID \"".concat(serverId, "\" not found in database"));
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: "Server with ID \"".concat(serverId, "\" not found")
                        })];
                }
                // Delete from JSON database (primary storage)
                generator.deleteServer(serverId);
                console.log("Deleted server \"".concat(serverId, "\" from JSON database"));
                serverInfo = generatedServers.get(serverId);
                if (!serverInfo) return [3 /*break*/, 2];
                serverDir = path_1.default.dirname(serverInfo.serverPath);
                return [4 /*yield*/, promises_1.default.rm(serverDir, { recursive: true, force: true })];
            case 1:
                _a.sent();
                console.log("Removed server files from ".concat(serverDir));
                _a.label = 2;
            case 2:
                // Remove from memory
                generatedServers.delete(req.params.id);
                res.json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                error_6 = _a.sent();
                console.error('Delete error:', error_6);
                res.status(400).json({
                    success: false,
                    error: error_6 instanceof Error ? error_6.message : 'Unknown error'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Start runtime server endpoint
app.post('/api/servers/:id/start-runtime', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var serverInfo, port, error_7;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                serverInfo = generatedServers.get(req.params.id);
                if (!serverInfo) {
                    return [2 /*return*/, res.status(404).json({
                            success: false,
                            error: 'Server not found'
                        })];
                }
                return [4 /*yield*/, startRuntimeMCPServer(req.params.id, serverInfo.serverPath)];
            case 1:
                port = _b.sent();
                res.json({
                    success: true,
                    data: {
                        serverId: req.params.id,
                        port: port,
                        endpoint: "http://localhost:".concat(port),
                        claudeConfig: (_a = {},
                            _a[serverInfo.config.name] = {
                                command: "curl",
                                args: ["-X", "POST", "http://localhost:".concat(port, "/sse/message")],
                                env: {
                                    MCP_TRANSPORT: "sse"
                                }
                            },
                            _a)
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_7 = _b.sent();
                console.error('Runtime start error:', error_7);
                res.status(500).json({
                    success: false,
                    error: error_7 instanceof Error ? error_7.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Stop runtime server endpoint
app.post('/api/servers/:id/stop-runtime', function (req, res) {
    var serverInfo = generatedServers.get(req.params.id);
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
app.get('/api/servers/:id/export', function (req, res) {
    var serverInfo = generatedServers.get(req.params.id);
    if (!serverInfo) {
        return res.status(404).json({
            success: false,
            error: 'Server not found'
        });
    }
    var serverDir = path_1.default.dirname(serverInfo.serverPath);
    var archiveName = "".concat(serverInfo.config.name, "-mcp-server.zip");
    // In a real implementation, you'd create a zip file here
    res.json({
        success: true,
        data: {
            downloadUrl: "/api/servers/".concat(req.params.id, "/download"),
            filename: archiveName
        }
    });
});
// Serve the main HTML page
// Serve specific HTML files for different routes
app.get('/manage-servers', function (req, res) {
    res.sendFile(path_1.default.join(__dirname, 'public', 'manage-servers.html'));
});
app.get('/test-servers', function (req, res) {
    res.sendFile(path_1.default.join(__dirname, 'public', 'test-servers.html'));
});
app.get('/database-tables', function (req, res) {
    res.sendFile(path_1.default.join(__dirname, 'public', 'database-tables.html'));
});
app.get('/how-to-use', function (req, res) {
    res.sendFile(path_1.default.join(__dirname, 'public', 'how-to-use.html'));
});
// Database tables API endpoints
app.get('/api/database/tables', function (req, res) {
    try {
        // Get database path
        var dbPath = path_1.default.join(process.cwd(), 'data', 'quickmcp.sqlite');
        // Open database connection
        var db_1 = new better_sqlite3_1.default(dbPath);
        // Get all table names
        var tables = db_1.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
        var tablesInfo = tables.map(function (table) {
            var tableName = table.name;
            // Get column information
            var columns = db_1.prepare("PRAGMA table_info(".concat(tableName, ")")).all();
            // Get row count
            var rowCountResult = db_1.prepare("SELECT COUNT(*) as count FROM ".concat(tableName)).get();
            var rowCount = (rowCountResult === null || rowCountResult === void 0 ? void 0 : rowCountResult.count) || 0;
            // Get sample data (first 5 rows)
            var sampleData = db_1.prepare("SELECT * FROM ".concat(tableName, " LIMIT 5")).all();
            return {
                name: tableName,
                columns: columns.map(function (col) { return ({
                    name: col.name,
                    type: col.type,
                    notnull: col.notnull === 1,
                    pk: col.pk === 1
                }); }),
                rowCount: rowCount,
                sampleData: sampleData
            };
        });
        db_1.close();
        res.json({
            success: true,
            data: {
                dbPath: dbPath,
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
app.get('/api/database/tables/:tableName', function (req, res) {
    try {
        var tableName = req.params.tableName;
        var dbPath = path_1.default.join(process.cwd(), 'data', 'quickmcp.sqlite');
        // Validate table name to prevent SQL injection
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid table name'
            });
        }
        var db = new better_sqlite3_1.default(dbPath);
        // Check if table exists
        var tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
        if (!tableExists) {
            db.close();
            return res.status(404).json({
                success: false,
                error: 'Table not found'
            });
        }
        // Get column information
        var columns = db.prepare("PRAGMA table_info(".concat(tableName, ")")).all();
        // Get row count
        var rowCountResult = db.prepare("SELECT COUNT(*) as count FROM ".concat(tableName)).get();
        var rowCount = (rowCountResult === null || rowCountResult === void 0 ? void 0 : rowCountResult.count) || 0;
        // Get sample data (first 10 rows)
        var sampleData = db.prepare("SELECT * FROM ".concat(tableName, " LIMIT 10")).all();
        db.close();
        res.json({
            success: true,
            data: {
                name: tableName,
                columns: columns.map(function (col) { return ({
                    name: col.name,
                    type: col.type,
                    notnull: col.notnull === 1,
                    pk: col.pk === 1
                }); }),
                rowCount: rowCount,
                sampleData: sampleData
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
app.post('/api/mcp-stdio', function (req, res) {
    console.log('MCP STDIO bridge connection established');
    // Set headers for keeping connection alive
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    var buffer = '';
    req.on('data', function (chunk) {
        buffer += chunk.toString();
        console.log('Received chunk:', chunk.toString());
        // Process complete JSON-RPC messages
        var lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            if (line.trim()) {
                var message = null;
                try {
                    message = JSON.parse(line);
                    console.log('Processing MCP message:', JSON.stringify(message, null, 2));
                    var response = null;
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
                        var tools = [];
                        // Add tools from all generated servers
                        for (var _a = 0, generatedServers_1 = generatedServers; _a < generatedServers_1.length; _a++) {
                            var _b = generatedServers_1[_a], serverId = _b[0], serverInfo = _b[1];
                            for (var _c = 0, _d = serverInfo.config.tools; _c < _d.length; _c++) {
                                var tool = _d[_c];
                                tools.push({
                                    name: "".concat(serverId, "__").concat(tool.name),
                                    description: "[".concat(serverInfo.config.name, "] ").concat(tool.description),
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
                            result: { tools: tools }
                        };
                    }
                    // Handle initialized notification (no response needed)
                    else if (message.method === 'notifications/initialized') {
                        console.log('MCP client initialized');
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
                        var responseStr = JSON.stringify(response) + '\n';
                        console.log('Sending response:', responseStr.trim());
                        res.write(responseStr);
                    }
                }
                catch (error) {
                    console.error('Error processing MCP message:', error);
                    if (message && message.id) {
                        var errorResponse = {
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
    req.on('end', function () {
        console.log('MCP stdio connection ended');
        res.end();
    });
    req.on('error', function (error) {
        console.error('MCP stdio connection error:', error);
        res.end();
    });
    req.on('close', function () {
        console.log('MCP stdio connection closed');
    });
});
// Serve index.html for root and any other routes
app.get('*', function (req, res) {
    res.sendFile(path_1.default.join(__dirname, 'public', 'index.html'));
});
var PORT = process.env.PORT || 3000;
var MCP_PORT = 3001;
// Initialize integrated MCP server
var integratedMCPServer = new integrated_mcp_server_new_1.IntegratedMCPServer();
app.listen(PORT, function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("\uD83C\uDF10 MCP Server Generator running on http://localhost:".concat(PORT));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, integratedMCPServer.start(MCP_PORT)];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                error_8 = _a.sent();
                console.error('❌ Failed to start integrated MCP server:', error_8);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = app;

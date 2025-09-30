#!/usr/bin/env node
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
exports.IntegratedMCPServer = void 0;
var index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
var types_js_1 = require("@modelcontextprotocol/sdk/types.js");
var express_1 = __importDefault(require("express"));
var dynamic_mcp_executor_js_1 = require("./dynamic-mcp-executor.js");
var IntegratedMCPServer = /** @class */ (function () {
    function IntegratedMCPServer() {
        this.executor = new dynamic_mcp_executor_js_1.DynamicMCPExecutor();
        this.server = new index_js_1.Server({
            name: 'quickmcp-integrated-server',
            version: '1.0.0'
        });
        this.app = (0, express_1.default)();
        this.setupHandlers();
        this.setupWebRoutes();
    }
    IntegratedMCPServer.prototype.setupHandlers = function () {
        var _this = this;
        // List tools - dynamically from SQLite
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, function () { return __awaiter(_this, void 0, void 0, function () {
            var tools, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.executor.getAllTools()];
                    case 1:
                        tools = _a.sent();
                        console.error("\uD83D\uDCCB Listed ".concat(tools.length, " dynamic tools"));
                        return [2 /*return*/, { tools: tools }];
                    case 2:
                        error_1 = _a.sent();
                        console.error('❌ Error listing tools:', error_1);
                        return [2 /*return*/, { tools: [] }];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        // List resources - dynamically from SQLite
        this.server.setRequestHandler(types_js_1.ListResourcesRequestSchema, function () { return __awaiter(_this, void 0, void 0, function () {
            var resources, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.executor.getAllResources()];
                    case 1:
                        resources = _a.sent();
                        console.log("\uD83D\uDCC2 Listed ".concat(resources.length, " dynamic resources"));
                        return [2 /*return*/, { resources: resources }];
                    case 2:
                        error_2 = _a.sent();
                        console.error('❌ Error listing resources:', error_2);
                        return [2 /*return*/, { resources: [] }];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        // Execute tool - dynamically via database
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, function (request) { return __awaiter(_this, void 0, void 0, function () {
            var _a, name_1, args, result, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = request.params, name_1 = _a.name, args = _a.arguments;
                        console.log("\uD83D\uDD27 Executing dynamic tool: ".concat(name_1));
                        return [4 /*yield*/, this.executor.executeTool(name_1, args || {})];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify(result, null, 2)
                                    }
                                ]
                            }];
                    case 2:
                        error_3 = _b.sent();
                        console.error("\u274C Error executing tool ".concat(request.params.name, ":"), error_3);
                        throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, "Failed to execute tool: ".concat(error_3 instanceof Error ? error_3.message : 'Unknown error'));
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        // Read resource - dynamically via database
        this.server.setRequestHandler(types_js_1.ReadResourceRequestSchema, function (request) { return __awaiter(_this, void 0, void 0, function () {
            var uri, resourceName, result, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        uri = request.params.uri;
                        console.log("\uD83D\uDCD6 Reading dynamic resource: ".concat(uri));
                        resourceName = uri.split('://')[0];
                        return [4 /*yield*/, this.executor.readResource(resourceName)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 2:
                        error_4 = _a.sent();
                        console.error("\u274C Error reading resource ".concat(request.params.uri, ":"), error_4);
                        throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, "Failed to read resource: ".concat(error_4 instanceof Error ? error_4.message : 'Unknown error'));
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        // Prompts - return empty for now
        this.server.setRequestHandler(types_js_1.ListPromptsRequestSchema, function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, { prompts: [] }];
            });
        }); });
        this.server.setRequestHandler(types_js_1.GetPromptRequestSchema, function (request) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, "Prompt not found: ".concat(request.params.name));
            });
        }); });
    };
    IntegratedMCPServer.prototype.setupWebRoutes = function () {
        var _this = this;
        this.app.use(express_1.default.json({ limit: '50mb' }));
        this.app.use(express_1.default.raw({ type: '*/*', limit: '50mb' }));
        // Health check
        this.app.get('/health', function (req, res) {
            var stats = _this.executor.getStats();
            res.json(__assign(__assign({ status: 'healthy' }, stats), { timestamp: new Date().toISOString() }));
        });
        // MCP STDIO endpoint for bridge
        this.app.post('/api/mcp-stdio', express_1.default.raw({ type: '*/*' }), function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var messageData, response, _a, tools, resources, toolResult, uri, resourceName, resourceResult, error_5;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 13, , 14]);
                        messageData = void 0;
                        if (Buffer.isBuffer(req.body)) {
                            messageData = JSON.parse(req.body.toString());
                        }
                        else if (typeof req.body === 'string') {
                            messageData = JSON.parse(req.body);
                        }
                        else {
                            messageData = req.body;
                        }
                        console.log('🔄 Processing MCP message:', messageData.method || 'unknown');
                        response = null;
                        _a = messageData.method;
                        switch (_a) {
                            case 'initialize': return [3 /*break*/, 1];
                            case 'tools/list': return [3 /*break*/, 2];
                            case 'resources/list': return [3 /*break*/, 4];
                            case 'tools/call': return [3 /*break*/, 6];
                            case 'resources/read': return [3 /*break*/, 8];
                            case 'notifications/initialized': return [3 /*break*/, 10];
                        }
                        return [3 /*break*/, 11];
                    case 1:
                        response = {
                            jsonrpc: '2.0',
                            id: messageData.id,
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
                        return [3 /*break*/, 12];
                    case 2: return [4 /*yield*/, this.executor.getAllTools()];
                    case 3:
                        tools = _c.sent();
                        response = {
                            jsonrpc: '2.0',
                            id: messageData.id,
                            result: { tools: tools }
                        };
                        return [3 /*break*/, 12];
                    case 4: return [4 /*yield*/, this.executor.getAllResources()];
                    case 5:
                        resources = _c.sent();
                        response = {
                            jsonrpc: '2.0',
                            id: messageData.id,
                            result: { resources: resources }
                        };
                        return [3 /*break*/, 12];
                    case 6: return [4 /*yield*/, this.executor.executeTool(messageData.params.name, messageData.params.arguments || {})];
                    case 7:
                        toolResult = _c.sent();
                        response = {
                            jsonrpc: '2.0',
                            id: messageData.id,
                            result: {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify(toolResult, null, 2)
                                    }
                                ]
                            }
                        };
                        return [3 /*break*/, 12];
                    case 8:
                        uri = messageData.params.uri;
                        resourceName = uri.split('://')[0];
                        return [4 /*yield*/, this.executor.readResource(resourceName)];
                    case 9:
                        resourceResult = _c.sent();
                        response = {
                            jsonrpc: '2.0',
                            id: messageData.id,
                            result: resourceResult
                        };
                        return [3 /*break*/, 12];
                    case 10:
                        // No response for notifications
                        console.log('🔔 MCP client initialized');
                        return [3 /*break*/, 12];
                    case 11:
                        if (messageData.id) {
                            response = {
                                jsonrpc: '2.0',
                                id: messageData.id,
                                error: {
                                    code: -32601,
                                    message: "Method not found: ".concat(messageData.method)
                                }
                            };
                        }
                        _c.label = 12;
                    case 12:
                        if (response) {
                            res.json(response);
                        }
                        else {
                            res.status(204).end();
                        }
                        return [3 /*break*/, 14];
                    case 13:
                        error_5 = _c.sent();
                        console.error('❌ Error processing MCP message:', error_5);
                        res.status(500).json({
                            jsonrpc: '2.0',
                            id: (_b = req.body) === null || _b === void 0 ? void 0 : _b.id,
                            error: {
                                code: -32603,
                                message: "Internal error: ".concat(error_5 instanceof Error ? error_5.message : 'Unknown error')
                            }
                        });
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/];
                }
            });
        }); });
        // Stats endpoint
        this.app.get('/api/stats', function (req, res) {
            res.json(_this.executor.getStats());
        });
    };
    IntegratedMCPServer.prototype.start = function () {
        return __awaiter(this, arguments, void 0, function (port) {
            var httpServer;
            var _this = this;
            if (port === void 0) { port = 3001; }
            return __generator(this, function (_a) {
                httpServer = this.app.listen(port, function () {
                    console.log("\uD83D\uDE80 QuickMCP Integrated Server running on http://localhost:".concat(port));
                    var stats = _this.executor.getStats();
                    console.log("\uD83D\uDCCA Managing ".concat(stats.servers, " virtual servers with ").concat(stats.tools, " tools and ").concat(stats.resources, " resources"));
                });
                // Setup SSE transport for MCP - skip for now due to compatibility issues
                // const transport = new SSEServerTransport('/sse', httpServer);
                // await this.server.connect(transport);
                console.log('✅ MCP server connected with dynamic SQLite-based execution (HTTP endpoints active)');
                // Graceful shutdown
                process.on('SIGINT', function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                console.log('\n🔄 Shutting down QuickMCP Integrated Server...');
                                return [4 /*yield*/, this.cleanup()];
                            case 1:
                                _a.sent();
                                process.exit(0);
                                return [2 /*return*/];
                        }
                    });
                }); });
                process.on('SIGTERM', function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                console.log('\n🔄 Shutting down QuickMCP Integrated Server...');
                                return [4 /*yield*/, this.cleanup()];
                            case 1:
                                _a.sent();
                                process.exit(0);
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        });
    };
    IntegratedMCPServer.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.server.close()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.executor.close()];
                    case 2:
                        _a.sent();
                        console.log('✅ Cleanup completed');
                        return [3 /*break*/, 4];
                    case 3:
                        error_6 = _a.sent();
                        console.error('❌ Error during cleanup:', error_6);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return IntegratedMCPServer;
}());
exports.IntegratedMCPServer = IntegratedMCPServer;

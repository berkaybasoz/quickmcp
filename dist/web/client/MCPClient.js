"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPClient = void 0;
var child_process_1 = require("child_process");
var MCPClient = /** @class */ (function () {
    function MCPClient() {
        this.process = null;
        this.messageId = 1;
        this.pendingRequests = new Map();
        this.isConnected = false;
        this.buffer = '';
    }
    MCPClient.prototype.connect = function (serverPath) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var _a, _b;
                        _this.process = (0, child_process_1.spawn)('node', [serverPath], {
                            stdio: ['pipe', 'pipe', 'pipe']
                        });
                        (_a = _this.process.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (data) {
                            _this.handleMessage(data.toString());
                        });
                        (_b = _this.process.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
                            console.error('MCP Server stderr:', data.toString());
                        });
                        _this.process.on('error', function (error) {
                            console.error('MCP Server process error:', error);
                            reject(error);
                        });
                        _this.process.on('exit', function (code) {
                            console.log('MCP Server process exited with code:', code);
                            _this.isConnected = false;
                        });
                        // Initialize the connection
                        _this.initialize()
                            .then(function () {
                            _this.isConnected = true;
                            resolve();
                        })
                            .catch(reject);
                    })];
            });
        });
    };
    MCPClient.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.process) {
                    this.process.kill();
                    this.process = null;
                    this.isConnected = false;
                }
                return [2 /*return*/];
            });
        });
    };
    MCPClient.prototype.listTools = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.sendRequest('tools/list', {})];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.tools || []];
                }
            });
        });
    };
    MCPClient.prototype.listResources = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.sendRequest('resources/list', {})];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.resources || []];
                }
            });
        });
    };
    MCPClient.prototype.listPrompts = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.sendRequest('prompts/list', {})];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.prompts || []];
                }
            });
        });
    };
    MCPClient.prototype.callTool = function (name, args) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.sendRequest('tools/call', {
                                name: name,
                                arguments: args || {}
                            })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: response
                            }];
                    case 2:
                        error_1 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: error_1 instanceof Error ? error_1.message : 'Unknown error'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MCPClient.prototype.readResource = function (uri) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.sendRequest('resources/read', { uri: uri })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: response
                            }];
                    case 2:
                        error_2 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'Unknown error'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MCPClient.prototype.getPrompt = function (name, args) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.sendRequest('prompts/get', {
                                name: name,
                                arguments: args || {}
                            })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                data: response
                            }];
                    case 2:
                        error_3 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: error_3 instanceof Error ? error_3.message : 'Unknown error'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MCPClient.prototype.testRequest = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (request.method) {
                    case 'tool':
                        return [2 /*return*/, this.callTool(request.name, request.params)];
                    case 'resource':
                        return [2 /*return*/, this.readResource(request.name)];
                    case 'prompt':
                        return [2 /*return*/, this.getPrompt(request.name, request.params)];
                    default:
                        return [2 /*return*/, {
                                success: false,
                                error: 'Unknown request method'
                            }];
                }
                return [2 /*return*/];
            });
        });
    };
    MCPClient.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.sendRequest('initialize', {
                            protocolVersion: '2024-11-05',
                            capabilities: {
                                roots: {},
                                sampling: {}
                            },
                            clientInfo: {
                                name: 'MCP Server Generator Client',
                                version: '1.0.0'
                            }
                        })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.sendNotification('initialized', {})];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MCPClient.prototype.sendRequest = function (method, params) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var _a;
                        if (!((_a = _this.process) === null || _a === void 0 ? void 0 : _a.stdin)) {
                            reject(new Error('Not connected to MCP server'));
                            return;
                        }
                        var id = _this.messageId++;
                        var message = {
                            jsonrpc: '2.0',
                            id: id,
                            method: method,
                            params: params
                        };
                        _this.pendingRequests.set(id, { resolve: resolve, reject: reject });
                        var messageStr = JSON.stringify(message) + '\n';
                        _this.process.stdin.write(messageStr);
                        // Set timeout for requests
                        setTimeout(function () {
                            if (_this.pendingRequests.has(id)) {
                                _this.pendingRequests.delete(id);
                                reject(new Error('Request timeout'));
                            }
                        }, 10000);
                    })];
            });
        });
    };
    MCPClient.prototype.sendNotification = function (method, params) {
        return __awaiter(this, void 0, void 0, function () {
            var message, messageStr;
            var _a;
            return __generator(this, function (_b) {
                if (!((_a = this.process) === null || _a === void 0 ? void 0 : _a.stdin)) {
                    throw new Error('Not connected to MCP server');
                }
                message = {
                    jsonrpc: '2.0',
                    method: method,
                    params: params
                };
                messageStr = JSON.stringify(message) + '\n';
                this.process.stdin.write(messageStr);
                return [2 /*return*/];
            });
        });
    };
    MCPClient.prototype.handleMessage = function (data) {
        this.buffer += data;
        var newlineIndex;
        while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
            var messageStr = this.buffer.slice(0, newlineIndex);
            this.buffer = this.buffer.slice(newlineIndex + 1);
            if (messageStr.trim()) {
                try {
                    var message = JSON.parse(messageStr);
                    this.processMessage(message);
                }
                catch (error) {
                    console.error('Failed to parse MCP message:', messageStr, error);
                }
            }
        }
    };
    MCPClient.prototype.processMessage = function (message) {
        if (message.id !== undefined && this.pendingRequests.has(message.id)) {
            var _a = this.pendingRequests.get(message.id), resolve = _a.resolve, reject = _a.reject;
            this.pendingRequests.delete(message.id);
            if (message.error) {
                reject(new Error("MCP Error (".concat(message.error.code, "): ").concat(message.error.message)));
            }
            else {
                resolve(message.result);
            }
        }
    };
    Object.defineProperty(MCPClient.prototype, "connected", {
        get: function () {
            return this.isConnected;
        },
        enumerable: false,
        configurable: true
    });
    return MCPClient;
}());
exports.MCPClient = MCPClient;

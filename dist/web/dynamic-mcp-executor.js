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
exports.DynamicMCPExecutor = void 0;
var sqlite_manager_js_1 = require("./database/sqlite-manager.js");
var sql = __importStar(require("mssql"));
var promise_1 = __importDefault(require("mysql2/promise"));
var pg_1 = require("pg");
var DynamicMCPExecutor = /** @class */ (function () {
    function DynamicMCPExecutor() {
        this.dbConnections = new Map();
        this.sqliteManager = new sqlite_manager_js_1.SQLiteManager();
    }
    DynamicMCPExecutor.prototype.getAllTools = function () {
        return __awaiter(this, void 0, void 0, function () {
            var tools;
            return __generator(this, function (_a) {
                tools = this.sqliteManager.getAllTools();
                return [2 /*return*/, tools.map(function (tool) { return ({
                        name: "".concat(tool.server_id, "__").concat(tool.name),
                        description: "[".concat(tool.server_id, "] ").concat(tool.description),
                        inputSchema: typeof tool.inputSchema === 'string' ? JSON.parse(tool.inputSchema) : tool.inputSchema
                    }); })];
            });
        });
    };
    DynamicMCPExecutor.prototype.getAllResources = function () {
        return __awaiter(this, void 0, void 0, function () {
            var resources;
            return __generator(this, function (_a) {
                resources = this.sqliteManager.getAllResources();
                return [2 /*return*/, resources.map(function (resource) { return ({
                        name: "".concat(resource.server_id, "__").concat(resource.name),
                        description: "[".concat(resource.server_id, "] ").concat(resource.description),
                        uri: resource.uri_template
                    }); })];
            });
        });
    };
    DynamicMCPExecutor.prototype.executeTool = function (toolName, args) {
        return __awaiter(this, void 0, void 0, function () {
            var parts, serverId, actualToolName_1, tools, tool, serverConfig, dbConnection, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        parts = toolName.split('__');
                        if (parts.length !== 2) {
                            throw new Error("Invalid tool name format: ".concat(toolName));
                        }
                        serverId = parts[0], actualToolName_1 = parts[1];
                        tools = this.sqliteManager.getToolsForServer(serverId);
                        tool = tools.find(function (t) { return t.name === actualToolName_1; });
                        if (!tool) {
                            throw new Error("Tool not found: ".concat(toolName));
                        }
                        serverConfig = this.sqliteManager.getServer(serverId);
                        if (!serverConfig) {
                            throw new Error("Server not found: ".concat(serverId));
                        }
                        return [4 /*yield*/, this.getOrCreateConnection(serverId, serverConfig.dbConfig)];
                    case 1:
                        dbConnection = _a.sent();
                        return [4 /*yield*/, this.executeQuery(dbConnection, tool.sqlQuery, args, tool.operation)];
                    case 2:
                        result = _a.sent();
                        console.error("\u2705 Executed tool ".concat(toolName, " successfully"));
                        return [2 /*return*/, {
                                success: true,
                                data: result,
                                rowCount: Array.isArray(result) ? result.length : (result.rowsAffected || 0)
                            }];
                    case 3:
                        error_1 = _a.sent();
                        console.error("\u274C Error executing tool ".concat(toolName, ":"), error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DynamicMCPExecutor.prototype.readResource = function (resourceName) {
        return __awaiter(this, void 0, void 0, function () {
            var parts, serverId, actualResourceName_1, resources, resource, serverConfig, dbConnection, result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        parts = resourceName.split('__');
                        if (parts.length !== 2) {
                            throw new Error("Invalid resource name format: ".concat(resourceName));
                        }
                        serverId = parts[0], actualResourceName_1 = parts[1];
                        resources = this.sqliteManager.getResourcesForServer(serverId);
                        resource = resources.find(function (r) { return r.name === actualResourceName_1; });
                        if (!resource) {
                            throw new Error("Resource not found: ".concat(resourceName));
                        }
                        serverConfig = this.sqliteManager.getServer(serverId);
                        if (!serverConfig) {
                            throw new Error("Server not found: ".concat(serverId));
                        }
                        return [4 /*yield*/, this.getOrCreateConnection(serverId, serverConfig.dbConfig)];
                    case 1:
                        dbConnection = _a.sent();
                        return [4 /*yield*/, this.executeQuery(dbConnection, resource.sqlQuery, {}, 'SELECT')];
                    case 2:
                        result = _a.sent();
                        console.error("\u2705 Read resource ".concat(resourceName, " successfully"));
                        return [2 /*return*/, {
                                contents: [{
                                        uri: resource.uri_template,
                                        mimeType: 'application/json',
                                        text: JSON.stringify(result, null, 2)
                                    }]
                            }];
                    case 3:
                        error_2 = _a.sent();
                        console.error("\u274C Error reading resource ".concat(resourceName, ":"), error_2);
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DynamicMCPExecutor.prototype.getOrCreateConnection = function (serverId, dbConfig) {
        return __awaiter(this, void 0, void 0, function () {
            var connection, dbConnection, _a, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.dbConnections.has(serverId)) {
                            return [2 /*return*/, this.dbConnections.get(serverId)];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 10, , 11]);
                        _a = dbConfig.type;
                        switch (_a) {
                            case 'mssql': return [3 /*break*/, 2];
                            case 'mysql': return [3 /*break*/, 4];
                            case 'postgresql': return [3 /*break*/, 6];
                        }
                        return [3 /*break*/, 8];
                    case 2:
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
                        return [4 /*yield*/, connection.connect()];
                    case 3:
                        _b.sent();
                        console.error("\uD83D\uDD17 Connected to MSSQL database for server ".concat(serverId));
                        return [3 /*break*/, 9];
                    case 4:
                        connection = promise_1.default.createConnection({
                            host: dbConfig.host,
                            port: dbConfig.port || 3306,
                            database: dbConfig.database,
                            user: dbConfig.username,
                            password: dbConfig.password
                        });
                        return [4 /*yield*/, connection.connect()];
                    case 5:
                        _b.sent();
                        console.error("\uD83D\uDD17 Connected to MySQL database for server ".concat(serverId));
                        return [3 /*break*/, 9];
                    case 6:
                        connection = new pg_1.Pool({
                            host: dbConfig.host,
                            port: dbConfig.port || 5432,
                            database: dbConfig.database,
                            user: dbConfig.username,
                            password: dbConfig.password
                        });
                        // Test connection
                        return [4 /*yield*/, connection.query('SELECT 1')];
                    case 7:
                        // Test connection
                        _b.sent();
                        console.error("\uD83D\uDD17 Connected to PostgreSQL database for server ".concat(serverId));
                        return [3 /*break*/, 9];
                    case 8: throw new Error("Unsupported database type: ".concat(dbConfig.type));
                    case 9:
                        dbConnection = {
                            type: dbConfig.type,
                            connection: connection,
                            config: dbConfig
                        };
                        this.dbConnections.set(serverId, dbConnection);
                        return [2 /*return*/, dbConnection];
                    case 10:
                        error_3 = _b.sent();
                        console.error("\u274C Failed to connect to database for server ".concat(serverId, ":"), error_3);
                        throw error_3;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    DynamicMCPExecutor.prototype.executeQuery = function (dbConnection, sqlQuery, args, operation) {
        return __awaiter(this, void 0, void 0, function () {
            var type, connection, _a, request, paramRegex, match, sqlParams, hasActiveFilters, modifiedQuery, _i, sqlParams_1, paramName, paramNameStr, value, result, rows, values, pgResult, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        type = dbConnection.type, connection = dbConnection.connection;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 10, , 11]);
                        _a = type;
                        switch (_a) {
                            case 'mssql': return [3 /*break*/, 2];
                            case 'mysql': return [3 /*break*/, 4];
                            case 'postgresql': return [3 /*break*/, 6];
                        }
                        return [3 /*break*/, 8];
                    case 2:
                        request = connection.request();
                        paramRegex = /@(\w+)/g;
                        match = void 0;
                        sqlParams = new Set();
                        while ((match = paramRegex.exec(sqlQuery)) !== null) {
                            sqlParams.add(match[1]);
                        }
                        hasActiveFilters = Array.from(sqlParams).some(function (paramName) {
                            if (paramName === 'limit' || paramName === 'offset')
                                return false;
                            var value = args[paramName];
                            return value !== undefined && value !== null;
                        });
                        modifiedQuery = sqlQuery;
                        if (!hasActiveFilters && operation === 'SELECT') {
                            // Remove complex WHERE clause that causes ntext compatibility issues
                            modifiedQuery = sqlQuery.replace(/WHERE.*?(?=ORDER BY|GROUP BY|HAVING|$)/gi, '');
                        }
                        // Always add all SQL parameters, using provided values or defaults
                        for (_i = 0, sqlParams_1 = sqlParams; _i < sqlParams_1.length; _i++) {
                            paramName = sqlParams_1[_i];
                            paramNameStr = paramName;
                            value = args[paramNameStr];
                            // Set defaults for limit and offset if not provided
                            if (paramNameStr === 'limit' && (value === undefined || value === null)) {
                                value = 100;
                            }
                            else if (paramNameStr === 'offset' && (value === undefined || value === null)) {
                                value = 0;
                            }
                            if (value !== undefined && value !== null) {
                                request.input(paramNameStr, value);
                            }
                            else {
                                request.input(paramNameStr, null);
                            }
                        }
                        return [4 /*yield*/, request.query(modifiedQuery)];
                    case 3:
                        result = _b.sent();
                        if (operation === 'SELECT') {
                            return [2 /*return*/, result.recordset];
                        }
                        else {
                            return [2 /*return*/, { rowsAffected: result.rowsAffected[0] }];
                        }
                        _b.label = 4;
                    case 4: return [4 /*yield*/, connection.execute(sqlQuery, Object.values(args).filter(function (v) { return v !== undefined && v !== null; }))];
                    case 5:
                        rows = (_b.sent())[0];
                        if (operation === 'SELECT') {
                            return [2 /*return*/, rows];
                        }
                        else {
                            return [2 /*return*/, { rowsAffected: rows.affectedRows }];
                        }
                        _b.label = 6;
                    case 6:
                        values = Object.values(args).filter(function (v) { return v !== undefined && v !== null; });
                        return [4 /*yield*/, connection.query(sqlQuery, values)];
                    case 7:
                        pgResult = _b.sent();
                        if (operation === 'SELECT') {
                            return [2 /*return*/, pgResult.rows];
                        }
                        else {
                            return [2 /*return*/, { rowsAffected: pgResult.rowCount }];
                        }
                        _b.label = 8;
                    case 8: throw new Error("Unsupported database type: ".concat(type));
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        error_4 = _b.sent();
                        console.error("\u274C Database query failed:", error_4);
                        throw error_4;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    DynamicMCPExecutor.prototype.getStats = function () {
        return __assign(__assign({}, this.sqliteManager.getStats()), { activeConnections: this.dbConnections.size });
    };
    DynamicMCPExecutor.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, _b, serverId, dbConnection, _c, error_5;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _i = 0, _a = this.dbConnections.entries();
                        _d.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 12];
                        _b = _a[_i], serverId = _b[0], dbConnection = _b[1];
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 10, , 11]);
                        _c = dbConnection.type;
                        switch (_c) {
                            case 'mssql': return [3 /*break*/, 3];
                            case 'mysql': return [3 /*break*/, 5];
                            case 'postgresql': return [3 /*break*/, 7];
                        }
                        return [3 /*break*/, 9];
                    case 3: return [4 /*yield*/, dbConnection.connection.close()];
                    case 4:
                        _d.sent();
                        return [3 /*break*/, 9];
                    case 5: return [4 /*yield*/, dbConnection.connection.end()];
                    case 6:
                        _d.sent();
                        return [3 /*break*/, 9];
                    case 7: return [4 /*yield*/, dbConnection.connection.end()];
                    case 8:
                        _d.sent();
                        return [3 /*break*/, 9];
                    case 9:
                        console.error("\uD83D\uDD0C Closed database connection for server ".concat(serverId));
                        return [3 /*break*/, 11];
                    case 10:
                        error_5 = _d.sent();
                        console.error("\u274C Error closing connection for server ".concat(serverId, ":"), error_5);
                        return [3 /*break*/, 11];
                    case 11:
                        _i++;
                        return [3 /*break*/, 1];
                    case 12:
                        this.dbConnections.clear();
                        this.sqliteManager.close();
                        return [2 /*return*/];
                }
            });
        });
    };
    return DynamicMCPExecutor;
}());
exports.DynamicMCPExecutor = DynamicMCPExecutor;

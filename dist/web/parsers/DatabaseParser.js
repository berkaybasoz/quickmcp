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
exports.DatabaseParser = void 0;
var promise_1 = __importDefault(require("mysql2/promise"));
var pg_1 = require("pg");
var sqlite3_1 = __importDefault(require("sqlite3"));
var sql = __importStar(require("mssql"));
var DatabaseParser = /** @class */ (function () {
    function DatabaseParser() {
    }
    DatabaseParser.prototype.parse = function (connection, tableName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (connection.type) {
                    case 'mysql':
                        return [2 /*return*/, this.parseMySql(connection, tableName)];
                    case 'postgresql':
                        return [2 /*return*/, this.parsePostgreSql(connection, tableName)];
                    case 'sqlite':
                        return [2 /*return*/, this.parseSqlite(connection, tableName)];
                    case 'mssql':
                        return [2 /*return*/, this.parseMsSql(connection, tableName)];
                    default:
                        throw new Error("Unsupported database type: ".concat(connection.type));
                }
                return [2 /*return*/];
            });
        });
    };
    DatabaseParser.prototype.getTables = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (connection.type) {
                    case 'mysql':
                        return [2 /*return*/, this.getMySqlTables(connection)];
                    case 'postgresql':
                        return [2 /*return*/, this.getPostgreSqlTables(connection)];
                    case 'sqlite':
                        return [2 /*return*/, this.getSqliteTables(connection)];
                    case 'mssql':
                        return [2 /*return*/, this.getMsSqlTables(connection)];
                    default:
                        throw new Error("Unsupported database type: ".concat(connection.type));
                }
                return [2 /*return*/];
            });
        });
    };
    DatabaseParser.prototype.parseMySql = function (connection, tableName) {
        return __awaiter(this, void 0, void 0, function () {
            var conn, tables, _a, results, _loop_1, _i, tables_1, table;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, promise_1.default.createConnection({
                            host: connection.host,
                            port: connection.port,
                            user: connection.username,
                            password: connection.password,
                            database: connection.database
                        })];
                    case 1:
                        conn = _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, , 10, 12]);
                        if (!tableName) return [3 /*break*/, 3];
                        _a = [tableName];
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.getMySqlTables(connection)];
                    case 4:
                        _a = _b.sent();
                        _b.label = 5;
                    case 5:
                        tables = _a;
                        results = [];
                        _loop_1 = function (table) {
                            var rows, columns, headers, dataTypes, rowsArray;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0: return [4 /*yield*/, conn.execute("SELECT * FROM `".concat(table, "` LIMIT 1000"))];
                                    case 1:
                                        rows = (_c.sent())[0];
                                        return [4 /*yield*/, conn.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?", [connection.database, table])];
                                    case 2:
                                        columns = (_c.sent())[0];
                                        headers = columns.map(function (col) { return col.COLUMN_NAME; });
                                        dataTypes = {};
                                        columns.forEach(function (col) {
                                            dataTypes[col.COLUMN_NAME] = _this.mapMySqlType(col.DATA_TYPE);
                                        });
                                        rowsArray = rows.map(function (row) { return headers.map(function (header) { return row[header]; }); });
                                        results.push({
                                            tableName: table,
                                            headers: headers,
                                            rows: rowsArray,
                                            metadata: {
                                                rowCount: rowsArray.length,
                                                columnCount: headers.length,
                                                dataTypes: dataTypes
                                            }
                                        });
                                        return [2 /*return*/];
                                }
                            });
                        };
                        _i = 0, tables_1 = tables;
                        _b.label = 6;
                    case 6:
                        if (!(_i < tables_1.length)) return [3 /*break*/, 9];
                        table = tables_1[_i];
                        return [5 /*yield**/, _loop_1(table)];
                    case 7:
                        _b.sent();
                        _b.label = 8;
                    case 8:
                        _i++;
                        return [3 /*break*/, 6];
                    case 9: return [2 /*return*/, results];
                    case 10: return [4 /*yield*/, conn.end()];
                    case 11:
                        _b.sent();
                        return [7 /*endfinally*/];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseParser.prototype.parsePostgreSql = function (connection, tableName) {
        return __awaiter(this, void 0, void 0, function () {
            var client, tables, _a, results, _loop_2, _i, tables_2, table;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        client = new pg_1.Client({
                            host: connection.host,
                            port: connection.port,
                            user: connection.username,
                            password: connection.password,
                            database: connection.database
                        });
                        return [4 /*yield*/, client.connect()];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, , 10, 12]);
                        if (!tableName) return [3 /*break*/, 3];
                        _a = [tableName];
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.getPostgreSqlTables(connection)];
                    case 4:
                        _a = _b.sent();
                        _b.label = 5;
                    case 5:
                        tables = _a;
                        results = [];
                        _loop_2 = function (table) {
                            var dataResult, columnsResult, headers, dataTypes, rowsArray;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0: return [4 /*yield*/, client.query("SELECT * FROM \"".concat(table, "\" LIMIT 1000"))];
                                    case 1:
                                        dataResult = _c.sent();
                                        return [4 /*yield*/, client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [table])];
                                    case 2:
                                        columnsResult = _c.sent();
                                        headers = columnsResult.rows.map(function (col) { return col.column_name; });
                                        dataTypes = {};
                                        columnsResult.rows.forEach(function (col) {
                                            dataTypes[col.column_name] = _this.mapPostgreSqlType(col.data_type);
                                        });
                                        rowsArray = dataResult.rows.map(function (row) { return headers.map(function (header) { return row[header]; }); });
                                        results.push({
                                            tableName: table,
                                            headers: headers,
                                            rows: rowsArray,
                                            metadata: {
                                                rowCount: rowsArray.length,
                                                columnCount: headers.length,
                                                dataTypes: dataTypes
                                            }
                                        });
                                        return [2 /*return*/];
                                }
                            });
                        };
                        _i = 0, tables_2 = tables;
                        _b.label = 6;
                    case 6:
                        if (!(_i < tables_2.length)) return [3 /*break*/, 9];
                        table = tables_2[_i];
                        return [5 /*yield**/, _loop_2(table)];
                    case 7:
                        _b.sent();
                        _b.label = 8;
                    case 8:
                        _i++;
                        return [3 /*break*/, 6];
                    case 9: return [2 /*return*/, results];
                    case 10: return [4 /*yield*/, client.end()];
                    case 11:
                        _b.sent();
                        return [7 /*endfinally*/];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseParser.prototype.parseSqlite = function (connection, tableName) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var db = new sqlite3_1.default.Database(connection.database);
                        db.serialize(function () { return __awaiter(_this, void 0, void 0, function () {
                            var tables, _a, results, _loop_3, _i, tables_3, table, error_1;
                            var _this = this;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 8, , 9]);
                                        if (!tableName) return [3 /*break*/, 1];
                                        _a = [tableName];
                                        return [3 /*break*/, 3];
                                    case 1: return [4 /*yield*/, this.getSqliteTables(connection)];
                                    case 2:
                                        _a = _b.sent();
                                        _b.label = 3;
                                    case 3:
                                        tables = _a;
                                        results = [];
                                        _loop_3 = function (table) {
                                            var rows, columns, headers_1, dataTypes_1, rowsArray;
                                            return __generator(this, function (_c) {
                                                switch (_c.label) {
                                                    case 0: return [4 /*yield*/, new Promise(function (res, rej) {
                                                            db.all("SELECT * FROM \"".concat(table, "\" LIMIT 1000"), function (err, rows) {
                                                                if (err)
                                                                    rej(err);
                                                                else
                                                                    res(rows);
                                                            });
                                                        })];
                                                    case 1:
                                                        rows = _c.sent();
                                                        return [4 /*yield*/, new Promise(function (res, rej) {
                                                                db.all("PRAGMA table_info(\"".concat(table, "\")"), function (err, cols) {
                                                                    if (err)
                                                                        rej(err);
                                                                    else
                                                                        res(cols);
                                                                });
                                                            })];
                                                    case 2:
                                                        columns = _c.sent();
                                                        if (rows.length > 0) {
                                                            headers_1 = Object.keys(rows[0]);
                                                            dataTypes_1 = {};
                                                            columns.forEach(function (col) {
                                                                dataTypes_1[col.name] = _this.mapSqliteType(col.type);
                                                            });
                                                            rowsArray = rows.map(function (row) { return headers_1.map(function (header) { return row[header]; }); });
                                                            results.push({
                                                                tableName: table,
                                                                headers: headers_1,
                                                                rows: rowsArray,
                                                                metadata: {
                                                                    rowCount: rowsArray.length,
                                                                    columnCount: headers_1.length,
                                                                    dataTypes: dataTypes_1
                                                                }
                                                            });
                                                        }
                                                        return [2 /*return*/];
                                                }
                                            });
                                        };
                                        _i = 0, tables_3 = tables;
                                        _b.label = 4;
                                    case 4:
                                        if (!(_i < tables_3.length)) return [3 /*break*/, 7];
                                        table = tables_3[_i];
                                        return [5 /*yield**/, _loop_3(table)];
                                    case 5:
                                        _b.sent();
                                        _b.label = 6;
                                    case 6:
                                        _i++;
                                        return [3 /*break*/, 4];
                                    case 7:
                                        resolve(results);
                                        return [3 /*break*/, 9];
                                    case 8:
                                        error_1 = _b.sent();
                                        reject(error_1);
                                        return [3 /*break*/, 9];
                                    case 9: return [2 /*return*/];
                                }
                            });
                        }); });
                        db.close();
                    })];
            });
        });
    };
    DatabaseParser.prototype.getMySqlTables = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var conn, rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, promise_1.default.createConnection({
                            host: connection.host,
                            port: connection.port,
                            user: connection.username,
                            password: connection.password,
                            database: connection.database
                        })];
                    case 1:
                        conn = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, , 4, 6]);
                        return [4 /*yield*/, conn.execute('SHOW TABLES')];
                    case 3:
                        rows = (_a.sent())[0];
                        return [2 /*return*/, rows.map(function (row) { return Object.values(row)[0]; })];
                    case 4: return [4 /*yield*/, conn.end()];
                    case 5:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseParser.prototype.getPostgreSqlTables = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var client, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        client = new pg_1.Client({
                            host: connection.host,
                            port: connection.port,
                            user: connection.username,
                            password: connection.password,
                            database: connection.database
                        });
                        return [4 /*yield*/, client.connect()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, , 4, 6]);
                        return [4 /*yield*/, client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'")];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result.rows.map(function (row) { return row.tablename; })];
                    case 4: return [4 /*yield*/, client.end()];
                    case 5:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseParser.prototype.getSqliteTables = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var db = new sqlite3_1.default.Database(connection.database);
                        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", function (err, rows) {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(rows.map(function (row) { return row.name; }));
                            }
                        });
                        db.close();
                    })];
            });
        });
    };
    DatabaseParser.prototype.mapMySqlType = function (type) {
        var lowerType = type.toLowerCase();
        if (lowerType.includes('int') || lowerType.includes('bigint'))
            return 'integer';
        if (lowerType.includes('decimal') || lowerType.includes('float') || lowerType.includes('double'))
            return 'number';
        if (lowerType.includes('bool') || lowerType.includes('tinyint(1)'))
            return 'boolean';
        if (lowerType.includes('date') || lowerType.includes('time'))
            return 'date';
        return 'string';
    };
    DatabaseParser.prototype.mapPostgreSqlType = function (type) {
        var lowerType = type.toLowerCase();
        if (lowerType.includes('int') || lowerType === 'bigint' || lowerType === 'smallint')
            return 'integer';
        if (lowerType.includes('numeric') || lowerType.includes('decimal') || lowerType === 'real' || lowerType === 'double precision')
            return 'number';
        if (lowerType === 'boolean')
            return 'boolean';
        if (lowerType.includes('timestamp') || lowerType === 'date' || lowerType === 'time')
            return 'date';
        return 'string';
    };
    DatabaseParser.prototype.mapSqliteType = function (type) {
        var lowerType = type.toLowerCase();
        if (lowerType === 'integer')
            return 'integer';
        if (lowerType === 'real' || lowerType === 'numeric')
            return 'number';
        if (lowerType === 'boolean')
            return 'boolean';
        if (lowerType === 'date' || lowerType === 'datetime')
            return 'date';
        return 'string';
    };
    DatabaseParser.prototype.parseMsSql = function (connection, tableName) {
        return __awaiter(this, void 0, void 0, function () {
            var config, tables, _a, results, _loop_4, _i, tables_4, table, error_2;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        config = {
                            server: connection.host,
                            port: connection.port || 1433,
                            user: connection.username,
                            password: connection.password,
                            database: connection.database,
                            options: {
                                encrypt: true,
                                trustServerCertificate: true
                            }
                        };
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 10, , 11]);
                        return [4 /*yield*/, sql.connect(config)];
                    case 2:
                        _b.sent();
                        if (!tableName) return [3 /*break*/, 3];
                        _a = [tableName];
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.getMsSqlTables(connection)];
                    case 4:
                        _a = _b.sent();
                        _b.label = 5;
                    case 5:
                        tables = _a;
                        results = [];
                        _loop_4 = function (table) {
                            var request, dataResult, columnsResult, headers, dataTypes, rowsArray;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        request = new sql.Request();
                                        return [4 /*yield*/, request.query("SELECT TOP 1000 * FROM [".concat(table, "]"))];
                                    case 1:
                                        dataResult = _c.sent();
                                        return [4 /*yield*/, request.query("\n          SELECT COLUMN_NAME, DATA_TYPE\n          FROM INFORMATION_SCHEMA.COLUMNS\n          WHERE TABLE_NAME = '".concat(table, "'\n        "))];
                                    case 2:
                                        columnsResult = _c.sent();
                                        headers = columnsResult.recordset.map(function (col) { return col.COLUMN_NAME; });
                                        dataTypes = {};
                                        columnsResult.recordset.forEach(function (col) {
                                            dataTypes[col.COLUMN_NAME] = _this.mapMsSqlType(col.DATA_TYPE);
                                        });
                                        rowsArray = dataResult.recordset.map(function (row) {
                                            return headers.map(function (header) { return row[header]; });
                                        });
                                        results.push({
                                            tableName: table,
                                            headers: headers,
                                            rows: rowsArray,
                                            metadata: {
                                                rowCount: rowsArray.length,
                                                columnCount: headers.length,
                                                dataTypes: dataTypes
                                            }
                                        });
                                        return [2 /*return*/];
                                }
                            });
                        };
                        _i = 0, tables_4 = tables;
                        _b.label = 6;
                    case 6:
                        if (!(_i < tables_4.length)) return [3 /*break*/, 9];
                        table = tables_4[_i];
                        return [5 /*yield**/, _loop_4(table)];
                    case 7:
                        _b.sent();
                        _b.label = 8;
                    case 8:
                        _i++;
                        return [3 /*break*/, 6];
                    case 9: return [2 /*return*/, results];
                    case 10:
                        error_2 = _b.sent();
                        throw error_2;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseParser.prototype.getMsSqlTables = function (connection) {
        return __awaiter(this, void 0, void 0, function () {
            var config, request, result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            server: connection.host,
                            port: connection.port || 1433,
                            user: connection.username,
                            password: connection.password,
                            database: connection.database,
                            options: {
                                encrypt: true,
                                trustServerCertificate: true
                            }
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, sql.connect(config)];
                    case 2:
                        _a.sent();
                        request = new sql.Request();
                        return [4 /*yield*/, request.query("\n        SELECT TABLE_NAME\n        FROM INFORMATION_SCHEMA.TABLES\n        WHERE TABLE_TYPE = 'BASE TABLE'\n      ")];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result.recordset.map(function (row) { return row.TABLE_NAME; })];
                    case 4:
                        error_3 = _a.sent();
                        throw error_3;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseParser.prototype.mapMsSqlType = function (type) {
        var lowerType = type.toLowerCase();
        if (lowerType.includes('int') || lowerType === 'bigint' || lowerType === 'smallint' || lowerType === 'tinyint')
            return 'integer';
        if (lowerType.includes('decimal') || lowerType.includes('numeric') || lowerType === 'float' || lowerType === 'real' || lowerType === 'money')
            return 'number';
        if (lowerType === 'bit')
            return 'boolean';
        if (lowerType.includes('date') || lowerType.includes('time'))
            return 'date';
        if (lowerType === 'uniqueidentifier')
            return 'string';
        return 'string';
    };
    return DatabaseParser;
}());
exports.DatabaseParser = DatabaseParser;

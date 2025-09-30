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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSourceParser = exports.DatabaseParser = exports.ExcelParser = exports.CsvParser = void 0;
var CsvParser_1 = require("./CsvParser");
Object.defineProperty(exports, "CsvParser", { enumerable: true, get: function () { return CsvParser_1.CsvParser; } });
var ExcelParser_1 = require("./ExcelParser");
Object.defineProperty(exports, "ExcelParser", { enumerable: true, get: function () { return ExcelParser_1.ExcelParser; } });
var DatabaseParser_1 = require("./DatabaseParser");
Object.defineProperty(exports, "DatabaseParser", { enumerable: true, get: function () { return DatabaseParser_1.DatabaseParser; } });
var CsvParser_2 = require("./CsvParser");
var ExcelParser_2 = require("./ExcelParser");
var DatabaseParser_2 = require("./DatabaseParser");
var DataSourceParser = /** @class */ (function () {
    function DataSourceParser() {
        this.csvParser = new CsvParser_2.CsvParser();
        this.excelParser = new ExcelParser_2.ExcelParser();
        this.databaseParser = new DatabaseParser_2.DatabaseParser();
    }
    DataSourceParser.prototype.parse = function (dataSource) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, csvData, excelData;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = dataSource.type;
                        switch (_a) {
                            case 'csv': return [3 /*break*/, 1];
                            case 'excel': return [3 /*break*/, 3];
                            case 'database': return [3 /*break*/, 5];
                            case 'json': return [3 /*break*/, 7];
                        }
                        return [3 /*break*/, 8];
                    case 1:
                        if (!dataSource.filePath)
                            throw new Error('File path required for CSV parsing');
                        return [4 /*yield*/, this.csvParser.parse(dataSource.filePath)];
                    case 2:
                        csvData = _b.sent();
                        return [2 /*return*/, [csvData]];
                    case 3:
                        if (!dataSource.filePath)
                            throw new Error('File path required for Excel parsing');
                        return [4 /*yield*/, this.excelParser.parse(dataSource.filePath)];
                    case 4:
                        excelData = _b.sent();
                        return [2 /*return*/, [excelData]];
                    case 5:
                        if (!dataSource.connection)
                            throw new Error('Database connection required for database parsing');
                        return [4 /*yield*/, this.databaseParser.parse(dataSource.connection)];
                    case 6: return [2 /*return*/, _b.sent()];
                    case 7:
                        if (!dataSource.data)
                            throw new Error('Data required for JSON parsing');
                        return [2 /*return*/, this.parseJsonData(dataSource.data)];
                    case 8: throw new Error("Unsupported data source type: ".concat(dataSource.type));
                }
            });
        });
    };
    DataSourceParser.prototype.parseJsonData = function (data) {
        var _this = this;
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('JSON data must be a non-empty array');
        }
        var headers = Object.keys(data[0]);
        var rows = data.map(function (item) { return headers.map(function (header) { return item[header]; }); });
        var dataTypes = {};
        headers.forEach(function (header) {
            var sample = data.slice(0, 100).map(function (item) { return item[header]; });
            dataTypes[header] = _this.inferJsonColumnType(sample);
        });
        return [{
                tableName: 'data',
                headers: headers,
                rows: rows,
                metadata: {
                    rowCount: rows.length,
                    columnCount: headers.length,
                    dataTypes: dataTypes
                }
            }];
    };
    DataSourceParser.prototype.inferJsonColumnType = function (values) {
        var nonNullValues = values.filter(function (v) { return v !== null && v !== undefined; });
        if (nonNullValues.length === 0)
            return 'string';
        var types = nonNullValues.map(function (v) { return typeof v; });
        var uniqueTypes = __spreadArray([], new Set(types), true);
        if (uniqueTypes.length === 1) {
            var type = uniqueTypes[0];
            if (type === 'boolean')
                return 'boolean';
            if (type === 'number') {
                var isInteger = nonNullValues.every(function (v) { return Number.isInteger(v); });
                return isInteger ? 'integer' : 'number';
            }
            if (type === 'string') {
                var isDate = nonNullValues.every(function (v) { return !isNaN(Date.parse(v)); });
                return isDate ? 'date' : 'string';
            }
        }
        return 'string';
    };
    return DataSourceParser;
}());
exports.DataSourceParser = DataSourceParser;

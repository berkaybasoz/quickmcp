"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSourceParser = exports.DatabaseParser = exports.ExcelParser = exports.CsvParser = void 0;
var CsvParser_1 = require("./CsvParser");
Object.defineProperty(exports, "CsvParser", { enumerable: true, get: function () { return CsvParser_1.CsvParser; } });
var ExcelParser_1 = require("./ExcelParser");
Object.defineProperty(exports, "ExcelParser", { enumerable: true, get: function () { return ExcelParser_1.ExcelParser; } });
var DatabaseParser_1 = require("./DatabaseParser");
Object.defineProperty(exports, "DatabaseParser", { enumerable: true, get: function () { return DatabaseParser_1.DatabaseParser; } });
const CsvParser_2 = require("./CsvParser");
const ExcelParser_2 = require("./ExcelParser");
const DatabaseParser_2 = require("./DatabaseParser");
class DataSourceParser {
    constructor() {
        this.csvParser = new CsvParser_2.CsvParser();
        this.excelParser = new ExcelParser_2.ExcelParser();
        this.databaseParser = new DatabaseParser_2.DatabaseParser();
    }
    async parse(dataSource) {
        switch (dataSource.type) {
            case 'csv':
                if (!dataSource.filePath)
                    throw new Error('File path required for CSV parsing');
                const csvData = await this.csvParser.parse(dataSource.filePath);
                return [csvData];
            case 'excel':
                if (!dataSource.filePath)
                    throw new Error('File path required for Excel parsing');
                const excelData = await this.excelParser.parse(dataSource.filePath);
                return [excelData];
            case 'database':
                if (!dataSource.connection)
                    throw new Error('Database connection required for database parsing');
                return await this.databaseParser.parse(dataSource.connection);
            case 'json':
                if (!dataSource.data)
                    throw new Error('Data required for JSON parsing');
                return this.parseJsonData(dataSource.data);
            default:
                throw new Error(`Unsupported data source type: ${dataSource.type}`);
        }
    }
    parseJsonData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('JSON data must be a non-empty array');
        }
        const headers = Object.keys(data[0]);
        const rows = data.map(item => headers.map(header => item[header]));
        const dataTypes = {};
        headers.forEach(header => {
            const sample = data.slice(0, 100).map(item => item[header]);
            dataTypes[header] = this.inferJsonColumnType(sample);
        });
        return [{
                tableName: 'data',
                headers,
                rows,
                metadata: {
                    rowCount: rows.length,
                    columnCount: headers.length,
                    dataTypes
                }
            }];
    }
    inferJsonColumnType(values) {
        const nonNullValues = values.filter(v => v !== null && v !== undefined);
        if (nonNullValues.length === 0)
            return 'string';
        const types = nonNullValues.map(v => typeof v);
        const uniqueTypes = [...new Set(types)];
        if (uniqueTypes.length === 1) {
            const type = uniqueTypes[0];
            if (type === 'boolean')
                return 'boolean';
            if (type === 'number') {
                const isInteger = nonNullValues.every(v => Number.isInteger(v));
                return isInteger ? 'integer' : 'number';
            }
            if (type === 'string') {
                const isDate = nonNullValues.every(v => !isNaN(Date.parse(v)));
                return isDate ? 'date' : 'string';
            }
        }
        return 'string';
    }
}
exports.DataSourceParser = DataSourceParser;
//# sourceMappingURL=index.js.map
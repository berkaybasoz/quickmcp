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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelParser = void 0;
const ExcelJS = __importStar(require("exceljs"));
class ExcelParser {
    async parse(filePath, sheetName) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = sheetName
            ? workbook.getWorksheet(sheetName)
            : workbook.getWorksheet(1); // First worksheet
        if (!worksheet) {
            throw new Error(`Sheet "${sheetName || 'first sheet'}" not found`);
        }
        const rows = [];
        let headers = [];
        worksheet.eachRow((row, rowNumber) => {
            const values = row.values;
            // Remove the first element (it's undefined in ExcelJS)
            const rowData = values.slice(1);
            if (rowNumber === 1) {
                headers = rowData.map(cell => cell?.toString() || '');
            }
            else {
                rows.push(rowData);
            }
        });
        if (headers.length === 0) {
            throw new Error('No data found in the sheet');
        }
        const dataTypes = this.inferDataTypes(rows, headers);
        return {
            tableName: worksheet.name,
            headers,
            rows,
            metadata: {
                rowCount: rows.length,
                columnCount: headers.length,
                dataTypes
            }
        };
    }
    async getSheetNames(filePath) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        return workbook.worksheets.map(sheet => sheet.name);
    }
    inferDataTypes(rows, headers) {
        const dataTypes = {};
        headers.forEach((header, index) => {
            const sample = rows.slice(0, 100).map(row => row[index]);
            dataTypes[header] = this.inferColumnType(sample);
        });
        return dataTypes;
    }
    inferColumnType(values) {
        const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
        if (nonNullValues.length === 0)
            return 'string';
        const isNumeric = nonNullValues.every(v => typeof v === 'number' || !isNaN(Number(v)));
        const isInteger = isNumeric && nonNullValues.every(v => {
            const num = typeof v === 'number' ? v : Number(v);
            return Number.isInteger(num);
        });
        const isBoolean = nonNullValues.every(v => v === true || v === false || v === 'true' || v === 'false' || v === 1 || v === 0);
        const isDate = nonNullValues.every(v => {
            if (v instanceof Date)
                return true;
            // ExcelJS automatically converts Excel dates to Date objects
            if (typeof v === 'string')
                return !isNaN(Date.parse(v));
            return false;
        });
        if (isBoolean)
            return 'boolean';
        if (isInteger)
            return 'integer';
        if (isNumeric)
            return 'number';
        if (isDate)
            return 'date';
        return 'string';
    }
}
exports.ExcelParser = ExcelParser;
//# sourceMappingURL=ExcelParser.js.map
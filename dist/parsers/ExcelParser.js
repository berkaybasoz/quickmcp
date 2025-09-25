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
const XLSX = __importStar(require("xlsx"));
class ExcelParser {
    async parse(filePath, sheetName) {
        const workbook = XLSX.readFile(filePath);
        const worksheetName = sheetName || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        if (!worksheet) {
            throw new Error(`Sheet "${worksheetName}" not found`);
        }
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length === 0) {
            throw new Error('No data found in the sheet');
        }
        const headers = jsonData[0];
        const rows = jsonData.slice(1);
        const dataTypes = this.inferDataTypes(rows, headers);
        return {
            tableName: worksheetName,
            headers,
            rows,
            metadata: {
                rowCount: rows.length,
                columnCount: headers.length,
                dataTypes
            }
        };
    }
    getSheetNames(filePath) {
        const workbook = XLSX.readFile(filePath);
        return workbook.SheetNames;
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
            if (typeof v === 'number')
                return XLSX.SSF.is_date(v);
            return !isNaN(Date.parse(v));
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
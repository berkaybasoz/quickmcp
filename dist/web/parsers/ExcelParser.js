"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelParser = void 0;
const XLSX = require("xlsx");
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

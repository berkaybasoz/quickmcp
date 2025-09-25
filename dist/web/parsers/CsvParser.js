"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvParser = void 0;
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");
class CsvParser {
    async parse(filePath) {
        return new Promise((resolve, reject) => {
            const rows = [];
            let headers = [];
            fs.createReadStream(filePath)
                .pipe(csv.default())
                .on('headers', (headerList) => {
                headers = headerList;
            })
                .on('data', (data) => {
                rows.push(Object.values(data));
            })
                .on('end', () => {
                const dataTypes = this.inferDataTypes(rows, headers);
                const fileName = path.basename(filePath, path.extname(filePath));
                resolve({
                    tableName: fileName,
                    headers,
                    rows,
                    metadata: {
                        rowCount: rows.length,
                        columnCount: headers.length,
                        dataTypes
                    }
                });
            })
                .on('error', reject);
        });
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
        const isNumeric = nonNullValues.every(v => !isNaN(Number(v)));
        const isInteger = isNumeric && nonNullValues.every(v => Number.isInteger(Number(v)));
        const isBoolean = nonNullValues.every(v => v === 'true' || v === 'false' || v === '1' || v === '0');
        const isDate = nonNullValues.every(v => !isNaN(Date.parse(v)));
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
exports.CsvParser = CsvParser;

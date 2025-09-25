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
exports.CsvParser = void 0;
const fs = __importStar(require("fs"));
const csv = __importStar(require("csv-parser"));
const path = __importStar(require("path"));
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
//# sourceMappingURL=CsvParser.js.map
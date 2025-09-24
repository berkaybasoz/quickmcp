import * as fs from 'fs';
import * as csv from 'csv-parser';
import { ParsedData } from '../types';

export class CsvParser {
  async parse(filePath: string): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      const rows: any[] = [];
      let headers: string[] = [];

      fs.createReadStream(filePath)
        .pipe(csv.default())
        .on('headers', (headerList: string[]) => {
          headers = headerList;
        })
        .on('data', (data: any) => {
          rows.push(Object.values(data));
        })
        .on('end', () => {
          const dataTypes = this.inferDataTypes(rows, headers);

          resolve({
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

  private inferDataTypes(rows: any[][], headers: string[]): Record<string, string> {
    const dataTypes: Record<string, string> = {};

    headers.forEach((header, index) => {
      const sample = rows.slice(0, 100).map(row => row[index]);
      dataTypes[header] = this.inferColumnType(sample);
    });

    return dataTypes;
  }

  private inferColumnType(values: any[]): string {
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

    if (nonNullValues.length === 0) return 'string';

    const isNumeric = nonNullValues.every(v => !isNaN(Number(v)));
    const isInteger = isNumeric && nonNullValues.every(v => Number.isInteger(Number(v)));
    const isBoolean = nonNullValues.every(v =>
      v === 'true' || v === 'false' || v === '1' || v === '0'
    );
    const isDate = nonNullValues.every(v => !isNaN(Date.parse(v)));

    if (isBoolean) return 'boolean';
    if (isInteger) return 'integer';
    if (isNumeric) return 'number';
    if (isDate) return 'date';
    return 'string';
  }
}
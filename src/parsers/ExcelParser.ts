import * as ExcelJS from 'exceljs';
import { ParsedData } from '../types';

export class ExcelParser {
  async parse(filePath: string, sheetName?: string): Promise<ParsedData> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = sheetName 
      ? workbook.getWorksheet(sheetName)
      : workbook.getWorksheet(1); // First worksheet

    if (!worksheet) {
      throw new Error(`Sheet "${sheetName || 'first sheet'}" not found`);
    }

    const rows: any[][] = [];
    let headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      const values = row.values as any[];
      // Remove the first element (it's undefined in ExcelJS)
      const rowData = values.slice(1);
      
      if (rowNumber === 1) {
        headers = rowData.map(cell => cell?.toString() || '');
      } else {
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

  async getSheetNames(filePath: string): Promise<string[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return workbook.worksheets.map(sheet => sheet.name);
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

    const isNumeric = nonNullValues.every(v => typeof v === 'number' || !isNaN(Number(v)));
    const isInteger = isNumeric && nonNullValues.every(v => {
      const num = typeof v === 'number' ? v : Number(v);
      return Number.isInteger(num);
    });
    const isBoolean = nonNullValues.every(v =>
      v === true || v === false || v === 'true' || v === 'false' || v === 1 || v === 0
    );
    const isDate = nonNullValues.every(v => {
      if (v instanceof Date) return true;
      // ExcelJS automatically converts Excel dates to Date objects
      if (typeof v === 'string') return !isNaN(Date.parse(v));
      return false;
    });

    if (isBoolean) return 'boolean';
    if (isInteger) return 'integer';
    if (isNumeric) return 'number';
    if (isDate) return 'date';
    return 'string';
  }
}
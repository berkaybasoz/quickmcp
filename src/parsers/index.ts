export { CsvParser } from './CsvParser';
export { ExcelParser } from './ExcelParser';
export { DatabaseParser } from './DatabaseParser';

import { CsvParser } from './CsvParser';
import { ExcelParser } from './ExcelParser';
import { DatabaseParser } from './DatabaseParser';
import { DataSource, DataSourceType, ParsedData, CsvDataSource, ExcelDataSource, JsonDataSource, CurlDataSource } from '../types';

type AnyDataSource = DataSource | CsvDataSource | ExcelDataSource | JsonDataSource | CurlDataSource;

export class DataSourceParser {
  private csvParser = new CsvParser();
  private excelParser = new ExcelParser();
  private databaseParser = new DatabaseParser();

  async parse(dataSource: AnyDataSource): Promise<ParsedData[]> {
    switch (dataSource.type) {
      case DataSourceType.CSV: {
        const csvSource = dataSource as CsvDataSource;
        const csvData = await this.csvParser.parse(csvSource.filePath);
        return [csvData];
      }

      case DataSourceType.Excel: {
        const excelSource = dataSource as ExcelDataSource;
        const excelData = await this.excelParser.parse(excelSource.filePath);
        return [excelData];
      }

      case DataSourceType.Database:
        if (!dataSource.connection) throw new Error('Database connection required for database parsing');
        return await this.databaseParser.parse(dataSource.connection);

      case DataSourceType.JSON: {
        const jsonSource = dataSource as JsonDataSource;
        if (!jsonSource.data) 
          throw new Error('Data required for JSON parsing');
        return this.parseJsonData(jsonSource.data);
      }

      default:
        throw new Error(`Unsupported data source type: ${dataSource.type}`);
    }
  }

  private parseJsonData(data: any[]): ParsedData[] {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('JSON data must be a non-empty array');
    }

    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(header => item[header]));

    const dataTypes: Record<string, string> = {};
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

  private inferJsonColumnType(values: any[]): string {
    const nonNullValues = values.filter(v => v !== null && v !== undefined);

    if (nonNullValues.length === 0) return 'string';

    const types = nonNullValues.map(v => typeof v);
    const uniqueTypes = [...new Set(types)];

    if (uniqueTypes.length === 1) {
      const type = uniqueTypes[0];
      if (type === 'boolean') return 'boolean';
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
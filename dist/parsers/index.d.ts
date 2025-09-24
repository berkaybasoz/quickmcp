export { CsvParser } from './CsvParser';
export { ExcelParser } from './ExcelParser';
export { DatabaseParser } from './DatabaseParser';
import { DataSource, ParsedData } from '../types';
export declare class DataSourceParser {
    private csvParser;
    private excelParser;
    private databaseParser;
    parse(dataSource: DataSource): Promise<ParsedData[]>;
    private parseJsonData;
    private inferJsonColumnType;
}
//# sourceMappingURL=index.d.ts.map
import { ParsedData } from '../types';
export declare class ExcelParser {
    parse(filePath: string, sheetName?: string): Promise<ParsedData>;
    getSheetNames(filePath: string): Promise<string[]>;
    private inferDataTypes;
    private inferColumnType;
}
//# sourceMappingURL=ExcelParser.d.ts.map
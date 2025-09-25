import { DatabaseConnection, ParsedData } from '../types';
export declare class DatabaseParser {
    parse(connection: DatabaseConnection, tableName?: string): Promise<ParsedData[]>;
    getTables(connection: DatabaseConnection): Promise<string[]>;
    private parseMySql;
    private parsePostgreSql;
    private parseSqlite;
    private getMySqlTables;
    private getPostgreSqlTables;
    private getSqliteTables;
    private mapMySqlType;
    private mapPostgreSqlType;
    private mapSqliteType;
    private parseMsSql;
    private getMsSqlTables;
    private mapMsSqlType;
}
//# sourceMappingURL=DatabaseParser.d.ts.map
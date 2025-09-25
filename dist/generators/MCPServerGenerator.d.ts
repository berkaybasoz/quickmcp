import { ServerConfig, ToolDefinition, ResourceDefinition } from '../database/sqlite-manager.js';
interface ParsedData {
    [tableName: string]: any[];
}
export declare class MCPServerGenerator {
    private sqliteManager;
    constructor();
    generateServer(serverId: string, serverName: string, parsedData: ParsedData, dbConfig: any): Promise<{
        success: boolean;
        message: string;
    }>;
    private generateToolsForData;
    private generateResourcesForData;
    private analyzeColumns;
    private generateFilterProperties;
    private generateInputProperties;
    private generateSelectQuery;
    private generateInsertQuery;
    private generateUpdateQuery;
    private generateDeleteQuery;
    private sanitizeName;
    getAllServers(): ServerConfig[];
    getServer(serverId: string): ServerConfig | null;
    deleteServer(serverId: string): void;
    getAllTools(): ToolDefinition[];
    getToolsForServer(serverId: string): ToolDefinition[];
    getAllResources(): ResourceDefinition[];
    getResourcesForServer(serverId: string): ResourceDefinition[];
    getStats(): {
        servers: number;
        tools: number;
        resources: number;
    };
    close(): void;
}
export {};
//# sourceMappingURL=MCPServerGenerator.d.ts.map
export interface ServerConfig {
    id: string;
    name: string;
    dbConfig: {
        type: 'mssql' | 'mysql' | 'postgresql';
        server: string;
        port: number;
        database: string;
        username: string;
        password: string;
        encrypt?: boolean;
        trustServerCertificate?: boolean;
    };
    createdAt: string;
}
export interface ToolDefinition {
    server_id: string;
    name: string;
    description: string;
    inputSchema: any;
    sqlQuery: string;
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
}
export interface ResourceDefinition {
    server_id: string;
    name: string;
    description: string;
    uri_template: string;
    sqlQuery: string;
}
export declare class SQLiteManager {
    private db;
    private dbPath;
    constructor();
    private initializeTables;
    saveServer(server: ServerConfig): void;
    getServer(serverId: string): ServerConfig | null;
    getAllServers(): ServerConfig[];
    deleteServer(serverId: string): void;
    saveTools(tools: ToolDefinition[]): void;
    getToolsForServer(serverId: string): ToolDefinition[];
    getAllTools(): ToolDefinition[];
    saveResources(resources: ResourceDefinition[]): void;
    getResourcesForServer(serverId: string): ResourceDefinition[];
    getAllResources(): ResourceDefinition[];
    close(): void;
    getStats(): {
        servers: number;
        tools: number;
        resources: number;
    };
}
//# sourceMappingURL=sqlite-manager.d.ts.map
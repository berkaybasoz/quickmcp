export interface DataSource {
    type: 'database' | 'csv' | 'excel' | 'json';
    name: string;
    connection?: DatabaseConnection;
    filePath?: string;
    data?: any[];
}
export interface DatabaseConnection {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    type: 'mysql' | 'postgresql' | 'sqlite';
}
export interface MCPServerConfig {
    name: string;
    description: string;
    version: string;
    dataSource: DataSource;
    tools: MCPTool[];
    resources: MCPResource[];
    prompts: MCPPrompt[];
}
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: any;
    handler: string;
}
export interface MCPResource {
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
}
export interface MCPPrompt {
    name: string;
    description: string;
    arguments: any[];
    template: string;
}
export interface ParsedData {
    headers: string[];
    rows: any[][];
    metadata: {
        rowCount: number;
        columnCount: number;
        dataTypes: Record<string, string>;
    };
}
export interface MCPTestRequest {
    serverId: string;
    method: 'tool' | 'resource' | 'prompt';
    name: string;
    params?: any;
}
export interface MCPTestResponse {
    success: boolean;
    data?: any;
    error?: string;
}
//# sourceMappingURL=index.d.ts.map
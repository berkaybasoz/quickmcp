#!/usr/bin/env node
interface ServerInfo {
    config: any;
    serverPath: string;
    parsedData: any[];
    runtimeProcess?: any;
    runtimePort?: number;
}
declare class IntegratedMCPServer {
    private server;
    private app;
    private generatedServers;
    constructor(generatedServers: Map<string, ServerInfo>);
    private setupHandlers;
    private executeToolHandler;
    private generateResourceContent;
    private processPromptTemplate;
    private searchTable;
    private getAllFromTable;
    private filterTableByColumn;
    private toSafeIdentifier;
    start(port?: number): Promise<void>;
}
export { IntegratedMCPServer };
//# sourceMappingURL=integrated-mcp-server.d.ts.map
export declare class DynamicMCPExecutor {
    private sqliteManager;
    private dbConnections;
    constructor();
    getAllTools(): Promise<any[]>;
    getAllResources(): Promise<any[]>;
    executeTool(toolName: string, args: any): Promise<any>;
    readResource(resourceName: string): Promise<any>;
    private getOrCreateConnection;
    private executeQuery;
    getStats(): any;
    close(): Promise<void>;
}
//# sourceMappingURL=dynamic-mcp-executor.d.ts.map
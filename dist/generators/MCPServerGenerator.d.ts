interface ParsedData {
    [tableName: string]: any[];
}
export declare class MCPServerGenerator {
    private jsonManager;
    constructor();
    generateServer(serverId: string, serverName: string, parsedData: ParsedData, dbConfig: any): Promise<{
        success: boolean;
        message: string;
    }>;
    generatePackageJson(config: MCPServerConfig): string;
    generateConfigFromData(name: string, description: string, parsedData: ParsedData[]): MCPServerConfig;
    private generateDataStorage;
    private generateToolDefinition;
    private generateResourceDefinition;
    private generatePromptDefinition;
    private generateToolHandler;
    private generateResourceHandler;
    private generatePromptHandler;
    private generateUtilityMethods;
    private generateStaticUtilityMethods;
    private generateMSSQLUtilityMethods;
    private getFilterSchema;
    private toSafeIdentifier;
    private toPascalCase;
}
export {};
//# sourceMappingURL=MCPServerGenerator.d.ts.map
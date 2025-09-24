import { MCPServerConfig, ParsedData } from '../types';
export declare class MCPServerGenerator {
    generateServer(config: MCPServerConfig, parsedData: ParsedData[]): string;
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
    private getFilterSchema;
    private toPascalCase;
}
//# sourceMappingURL=MCPServerGenerator.d.ts.map
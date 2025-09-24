import { MCPTestRequest, MCPTestResponse } from '../types';
export declare class MCPClient {
    private process;
    private messageId;
    private pendingRequests;
    private isConnected;
    private buffer;
    connect(serverPath: string): Promise<void>;
    disconnect(): Promise<void>;
    listTools(): Promise<any[]>;
    listResources(): Promise<any[]>;
    listPrompts(): Promise<any[]>;
    callTool(name: string, args?: any): Promise<MCPTestResponse>;
    readResource(uri: string): Promise<MCPTestResponse>;
    getPrompt(name: string, args?: any): Promise<MCPTestResponse>;
    testRequest(request: MCPTestRequest): Promise<MCPTestResponse>;
    private initialize;
    private sendRequest;
    private sendNotification;
    private handleMessage;
    private processMessage;
    get connected(): boolean;
}
//# sourceMappingURL=MCPClient.d.ts.map
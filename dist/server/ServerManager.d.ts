import { ChildProcess } from 'child_process';
import { MCPServerConfig, ParsedData } from '../types';
export interface ServerInstance {
    id: string;
    config: MCPServerConfig;
    serverPath: string;
    process?: ChildProcess;
    status: 'stopped' | 'starting' | 'running' | 'error';
    port?: number;
    lastError?: string;
    createdAt: Date;
    lastStarted?: Date;
}
export declare class ServerManager {
    private servers;
    private serverDir;
    constructor(baseDir?: string);
    initialize(): Promise<void>;
    createServer(config: MCPServerConfig, parsedData: ParsedData[], serverCode: string, packageJson: string): Promise<ServerInstance>;
    buildServer(serverId: string): Promise<void>;
    startServer(serverId: string, port?: number): Promise<void>;
    stopServer(serverId: string): Promise<void>;
    restartServer(serverId: string): Promise<void>;
    deleteServer(serverId: string): Promise<void>;
    exportServer(serverId: string): Promise<string>;
    getServerInstance(serverId: string): ServerInstance | undefined;
    getAllServers(): ServerInstance[];
    getRunningServers(): ServerInstance[];
    updateServerConfig(serverId: string, newConfig: Partial<MCPServerConfig>): Promise<void>;
    private loadExistingServers;
    private saveServerMetadata;
    private generateServerId;
    private runCommand;
    private copyDirectory;
    private generateReadme;
}
//# sourceMappingURL=ServerManager.d.ts.map
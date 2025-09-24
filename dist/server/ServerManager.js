"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerManager = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
class ServerManager {
    constructor(baseDir = './generated-servers') {
        this.servers = new Map();
        this.serverDir = path.resolve(baseDir);
    }
    async initialize() {
        await fs.mkdir(this.serverDir, { recursive: true });
        await this.loadExistingServers();
    }
    async createServer(config, parsedData, serverCode, packageJson) {
        const serverId = this.generateServerId(config.name);
        const serverPath = path.join(this.serverDir, serverId);
        // Create server directory
        await fs.mkdir(serverPath, { recursive: true });
        // Write server files
        await fs.writeFile(path.join(serverPath, 'index.ts'), serverCode);
        await fs.writeFile(path.join(serverPath, 'package.json'), packageJson);
        await fs.writeFile(path.join(serverPath, 'data.json'), JSON.stringify(parsedData, null, 2));
        // Create TypeScript config
        const tsConfig = {
            compilerOptions: {
                target: "ES2020",
                module: "commonjs",
                outDir: "./dist",
                rootDir: "./",
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true
            },
            include: ["*.ts"],
            exclude: ["node_modules", "dist"]
        };
        await fs.writeFile(path.join(serverPath, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));
        // Create server instance
        const instance = {
            id: serverId,
            config,
            serverPath: path.join(serverPath, 'index.ts'),
            status: 'stopped',
            createdAt: new Date()
        };
        this.servers.set(serverId, instance);
        await this.saveServerMetadata(instance);
        return instance;
    }
    async buildServer(serverId) {
        const instance = this.servers.get(serverId);
        if (!instance) {
            throw new Error(`Server ${serverId} not found`);
        }
        const serverDir = path.dirname(instance.serverPath);
        // Install dependencies
        await this.runCommand('npm', ['install'], serverDir);
        // Build TypeScript
        await this.runCommand('npx', ['tsc'], serverDir);
    }
    async startServer(serverId, port) {
        const instance = this.servers.get(serverId);
        if (!instance) {
            throw new Error(`Server ${serverId} not found`);
        }
        if (instance.status === 'running') {
            throw new Error(`Server ${serverId} is already running`);
        }
        const serverDir = path.dirname(instance.serverPath);
        const distPath = path.join(serverDir, 'dist', 'index.js');
        // Check if server is built
        try {
            await fs.access(distPath);
        }
        catch {
            await this.buildServer(serverId);
        }
        instance.status = 'starting';
        instance.lastStarted = new Date();
        try {
            const childProcess = (0, child_process_1.spawn)('node', [distPath], {
                cwd: serverDir,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    PORT: port?.toString() || '0'
                }
            });
            childProcess.on('error', (error) => {
                instance.status = 'error';
                instance.lastError = error.message;
            });
            childProcess.on('exit', (code) => {
                instance.status = 'stopped';
                if (code !== 0) {
                    instance.lastError = `Process exited with code ${code}`;
                }
            });
            // Give the process a moment to start
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (childProcess.killed) {
                throw new Error('Server failed to start');
            }
            instance.process = childProcess;
            instance.status = 'running';
            instance.port = port;
        }
        catch (error) {
            instance.status = 'error';
            instance.lastError = error instanceof Error ? error.message : 'Unknown error';
            throw error;
        }
    }
    async stopServer(serverId) {
        const instance = this.servers.get(serverId);
        if (!instance) {
            throw new Error(`Server ${serverId} not found`);
        }
        if (instance.process) {
            instance.process.kill('SIGTERM');
            // Wait for graceful shutdown
            await new Promise(resolve => {
                setTimeout(() => {
                    if (instance.process && !instance.process.killed) {
                        instance.process.kill('SIGKILL');
                    }
                    resolve(void 0);
                }, 5000);
            });
            instance.process = undefined;
        }
        instance.status = 'stopped';
        instance.port = undefined;
    }
    async restartServer(serverId) {
        await this.stopServer(serverId);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.startServer(serverId);
    }
    async deleteServer(serverId) {
        const instance = this.servers.get(serverId);
        if (!instance) {
            throw new Error(`Server ${serverId} not found`);
        }
        // Stop server if running
        if (instance.status === 'running') {
            await this.stopServer(serverId);
        }
        // Remove server directory
        const serverDir = path.dirname(instance.serverPath);
        await fs.rm(serverDir, { recursive: true, force: true });
        // Remove from memory
        this.servers.delete(serverId);
    }
    async exportServer(serverId) {
        const instance = this.servers.get(serverId);
        if (!instance) {
            throw new Error(`Server ${serverId} not found`);
        }
        const serverDir = path.dirname(instance.serverPath);
        const exportPath = path.join(this.serverDir, `${serverId}-export.zip`);
        // In a real implementation, you'd create a proper zip file
        // For now, we'll just copy the directory structure
        const exportDir = path.join(this.serverDir, `${serverId}-export`);
        await fs.mkdir(exportDir, { recursive: true });
        // Copy server files
        const files = await fs.readdir(serverDir);
        for (const file of files) {
            if (file !== 'node_modules' && file !== 'dist') {
                const srcPath = path.join(serverDir, file);
                const destPath = path.join(exportDir, file);
                const stats = await fs.stat(srcPath);
                if (stats.isDirectory()) {
                    await this.copyDirectory(srcPath, destPath);
                }
                else {
                    await fs.copyFile(srcPath, destPath);
                }
            }
        }
        // Add README
        const readme = this.generateReadme(instance);
        await fs.writeFile(path.join(exportDir, 'README.md'), readme);
        return exportDir;
    }
    getServerInstance(serverId) {
        return this.servers.get(serverId);
    }
    getAllServers() {
        return Array.from(this.servers.values());
    }
    getRunningServers() {
        return this.getAllServers().filter(server => server.status === 'running');
    }
    async updateServerConfig(serverId, newConfig) {
        const instance = this.servers.get(serverId);
        if (!instance) {
            throw new Error(`Server ${serverId} not found`);
        }
        // Update config
        instance.config = { ...instance.config, ...newConfig };
        // Save metadata
        await this.saveServerMetadata(instance);
    }
    async loadExistingServers() {
        try {
            const entries = await fs.readdir(this.serverDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    try {
                        const metadataPath = path.join(this.serverDir, entry.name, 'metadata.json');
                        const metadataStr = await fs.readFile(metadataPath, 'utf-8');
                        const metadata = JSON.parse(metadataStr);
                        const instance = {
                            ...metadata,
                            createdAt: new Date(metadata.createdAt),
                            lastStarted: metadata.lastStarted ? new Date(metadata.lastStarted) : undefined,
                            status: 'stopped',
                            process: undefined
                        };
                        this.servers.set(instance.id, instance);
                    }
                    catch (error) {
                        console.warn(`Failed to load server metadata for ${entry.name}:`, error);
                    }
                }
            }
        }
        catch (error) {
            // Directory doesn't exist yet, that's fine
        }
    }
    async saveServerMetadata(instance) {
        const serverDir = path.dirname(instance.serverPath);
        const metadataPath = path.join(serverDir, 'metadata.json');
        const metadata = {
            id: instance.id,
            config: instance.config,
            serverPath: instance.serverPath,
            status: instance.status,
            port: instance.port,
            lastError: instance.lastError,
            createdAt: instance.createdAt.toISOString(),
            lastStarted: instance.lastStarted?.toISOString()
        };
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }
    generateServerId(name) {
        const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const timestamp = Date.now().toString(36);
        return `${cleanName}-${timestamp}`;
    }
    async runCommand(command, args, cwd) {
        return new Promise((resolve, reject) => {
            const process = (0, child_process_1.spawn)(command, args, { cwd, stdio: 'pipe' });
            let stdout = '';
            let stderr = '';
            process.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            process.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`Command failed with code ${code}: ${stderr}`));
                }
            });
            process.on('error', reject);
        });
    }
    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            }
            else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }
    generateReadme(instance) {
        return `# ${instance.config.name}

${instance.config.description}

## Installation

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Build the server:
   \`\`\`bash
   npm run build
   \`\`\`

3. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

## Configuration

This MCP server provides the following capabilities:

- **Tools**: ${instance.config.tools.length} available tools
- **Resources**: ${instance.config.resources.length} available resources
- **Prompts**: ${instance.config.prompts.length} available prompts

## Usage

This server implements the Model Context Protocol (MCP) and can be used with any MCP-compatible client.

### Tools

${instance.config.tools.map(tool => `- **${tool.name}**: ${tool.description}`).join('\n')}

### Resources

${instance.config.resources.map(resource => `- **${resource.name}**: ${resource.description}`).join('\n')}

### Prompts

${instance.config.prompts.map(prompt => `- **${prompt.name}**: ${prompt.description}`).join('\n')}

Generated with MCP Server Generator - ${new Date().toISOString()}
`;
    }
}
exports.ServerManager = ServerManager;
//# sourceMappingURL=ServerManager.js.map
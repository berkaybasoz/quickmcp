"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPClient = void 0;
const child_process_1 = require("child_process");
class MCPClient {
    constructor() {
        this.process = null;
        this.messageId = 1;
        this.pendingRequests = new Map();
        this.isConnected = false;
        this.buffer = '';
    }
    async connect(serverPath) {
        return new Promise((resolve, reject) => {
            this.process = (0, child_process_1.spawn)('node', [serverPath], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            this.process.stdout?.on('data', (data) => {
                this.handleMessage(data.toString());
            });
            this.process.stderr?.on('data', (data) => {
                console.error('MCP Server stderr:', data.toString());
            });
            this.process.on('error', (error) => {
                console.error('MCP Server process error:', error);
                reject(error);
            });
            this.process.on('exit', (code) => {
                console.log('MCP Server process exited with code:', code);
                this.isConnected = false;
            });
            // Initialize the connection
            this.initialize()
                .then(() => {
                this.isConnected = true;
                resolve();
            })
                .catch(reject);
        });
    }
    async disconnect() {
        if (this.process) {
            this.process.kill();
            this.process = null;
            this.isConnected = false;
        }
    }
    async listTools() {
        const response = await this.sendRequest('tools/list', {});
        return response.tools || [];
    }
    async listResources() {
        const response = await this.sendRequest('resources/list', {});
        return response.resources || [];
    }
    async listPrompts() {
        const response = await this.sendRequest('prompts/list', {});
        return response.prompts || [];
    }
    async callTool(name, args) {
        try {
            const response = await this.sendRequest('tools/call', {
                name,
                arguments: args || {}
            });
            return {
                success: true,
                data: response
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async readResource(uri) {
        try {
            const response = await this.sendRequest('resources/read', { uri });
            return {
                success: true,
                data: response
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getPrompt(name, args) {
        try {
            const response = await this.sendRequest('prompts/get', {
                name,
                arguments: args || {}
            });
            return {
                success: true,
                data: response
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async testRequest(request) {
        switch (request.method) {
            case 'tool':
                return this.callTool(request.name, request.params);
            case 'resource':
                return this.readResource(request.name);
            case 'prompt':
                return this.getPrompt(request.name, request.params);
            default:
                return {
                    success: false,
                    error: 'Unknown request method'
                };
        }
    }
    async initialize() {
        await this.sendRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {
                roots: {},
                sampling: {}
            },
            clientInfo: {
                name: 'MCP Server Generator Client',
                version: '1.0.0'
            }
        });
        await this.sendNotification('initialized', {});
    }
    async sendRequest(method, params) {
        return new Promise((resolve, reject) => {
            if (!this.process?.stdin) {
                reject(new Error('Not connected to MCP server'));
                return;
            }
            const id = this.messageId++;
            const message = {
                jsonrpc: '2.0',
                id,
                method,
                params
            };
            this.pendingRequests.set(id, { resolve, reject });
            const messageStr = JSON.stringify(message) + '\n';
            this.process.stdin.write(messageStr);
            // Set timeout for requests
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 10000);
        });
    }
    async sendNotification(method, params) {
        if (!this.process?.stdin) {
            throw new Error('Not connected to MCP server');
        }
        const message = {
            jsonrpc: '2.0',
            method,
            params
        };
        const messageStr = JSON.stringify(message) + '\n';
        this.process.stdin.write(messageStr);
    }
    handleMessage(data) {
        this.buffer += data;
        let newlineIndex;
        while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
            const messageStr = this.buffer.slice(0, newlineIndex);
            this.buffer = this.buffer.slice(newlineIndex + 1);
            if (messageStr.trim()) {
                try {
                    const message = JSON.parse(messageStr);
                    this.processMessage(message);
                }
                catch (error) {
                    console.error('Failed to parse MCP message:', messageStr, error);
                }
            }
        }
    }
    processMessage(message) {
        if (message.id !== undefined && this.pendingRequests.has(message.id)) {
            const { resolve, reject } = this.pendingRequests.get(message.id);
            this.pendingRequests.delete(message.id);
            if (message.error) {
                reject(new Error(`MCP Error (${message.error.code}): ${message.error.message}`));
            }
            else {
                resolve(message.result);
            }
        }
    }
    get connected() {
        return this.isConnected;
    }
}
exports.MCPClient = MCPClient;
//# sourceMappingURL=MCPClient.js.map
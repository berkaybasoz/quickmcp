#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegratedMCPServer = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const express_1 = __importDefault(require("express"));
const dynamic_mcp_executor_1 = require("./dynamic-mcp-executor");
class IntegratedMCPServer {
    constructor() {
        this.executor = new dynamic_mcp_executor_1.DynamicMCPExecutor();
        this.server = new index_js_1.Server({
            name: 'quickmcp-integrated-server',
            version: '1.0.0'
        });
        this.app = (0, express_1.default)();
        this.setupHandlers();
        this.setupWebRoutes();
    }
    setupHandlers() {
        // List tools - dynamically from SQLite
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            try {
                const tools = await this.executor.getAllTools();
                console.error(`📋 Listed ${tools.length} dynamic tools`);
                return { tools };
            }
            catch (error) {
                console.error('❌ Error listing tools:', error);
                return { tools: [] };
            }
        });
        // List resources - dynamically from SQLite
        this.server.setRequestHandler(types_js_1.ListResourcesRequestSchema, async () => {
            try {
                const resources = await this.executor.getAllResources();
                //console.log(`📂 Listed ${resources.length} dynamic resources`);
                return { resources };
            }
            catch (error) {
                console.error('❌ Error listing resources:', error);
                return { resources: [] };
            }
        });
        // Execute tool - dynamically via database
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            try {
                const { name, arguments: args } = request.params;
                //console.log(`🔧 Executing dynamic tool: ${name}`);
                const result = await this.executor.executeTool(name, args || {});
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                };
            }
            catch (error) {
                console.error(`❌ Error executing tool ${request.params.name}:`, error);
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Failed to execute tool: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        // Read resource - dynamically via database
        this.server.setRequestHandler(types_js_1.ReadResourceRequestSchema, async (request) => {
            try {
                const { uri } = request.params;
                //console.log(`📖 Reading dynamic resource: ${uri}`);
                // Extract resource name from URI (e.g., "serverId__resourceName://list" -> "serverId__resourceName")
                const resourceName = uri.split('://')[0];
                const result = await this.executor.readResource(resourceName);
                return result;
            }
            catch (error) {
                console.error(`❌ Error reading resource ${request.params.uri}:`, error);
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
        // Prompts - return empty for now
        this.server.setRequestHandler(types_js_1.ListPromptsRequestSchema, async () => {
            return { prompts: [] };
        });
        this.server.setRequestHandler(types_js_1.GetPromptRequestSchema, async (request) => {
            throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Prompt not found: ${request.params.name}`);
        });
    }
    setupWebRoutes() {
        this.app.use(express_1.default.json({ limit: '50mb' }));
        this.app.use(express_1.default.raw({ type: '*/*', limit: '50mb' }));
        // Health check
        this.app.get('/health', (req, res) => {
            const stats = this.executor.getStats();
            res.json({
                status: 'healthy',
                ...stats,
                timestamp: new Date().toISOString()
            });
        });
        // MCP STDIO endpoint for bridge
        this.app.post('/api/mcp-stdio', express_1.default.raw({ type: '*/*' }), async (req, res) => {
            try {
                let messageData;
                if (Buffer.isBuffer(req.body)) {
                    messageData = JSON.parse(req.body.toString());
                }
                else if (typeof req.body === 'string') {
                    messageData = JSON.parse(req.body);
                }
                else {
                    messageData = req.body;
                }
                //console.log('🔄 Processing MCP message:', messageData.method || 'unknown');
                let response = null;
                switch (messageData.method) {
                    case 'initialize':
                        response = {
                            jsonrpc: '2.0',
                            id: messageData.id,
                            result: {
                                protocolVersion: '2024-11-05',
                                serverInfo: {
                                    name: 'quickmcp-integrated',
                                    version: '1.0.0'
                                },
                                capabilities: {
                                    tools: {},
                                    resources: {},
                                    prompts: {}
                                }
                            }
                        };
                        break;
                    case 'tools/list':
                        const tools = await this.executor.getAllTools();
                        response = {
                            jsonrpc: '2.0',
                            id: messageData.id,
                            result: { tools }
                        };
                        break;
                    case 'resources/list':
                        const resources = await this.executor.getAllResources();
                        response = {
                            jsonrpc: '2.0',
                            id: messageData.id,
                            result: { resources }
                        };
                        break;
                    case 'tools/call':
                        const toolResult = await this.executor.executeTool(messageData.params.name, messageData.params.arguments || {});
                        response = {
                            jsonrpc: '2.0',
                            id: messageData.id,
                            result: {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify(toolResult, null, 2)
                                    }
                                ]
                            }
                        };
                        break;
                    case 'resources/read':
                        const uri = messageData.params.uri;
                        const resourceName = uri.split('://')[0];
                        const resourceResult = await this.executor.readResource(resourceName);
                        response = {
                            jsonrpc: '2.0',
                            id: messageData.id,
                            result: resourceResult
                        };
                        break;
                    case 'notifications/initialized':
                        // No response for notifications
                        //console.log('🔔 MCP client initialized');
                        break;
                    default:
                        if (messageData.id) {
                            response = {
                                jsonrpc: '2.0',
                                id: messageData.id,
                                error: {
                                    code: -32601,
                                    message: `Method not found: ${messageData.method}`
                                }
                            };
                        }
                }
                if (response) {
                    res.json(response);
                }
                else {
                    res.status(204).end();
                }
            }
            catch (error) {
                console.error('❌ Error processing MCP message:', error);
                res.status(500).json({
                    jsonrpc: '2.0',
                    id: req.body?.id,
                    error: {
                        code: -32603,
                        message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
                    }
                });
            }
        });
        // Stats endpoint
        this.app.get('/api/stats', (req, res) => {
            res.json(this.executor.getStats());
        });
    }
    async start(port = 3001) {
        // Start HTTP server
        const httpServer = this.app.listen(port, () => {
            //console.log(`🚀 QuickMCP Integrated Server running on http://localhost:${port}`);
            const stats = this.executor.getStats();
            //console.log(`📊 Managing ${stats.servers} virtual servers with ${stats.tools} tools and ${stats.resources} resources`);
        });
        // Setup SSE transport for MCP - skip for now due to compatibility issues
        // const transport = new SSEServerTransport('/sse', httpServer);
        // await this.server.connect(transport);
        //console.log('✅ MCP server connected with dynamic SQLite-based execution (HTTP endpoints active)');
        // Graceful shutdown
        process.on('SIGINT', async () => {
            //console.log('\n🔄 Shutting down QuickMCP Integrated Server...');
            await this.cleanup();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            //console.log('\n🔄 Shutting down QuickMCP Integrated Server...');
            await this.cleanup();
            process.exit(0);
        });
    }
    async cleanup() {
        try {
            await this.server.close();
            await this.executor.close();
            //console.log('✅ Cleanup completed');
        }
        catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }
}
exports.IntegratedMCPServer = IntegratedMCPServer;
//# sourceMappingURL=integrated-mcp-server-new.js.map
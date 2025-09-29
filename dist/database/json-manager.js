"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class JSONManager {
    constructor() {
        // Create database directory if it doesn't exist
        const dbDir = path_1.default.join(process.cwd(), 'data');
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        this.dbPath = path_1.default.join(dbDir, 'quickmcp.json');
        this.loadData();
        console.error('✅ JSON database initialized:', this.dbPath);
    }
    loadData() {
        if (fs_1.default.existsSync(this.dbPath)) {
            try {
                const jsonData = fs_1.default.readFileSync(this.dbPath, 'utf8');
                this.data = JSON.parse(jsonData);
            }
            catch (error) {
                console.error('❌ Error loading JSON database:', error);
                this.initializeEmptyData();
            }
        }
        else {
            this.initializeEmptyData();
        }
    }
    initializeEmptyData() {
        this.data = {
            servers: [],
            tools: [],
            resources: []
        };
        this.saveData();
    }
    saveData() {
        try {
            fs_1.default.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
        }
        catch (error) {
            console.error('❌ Error saving JSON database:', error);
            throw error;
        }
    }
    // Server operations
    saveServer(server) {
        const existingIndex = this.data.servers.findIndex(s => s.id === server.id);
        if (existingIndex >= 0) {
            this.data.servers[existingIndex] = server;
        }
        else {
            this.data.servers.push(server);
        }
        this.saveData();
    }
    getServer(serverId) {
        return this.data.servers.find(s => s.id === serverId) || null;
    }
    getAllServers() {
        return [...this.data.servers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    deleteServer(serverId) {
        this.data.servers = this.data.servers.filter(s => s.id !== serverId);
        this.data.tools = this.data.tools.filter(t => t.server_id !== serverId);
        this.data.resources = this.data.resources.filter(r => r.server_id !== serverId);
        this.saveData();
    }
    // Tool operations
    saveTools(tools) {
        for (const tool of tools) {
            const existingIndex = this.data.tools.findIndex(t => t.server_id === tool.server_id && t.name === tool.name);
            if (existingIndex >= 0) {
                this.data.tools[existingIndex] = tool;
            }
            else {
                this.data.tools.push(tool);
            }
        }
        this.saveData();
    }
    getToolsForServer(serverId) {
        return this.data.tools.filter(t => t.server_id === serverId);
    }
    getAllTools() {
        return [...this.data.tools];
    }
    // Resource operations
    saveResources(resources) {
        for (const resource of resources) {
            const existingIndex = this.data.resources.findIndex(r => r.server_id === resource.server_id && r.name === resource.name);
            if (existingIndex >= 0) {
                this.data.resources[existingIndex] = resource;
            }
            else {
                this.data.resources.push(resource);
            }
        }
        this.saveData();
    }
    getResourcesForServer(serverId) {
        return this.data.resources.filter(r => r.server_id === serverId);
    }
    getAllResources() {
        return [...this.data.resources];
    }
    // Cleanup
    close() {
        // JSON manager doesn't need cleanup
        console.error('📁 JSON manager closed');
    }
    // Statistics
    getStats() {
        return {
            servers: this.data.servers.length,
            tools: this.data.tools.length,
            resources: this.data.resources.length
        };
    }
}
exports.JSONManager = JSONManager;
//# sourceMappingURL=json-manager.js.map
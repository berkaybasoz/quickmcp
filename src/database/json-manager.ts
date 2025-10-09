import fs from 'fs';
import path from 'path';

export interface ServerConfig {
  id: string;
  name: string;
  dbConfig: {
    type: 'mssql' | 'mysql' | 'postgresql';
    server: string;
    port: number;
    database: string;
    username: string;
    password: string;
    encrypt?: boolean;
    trustServerCertificate?: boolean;
  };
  createdAt: string;
}

export interface ToolDefinition {
  server_id: string;
  name: string;
  description: string;
  inputSchema: any;
  sqlQuery: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
}

export interface ResourceDefinition {
  server_id: string;
  name: string;
  description: string;
  uri_template: string;
  sqlQuery: string;
}

interface DatabaseData {
  servers: ServerConfig[];
  tools: ToolDefinition[];
  resources: ResourceDefinition[];
}

export class JSONManager {
  private dbPath: string;
  private data: DatabaseData;

  constructor() {
    // Create database directory if it doesn't exist
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.dbPath = path.join(dbDir, 'quickmcp.json');
    this.loadData();
    //console.log('✅ JSON database initialized:', this.dbPath);
  }

  private loadData(): void {
    if (fs.existsSync(this.dbPath)) {
      try {
        const jsonData = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(jsonData);
      } catch (error) {
        console.error('❌ Error loading JSON database:', error);
        this.initializeEmptyData();
      }
    } else {
      this.initializeEmptyData();
    }
  }

  private initializeEmptyData(): void {
    this.data = {
      servers: [],
      tools: [],
      resources: []
    };
    this.saveData();
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('❌ Error saving JSON database:', error);
      throw error;
    }
  }

  // Server operations
  saveServer(server: ServerConfig): void {
    const existingIndex = this.data.servers.findIndex(s => s.id === server.id);

    if (existingIndex >= 0) {
      this.data.servers[existingIndex] = server;
    } else {
      this.data.servers.push(server);
    }

    this.saveData();
  }

  getServer(serverId: string): ServerConfig | null {
    return this.data.servers.find(s => s.id === serverId) || null;
  }

  getAllServers(): ServerConfig[] {
    return [...this.data.servers].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  deleteServer(serverId: string): void {
    this.data.servers = this.data.servers.filter(s => s.id !== serverId);
    this.data.tools = this.data.tools.filter(t => t.server_id !== serverId);
    this.data.resources = this.data.resources.filter(r => r.server_id !== serverId);
    this.saveData();
  }

  // Tool operations
  saveTools(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      const existingIndex = this.data.tools.findIndex(
        t => t.server_id === tool.server_id && t.name === tool.name
      );

      if (existingIndex >= 0) {
        this.data.tools[existingIndex] = tool;
      } else {
        this.data.tools.push(tool);
      }
    }

    this.saveData();
  }

  getToolsForServer(serverId: string): ToolDefinition[] {
    return this.data.tools.filter(t => t.server_id === serverId);
  }

  getAllTools(): ToolDefinition[] {
    return [...this.data.tools];
  }

  // Resource operations
  saveResources(resources: ResourceDefinition[]): void {
    for (const resource of resources) {
      const existingIndex = this.data.resources.findIndex(
        r => r.server_id === resource.server_id && r.name === resource.name
      );

      if (existingIndex >= 0) {
        this.data.resources[existingIndex] = resource;
      } else {
        this.data.resources.push(resource);
      }
    }

    this.saveData();
  }

  getResourcesForServer(serverId: string): ResourceDefinition[] {
    return this.data.resources.filter(r => r.server_id === serverId);
  }

  getAllResources(): ResourceDefinition[] {
    return [...this.data.resources];
  }

  // Cleanup
  close(): void {
    // JSON manager doesn't need cleanup
    //console.log('📁 JSON manager closed');
  }

  // Statistics
  getStats(): { servers: number; tools: number; resources: number } {
    return {
      servers: this.data.servers.length,
      tools: this.data.tools.length,
      resources: this.data.resources.length
    };
  }
}
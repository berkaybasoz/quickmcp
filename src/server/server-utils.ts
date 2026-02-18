import { IDataStore, ToolDefinition } from '../database/datastore';

export class ServerUtils {
  constructor(private readonly dataStore: IDataStore) {}

  async getAllTools(): Promise<any[]> {
    const tools = await this.dataStore.getAllTools();
    return tools.map((tool) => ({
      name: `${tool.server_id}__${tool.name}`,
      description: `[${tool.server_id}] ${tool.description}`,
      inputSchema: typeof tool.inputSchema === 'string' ? JSON.parse(tool.inputSchema) : tool.inputSchema
    }));
  }

  async getAllResources(): Promise<any[]> {
    const resources = await this.dataStore.getAllResources();
    return resources.map((resource) => ({
      name: `${resource.server_id}__${resource.name}`,
      description: `[${resource.server_id}] ${resource.description}`,
      uri: resource.uri_template
    }));
  }

  async parseQualifiedName(name: string, kind: 'tool' | 'resource'): Promise<[string, string]> {
    const allServerIds = (await this.dataStore.getAllServers()).map((s) => s.id);
    const matchingServerIds = allServerIds
      .filter((serverId) => name.startsWith(`${serverId}__`))
      .sort((a, b) => b.length - a.length);

    if (matchingServerIds.length > 0) {
      const serverId = matchingServerIds[0];
      const itemName = name.slice(serverId.length + 2);
      if (itemName.length === 0) {
        throw new Error(`Invalid ${kind} name format: ${name}`);
      }
      return [serverId, itemName];
    }

    // Backward-compatible fallback: "<serverId>__<name>"
    const sepIndex = name.indexOf('__');
    if (sepIndex <= 0 || sepIndex >= name.length - 2) {
      throw new Error(`Invalid ${kind} name format: ${name}`);
    }
    return [name.slice(0, sepIndex), name.slice(sepIndex + 2)];
  }

  async parseToolName(toolName: string): Promise<[string, string]> {
    return this.parseQualifiedName(toolName, 'tool');
  }

  async getTool(serverId: string, toolName: string): Promise<ToolDefinition> {
    const tools = await this.dataStore.getToolsForServer(serverId);
    const tool = tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${serverId}__${toolName}`);
    }
    return tool;
  }

  async getServerConfig(serverId: string): Promise<any> {
    const serverConfig = await this.dataStore.getServer(serverId);
    if (!serverConfig) {
      throw new Error(`Server not found: ${serverId}`);
    }
    return serverConfig;
  }

  parseQueryConfig(sqlQuery: string): any {
    try {
      return JSON.parse(sqlQuery);
    } catch {
      return null;
    }
  }
}

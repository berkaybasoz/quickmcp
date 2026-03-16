import { IDataStore, ToolDefinition } from '../database/datastore';

export class ServerUtils {
  constructor(private readonly dataStore: IDataStore) {}

  async getAllTools(): Promise<any[]> {
    const tools = await this.dataStore.getAllTools();
    return tools.map((tool) => ({
      name: `${tool.server_id}__${tool.name}`,
      description: `[${tool.server_id}] ${tool.description}`,
      inputSchema: this.normalizeToolInputSchema(tool.inputSchema)
    }));
  }

  private normalizeToolInputSchema(raw: any): any {
    let schema = raw;
    if (typeof schema === 'string') {
      try {
        schema = JSON.parse(schema);
      } catch {
        schema = {};
      }
    }

    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      schema = { type: 'object', properties: {}, required: [] };
    }

    const sanitizeNode = (node: any): any => {
      if (!node || typeof node !== 'object' || Array.isArray(node)) return {};

      const out: any = { ...node };

      if (out.type === 'array') {
        out.items = sanitizeNode(out.items || {});
      }

      if (out.properties && typeof out.properties === 'object' && !Array.isArray(out.properties)) {
        const nextProps: Record<string, any> = {};
        for (const [key, value] of Object.entries(out.properties)) {
          nextProps[key] = sanitizeNode(value);
        }
        out.properties = nextProps;
      }

      if (Array.isArray(out.oneOf)) out.oneOf = out.oneOf.map((v: any) => sanitizeNode(v));
      if (Array.isArray(out.anyOf)) out.anyOf = out.anyOf.map((v: any) => sanitizeNode(v));
      if (Array.isArray(out.allOf)) out.allOf = out.allOf.map((v: any) => sanitizeNode(v));

      if (out.additionalProperties && typeof out.additionalProperties === 'object') {
        out.additionalProperties = sanitizeNode(out.additionalProperties);
      }

      return out;
    };

    const normalized = sanitizeNode(schema);
    if (String(normalized.type || '').toLowerCase() !== 'object') normalized.type = 'object';
    if (!normalized.properties || typeof normalized.properties !== 'object' || Array.isArray(normalized.properties)) {
      normalized.properties = {};
    }
    if (!Array.isArray(normalized.required)) normalized.required = [];
    return normalized;
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

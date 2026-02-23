import crypto from 'crypto';
import {
  getMcpTokenRecord,
  isMcpAuthorizedGlobally,
  parseServerOwner,
  McpIdentity,
  McpTokenAuthRecord
} from '../auth/auth-utils';
import { verifyMcpToken } from '../auth/token-utils';
import { AuthMode } from '../config/auth-config';
import { IDataStore } from '../database/datastore';
import { DynamicMCPExecutor } from '../server/dynamic-mcp-executor';

export type JsonRpcMessage = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: any;
};

export type McpAuthContext = {
  identity: McpIdentity | null;
  tokenRecord: McpTokenAuthRecord | null;
};

export type AuthTokenSources = {
  authorization?: string;
  xMcpToken?: string;
  queryToken?: string;
  bodyToken?: string;
};

type McpCoreServiceDeps = {
  executor: DynamicMCPExecutor;
  authStore: IDataStore;
  authMode: AuthMode;
  tokenSecret: string;
  defaultToken?: string;
};

export class McpCoreService {
  private readonly executor: DynamicMCPExecutor;
  private readonly authStore: IDataStore;
  private readonly authMode: AuthMode;
  private readonly tokenSecret: string;
  private readonly defaultAuthContext: McpAuthContext;

  constructor(deps: McpCoreServiceDeps) {
    this.executor = deps.executor;
    this.authStore = deps.authStore;
    this.authMode = deps.authMode;
    this.tokenSecret = deps.tokenSecret;
    this.defaultAuthContext = this.resolveAuthContextFromToken(deps.defaultToken || '');
  }

  parseIncomingMessage(body: any): JsonRpcMessage {
    if (Buffer.isBuffer(body)) return JSON.parse(body.toString());
    if (typeof body === 'string') return JSON.parse(body);
    if (body && typeof body === 'object') return body;
    throw new Error('Invalid JSON-RPC payload');
  }

  resolveAuthContextFromSources(sources: AuthTokenSources): McpAuthContext {
    if (this.authMode === 'NONE') {
      return { identity: null, tokenRecord: null };
    }

    const bearer = String(sources.authorization || '').startsWith('Bearer ')
      ? String(sources.authorization).slice(7).trim()
      : '';
    const token = bearer
      || String(sources.xMcpToken || '').trim()
      || String(sources.queryToken || '').trim()
      || String(sources.bodyToken || '').trim();

    if (!token) return this.defaultAuthContext;
    return this.resolveAuthContextFromToken(token);
  }

  async processJsonRpcMessage(messageData: JsonRpcMessage, authContext: McpAuthContext): Promise<any | null> {
    switch (messageData.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: messageData.id,
          result: {
            protocolVersion: '2025-11-25',
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

      case 'tools/list': {
        const tools = await this.getAuthorizedTools(await this.executor.getAllTools(), authContext);
        return { jsonrpc: '2.0', id: messageData.id, result: { tools } };
      }

      case 'resources/list': {
        const resources = await this.getAuthorizedResources(await this.executor.getAllResources(), authContext);
        return { jsonrpc: '2.0', id: messageData.id, result: { resources } };
      }

      case 'prompts/list':
        return { jsonrpc: '2.0', id: messageData.id, result: { prompts: [] } };

      case 'tools/call': {
        const toolName = String(messageData.params?.name || '');
        await this.ensureToolAllowed(toolName, authContext);
        const toolResult = await this.executor.executeTool(toolName, messageData.params?.arguments || {});
        return {
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
      }

      case 'resources/read': {
        const uri = String(messageData.params?.uri || '');
        const resourceName = uri.split('://')[0];
        await this.ensureResourceAllowed(resourceName, authContext);
        const resourceResult = await this.executor.readResource(resourceName);
        return { jsonrpc: '2.0', id: messageData.id, result: resourceResult };
      }

      case 'notifications/initialized':
        return null;

      default:
        if (!messageData.id) return null;
        return {
          jsonrpc: '2.0',
          id: messageData.id,
          error: {
            code: -32601,
            message: `Method not found: ${String(messageData.method || '')}`
          }
        };
    }
  }

  private resolveAuthContextFromToken(rawToken: string): McpAuthContext {
    if (this.authMode === 'NONE') {
      return { identity: null, tokenRecord: null };
    }

    const token = String(rawToken || '').trim();
    if (!token) {
      return { identity: null, tokenRecord: null };
    }

    const verified = verifyMcpToken(token, this.tokenSecret);
    if (!verified) {
      throw new Error('Invalid MCP token');
    }

    const identity: McpIdentity = {
      tokenId: verified.jti ? String(verified.jti) : '',
      username: String(verified.sub),
      workspace: String(verified.ws || verified.workspace || verified.sub),
      role: String(verified.role || 'user')
    };

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenRecord = getMcpTokenRecord(this.authStore, this.authMode, tokenHash);

    return { identity, tokenRecord };
  }

  private parseQualifiedName(name: string): [string, string] {
    const sepIndex = name.indexOf('__');
    if (sepIndex <= 0 || sepIndex >= name.length - 2) {
      throw new Error(`Invalid qualified name format: ${name}`);
    }
    return [name.slice(0, sepIndex), name.slice(sepIndex + 2)];
  }

  private async getAuthorizedTools(tools: any[], authContext: McpAuthContext): Promise<any[]> {
    if (this.authMode === 'NONE') return tools;
    const out: any[] = [];
    for (const tool of tools) {
      try {
        const [serverId, toolName] = this.parseQualifiedName(String(tool.name || ''));
        if (await this.isToolAuthorizedAsync(authContext, serverId, toolName)) {
          out.push(tool);
        }
      } catch {
        // ignore invalid names
      }
    }
    return out;
  }

  private async getAuthorizedResources(resources: any[], authContext: McpAuthContext): Promise<any[]> {
    if (this.authMode === 'NONE') return resources;
    const out: any[] = [];
    for (const resource of resources) {
      try {
        const [serverId, resourceName] = this.parseQualifiedName(String(resource.name || ''));
        if (await this.isResourceAuthorizedAsync(authContext, serverId, resourceName)) {
          out.push(resource);
        }
      } catch {
        // ignore invalid names
      }
    }
    return out;
  }

  private async ensureToolAllowed(qualifiedToolName: string, authContext: McpAuthContext): Promise<void> {
    if (this.authMode === 'NONE') return;
    const [serverId, toolName] = this.parseQualifiedName(qualifiedToolName);
    const allowed = await this.isToolAuthorizedAsync(authContext, serverId, toolName);
    if (!allowed) {
      throw new Error('Unauthorized: tool is not allowed by token policy');
    }
  }

  private async ensureResourceAllowed(qualifiedResourceName: string, authContext: McpAuthContext): Promise<void> {
    if (this.authMode === 'NONE') return;
    const [serverId, resourceName] = this.parseQualifiedName(qualifiedResourceName);
    const allowed = await this.isResourceAuthorizedAsync(authContext, serverId, resourceName);
    if (!allowed) {
      throw new Error('Unauthorized: resource is not allowed by token policy');
    }
  }

  private async getServerRequireMcpToken(serverId: string): Promise<boolean> {
    if (this.authMode === 'NONE') return false;
    let requireToken = true;
    const owner = parseServerOwner(serverId);
    try {
      if (typeof this.authStore.getMcpTokenPolicy === 'function') {
        const globalCfg = await this.authStore.getMcpTokenPolicy('global', '*');
        if (globalCfg) requireToken = globalCfg.requireMcpToken !== false;

        if (owner) {
          const userCfg = await this.authStore.getMcpTokenPolicy('user', owner);
          if (userCfg) requireToken = userCfg.requireMcpToken !== false;
        }

        const serverCfg = await this.authStore.getMcpTokenPolicy('server', serverId);
        if (serverCfg) return serverCfg.requireMcpToken !== false;
      }

      if (typeof this.authStore.getServerAuthConfig === 'function') {
        const legacyCfg = await this.authStore.getServerAuthConfig(serverId);
        if (legacyCfg) return legacyCfg.requireMcpToken !== false;
      }
    } catch {}
    return requireToken;
  }

  private isServerOwnedByIdentity(authContext: McpAuthContext, serverId: string): boolean {
    if (this.authMode === 'NONE') return true;
    if (!authContext.identity || !authContext.tokenRecord) return false;
    const owner = parseServerOwner(serverId);
    return owner === authContext.identity.workspace || owner === authContext.identity.username;
  }

  private async isServerAuthorizedAsync(authContext: McpAuthContext, serverId: string): Promise<boolean> {
    if (this.authMode === 'NONE') return true;
    const requireToken = await this.getServerRequireMcpToken(serverId);
    if (!requireToken) return true;

    if (!isMcpAuthorizedGlobally(this.authMode, authContext.identity, authContext.tokenRecord)) return false;
    if (!this.isServerOwnedByIdentity(authContext, serverId)) return false;

    const tokenRecord = authContext.tokenRecord;
    if (tokenRecord?.serverRules && Object.prototype.hasOwnProperty.call(tokenRecord.serverRules, serverId)) {
      const decision = tokenRecord.serverRules[serverId];
      if (decision === false) return false;
      if (decision === true) return true;
    }

    if (tokenRecord && !tokenRecord.allowAllServers) {
      return tokenRecord.serverIds.includes(serverId);
    }
    return true;
  }

  private async isToolAuthorizedAsync(authContext: McpAuthContext, serverId: string, toolName: string): Promise<boolean> {
    if (this.authMode === 'NONE') return true;

    let requireToken = await this.getServerRequireMcpToken(serverId);
    try {
      const toolCfg = await this.authStore.getMcpTokenPolicy('tool', `${serverId}__${toolName}`);
      if (toolCfg) requireToken = toolCfg.requireMcpToken !== false;
    } catch {}

    if (!requireToken) return true;
    if (!isMcpAuthorizedGlobally(this.authMode, authContext.identity, authContext.tokenRecord)) return false;
    if (!this.isServerOwnedByIdentity(authContext, serverId)) return false;

    const tokenRecord = authContext.tokenRecord;
    const full = `${serverId}__${toolName}`;
    if (!tokenRecord) return false;

    if (tokenRecord.toolRules && Object.prototype.hasOwnProperty.call(tokenRecord.toolRules, full)) {
      const decision = tokenRecord.toolRules[full];
      if (decision === false) return false;
      if (decision === true) return true;
    }

    if (!tokenRecord.allowAllTools) {
      return tokenRecord.allowedTools.includes(full);
    }
    return true;
  }

  private async isResourceAuthorizedAsync(authContext: McpAuthContext, serverId: string, resourceName: string): Promise<boolean> {
    if (this.authMode === 'NONE') return true;
    if (!await this.isServerAuthorizedAsync(authContext, serverId)) return false;

    const tokenRecord = authContext.tokenRecord;
    if (!tokenRecord) return false;
    const full = `${serverId}__${resourceName}`;

    if (tokenRecord.resourceRules && Object.prototype.hasOwnProperty.call(tokenRecord.resourceRules, full)) {
      const decision = tokenRecord.resourceRules[full];
      if (decision === false) return false;
      if (decision === true) return true;
    }

    if (!tokenRecord.allowAllResources) {
      return tokenRecord.allowedResources.includes(full);
    }
    return true;
  }
}

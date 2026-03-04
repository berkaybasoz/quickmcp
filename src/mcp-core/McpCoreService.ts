import crypto from 'crypto';
import {
  isMcpAuthorizedGlobally,
  parseServerOwner,
  McpIdentity,
  McpTokenAuthRecord
} from '../auth/auth-utils';
import { verifyMcpToken, verifyMcpTokenRS256 } from '../auth/token-utils';
import { AuthMode } from '../config/auth-config';
import { IDataStore, McpTokenRecord } from '../database/datastore';
import { DynamicMCPExecutor } from '../server/dynamic-mcp-executor';
import { logger } from '../utils/logger';

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
  deployMode?: string;
  tokenSecret: string;
  defaultToken?: string;
  rsaPublicKey?: crypto.KeyObject;
};

const AUTH_RETRY_PROBE_TOOL_NAME = 'quickmcp__auth_retry_probe';

export class McpCoreService {
  private readonly executor: DynamicMCPExecutor;
  private readonly authStore: IDataStore;
  private readonly authMode: AuthMode;
  private readonly deployMode: string;
  private readonly tokenSecret: string;
  private readonly defaultToken: string;
  private readonly rsaPublicKey: crypto.KeyObject | undefined;

  constructor(deps: McpCoreServiceDeps) {
    this.executor = deps.executor;
    this.authStore = deps.authStore;
    this.authMode = deps.authMode;
    this.deployMode = String(deps.deployMode || '').trim().toUpperCase();
    this.tokenSecret = deps.tokenSecret;
    this.defaultToken = (deps.defaultToken || '').trim();
    this.rsaPublicKey = deps.rsaPublicKey;
  }

  private isSaasMode(): boolean {
    return this.deployMode === 'SAAS';
  }

  parseIncomingMessage(body: any): JsonRpcMessage {
    if (Buffer.isBuffer(body)) return JSON.parse(body.toString());
    if (typeof body === 'string') return JSON.parse(body);
    if (body && typeof body === 'object') return body;
    throw new Error('Invalid JSON-RPC payload');
  }

  async resolveAuthContextFromSources(sources: AuthTokenSources): Promise<McpAuthContext> {
    if (this.authMode === 'NONE') {
      return { identity: null, tokenRecord: null };
    }

    const authHeader = String(sources.authorization || '').trim();
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const bearer = bearerMatch ? String(bearerMatch[1] || '').trim() : '';
    const xMcpToken = String(sources.xMcpToken || '').trim();
    const queryToken = String(sources.queryToken || '').trim();
    const bodyToken = String(sources.bodyToken || '').trim();
    const token = bearer || xMcpToken || queryToken || bodyToken;

    if (!token) {
      logger.info(
        `[MCP] auth carriers authHeader=${authHeader ? '1' : '0'} bearer=${bearer ? '1' : '0'} x-mcp-token=${xMcpToken ? '1' : '0'} query=${queryToken ? '1' : '0'} body=${bodyToken ? '1' : '0'}`
      );
      if (this.defaultToken) {
        logger.info(`[MCP] auth: no token in request, using default token`);
        return this.resolveAuthContextFromToken(this.defaultToken);
      }
      logger.info('[MCP] auth: no token in request, no default token → unauthenticated');
      return { identity: null, tokenRecord: null };
    }
    return this.resolveAuthContextFromToken(token);
  }

  private describeIdentity(authContext: McpAuthContext): string {
    if (this.authMode === 'NONE') return 'anonymous (auth=NONE)';
    if (authContext.identity) return `user=${authContext.identity.username} workspace=${authContext.identity.workspace} role=${authContext.identity.role}`;
    return 'unauthenticated (no valid token)';
  }

  async processJsonRpcMessage(messageData: JsonRpcMessage, authContext: McpAuthContext): Promise<any | null> {
    const method = String(messageData.method || '');
    const who = this.describeIdentity(authContext);
    logger.info(`[MCP] request method=${method} ${who}`);

    switch (messageData.method) {
      case 'initialize': {
        const protocolVersion = String(messageData.params?.protocolVersion || '2025-11-25');
        return {
          jsonrpc: '2.0',
          id: messageData.id,
          result: {
            protocolVersion,
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
      }

      case 'tools/list': {
        const allTools = await this.executor.getAllTools();
        const tools = await this.getAuthorizedTools(allTools, authContext);
        const toolsWithSecuritySchemes = await this.withToolSecuritySchemes(tools);
        const toolsWithProbe = this.withAuthRetryProbeTool(toolsWithSecuritySchemes);
        if (tools.length === 0 && allTools.length > 0) {
          logger.info(`[MCP] tools/list ${who} → 0/${allTools.length} tools (authorization filtered all tools)`);
        } else {
          const toolNames = tools.map((t: any) => String(t.name || '')).join(', ') || '(none)';
          logger.info(`[MCP] tools/list ${who} → ${tools.length}/${allTools.length} tools: [${toolNames}]`);
        }
        return { jsonrpc: '2.0', id: messageData.id, result: { tools: toolsWithProbe } };
      }

      case 'resources/list': {
        const allResources = await this.executor.getAllResources();
        const resources = await this.getAuthorizedResources(allResources, authContext);
        logger.info(`[MCP] resources/list ${who} → ${resources.length}/${allResources.length} resources`);
        return { jsonrpc: '2.0', id: messageData.id, result: { resources } };
      }

      case 'prompts/list':
        return { jsonrpc: '2.0', id: messageData.id, result: { prompts: [] } };

      case 'tools/call': {
        const toolName = String(messageData.params?.name || '');
        logger.info(`[MCP] tools/call tool=${toolName} ${who}`);
        if (this.isSaasMode() && toolName === AUTH_RETRY_PROBE_TOOL_NAME) {
          if (!authContext.identity) {
            logger.info(`[MCP] auth-retry-probe invoked without token; forcing insufficient_scope challenge`);
            throw new Error('insufficient_scope: auth retry probe');
          }
          logger.info(
            `[MCP] auth-retry-probe success authHeaderPresent=1 user=${authContext.identity.username} workspace=${authContext.identity.workspace}`
          );
          return {
            jsonrpc: '2.0',
            id: messageData.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    ok: true,
                    message: 'Auth retry probe passed. Client retried with token.',
                    username: authContext.identity.username,
                    workspace: authContext.identity.workspace
                  }, null, 2)
                }
              ]
            }
          };
        }
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

  private async resolveAuthContextFromToken(rawToken: string): Promise<McpAuthContext> {
    if (this.authMode === 'NONE') {
      return { identity: null, tokenRecord: null };
    }

    const token = String(rawToken || '').trim();
    if (!token) {
      return { identity: null, tokenRecord: null };
    }

    const verified = (this.rsaPublicKey ? verifyMcpTokenRS256(token, this.rsaPublicKey) : null)
      ?? verifyMcpToken(token, this.tokenSecret);
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
    const row = await this.authStore.getMcpTokenByHash(tokenHash);
    const tokenRecord = this.mapToAuthRecord(row);

    return { identity, tokenRecord };
  }

  private mapToAuthRecord(row: McpTokenRecord | null): McpTokenAuthRecord | null {
    if (!row) return null;
    return {
      id: row.id,
      tokenName: row.tokenName,
      workspaceId: row.workspaceId,
      subjectUsername: row.subjectUsername,
      allowAllServers: row.allowAllServers,
      allowAllTools: row.allowAllTools,
      allowAllResources: row.allowAllResources,
      serverIds: row.serverIds,
      allowedTools: row.allowedTools,
      allowedResources: row.allowedResources,
      serverRules: row.serverRules || {},
      toolRules: row.toolRules || {},
      resourceRules: row.resourceRules || {},
      neverExpires: row.neverExpires,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt
    };
  }

  private parseQualifiedName(name: string): [string, string] {
    // Tool/resource names are "<serverId>__<itemName>" and serverId itself can contain "__".
    // Split by the last separator so owner-scoped server ids keep their full value.
    const sepIndex = name.lastIndexOf('__');
    if (sepIndex <= 0 || sepIndex >= name.length - 2) {
      logger.error(`[MCP] invalid qualified name: ${name}`);
      throw new Error(`Invalid qualified name format: ${name}`);
    }
    return [name.slice(0, sepIndex), name.slice(sepIndex + 2)];
  }

  private async getAuthorizedTools(tools: any[], authContext: McpAuthContext): Promise<any[]> {
    if (this.authMode === 'NONE') return tools;
    if (!authContext.identity) {
      // In multi-tenant SaaS mode, unauthenticated discovery must never expose
      // other tenants' tools. ChatGPT should attach bearer before scoped listing.
      if (this.isSaasMode()) return [];
      return tools;
    }
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

  private async withToolSecuritySchemes(tools: any[]): Promise<any[]> {
    const out: any[] = [];
    for (const tool of tools) {
      const cloned = { ...tool };
      try {
        const [serverId, toolName] = this.parseQualifiedName(String(tool.name || ''));
        const requireToken = await this.getToolRequireMcpToken(serverId, toolName);
        const defaultSchemes = requireToken
          ? [{ type: 'oauth2', scopes: ['mcp'] }]
          : [{ type: 'noauth' }];
        const schemes = Array.isArray((tool as any).securitySchemes) && (tool as any).securitySchemes.length > 0
          ? (tool as any).securitySchemes
          : defaultSchemes;
        cloned.securitySchemes = schemes;
        cloned._meta = { ...((tool as any)._meta || {}), securitySchemes: schemes };
      } catch {
        const schemes = Array.isArray((tool as any).securitySchemes) && (tool as any).securitySchemes.length > 0
          ? (tool as any).securitySchemes
          : [{ type: 'oauth2', scopes: ['mcp'] }];
        cloned.securitySchemes = schemes;
        cloned._meta = { ...((tool as any)._meta || {}), securitySchemes: schemes };
      }
      out.push(cloned);
    }
    return out;
  }

  private withAuthRetryProbeTool(tools: any[]): any[] {
    if (!this.isSaasMode()) return tools;
    if (tools.some((tool) => String(tool?.name || '') === AUTH_RETRY_PROBE_TOOL_NAME)) return tools;
    const schemes = [{ type: 'oauth2', scopes: ['mcp'] }];
    const probeTool = {
      name: AUTH_RETRY_PROBE_TOOL_NAME,
      description: 'Auth retry probe tool. Always returns 401 with WWW-Authenticate to test bearer retry behavior.',
      inputSchema: {
        type: 'object',
        properties: {
          note: {
            type: 'string',
            description: 'Optional note for tracing.'
          }
        },
        additionalProperties: true
      },
      securitySchemes: schemes,
      _meta: { securitySchemes: schemes }
    };
    return [...tools, probeTool];
  }

  private async getAuthorizedResources(resources: any[], authContext: McpAuthContext): Promise<any[]> {
    if (this.authMode === 'NONE') return resources;
    if (!authContext.identity) {
      if (this.isSaasMode()) return [];
      return resources;
    }
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
    // In SAAS mode, MCP calls must always be token-bound to avoid tenant leakage.
    if (this.isSaasMode()) return true;
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
    // SAAS tenant isolation must be workspace-based, not username-based.
    if (this.isSaasMode()) {
      return owner === authContext.identity.workspace;
    }
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

  private async getToolRequireMcpToken(serverId: string, toolName: string): Promise<boolean> {
    if (this.authMode === 'NONE') return false;
    let requireToken = await this.getServerRequireMcpToken(serverId);
    try {
      const toolCfg = await this.authStore.getMcpTokenPolicy('tool', `${serverId}__${toolName}`);
      if (toolCfg) requireToken = toolCfg.requireMcpToken !== false;
    } catch {}
    return requireToken;
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

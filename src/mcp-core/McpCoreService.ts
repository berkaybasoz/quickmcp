import crypto from 'crypto';
import {
  isMcpAuthorizedGlobally,
  parseServerOwner,
  McpIdentity,
  McpTokenAuthRecord,
  resolveLiteAdminUsernames
} from '../auth/auth-utils';
import { hashMcpToken, verifyMcpToken, verifyMcpTokenRS256 } from '../auth/token-utils';
import { Constant } from '../constant/constant';
import { AuthMode } from '../config/auth-config';
import { IDataStore, McpTokenRecord } from '../database/datastore';
import { DynamicMCPExecutor } from '../server/dynamic-mcp-executor';
import { DeploymentUtil } from '../utils/deployment-util';
import { logger } from '../utils/logger';
import {
  QUICKMCP_META_TOOLS,
  QUICKMCP_META_TOOL_NAMES,
  isQuickMcpMetaToolName
} from './quickmcp-meta-tools';

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
  tokenMode?: string;
  tokenSecret: string;
  defaultToken?: string;
  rsaPublicKey?: crypto.KeyObject;
};

const AUTH_RETRY_PROBE_TOOL_NAME = 'quickmcp__auth_retry_probe';

export class McpCoreService {
  private readonly executor: DynamicMCPExecutor;
  private readonly authStore: IDataStore;
  private readonly authMode: AuthMode;
  private readonly deploymentUtil: DeploymentUtil;
  private readonly tokenSecret: string;
  private readonly defaultToken: string;
  private readonly rsaPublicKey: crypto.KeyObject | undefined;
  private readonly liteAdminUsernames: Set<string>;
  private readonly useStaticQuickMcpTools: boolean;

  constructor(deps: McpCoreServiceDeps) {
    this.executor = deps.executor;
    this.authStore = deps.authStore;
    this.authMode = deps.authMode;
    this.deploymentUtil = DeploymentUtil.fromRuntime(deps.deployMode, deps.tokenMode);
    this.tokenSecret = deps.tokenSecret;
    this.defaultToken = (deps.defaultToken || '').trim();
    this.rsaPublicKey = deps.rsaPublicKey;
    this.liteAdminUsernames = resolveLiteAdminUsernames();
    const rawStaticToolsFlag = String(process.env.QUICKMCP_STATIC_META_TOOLS || '').trim().toLowerCase();
    const staticToolsFlagEnabled = rawStaticToolsFlag === '1' || rawStaticToolsFlag === 'true' || rawStaticToolsFlag === 'yes';
    this.useStaticQuickMcpTools = this.deploymentUtil.isSaasMode() || staticToolsFlagEnabled;
  }

  parseIncomingMessage(body: any): JsonRpcMessage {
    if (Buffer.isBuffer(body)) return JSON.parse(body.toString());
    if (typeof body === 'string') return JSON.parse(body);
    if (body && typeof body === 'object') return body;
    throw new Error('Invalid JSON-RPC payload');
  }

  async resolveAuthContextFromSources(sources: AuthTokenSources): Promise<McpAuthContext> {
    if (this.deploymentUtil.authModeIsNone(this.authMode)) {
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
    if (this.deploymentUtil.authModeIsNone(this.authMode)) return 'anonymous (auth=NONE)';
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
        if (this.useStaticQuickMcpTools) {
          logger.info(`[MCP] tools/list ${who} → ${QUICKMCP_META_TOOLS.length}/${QUICKMCP_META_TOOLS.length} tools (static quickmcp meta tools)`);
          return { jsonrpc: '2.0', id: messageData.id, result: { tools: QUICKMCP_META_TOOLS } };
        }
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
        if (this.useStaticQuickMcpTools && isQuickMcpMetaToolName(toolName)) {
          const metaResult = await this.executeQuickMcpMetaTool(
            toolName,
            messageData.params?.arguments || {},
            authContext
          );
          return {
            jsonrpc: '2.0',
            id: messageData.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(metaResult, null, 2)
                }
              ]
            }
          };
        }
        if (this.deploymentUtil.isSaasMode() && toolName === AUTH_RETRY_PROBE_TOOL_NAME) {
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
    if (this.deploymentUtil.authModeIsNone(this.authMode)) {
      return { identity: null, tokenRecord: null };
    }

    const token = String(rawToken || '').trim();
    if (!token) {
      return { identity: null, tokenRecord: null };
    }

    if (this.deploymentUtil.tokenModeIsLocal()) {
      const tokenHash = hashMcpToken(token);
      const row = await this.authStore.getMcpTokenByHash(tokenHash);
      const tokenRecord = this.mapToAuthRecord(row);
      if (!tokenRecord) {
        throw new Error('Invalid MCP token');
      }

      const identity: McpIdentity = {
        tokenId: tokenRecord.id,
        username: tokenRecord.subjectUsername,
        workspace: tokenRecord.workspaceId,
        role: this.liteAdminUsernames.has(String(tokenRecord.subjectUsername || '').trim().toLowerCase())
          ? Constant.Roles.ADMIN
          : Constant.Roles.USER
      };

      return { identity, tokenRecord };
    } else {
      const verified = (this.rsaPublicKey ? verifyMcpTokenRS256(token, this.rsaPublicKey) : null)
        ?? verifyMcpToken(token, this.tokenSecret);
      if (!verified) {
        throw new Error('Invalid MCP token');
      }

      const identity: McpIdentity = {
        tokenId: verified.jti ? String(verified.jti) : '',
        username: String(verified.sub),
        workspace: String(verified.ws || verified.workspace || verified.sub),
        role: String(verified.role || Constant.Roles.USER)
      };

      const tokenHash = hashMcpToken(token);
      const row = await this.authStore.getMcpTokenByHash(tokenHash);
      const tokenRecord = this.mapToAuthRecord(row);

      return { identity, tokenRecord };
    }
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

  private normalizeMetaSessionId(args: any): string {
    const requestedSessionId = String(args?.session?.id || args?.session_id || '').trim();
    const wantsNewSession = args?.session?.generate_id === true || !requestedSessionId;
    return wantsNewSession ? `qms_${crypto.randomUUID()}` : requestedSessionId;
  }

  private async getAuthorizedRuntimeToolsForMeta(authContext: McpAuthContext): Promise<any[]> {
    const allTools = await this.executor.getAllTools();
    const authorized = await this.getAuthorizedTools(allTools, authContext);
    return this.withToolSecuritySchemes(authorized);
  }

  private scoreToolAgainstQueries(tool: any, queries: string[]): number {
    if (queries.length === 0) return 1;
    const haystack = `${String(tool?.name || '')} ${String(tool?.description || '')}`.toLowerCase();
    let score = 0;
    for (const query of queries) {
      const normalized = String(query || '').toLowerCase().trim();
      if (!normalized) continue;
      if (haystack.includes(normalized)) {
        score += 8;
        continue;
      }
      const tokens = normalized.split(/[\s,.:;|/-]+/g).filter(Boolean);
      for (const token of tokens) {
        if (token.length < 2) continue;
        if (haystack.includes(token)) score += 1;
      }
    }
    return score;
  }

  private normalizeMetaToolResult(tool: any): any {
    return {
      tool_slug: String(tool?.name || ''),
      name: String(tool?.name || ''),
      description: String(tool?.description || ''),
      input_schema: tool?.inputSchema || { type: 'object', properties: {}, required: [] }
    };
  }

  private parseSearchQueryText(args: any): string[] {
    const queries = Array.isArray(args?.queries) ? args.queries : [];
    const out: string[] = [];
    for (const item of queries) {
      const useCase = String(item?.use_case || '').trim();
      const knownFields = String(item?.known_fields || '').trim();
      const joined = `${useCase} ${knownFields}`.trim();
      if (joined) out.push(joined);
    }
    return out;
  }

  private async executeQuickMcpMetaTool(
    toolName: string,
    args: any,
    authContext: McpAuthContext
  ): Promise<any> {
    if (!isQuickMcpMetaToolName(toolName)) {
      throw new Error(`Unsupported QuickMCP meta tool: ${toolName}`);
    }

    switch (toolName) {
      case QUICKMCP_META_TOOL_NAMES.SEARCH_TOOLS:
        return this.executeQuickMcpSearchTools(args, authContext);
      case QUICKMCP_META_TOOL_NAMES.GET_TOOL_SCHEMAS:
        return this.executeQuickMcpGetToolSchemas(args, authContext);
      case QUICKMCP_META_TOOL_NAMES.MANAGE_CONNECTIONS:
        return this.executeQuickMcpManageConnections(args);
      case QUICKMCP_META_TOOL_NAMES.MULTI_EXECUTE_TOOL:
        return this.executeQuickMcpMultiExecuteTool(args, authContext);
      case QUICKMCP_META_TOOL_NAMES.FIND_TOOL:
        return this.executeQuickMcpFindTool(args, authContext);
      default:
        throw new Error(`Unknown QuickMCP meta tool: ${toolName}`);
    }
  }

  private async executeQuickMcpSearchTools(args: any, authContext: McpAuthContext): Promise<any> {
    const queries = this.parseSearchQueryText(args);
    const sessionId = this.normalizeMetaSessionId(args);
    const tools = await this.getAuthorizedRuntimeToolsForMeta(authContext);
    const scored = tools
      .map((tool) => ({ tool, score: this.scoreToolAgainstQueries(tool, queries) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);

    const maxCount = Math.max(10, Math.min(100, queries.length * 10 || 20));
    const selected = scored.slice(0, maxCount).map((row) => this.normalizeMetaToolResult(row.tool));

    return {
      session_id: sessionId,
      utc_time: new Date().toISOString(),
      query_count: queries.length,
      tools_count: selected.length,
      tools: selected,
      memory: {},
      plan: [
        'Review returned tools and choose the smallest set needed.',
        'Call QUICKMCP_GET_TOOL_SCHEMAS if you need exact schemas before execution.',
        'Run selected tools with QUICKMCP_MULTI_EXECUTE_TOOL.'
      ]
    };
  }

  private async executeQuickMcpGetToolSchemas(args: any, authContext: McpAuthContext): Promise<any> {
    const requestedSlugs = Array.isArray(args?.tool_slugs)
      ? args.tool_slugs.map((slug: any) => String(slug || '').trim()).filter(Boolean)
      : [];
    const tools = await this.getAuthorizedRuntimeToolsForMeta(authContext);
    const byExact = new Map<string, any>(tools.map((tool) => [String(tool?.name || ''), tool]));
    const byLower = new Map<string, any>(tools.map((tool) => [String(tool?.name || '').toLowerCase(), tool]));

    const schemas: any[] = [];
    const missing: string[] = [];

    for (const slug of requestedSlugs) {
      const found = byExact.get(slug) || byLower.get(slug.toLowerCase());
      if (!found) {
        missing.push(slug);
        continue;
      }
      schemas.push({
        tool_slug: slug,
        name: String(found?.name || ''),
        description: String(found?.description || ''),
        input_schema: found?.inputSchema || { type: 'object', properties: {}, required: [] }
      });
    }

    return {
      session_id: String(args?.session_id || '').trim() || null,
      schemas,
      missing
    };
  }

  private async executeQuickMcpManageConnections(args: any): Promise<any> {
    const toolkits = Array.isArray(args?.toolkits)
      ? args.toolkits.map((toolkit: any) => String(toolkit || '').trim()).filter(Boolean)
      : [];
    const reinitiateAll = args?.reinitiate_all === true;

    return {
      session_id: String(args?.session_id || '').trim() || null,
      reinitiate_all: reinitiateAll,
      connections: toolkits.map((toolkit) => ({
        toolkit,
        status: 'active',
        message: 'QuickMCP executes through workspace-managed integrations; no additional OAuth link required here.'
      }))
    };
  }

  private async executeQuickMcpMultiExecuteTool(args: any, authContext: McpAuthContext): Promise<any> {
    const toolsToRun = Array.isArray(args?.tools) ? args.tools : [];
    if (toolsToRun.length === 0) {
      return {
        session_id: String(args?.session_id || '').trim() || null,
        success_count: 0,
        error_count: 0,
        results: []
      };
    }

    const availableTools = await this.getAuthorizedRuntimeToolsForMeta(authContext);
    const byExact = new Map<string, any>(availableTools.map((tool) => [String(tool?.name || ''), tool]));
    const byLower = new Map<string, any>(availableTools.map((tool) => [String(tool?.name || '').toLowerCase(), tool]));
    const results: any[] = [];

    for (const item of toolsToRun) {
      const requestedSlug = String(item?.tool_slug || '').trim();
      const resolvedTool = byExact.get(requestedSlug) || byLower.get(requestedSlug.toLowerCase());
      if (!requestedSlug || !resolvedTool) {
        results.push({
          tool_slug: requestedSlug,
          success: false,
          error: `Unknown or unauthorized tool_slug: ${requestedSlug}`
        });
        continue;
      }

      const qualifiedName = String(resolvedTool.name || '').trim();
      try {
        await this.ensureToolAllowed(qualifiedName, authContext);
        const output = await this.executor.executeTool(qualifiedName, item?.arguments || {});
        results.push({
          tool_slug: requestedSlug,
          success: true,
          output
        });
      } catch (error) {
        results.push({
          tool_slug: requestedSlug,
          success: false,
          error: error instanceof Error ? error.message : 'Tool execution failed'
        });
      }
    }

    const successCount = results.filter((result) => result.success).length;
    const errorCount = results.length - successCount;
    return {
      session_id: String(args?.session_id || '').trim() || null,
      success_count: successCount,
      error_count: errorCount,
      sync_response_to_workbench: args?.sync_response_to_workbench === true,
      results
    };
  }

  private async executeQuickMcpFindTool(args: any, authContext: McpAuthContext): Promise<any> {
    const query = String(args?.query || '').trim();
    const limit = Number(args?.limit || 5);
    const boundedLimit = Math.max(1, Math.min(20, Number.isFinite(limit) ? limit : 5));
    const includeDetails = args?.include_details === true;
    const tools = await this.getAuthorizedRuntimeToolsForMeta(authContext);
    const scored = tools
      .map((tool) => ({ tool, score: this.scoreToolAgainstQueries(tool, [query]) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, boundedLimit);

    return {
      successful: true,
      total_tools_searched: tools.length,
      query_interpretation: query,
      tools: scored.map((row) => {
        const payload: any = {
          tool_id: String(row.tool?.name || ''),
          name: String(row.tool?.name || ''),
          description: String(row.tool?.description || ''),
          relevance_score: Math.min(100, row.score * 10)
        };
        if (includeDetails) payload.input_schema = row.tool?.inputSchema || {};
        return payload;
      })
    };
  }

  private async getAuthorizedTools(tools: any[], authContext: McpAuthContext): Promise<any[]> {
    if (this.deploymentUtil.authModeIsNone(this.authMode)) return tools;
    if (!authContext.identity) {
      // In multi-tenant SaaS mode, unauthenticated discovery must never expose
      // other tenants' tools. ChatGPT should attach bearer before scoped listing.
      if (this.deploymentUtil.isSaasMode()) return [];
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
    if (!this.deploymentUtil.isSaasMode()) return tools;
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
    if (this.deploymentUtil.authModeIsNone(this.authMode)) return resources;
    if (!authContext.identity) {
      if (this.deploymentUtil.isSaasMode()) return [];
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
    if (this.deploymentUtil.authModeIsNone(this.authMode)) return;
    const [serverId, toolName] = this.parseQualifiedName(qualifiedToolName);
    const allowed = await this.isToolAuthorizedAsync(authContext, serverId, toolName);
    if (!allowed) {
      throw new Error('Unauthorized: tool is not allowed by token policy');
    }
  }

  private async ensureResourceAllowed(qualifiedResourceName: string, authContext: McpAuthContext): Promise<void> {
    if (this.deploymentUtil.authModeIsNone(this.authMode)) return;
    const [serverId, resourceName] = this.parseQualifiedName(qualifiedResourceName);
    const allowed = await this.isResourceAuthorizedAsync(authContext, serverId, resourceName);
    if (!allowed) {
      throw new Error('Unauthorized: resource is not allowed by token policy');
    }
  }

  private async getServerRequireMcpToken(serverId: string): Promise<boolean> {
    if (this.deploymentUtil.authModeIsNone(this.authMode)) return false;
    // In SAAS mode, MCP calls must always be token-bound to avoid tenant leakage.
    if (this.deploymentUtil.isSaasMode()) return true;
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
    if (this.deploymentUtil.authModeIsNone(this.authMode)) return true;
    if (!authContext.identity || !authContext.tokenRecord) return false;
    const owner = parseServerOwner(serverId);
    // SAAS tenant isolation must be workspace-based, not username-based.
    if (this.deploymentUtil.isSaasMode()) {
      return owner === authContext.identity.workspace;
    }
    return owner === authContext.identity.workspace || owner === authContext.identity.username;
  }

  private async isServerAuthorizedAsync(authContext: McpAuthContext, serverId: string): Promise<boolean> {
    if (this.deploymentUtil.authModeIsNone(this.authMode)) return true;
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
    if (this.deploymentUtil.authModeIsNone(this.authMode)) return true;

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
    if (this.deploymentUtil.authModeIsNone(this.authMode)) return false;
    let requireToken = await this.getServerRequireMcpToken(serverId);
    try {
      const toolCfg = await this.authStore.getMcpTokenPolicy('tool', `${serverId}__${toolName}`);
      if (toolCfg) requireToken = toolCfg.requireMcpToken !== false;
    } catch {}
    return requireToken;
  }

  private async isResourceAuthorizedAsync(authContext: McpAuthContext, serverId: string, resourceName: string): Promise<boolean> {
    if (this.deploymentUtil.authModeIsNone(this.authMode)) return true;
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

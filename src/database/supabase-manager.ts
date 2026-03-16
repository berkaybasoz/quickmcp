import {
  IDataStore,
  LogEntry,
  McpTokenCreateInput,
  McpTokenPolicyRecord,
  McpTokenPolicyScope,
  McpTokenRecord,
  QuickAskStateRecord,
  RefreshTokenRecord,
  ResourceDefinition,
  ServerAuthConfig,
  ServerConfig,
  ToolDefinition,
  UserRecord,
  UserRole,
  WorkspaceAiConfig
} from './datastore';

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class SupabaseDataStore implements IDataStore {
  private readonly restBaseUrl: string;
  private readonly apiKey: string;
  private readonly requestTimingLogsEnabled: boolean;
  private readonly requestTimingSlowThresholdMs: number;

  constructor() {
    const rawUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const rawKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

    if (!rawUrl) {
      throw new Error('SUPABASE_URL is required when DATA_PROVIDER=SUPABASE');
    }
    if (!rawKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required when DATA_PROVIDER=SUPABASE');
    }

    this.restBaseUrl = rawUrl.endsWith('/rest/v1') ? rawUrl : `${rawUrl}/rest/v1`;
    this.apiKey = rawKey;
    this.requestTimingLogsEnabled = String(process.env.SUPABASE_LOG_REQUEST_TIMINGS || '1').trim() !== '0';
    const threshold = Number(process.env.SUPABASE_SLOW_REQUEST_MS || '100');
    this.requestTimingSlowThresholdMs = Number.isFinite(threshold) && threshold >= 0 ? threshold : 100;
  }

  private shouldSkipTimingLog(tablePath: string): boolean {
    const normalized = String(tablePath || '').trim().replace(/^\/+/, '').toLowerCase();
    return normalized.startsWith('app_logs');
  }

  private logRequestTiming(
    tablePath: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    status: number,
    durationMs: number,
    outcome: 'ok' | 'error'
  ): void {
    if (!this.requestTimingLogsEnabled) return;
    if (this.shouldSkipTimingLog(tablePath)) return;
    const cleanPath = String(tablePath || '').trim().replace(/^\/+/, '');
    const msg = `[supabase] ${method} ${cleanPath} -> ${status} ${outcome} in ${durationMs.toFixed(1)}ms`;
    if (durationMs >= this.requestTimingSlowThresholdMs || outcome === 'error') {
      console.error(msg);
      return;
    }
    console.log(msg);
  }

  private async request<T = any>(
    tablePath: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = `${this.restBaseUrl}/${tablePath.replace(/^\/+/, '')}`;
    const requestHeaders: Record<string, string> = {
      apikey: this.apiKey,
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...headers
    };

    const startedAt = Date.now();
    let statusCode = 0;
    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: typeof body !== 'undefined' ? JSON.stringify(body) : undefined
      });
      statusCode = response.status;
      const bodyText = (await response.text()).trim();
      const durationMs = Date.now() - startedAt;
      if (!response.ok) {
        throw new Error(`Supabase HTTP ${response.status}: ${bodyText || 'request failed'}`);
      }
      this.logRequestTiming(tablePath, method, statusCode, durationMs, 'ok');
      if (!bodyText) return [] as T;

      try {
        return JSON.parse(bodyText) as T;
      } catch {
        return bodyText as T;
      }
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.logRequestTiming(tablePath, method, statusCode || 0, durationMs, 'error');
      throw error;
    }
  }

  private mapServerRow(row: any): ServerConfig {
    const sourceConfig = typeof row.source_config === 'string'
      ? safeJsonParse<Record<string, unknown>>(row.source_config, {})
      : (row.source_config || {});
    return {
      id: String(row.id),
      name: String(row.name),
      version: String(row.version || '1.0.0'),
      ownerUsername: String(row.owner_username || 'guest'),
      sourceConfig,
      createdAt: String(row.created_at)
    };
  }

  private mapToolRow(row: any): ToolDefinition {
    const inputSchema = typeof row.input_schema === 'string'
      ? safeJsonParse<any>(row.input_schema, {})
      : (row.input_schema || {});
    return {
      server_id: String(row.server_id),
      name: String(row.name),
      description: String(row.description),
      inputSchema,
      sqlQuery: String(row.sql_query),
      operation: row.operation as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
    };
  }

  private mapResourceRow(row: any): ResourceDefinition {
    return {
      server_id: String(row.server_id),
      name: String(row.name),
      description: String(row.description),
      uri_template: String(row.uri_template),
      sqlQuery: String(row.sql_query)
    };
  }

  private mapUserRow(row: any): UserRecord {
    const displayName = typeof row?.display_name === 'string' ? row.display_name.trim() : '';
    return {
      username: String(row.username),
      displayName: displayName || undefined,
      workspaceId: String(row.workspace_id || row.username),
      passwordHash: String(row.password_hash),
      role: row.role as UserRole,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private mapMcpTokenPolicyRow(row: any): McpTokenPolicyRecord {
    return {
      scopeType: row.scope_type as McpTokenPolicyScope,
      scopeId: String(row.scope_id),
      requireMcpToken: row.require_mcp_token === true || Number(row.require_mcp_token) === 1,
      updatedAt: String(row.updated_at)
    };
  }

  private mapMcpTokenRow(row: any): McpTokenRecord {
    return {
      id: String(row.id),
      tokenName: String(row.token_name || ''),
      workspaceId: String(row.workspace_id),
      subjectUsername: String(row.subject_username),
      createdBy: String(row.created_by),
      tokenHash: String(row.token_hash),
      tokenValue: String(row.token_value),
      allowAllServers: row.allow_all_servers === true || Number(row.allow_all_servers) === 1,
      allowAllTools: row.allow_all_tools === true || Number(row.allow_all_tools) === 1,
      allowAllResources: row.allow_all_resources === true || Number(row.allow_all_resources) === 1,
      serverIds: typeof row.server_ids_json === 'string' ? safeJsonParse<string[]>(row.server_ids_json, []) : (row.server_ids_json || []),
      allowedTools: typeof row.allowed_tools_json === 'string' ? safeJsonParse<string[]>(row.allowed_tools_json, []) : (row.allowed_tools_json || []),
      allowedResources: typeof row.allowed_resources_json === 'string' ? safeJsonParse<string[]>(row.allowed_resources_json, []) : (row.allowed_resources_json || []),
      serverRules: typeof row.server_rules_json === 'string' ? safeJsonParse<Record<string, boolean | null>>(row.server_rules_json, {}) : (row.server_rules_json || {}),
      toolRules: typeof row.tool_rules_json === 'string' ? safeJsonParse<Record<string, boolean | null>>(row.tool_rules_json, {}) : (row.tool_rules_json || {}),
      resourceRules: typeof row.resource_rules_json === 'string' ? safeJsonParse<Record<string, boolean | null>>(row.resource_rules_json, {}) : (row.resource_rules_json || {}),
      neverExpires: row.never_expires === true || Number(row.never_expires) === 1,
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      createdAt: String(row.created_at),
      revokedAt: row.revoked_at ? String(row.revoked_at) : null
    };
  }

  async saveServer(server: ServerConfig): Promise<void> {
    await this.request('servers?on_conflict=id', 'POST', {
      id: server.id,
      name: server.name,
      version: server.version || '1.0.0',
      owner_username: server.ownerUsername,
      source_config: server.sourceConfig,
      created_at: server.createdAt,
      updated_at: new Date().toISOString()
    }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  async getServer(serverId: string): Promise<ServerConfig | null> {
    const rows = await this.request<any[]>(`servers?select=*&id=eq.${encodeURIComponent(serverId)}&limit=1`);
    return rows.length > 0 ? this.mapServerRow(rows[0]) : null;
  }

  async getServerForOwner(serverId: string, ownerUsername: string): Promise<ServerConfig | null> {
    const rows = await this.request<any[]>(
      `servers?select=*&id=eq.${encodeURIComponent(serverId)}&owner_username=eq.${encodeURIComponent(ownerUsername)}&limit=1`
    );
    return rows.length > 0 ? this.mapServerRow(rows[0]) : null;
  }

  async getAllServers(): Promise<ServerConfig[]> {
    return (await this.request<any[]>('servers?select=*&order=created_at.desc')).map((r) => this.mapServerRow(r));
  }

  async getAllServersByOwner(ownerUsername: string): Promise<ServerConfig[]> {
    return (await this.request<any[]>(
      `servers?select=*&owner_username=eq.${encodeURIComponent(ownerUsername)}&order=created_at.desc`
    )).map((r) => this.mapServerRow(r));
  }

  async serverNameExistsForOwner(serverName: string, ownerUsername: string): Promise<boolean> {
    const rows = await this.request<any[]>(
      `servers?select=id&name=eq.${encodeURIComponent(serverName)}&owner_username=eq.${encodeURIComponent(ownerUsername)}&limit=1`
    );
    return rows.length > 0;
  }

  async deleteServer(serverId: string): Promise<void> {
    await this.request(`servers?id=eq.${encodeURIComponent(serverId)}`, 'DELETE', undefined, { Prefer: 'return=minimal' });
  }

  async saveTools(tools: ToolDefinition[]): Promise<void> {
    if (tools.length === 0) return;
    await this.request('tools?on_conflict=server_id,name', 'POST', tools.map((tool) => ({
      server_id: tool.server_id,
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
      sql_query: tool.sqlQuery,
      operation: tool.operation
    })), { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  async getToolsForServer(serverId: string): Promise<ToolDefinition[]> {
    return (await this.request<any[]>(`tools?select=*&server_id=eq.${encodeURIComponent(serverId)}`)).map((r) => this.mapToolRow(r));
  }

  async getAllTools(): Promise<ToolDefinition[]> {
    return (await this.request<any[]>('tools?select=*&order=server_id.asc,name.asc')).map((r) => this.mapToolRow(r));
  }

  async saveResources(resources: ResourceDefinition[]): Promise<void> {
    if (resources.length === 0) return;
    await this.request('resources?on_conflict=server_id,name', 'POST', resources.map((resource) => ({
      server_id: resource.server_id,
      name: resource.name,
      description: resource.description,
      uri_template: resource.uri_template,
      sql_query: resource.sqlQuery
    })), { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  async getResourcesForServer(serverId: string): Promise<ResourceDefinition[]> {
    return (await this.request<any[]>(`resources?select=*&server_id=eq.${encodeURIComponent(serverId)}`)).map((r) => this.mapResourceRow(r));
  }

  async getAllResources(): Promise<ResourceDefinition[]> {
    return (await this.request<any[]>('resources?select=*&order=server_id.asc,name.asc')).map((r) => this.mapResourceRow(r));
  }

  async saveRefreshToken(tokenHash: string, username: string, expiresAt: string): Promise<void> {
    await this.request('refresh_tokens?on_conflict=token_hash', 'POST', {
      token_hash: tokenHash,
      username,
      expires_at: expiresAt,
      revoked_at: null
    }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  async getRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const rows = await this.request<any[]>(`refresh_tokens?select=*&token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`);
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      tokenHash: String(row.token_hash),
      username: String(row.username),
      expiresAt: String(row.expires_at),
      createdAt: String(row.created_at),
      revokedAt: row.revoked_at ? String(row.revoked_at) : null
    };
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.request(`refresh_tokens?token_hash=eq.${encodeURIComponent(tokenHash)}&revoked_at=is.null`, 'PATCH', {
      revoked_at: new Date().toISOString()
    }, { Prefer: 'return=minimal' });
  }

  async revokeAllRefreshTokensForUser(username: string): Promise<void> {
    await this.request(`refresh_tokens?username=eq.${encodeURIComponent(username)}&revoked_at=is.null`, 'PATCH', {
      revoked_at: new Date().toISOString()
    }, { Prefer: 'return=minimal' });
  }

  async getUser(username: string): Promise<UserRecord | null> {
    const rows = await this.request<any[]>(`users?select=*&username=eq.${encodeURIComponent(username)}&limit=1`);
    return rows.length > 0 ? this.mapUserRow(rows[0]) : null;
  }

  async getUserInWorkspace(username: string, workspaceId: string): Promise<UserRecord | null> {
    const rows = await this.request<any[]>(
      `users?select=*&username=eq.${encodeURIComponent(username)}&workspace_id=eq.${encodeURIComponent(workspaceId)}&limit=1`
    );
    return rows.length > 0 ? this.mapUserRow(rows[0]) : null;
  }

  async getAllUsers(): Promise<Array<Omit<UserRecord, 'passwordHash'>>> {
    return (await this.request<any[]>('users?select=*&order=username.asc')).map((row) => {
      const user = this.mapUserRow(row);
      const { passwordHash: _passwordHash, ...publicUser } = user;
      return publicUser;
    });
  }

  async getAllUsersByWorkspace(workspaceId: string): Promise<Array<Omit<UserRecord, 'passwordHash'>>> {
    return (await this.request<any[]>(
      `users?select=*&workspace_id=eq.${encodeURIComponent(workspaceId)}&order=username.asc`
    )).map((row) => {
      const user = this.mapUserRow(row);
      const { passwordHash: _passwordHash, ...publicUser } = user;
      return publicUser;
    });
  }

  async createUser(username: string, passwordHash: string, role: UserRole, workspaceId: string, displayName?: string): Promise<void> {
    const payload: Record<string, any> = {
      username,
      workspace_id: workspaceId,
      password_hash: passwordHash,
      role
    };
    const trimmedDisplayName = String(displayName || '').trim();
    if (trimmedDisplayName) payload.display_name = trimmedDisplayName;
    try {
      await this.request('users', 'POST', payload, { Prefer: 'return=minimal' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || '');
      const missingDisplayNameColumn = /display_name/i.test(message) && /(column|schema|unknown|does not exist)/i.test(message);
      if (trimmedDisplayName && missingDisplayNameColumn) {
        delete payload.display_name;
        await this.request('users', 'POST', payload, { Prefer: 'return=minimal' });
        return;
      }
      throw error;
    }
  }

  async upsertUser(username: string, passwordHash: string, role: UserRole, workspaceId: string, displayName?: string): Promise<void> {
    const payload: Record<string, any> = {
      username,
      workspace_id: workspaceId,
      password_hash: passwordHash,
      role,
      updated_at: new Date().toISOString()
    };
    const trimmedDisplayName = String(displayName || '').trim();
    if (trimmedDisplayName) payload.display_name = trimmedDisplayName;
    try {
      await this.request('users?on_conflict=username', 'POST', payload, { Prefer: 'resolution=merge-duplicates,return=minimal' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || '');
      const missingDisplayNameColumn = /display_name/i.test(message) && /(column|schema|unknown|does not exist)/i.test(message);
      if (trimmedDisplayName && missingDisplayNameColumn) {
        delete payload.display_name;
        await this.request('users?on_conflict=username', 'POST', payload, { Prefer: 'resolution=merge-duplicates,return=minimal' });
        return;
      }
      throw error;
    }
  }

  async updateUserRole(username: string, workspaceId: string, role: UserRole): Promise<void> {
    await this.request(
      `users?username=eq.${encodeURIComponent(username)}&workspace_id=eq.${encodeURIComponent(workspaceId)}`,
      'PATCH',
      { role, updated_at: new Date().toISOString() },
      { Prefer: 'return=minimal' }
    );
  }

  async getServerAuthConfig(serverId: string): Promise<ServerAuthConfig | null> {
    const policy = await this.getMcpTokenPolicy('server', serverId);
    if (policy) {
      return {
        serverId,
        requireMcpToken: policy.requireMcpToken,
        updatedAt: policy.updatedAt
      };
    }

    const rows = await this.request<any[]>(
      `server_auth_config?select=server_id,require_mcp_token,updated_at&server_id=eq.${encodeURIComponent(serverId)}&limit=1`
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      serverId: String(row.server_id),
      requireMcpToken: row.require_mcp_token === true || Number(row.require_mcp_token) === 1,
      updatedAt: String(row.updated_at)
    };
  }

  async setServerAuthConfig(serverId: string, requireMcpToken: boolean): Promise<void> {
    await this.request('server_auth_config?on_conflict=server_id', 'POST', {
      server_id: serverId,
      require_mcp_token: requireMcpToken,
      updated_at: new Date().toISOString()
    }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
    await this.setMcpTokenPolicy('server', serverId, requireMcpToken);
  }

  async getMcpTokenPolicy(scopeType: McpTokenPolicyScope, scopeId: string): Promise<McpTokenPolicyRecord | null> {
    const rows = await this.request<any[]>(
      `mcp_token_policies?select=scope_type,scope_id,require_mcp_token,updated_at&scope_type=eq.${encodeURIComponent(scopeType)}&scope_id=eq.${encodeURIComponent(scopeId)}&limit=1`
    );
    return rows.length > 0 ? this.mapMcpTokenPolicyRow(rows[0]) : null;
  }

  async listMcpTokenPolicies(scopeType?: McpTokenPolicyScope): Promise<McpTokenPolicyRecord[]> {
    const q = scopeType
      ? `mcp_token_policies?select=scope_type,scope_id,require_mcp_token,updated_at&scope_type=eq.${encodeURIComponent(scopeType)}&order=updated_at.desc`
      : 'mcp_token_policies?select=scope_type,scope_id,require_mcp_token,updated_at&order=updated_at.desc';
    return (await this.request<any[]>(q)).map((row) => this.mapMcpTokenPolicyRow(row));
  }

  async setMcpTokenPolicy(scopeType: McpTokenPolicyScope, scopeId: string, requireMcpToken: boolean | null): Promise<void> {
    if (!scopeId) return;
    if (requireMcpToken === null) {
      await this.request(
        `mcp_token_policies?scope_type=eq.${encodeURIComponent(scopeType)}&scope_id=eq.${encodeURIComponent(scopeId)}`,
        'DELETE',
        undefined,
        { Prefer: 'return=minimal' }
      );
      return;
    }
    await this.request('mcp_token_policies?on_conflict=scope_type,scope_id', 'POST', {
      scope_type: scopeType,
      scope_id: scopeId,
      require_mcp_token: requireMcpToken,
      updated_at: new Date().toISOString()
    }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  async createMcpToken(input: McpTokenCreateInput): Promise<void> {
    await this.request('mcp_tokens', 'POST', {
      id: input.id,
      token_name: input.tokenName,
      workspace_id: input.workspaceId,
      subject_username: input.subjectUsername,
      created_by: input.createdBy,
      token_hash: input.tokenHash,
      token_value: input.tokenValue,
      allow_all_servers: input.allowAllServers,
      allow_all_tools: input.allowAllTools,
      allow_all_resources: input.allowAllResources,
      server_ids_json: JSON.stringify(input.serverIds || []),
      allowed_tools_json: JSON.stringify(input.allowedTools || []),
      allowed_resources_json: JSON.stringify(input.allowedResources || []),
      server_rules_json: JSON.stringify(input.serverRules || {}),
      tool_rules_json: JSON.stringify(input.toolRules || {}),
      resource_rules_json: JSON.stringify(input.resourceRules || {}),
      never_expires: input.neverExpires,
      expires_at: input.expiresAt
    }, { Prefer: 'return=minimal' });
  }

  async getMcpTokenByHash(tokenHash: string): Promise<McpTokenRecord | null> {
    const rows = await this.request<any[]>(`mcp_tokens?select=*&token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`);
    return rows.length > 0 ? this.mapMcpTokenRow(rows[0]) : null;
  }

  async getMcpTokenById(id: string): Promise<McpTokenRecord | null> {
    const rows = await this.request<any[]>(`mcp_tokens?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows.length > 0 ? this.mapMcpTokenRow(rows[0]) : null;
  }

  async getMcpTokensByWorkspace(workspaceId: string): Promise<McpTokenRecord[]> {
    return (await this.request<any[]>(
      `mcp_tokens?select=*&workspace_id=eq.${encodeURIComponent(workspaceId)}&order=created_at.desc`
    )).map((row) => this.mapMcpTokenRow(row));
  }

  async revokeMcpToken(id: string): Promise<void> {
    await this.request(`mcp_tokens?id=eq.${encodeURIComponent(id)}&revoked_at=is.null`, 'PATCH', {
      revoked_at: new Date().toISOString()
    }, { Prefer: 'return=minimal' });
  }

  async getWorkspaceAiConfig(workspaceId: string): Promise<WorkspaceAiConfig | null> {
    try {
      const rows = await this.request<any[]>(
        `workspace_ai_config?select=provider,model,api_token,api_version,base_url&workspace_id=eq.${encodeURIComponent(workspaceId)}&limit=1`
      );
      if (!rows.length) return null;
      const row = rows[0];
      const apiToken = String(row.api_token || '').trim();
      if (!apiToken) return null;
      return {
        provider: String(row.provider || 'claude').trim().toLowerCase(),
        model: String(row.model || '').trim(),
        apiToken,
        apiVersion: String(row.api_version || '').trim() || undefined,
        baseUrl: String(row.base_url || '').trim() || undefined
      };
    } catch {
      return null;
    }
  }

  async getQuickAskState(workspaceId: string): Promise<QuickAskStateRecord | null> {
    try {
      const rows = await this.request<any[]>(
        `chat_state?select=workspace_id,chats_json,current_chat_id,updated_at&workspace_id=eq.${encodeURIComponent(workspaceId)}&limit=1`
      );
      if (!rows.length) return null;
      const row = rows[0];
      const chatsRaw = typeof row.chats_json === 'string'
        ? safeJsonParse<any[]>(row.chats_json, [])
        : (Array.isArray(row.chats_json) ? row.chats_json : []);
      return {
        workspaceId: String(row.workspace_id || workspaceId),
        chats: chatsRaw,
        currentChatId: String(row.current_chat_id || ''),
        updatedAt: String(row.updated_at || new Date().toISOString())
      };
    } catch {
      return null;
    }
  }

  async saveQuickAskState(workspaceId: string, chats: any[], currentChatId: string): Promise<void> {
    await this.request('chat_state?on_conflict=workspace_id', 'POST', {
      workspace_id: workspaceId,
      chats_json: Array.isArray(chats) ? chats : [],
      current_chat_id: String(currentChatId || ''),
      updated_at: new Date().toISOString()
    }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  async getUserPreference(userId: string, key: string): Promise<string | null> {
    const safeUserId = String(userId || '').trim();
    const safeKey = String(key || '').trim();
    if (!safeUserId || !safeKey) return null;
    try {
      const rows = await this.request<any[]>(
        `user_preferences?select=pref_value&user_id=eq.${encodeURIComponent(safeUserId)}&pref_key=eq.${encodeURIComponent(safeKey)}&limit=1`
      );
      if (!rows.length) return null;
      return String(rows[0]?.pref_value || '');
    } catch {
      return null;
    }
  }

  async setUserPreference(userId: string, key: string, value: string): Promise<void> {
    const safeUserId = String(userId || '').trim();
    const safeKey = String(key || '').trim();
    if (!safeUserId || !safeKey) return;
    await this.request('user_preferences?on_conflict=user_id,pref_key', 'POST', {
      user_id: safeUserId,
      pref_key: safeKey,
      pref_value: String(value || ''),
      updated_at: new Date().toISOString()
    }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  async writeLog(entry: LogEntry): Promise<void> {
    await this.request('app_logs', 'POST', {
      username: entry.username,
      severity: entry.severity,
      message: entry.message,
      datetime: entry.datetime,
      additional_info: entry.additionalInfo ?? null
    }, { Prefer: 'return=minimal' });
  }

  async close(): Promise<void> {
    // no-op for HTTP-backed datastore
  }

  async getStats(): Promise<{ servers: number; tools: number; resources: number }> {
    const servers = (await this.request<any[]>('servers?select=id')).length;
    const tools = (await this.request<any[]>('tools?select=id')).length;
    const resources = (await this.request<any[]>('resources?select=id')).length;
    return { servers, tools, resources };
  }
}

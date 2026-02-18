import { execFileSync } from 'child_process';
import {
  IDataStore,
  McpTokenCreateInput,
  McpTokenPolicyRecord,
  McpTokenPolicyScope,
  McpTokenRecord,
  RefreshTokenRecord,
  ResourceDefinition,
  ServerAuthConfig,
  ServerConfig,
  ToolDefinition,
  UserRecord,
  UserRole
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
  }

  private request<T = any>(
    tablePath: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown,
    headers: Record<string, string> = {}
  ): T {
    const url = `${this.restBaseUrl}/${tablePath.replace(/^\/+/, '')}`;
    const args: string[] = [
      '-sS',
      '-X', method,
      '-H', `apikey: ${this.apiKey}`,
      '-H', `Authorization: Bearer ${this.apiKey}`,
      '-H', 'Content-Type: application/json'
    ];

    for (const [k, v] of Object.entries(headers)) {
      args.push('-H', `${k}: ${v}`);
    }

    if (typeof body !== 'undefined') {
      args.push('--data-raw', JSON.stringify(body));
    }

    args.push(url, '-w', '\n__STATUS__:%{http_code}');

    const out = execFileSync('curl', args, { encoding: 'utf8' });
    const marker = '\n__STATUS__:';
    const idx = out.lastIndexOf(marker);
    const bodyText = idx >= 0 ? out.slice(0, idx).trim() : out.trim();
    const status = idx >= 0 ? Number(out.slice(idx + marker.length).trim()) : 0;

    if (status >= 400) {
      throw new Error(`Supabase HTTP ${status}: ${bodyText || 'request failed'}`);
    }
    if (!bodyText) return [] as T;

    try {
      return JSON.parse(bodyText) as T;
    } catch {
      return bodyText as T;
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
    return {
      username: String(row.username),
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

  saveServer(server: ServerConfig): void {
    this.request('servers?on_conflict=id', 'POST', {
      id: server.id,
      name: server.name,
      version: server.version || '1.0.0',
      owner_username: server.ownerUsername,
      source_config: server.sourceConfig,
      created_at: server.createdAt,
      updated_at: new Date().toISOString()
    }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  getServer(serverId: string): ServerConfig | null {
    const rows = this.request<any[]>(`servers?select=*&id=eq.${encodeURIComponent(serverId)}&limit=1`);
    return rows.length > 0 ? this.mapServerRow(rows[0]) : null;
  }

  getServerForOwner(serverId: string, ownerUsername: string): ServerConfig | null {
    const rows = this.request<any[]>(
      `servers?select=*&id=eq.${encodeURIComponent(serverId)}&owner_username=eq.${encodeURIComponent(ownerUsername)}&limit=1`
    );
    return rows.length > 0 ? this.mapServerRow(rows[0]) : null;
  }

  getAllServers(): ServerConfig[] {
    return this.request<any[]>('servers?select=*&order=created_at.desc').map((r) => this.mapServerRow(r));
  }

  getAllServersByOwner(ownerUsername: string): ServerConfig[] {
    return this.request<any[]>(
      `servers?select=*&owner_username=eq.${encodeURIComponent(ownerUsername)}&order=created_at.desc`
    ).map((r) => this.mapServerRow(r));
  }

  serverNameExistsForOwner(serverName: string, ownerUsername: string): boolean {
    const rows = this.request<any[]>(
      `servers?select=id&name=eq.${encodeURIComponent(serverName)}&owner_username=eq.${encodeURIComponent(ownerUsername)}&limit=1`
    );
    return rows.length > 0;
  }

  deleteServer(serverId: string): void {
    this.request(`servers?id=eq.${encodeURIComponent(serverId)}`, 'DELETE', undefined, { Prefer: 'return=minimal' });
  }

  saveTools(tools: ToolDefinition[]): void {
    if (tools.length === 0) return;
    this.request('tools?on_conflict=server_id,name', 'POST', tools.map((tool) => ({
      server_id: tool.server_id,
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
      sql_query: tool.sqlQuery,
      operation: tool.operation
    })), { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  getToolsForServer(serverId: string): ToolDefinition[] {
    return this.request<any[]>(`tools?select=*&server_id=eq.${encodeURIComponent(serverId)}`).map((r) => this.mapToolRow(r));
  }

  getAllTools(): ToolDefinition[] {
    return this.request<any[]>('tools?select=*&order=server_id.asc,name.asc').map((r) => this.mapToolRow(r));
  }

  saveResources(resources: ResourceDefinition[]): void {
    if (resources.length === 0) return;
    this.request('resources?on_conflict=server_id,name', 'POST', resources.map((resource) => ({
      server_id: resource.server_id,
      name: resource.name,
      description: resource.description,
      uri_template: resource.uri_template,
      sql_query: resource.sqlQuery
    })), { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  getResourcesForServer(serverId: string): ResourceDefinition[] {
    return this.request<any[]>(`resources?select=*&server_id=eq.${encodeURIComponent(serverId)}`).map((r) => this.mapResourceRow(r));
  }

  getAllResources(): ResourceDefinition[] {
    return this.request<any[]>('resources?select=*&order=server_id.asc,name.asc').map((r) => this.mapResourceRow(r));
  }

  saveRefreshToken(tokenHash: string, username: string, expiresAt: string): void {
    this.request('refresh_tokens?on_conflict=token_hash', 'POST', {
      token_hash: tokenHash,
      username,
      expires_at: expiresAt,
      revoked_at: null
    }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  getRefreshToken(tokenHash: string): RefreshTokenRecord | null {
    const rows = this.request<any[]>(`refresh_tokens?select=*&token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`);
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

  revokeRefreshToken(tokenHash: string): void {
    this.request(`refresh_tokens?token_hash=eq.${encodeURIComponent(tokenHash)}&revoked_at=is.null`, 'PATCH', {
      revoked_at: new Date().toISOString()
    }, { Prefer: 'return=minimal' });
  }

  revokeAllRefreshTokensForUser(username: string): void {
    this.request(`refresh_tokens?username=eq.${encodeURIComponent(username)}&revoked_at=is.null`, 'PATCH', {
      revoked_at: new Date().toISOString()
    }, { Prefer: 'return=minimal' });
  }

  getUser(username: string): UserRecord | null {
    const rows = this.request<any[]>(`users?select=*&username=eq.${encodeURIComponent(username)}&limit=1`);
    return rows.length > 0 ? this.mapUserRow(rows[0]) : null;
  }

  getUserInWorkspace(username: string, workspaceId: string): UserRecord | null {
    const rows = this.request<any[]>(
      `users?select=*&username=eq.${encodeURIComponent(username)}&workspace_id=eq.${encodeURIComponent(workspaceId)}&limit=1`
    );
    return rows.length > 0 ? this.mapUserRow(rows[0]) : null;
  }

  getAllUsers(): Array<Omit<UserRecord, 'passwordHash'>> {
    return this.request<any[]>('users?select=username,workspace_id,role,created_at,updated_at&order=username.asc').map((row) => ({
      username: String(row.username),
      workspaceId: String(row.workspace_id || row.username),
      role: row.role as UserRole,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  getAllUsersByWorkspace(workspaceId: string): Array<Omit<UserRecord, 'passwordHash'>> {
    return this.request<any[]>(
      `users?select=username,workspace_id,role,created_at,updated_at&workspace_id=eq.${encodeURIComponent(workspaceId)}&order=username.asc`
    ).map((row) => ({
      username: String(row.username),
      workspaceId: String(row.workspace_id || row.username),
      role: row.role as UserRole,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  createUser(username: string, passwordHash: string, role: UserRole, workspaceId: string): void {
    this.request('users', 'POST', {
      username,
      workspace_id: workspaceId,
      password_hash: passwordHash,
      role
    }, { Prefer: 'return=minimal' });
  }

  upsertUser(username: string, passwordHash: string, role: UserRole, workspaceId: string): void {
    this.request('users?on_conflict=username', 'POST', {
      username,
      workspace_id: workspaceId,
      password_hash: passwordHash,
      role,
      updated_at: new Date().toISOString()
    }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  updateUserRole(username: string, workspaceId: string, role: UserRole): void {
    this.request(
      `users?username=eq.${encodeURIComponent(username)}&workspace_id=eq.${encodeURIComponent(workspaceId)}`,
      'PATCH',
      { role, updated_at: new Date().toISOString() },
      { Prefer: 'return=minimal' }
    );
  }

  getServerAuthConfig(serverId: string): ServerAuthConfig | null {
    const policy = this.getMcpTokenPolicy('server', serverId);
    if (policy) {
      return {
        serverId,
        requireMcpToken: policy.requireMcpToken,
        updatedAt: policy.updatedAt
      };
    }

    const rows = this.request<any[]>(
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

  setServerAuthConfig(serverId: string, requireMcpToken: boolean): void {
    this.request('server_auth_config?on_conflict=server_id', 'POST', {
      server_id: serverId,
      require_mcp_token: requireMcpToken,
      updated_at: new Date().toISOString()
    }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
    this.setMcpTokenPolicy('server', serverId, requireMcpToken);
  }

  getMcpTokenPolicy(scopeType: McpTokenPolicyScope, scopeId: string): McpTokenPolicyRecord | null {
    const rows = this.request<any[]>(
      `mcp_token_policies?select=scope_type,scope_id,require_mcp_token,updated_at&scope_type=eq.${encodeURIComponent(scopeType)}&scope_id=eq.${encodeURIComponent(scopeId)}&limit=1`
    );
    return rows.length > 0 ? this.mapMcpTokenPolicyRow(rows[0]) : null;
  }

  listMcpTokenPolicies(scopeType?: McpTokenPolicyScope): McpTokenPolicyRecord[] {
    const q = scopeType
      ? `mcp_token_policies?select=scope_type,scope_id,require_mcp_token,updated_at&scope_type=eq.${encodeURIComponent(scopeType)}&order=updated_at.desc`
      : 'mcp_token_policies?select=scope_type,scope_id,require_mcp_token,updated_at&order=updated_at.desc';
    return this.request<any[]>(q).map((row) => this.mapMcpTokenPolicyRow(row));
  }

  setMcpTokenPolicy(scopeType: McpTokenPolicyScope, scopeId: string, requireMcpToken: boolean | null): void {
    if (!scopeId) return;
    if (requireMcpToken === null) {
      this.request(
        `mcp_token_policies?scope_type=eq.${encodeURIComponent(scopeType)}&scope_id=eq.${encodeURIComponent(scopeId)}`,
        'DELETE',
        undefined,
        { Prefer: 'return=minimal' }
      );
      return;
    }
    this.request('mcp_token_policies?on_conflict=scope_type,scope_id', 'POST', {
      scope_type: scopeType,
      scope_id: scopeId,
      require_mcp_token: requireMcpToken,
      updated_at: new Date().toISOString()
    }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  createMcpToken(input: McpTokenCreateInput): void {
    this.request('mcp_tokens', 'POST', {
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

  getMcpTokenByHash(tokenHash: string): McpTokenRecord | null {
    const rows = this.request<any[]>(`mcp_tokens?select=*&token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`);
    return rows.length > 0 ? this.mapMcpTokenRow(rows[0]) : null;
  }

  getMcpTokenById(id: string): McpTokenRecord | null {
    const rows = this.request<any[]>(`mcp_tokens?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows.length > 0 ? this.mapMcpTokenRow(rows[0]) : null;
  }

  getMcpTokensByWorkspace(workspaceId: string): McpTokenRecord[] {
    return this.request<any[]>(
      `mcp_tokens?select=*&workspace_id=eq.${encodeURIComponent(workspaceId)}&order=created_at.desc`
    ).map((row) => this.mapMcpTokenRow(row));
  }

  revokeMcpToken(id: string): void {
    this.request(`mcp_tokens?id=eq.${encodeURIComponent(id)}&revoked_at=is.null`, 'PATCH', {
      revoked_at: new Date().toISOString()
    }, { Prefer: 'return=minimal' });
  }

  close(): void {
    // no-op for HTTP-backed datastore
  }

  getStats(): { servers: number; tools: number; resources: number } {
    const servers = this.request<any[]>('servers?select=id').length;
    const tools = this.request<any[]>('tools?select=id').length;
    const resources = this.request<any[]>('resources?select=id').length;
    return { servers, tools, resources };
  }
}

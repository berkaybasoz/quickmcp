import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { extractApiData, fetchJson } from '../shared/api/http';

type TabName = 'token' | 'policy';
type TriSelect = 'inherit' | 'allow' | 'deny';
type PolicySelect = 'inherit' | 'require' | 'no-token';
type ToastType = 'success' | 'error' | 'warning' | 'info';

type AuthorizationConfig = {
  isSaasMode?: boolean;
  mcpTokenRequired?: boolean;
};

type AuthorizationUser = {
  username: string;
  role: string;
  displayName?: string;
};

type AuthorizationServer = {
  id: string;
  name: string;
  type?: string;
  tools: string[];
  resources: string[];
};

type AuthorizationContext = {
  users: AuthorizationUser[];
  servers: AuthorizationServer[];
};

type TokenPolicy = {
  globalRequireMcpToken: boolean;
  userRules: Record<string, boolean | null>;
  serverRules: Record<string, boolean | null>;
  toolRules: Record<string, boolean | null>;
};

type AuthorizationToken = {
  id: string;
  tokenName: string;
  subjectUsername: string;
  createdAt?: string;
  expiresAt?: string;
  neverExpires?: boolean;
  revokedAt?: string | null;
};

type TokenDetails = {
  token?: string;
  neverExpires?: boolean;
  expiresAt?: string;
};

type GroupedUserServers = {
  username: string;
  displayName: string;
  role: string;
  servers: AuthorizationServer[];
};

type AuthorizationRuntimeWindow = Window & {
  utils?: {
    showToast?: (message: string, type?: ToastType) => void;
  };
};

const TTL_PRESET_TO_HOURS: Record<string, number> = {
  '1m': 1 / 60,
  '5m': 5 / 60,
  '15m': 15 / 60,
  '30m': 30 / 60,
  '1h': 1,
  '4h': 4,
  '12h': 12,
  '24h': 24,
  '1w': 24 * 7,
  '2w': 24 * 14,
  '1mo': 24 * 30,
  '3mo': 24 * 90,
  '6mo': 24 * 180
};

const TTL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'never', label: 'Never expires' },
  { value: '1m', label: '1 minute' },
  { value: '5m', label: '5 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '4h', label: '4 hours' },
  { value: '12h', label: '12 hours' },
  { value: '24h', label: '24 hours' },
  { value: '1w', label: '1 week' },
  { value: '2w', label: '2 weeks' },
  { value: '1mo', label: '1 month' },
  { value: '3mo', label: '3 months' },
  { value: '6mo', label: '6 months' }
];

function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('aborted');
}

function triFromSelect(value: TriSelect): boolean | null {
  if (value === 'allow') return true;
  if (value === 'deny') return false;
  return null;
}

function resolveTriValue(...values: Array<boolean | null | undefined>): boolean | null {
  for (const value of values) {
    if (value === true || value === false) return value;
  }
  return null;
}

function policyValueToSelect(value: boolean | null | undefined): PolicySelect {
  if (value === true) return 'require';
  if (value === false) return 'no-token';
  return 'inherit';
}

function selectToPolicyValue(value: PolicySelect): boolean | null {
  if (value === 'require') return true;
  if (value === 'no-token') return false;
  return null;
}

function serverOwnerFromId(serverId: string): string {
  const idx = String(serverId || '').indexOf('__');
  if (idx <= 0) return '';
  return String(serverId).slice(0, idx);
}

function getMcpDisplayName(server: AuthorizationServer): string {
  const id = String(server?.id || '');
  const rawName = String(server?.name || id || '');
  const owner = serverOwnerFromId(id);
  if (owner && rawName.startsWith(`${owner}__`)) return rawName.slice(owner.length + 2);
  if (rawName.includes('__')) return rawName.split('__').slice(-1)[0];
  return rawName;
}

function getMcpTypeIcon(type?: string): string {
  const t = String(type || '').toLowerCase();
  if (['mysql', 'postgresql', 'postgres', 'mssql', 'oracle', 'sqlite', 'mongodb', 'database'].includes(t)) return 'fa-database';
  if (t === 'webpage' || t === 'webhook') return 'fa-rocket';
  if (['rest', 'graphql', 'soap', 'rss', 'curl'].includes(t)) return 'fa-globe';
  if (['docker', 'kubernetes', 'openshift', 'elasticsearch', 'opensearch', 'prometheus', 'grafana'].includes(t)) return 'fa-cubes';
  if (['slack', 'discord', 'telegram', 'whatsappbusiness', 'x', 'facebook', 'instagram', 'tiktok', 'linkedin', 'reddit', 'youtube', 'threads'].includes(t)) return 'fa-comments';
  if (['openai', 'claude', 'gemini', 'grok', 'falai', 'huggingface', 'llama', 'deepseek', 'azureopenai', 'mistral', 'cohere', 'perplexity', 'together', 'fireworks', 'groq', 'openrouter'].includes(t)) return 'fa-brain';
  if (t === 'ftp' || t === 'localfs') return 'fa-folder-open';
  return 'fa-server';
}

function getUserLabel(user: AuthorizationUser, isSaasMode: boolean): string {
  const username = String(user?.username || '').trim();
  if (!username) return '';
  if (!isSaasMode) return username;
  const displayName = String(user?.displayName || '').trim();
  return displayName || username;
}

function mergeSelectDefaults(
  previous: Record<string, TriSelect>,
  ids: string[],
  fallback: TriSelect = 'inherit'
): Record<string, TriSelect> {
  const next: Record<string, TriSelect> = {};
  ids.forEach((id) => {
    if (!id) return;
    next[id] = previous[id] || fallback;
  });
  return next;
}

function mergePolicyDefaults(
  previous: Record<string, PolicySelect>,
  ids: string[],
  fallback: PolicySelect = 'inherit'
): Record<string, PolicySelect> {
  const next: Record<string, PolicySelect> = {};
  ids.forEach((id) => {
    if (!id) return;
    next[id] = previous[id] || fallback;
  });
  return next;
}

function pickTri(map: Record<string, TriSelect>, id: string): TriSelect {
  return map[id] || 'inherit';
}

function pickPolicy(map: Record<string, PolicySelect>, id: string): PolicySelect {
  return map[id] || 'inherit';
}

function formatTokenExpiry(token: AuthorizationToken): string {
  if (token.neverExpires) return 'Never';
  return token.expiresAt || '-';
}

export function AuthorizationPage() {
  const runIdRef = useRef(0);

  useEffect(() => {
    document.body.classList.add('auth-page');
    return () => {
      document.body.classList.remove('auth-page');
    };
  }, []);

  const [activeTab, setActiveTab] = useState<TabName>('token');
  const [isSaasMode, setIsSaasMode] = useState(false);
  const [authSummary, setAuthSummary] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const [authContext, setAuthContext] = useState<AuthorizationContext>({ users: [], servers: [] });
  const [tokens, setTokens] = useState<AuthorizationToken[]>([]);

  const [subjectUsername, setSubjectUsername] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenTtlPreset, setTokenTtlPreset] = useState('never');

  const [rootMcpRule, setRootMcpRule] = useState<TriSelect>('inherit');
  const [userRuleSelect, setUserRuleSelect] = useState<Record<string, TriSelect>>({});
  const [serverRuleSelect, setServerRuleSelect] = useState<Record<string, TriSelect>>({});
  const [toolRuleSelect, setToolRuleSelect] = useState<Record<string, TriSelect>>({});
  const [resourceRuleSelect, setResourceRuleSelect] = useState<Record<string, TriSelect>>({});

  const [policyRootRule, setPolicyRootRule] = useState<PolicySelect>('require');
  const [policyUserSelect, setPolicyUserSelect] = useState<Record<string, PolicySelect>>({});
  const [policyServerSelect, setPolicyServerSelect] = useState<Record<string, PolicySelect>>({});
  const [policyToolSelect, setPolicyToolSelect] = useState<Record<string, PolicySelect>>({});

  const [generatedToken, setGeneratedToken] = useState('');
  const [tokenMeta, setTokenMeta] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [tokenModalMasked, setTokenModalMasked] = useState(true);
  const [tokenModalToken, setTokenModalToken] = useState('');
  const [tokenModalMeta, setTokenModalMeta] = useState('');

  const notify = useCallback((message: string, type: ToastType = 'info') => {
    const runtime = window as AuthorizationRuntimeWindow;
    runtime.utils?.showToast?.(message, type);
    if (type === 'error') console.error(message);
  }, []);

  const userIds = useMemo(() => authContext.users.map((u) => u.username).filter(Boolean), [authContext.users]);
  const serverIds = useMemo(() => authContext.servers.map((s) => s.id).filter(Boolean), [authContext.servers]);
  const toolIds = useMemo(() => authContext.servers.flatMap((s) => (s.tools || []).filter(Boolean)), [authContext.servers]);
  const resourceIds = useMemo(() => authContext.servers.flatMap((s) => (s.resources || []).filter(Boolean)), [authContext.servers]);

  const groupedUsers = useMemo<GroupedUserServers[]>(() => {
    const users = authContext.users || [];
    const servers = authContext.servers || [];
    const grouped = users.map((u) => ({
      username: u.username,
      displayName: getUserLabel(u, isSaasMode),
      role: u.role,
      servers: servers.filter((s) => serverOwnerFromId(s.id) === u.username)
    }));

    const matchedCount = grouped.reduce((acc, item) => acc + (item.servers || []).length, 0);
    if (matchedCount === 0 && subjectUsername) {
      const idx = grouped.findIndex((g) => g.username === subjectUsername);
      if (idx >= 0) {
        grouped[idx] = { ...grouped[idx], servers };
      }
    }

    return grouped;
  }, [authContext, isSaasMode, subjectUsername]);

  const syncRuleMapsWithContext = useCallback(() => {
    setUserRuleSelect((prev) => mergeSelectDefaults(prev, userIds));
    setServerRuleSelect((prev) => mergeSelectDefaults(prev, serverIds));
    setToolRuleSelect((prev) => mergeSelectDefaults(prev, toolIds));
    setResourceRuleSelect((prev) => mergeSelectDefaults(prev, resourceIds));

    setPolicyUserSelect((prev) => mergePolicyDefaults(prev, userIds));
    setPolicyServerSelect((prev) => mergePolicyDefaults(prev, serverIds));
    setPolicyToolSelect((prev) => mergePolicyDefaults(prev, toolIds));
  }, [resourceIds, serverIds, toolIds, userIds]);

  useEffect(() => {
    syncRuleMapsWithContext();
    if (!subjectUsername && userIds.length > 0) {
      setSubjectUsername(userIds[0]);
    } else if (subjectUsername && !userIds.includes(subjectUsername)) {
      setSubjectUsername(userIds[0] || '');
    }
  }, [subjectUsername, syncRuleMapsWithContext, userIds]);

  const loadTokens = useCallback(async (signal?: AbortSignal): Promise<void> => {
    const payload = await fetchJson<any>('/api/authorization/tokens', { signal });
    const data = extractApiData<{ tokens?: AuthorizationToken[] }>(payload);
    setTokens(Array.isArray(data?.tokens) ? data.tokens : []);
  }, []);

  const initializePage = useCallback(async (signal: AbortSignal): Promise<void> => {
    const runId = ++runIdRef.current;
    const isStale = () => runId !== runIdRef.current || signal.aborted;

    setIsBootstrapping(true);
    try {
      const configPayload = await fetchJson<any>('/api/authorization/config', { signal });
      if (isStale()) return;
      const config = extractApiData<AuthorizationConfig>(configPayload) || {};
      const saas = config.isSaasMode === true;
      setIsSaasMode(saas);
      setAuthSummary(
        config.mcpTokenRequired
          ? 'Create and manage access tokens to control which users can see and run MCP servers, tools, and resources.'
          : 'You can optionally create access tokens to control who can use MCP servers, tools, and resources.'
      );
      if (saas) setActiveTab('token');

      const contextPayload = await fetchJson<any>('/api/authorization/context', { signal });
      if (isStale()) return;
      const context = extractApiData<AuthorizationContext>(contextPayload) || { users: [], servers: [] };
      setAuthContext({
        users: Array.isArray(context.users) ? context.users : [],
        servers: Array.isArray(context.servers) ? context.servers : []
      });

      if (!saas) {
        const policyPayload = await fetchJson<any>('/api/authorization/token-policy', { signal });
        if (isStale()) return;
        const policy = extractApiData<TokenPolicy>(policyPayload);
        setPolicyRootRule((policy?.globalRequireMcpToken ?? true) ? 'require' : 'no-token');

        const nextUser: Record<string, PolicySelect> = {};
        const nextServer: Record<string, PolicySelect> = {};
        const nextTool: Record<string, PolicySelect> = {};
        Object.entries(policy?.userRules || {}).forEach(([id, value]) => { nextUser[id] = policyValueToSelect(value); });
        Object.entries(policy?.serverRules || {}).forEach(([id, value]) => { nextServer[id] = policyValueToSelect(value); });
        Object.entries(policy?.toolRules || {}).forEach(([id, value]) => { nextTool[id] = policyValueToSelect(value); });
        setPolicyUserSelect(nextUser);
        setPolicyServerSelect(nextServer);
        setPolicyToolSelect(nextTool);
      }

      await loadTokens(signal);
      if (isStale()) return;
    } catch (error) {
      if (!isAbortError(error)) {
        notify(error instanceof Error ? error.message : 'Authorization page failed to load', 'error');
      }
    } finally {
      if (!isStale()) {
        setIsBootstrapping(false);
      }
    }
  }, [loadTokens, notify]);

  useEffect(() => {
    const controller = new AbortController();
    void initializePage(controller.signal);
    return () => {
      controller.abort();
      runIdRef.current += 1;
    };
  }, [initializePage]);

  const applyRootMcpCascade = (value: TriSelect) => {
    setRootMcpRule(value);
    setUserRuleSelect((prev) => {
      const next = { ...mergeSelectDefaults(prev, userIds) };
      userIds.forEach((id) => {
        if (next[id] === 'inherit') next[id] = value;
      });
      return next;
    });
    setServerRuleSelect((prev) => {
      const next = { ...mergeSelectDefaults(prev, serverIds) };
      serverIds.forEach((id) => {
        if (next[id] === 'inherit') next[id] = value;
      });
      return next;
    });
    setToolRuleSelect((prev) => {
      const next = { ...mergeSelectDefaults(prev, toolIds) };
      toolIds.forEach((id) => {
        if (next[id] === 'inherit') next[id] = value;
      });
      return next;
    });
    setResourceRuleSelect((prev) => {
      const next = { ...mergeSelectDefaults(prev, resourceIds) };
      resourceIds.forEach((id) => {
        if (next[id] === 'inherit') next[id] = value;
      });
      return next;
    });
  };

  const handleUserRuleChange = (username: string, value: TriSelect) => {
    setUserRuleSelect((prev) => ({ ...prev, [username]: value }));
    setServerRuleSelect((prev) => {
      const next = { ...mergeSelectDefaults(prev, serverIds) };
      groupedUsers
        .find((group) => group.username === username)
        ?.servers.forEach((server) => {
          if (next[server.id] === 'inherit') {
            next[server.id] = value;
          }
        });
      return next;
    });
  };

  const handleServerRuleChange = (serverId: string, value: TriSelect) => {
    setServerRuleSelect((prev) => ({ ...prev, [serverId]: value }));
    setToolRuleSelect((prev) => {
      const next = { ...mergeSelectDefaults(prev, toolIds) };
      const server = authContext.servers.find((s) => s.id === serverId);
      (server?.tools || []).forEach((id) => {
        if (next[id] === 'inherit') {
          next[id] = value;
        }
      });
      return next;
    });
    setResourceRuleSelect((prev) => {
      const next = { ...mergeSelectDefaults(prev, resourceIds) };
      const server = authContext.servers.find((s) => s.id === serverId);
      (server?.resources || []).forEach((id) => {
        if (next[id] === 'inherit') {
          next[id] = value;
        }
      });
      return next;
    });
  };

  const handlePolicyUserChange = (username: string, value: PolicySelect) => {
    setPolicyUserSelect((prev) => ({ ...prev, [username]: value }));
    setPolicyServerSelect((prev) => {
      const next = { ...mergePolicyDefaults(prev, serverIds) };
      groupedUsers
        .find((group) => group.username === username)
        ?.servers.forEach((server) => {
          if (next[server.id] === 'inherit') {
            next[server.id] = value;
          }
        });
      return next;
    });
  };

  const handlePolicyServerChange = (serverId: string, value: PolicySelect) => {
    setPolicyServerSelect((prev) => ({ ...prev, [serverId]: value }));
    setPolicyToolSelect((prev) => {
      const next = { ...mergePolicyDefaults(prev, toolIds) };
      const server = authContext.servers.find((s) => s.id === serverId);
      (server?.tools || []).forEach((id) => {
        if (next[id] === 'inherit') {
          next[id] = value;
        }
      });
      return next;
    });
  };

  const computeEffectiveRules = useCallback(() => {
    const rootRule = triFromSelect(rootMcpRule);
    const userRuleMap: Record<string, boolean | null> = {};

    authContext.users.forEach((user) => {
      userRuleMap[user.username] = triFromSelect(pickTri(userRuleSelect, user.username));
    });

    const serverRules: Record<string, boolean | null> = {};
    authContext.servers.forEach((server) => {
      const owner = serverOwnerFromId(server.id);
      const local = triFromSelect(pickTri(serverRuleSelect, server.id));
      serverRules[server.id] = resolveTriValue(local, userRuleMap[owner], rootRule);
    });

    const toolRules: Record<string, boolean | null> = {};
    const resourceRules: Record<string, boolean | null> = {};

    authContext.servers.forEach((server) => {
      const owner = serverOwnerFromId(server.id);
      (server.tools || []).forEach((toolId) => {
        const local = triFromSelect(pickTri(toolRuleSelect, toolId));
        toolRules[toolId] = resolveTriValue(local, serverRules[server.id], userRuleMap[owner], rootRule);
      });
      (server.resources || []).forEach((resourceId) => {
        const local = triFromSelect(pickTri(resourceRuleSelect, resourceId));
        resourceRules[resourceId] = resolveTriValue(local, serverRules[server.id], userRuleMap[owner], rootRule);
      });
    });

    return { serverRules, toolRules, resourceRules };
  }, [authContext.servers, authContext.users, resourceRuleSelect, rootMcpRule, serverRuleSelect, toolRuleSelect, userRuleSelect]);

  const handleGenerateToken = async () => {
    const trimmedName = tokenName.trim();
    if (!trimmedName) {
      notify('Token name is required', 'error');
      return;
    }
    if (!subjectUsername) {
      notify('Select a user first', 'error');
      return;
    }

    const { serverRules, toolRules, resourceRules } = computeEffectiveRules();
    const neverExpires = tokenTtlPreset === 'never';
    const ttlHours = neverExpires ? null : (TTL_PRESET_TO_HOURS[tokenTtlPreset] || 24 * 30);

    setIsSubmitting(true);
    try {
      const payload = await fetchJson<any>('/api/authorization/mcp-token', {
        method: 'POST',
        body: JSON.stringify({
          tokenName: trimmedName,
          subjectUsername,
          neverExpires,
          ttlHours,
          serverRules,
          toolRules,
          resourceRules
        })
      });

      const data = extractApiData<any>(payload) || {};
      const token = String(data?.token || '');
      setGeneratedToken(token);
      setTokenMeta(data?.neverExpires ? 'Never expires' : `Expires: ${data?.expiresAt || '-'}`);
      await loadTokens();
      notify('Token generated', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to generate token', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshTokens = async () => {
    try {
      await loadTokens();
      notify('Token list refreshed', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to load tokens', 'error');
    }
  };

  const handleSavePolicy = async () => {
    try {
      const userRules: Record<string, boolean | null> = {};
      const serverRules: Record<string, boolean | null> = {};
      const toolRules: Record<string, boolean | null> = {};

      userIds.forEach((id) => { userRules[id] = selectToPolicyValue(pickPolicy(policyUserSelect, id)); });
      serverIds.forEach((id) => { serverRules[id] = selectToPolicyValue(pickPolicy(policyServerSelect, id)); });
      toolIds.forEach((id) => { toolRules[id] = selectToPolicyValue(pickPolicy(policyToolSelect, id)); });

      const payload = await fetchJson<any>('/api/authorization/token-policy', {
        method: 'POST',
        body: JSON.stringify({
          globalRequireMcpToken: policyRootRule !== 'no-token',
          userRules,
          serverRules,
          toolRules
        })
      });

      const data = extractApiData<TokenPolicy>(payload);
      setPolicyRootRule((data?.globalRequireMcpToken ?? true) ? 'require' : 'no-token');

      const nextUser: Record<string, PolicySelect> = {};
      const nextServer: Record<string, PolicySelect> = {};
      const nextTool: Record<string, PolicySelect> = {};
      Object.entries(data?.userRules || {}).forEach(([id, value]) => { nextUser[id] = policyValueToSelect(value); });
      Object.entries(data?.serverRules || {}).forEach(([id, value]) => { nextServer[id] = policyValueToSelect(value); });
      Object.entries(data?.toolRules || {}).forEach(([id, value]) => { nextTool[id] = policyValueToSelect(value); });
      setPolicyUserSelect(nextUser);
      setPolicyServerSelect(nextServer);
      setPolicyToolSelect(nextTool);

      notify('Token policy saved', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to save token policy', 'error');
    }
  };

  const handleShowToken = async (id: string) => {
    try {
      const payload = await fetchJson<any>(`/api/authorization/tokens/${encodeURIComponent(id)}`);
      const data = extractApiData<TokenDetails>(payload) || {};
      setTokenModalToken(String(data?.token || ''));
      setTokenModalMeta(data?.neverExpires ? 'Never expires' : `Expires: ${data?.expiresAt || '-'}`);
      setTokenModalMasked(true);
      setTokenModalOpen(true);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to load token', 'error');
    }
  };

  const handleRevokeToken = async (id: string) => {
    try {
      await fetchJson(`/api/authorization/tokens/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadTokens();
      notify('Token revoked', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to revoke token', 'error');
    }
  };

  const copyText = async (value: string, successMessage = 'Copied'): Promise<void> => {
    const text = String(value || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      notify(successMessage, 'success');
    } catch {
      notify('Failed to copy', 'error');
    }
  };

  const tokenModalDisplayValue = tokenModalMasked
    ? (tokenModalToken.length <= 8
      ? '•'.repeat(tokenModalToken.length)
      : `${tokenModalToken.slice(0, 4)}${'•'.repeat(Math.max(8, tokenModalToken.length - 8))}${tokenModalToken.slice(-4)}`)
    : tokenModalToken;

  return (
    <>
      <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-modern p-8 relative z-0">
          <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900">MCP Authorization</h2>
              <p className="text-slate-600 mt-1">{authSummary}</p>
            </div>

            <section id="authorizationMainCard" className="card p-0 overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50/80">
                <div className="px-5 pt-4">
                  <nav className="flex items-end gap-1" aria-label="Authorization tabs">
                    <button
                      id="tabToken"
                      type="button"
                      onClick={() => setActiveTab('token')}
                      className={activeTab === 'token'
                        ? 'px-4 py-2.5 rounded-t-lg text-sm font-semibold border border-slate-200 border-b-white bg-white text-slate-900 -mb-px'
                        : 'px-4 py-2.5 rounded-t-lg text-sm font-semibold border border-transparent text-slate-600 hover:text-blue-700 hover:bg-white/70'}
                    >
                      Token
                    </button>
                    {!isSaasMode && (
                      <button
                        id="tabPolicy"
                        type="button"
                        onClick={() => setActiveTab('policy')}
                        className={activeTab === 'policy'
                          ? 'px-4 py-2.5 rounded-t-lg text-sm font-semibold border border-slate-200 border-b-white bg-white text-slate-900 -mb-px'
                          : 'px-4 py-2.5 rounded-t-lg text-sm font-semibold border border-transparent text-slate-600 hover:text-blue-700 hover:bg-white/70'}
                      >
                        Policy
                      </button>
                    )}
                  </nav>
                </div>
              </div>

              {activeTab === 'token' && (
                <div id="tokenTabPanel" className="p-5 space-y-6">
                  <section className="card p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">Generate Token</h3>
                      <button
                        type="button"
                        onClick={handleGenerateToken}
                        disabled={isSubmitting || isBootstrapping}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
                      >
                        {isSubmitting ? 'Generating...' : 'Generate Token'}
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm text-slate-700 mb-1">Token Name</label>
                      <div className="relative">
                        <i className="fas fa-tag absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                        <input
                          value={tokenName}
                          onChange={(event) => setTokenName(event.target.value)}
                          className="input w-full pl-9"
                          placeholder="e.g. Claude Desktop, Cursor, Windsurf"
                          maxLength={120}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-700 mb-1">User</label>
                        <div className="relative">
                          <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                          <select
                            value={subjectUsername}
                            onChange={(event) => setSubjectUsername(event.target.value)}
                            className="input w-full pl-9 pr-9 appearance-none bg-white border-slate-200 hover:border-slate-300 focus:border-blue-400 shadow-sm"
                          >
                            {authContext.users.map((user) => (
                              <option key={user.username} value={user.username}>
                                {getUserLabel(user, isSaasMode)} ({user.role})
                              </option>
                            ))}
                          </select>
                          <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-slate-700 mb-1">Token Expiration</label>
                        <div className="relative">
                          <i className="fas fa-clock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                          <select
                            value={tokenTtlPreset}
                            onChange={(event) => setTokenTtlPreset(event.target.value)}
                            className="input w-full pl-9 pr-9 appearance-none bg-white border-slate-200 hover:border-slate-300 focus:border-blue-400 shadow-sm"
                          >
                            {TTL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">MCP Access Tree</h4>
                      <p className="text-xs text-slate-500 mb-2">Use 3-state policy for each item: Inherit, Allow, Deny.</p>

                      <div id="mcpTree" className="max-h-[28rem] overflow-auto border border-slate-200 rounded-lg p-3 space-y-3 bg-white">
                        <div className="border border-slate-200 rounded-lg bg-slate-50/50">
                          <div className="px-3 py-2 border-b border-slate-200 text-sm font-semibold text-slate-800 flex items-center gap-2">
                            <select
                              value={rootMcpRule}
                              onChange={(event: ChangeEvent<HTMLSelectElement>) => applyRootMcpCascade(event.target.value as TriSelect)}
                              className="h-7 text-xs border border-slate-300 rounded px-1 bg-white"
                            >
                              <option value="inherit">Inherit</option>
                              <option value="allow">Allow</option>
                              <option value="deny">Deny</option>
                            </select>
                            <span className="flex items-center gap-2">
                              <i className="fas fa-sitemap text-slate-500" />
                              <span>MCP Servers</span>
                            </span>
                          </div>

                          <div className="p-2 space-y-2">
                            {groupedUsers.map((group) => (
                              <details key={group.username} className="border border-slate-200 rounded-md bg-white" open>
                                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-800 flex items-center gap-2">
                                  <select
                                    value={pickTri(userRuleSelect, group.username)}
                                    onChange={(event) => handleUserRuleChange(group.username, event.target.value as TriSelect)}
                                    className="h-7 text-xs border border-slate-300 rounded px-1 bg-white"
                                  >
                                    <option value="inherit">Inherit</option>
                                    <option value="allow">Allow</option>
                                    <option value="deny">Deny</option>
                                  </select>
                                  <span className="flex items-center gap-2">
                                    <i className="fas fa-user text-slate-500" />
                                    <span>{group.displayName}</span>
                                    <span className="text-[11px] text-slate-500">({group.role})</span>
                                  </span>
                                </summary>

                                <div className="px-3 pb-3 space-y-2">
                                  {group.servers.length === 0 && <p className="text-xs text-slate-400 px-1 py-2">No servers for this user</p>}
                                  {group.servers.map((server) => (
                                    <details key={server.id} className="border border-slate-200 rounded-md bg-slate-50/50">
                                      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-800 flex items-center gap-2">
                                        <select
                                          value={pickTri(serverRuleSelect, server.id)}
                                          onChange={(event) => handleServerRuleChange(server.id, event.target.value as TriSelect)}
                                          className="h-7 text-xs border border-slate-300 rounded px-1 bg-white mr-1"
                                        >
                                          <option value="inherit">Inherit</option>
                                          <option value="allow">Allow</option>
                                          <option value="deny">Deny</option>
                                        </select>
                                        <span className="inline-flex items-center gap-2">
                                          <i className={`fas ${getMcpTypeIcon(server.type)} text-slate-500`} />
                                          <span>{getMcpDisplayName(server)}</span>
                                        </span>
                                      </summary>

                                      <div className="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <div className="text-xs font-semibold text-slate-600 mb-2">Tools</div>
                                          <div className="space-y-1 max-h-40 overflow-auto">
                                            {(server.tools || []).length === 0 && <p className="text-xs text-slate-400">No tools</p>}
                                            {(server.tools || []).map((id) => (
                                              <label key={id} className="inline-flex items-center gap-2 text-xs text-slate-700 w-full justify-between">
                                                <span className="font-mono truncate">{id.split('__').slice(-1)[0]}</span>
                                                <select
                                                  value={pickTri(toolRuleSelect, id)}
                                                  onChange={(event) => setToolRuleSelect((prev) => ({ ...prev, [id]: event.target.value as TriSelect }))}
                                                  className="h-6 text-[11px] border border-slate-300 rounded px-1 bg-white"
                                                >
                                                  <option value="inherit">Inherit</option>
                                                  <option value="allow">Allow</option>
                                                  <option value="deny">Deny</option>
                                                </select>
                                              </label>
                                            ))}
                                          </div>
                                        </div>

                                        <div>
                                          <div className="text-xs font-semibold text-slate-600 mb-2">Resources</div>
                                          <div className="space-y-1 max-h-40 overflow-auto">
                                            {(server.resources || []).length === 0 && <p className="text-xs text-slate-400">No resources</p>}
                                            {(server.resources || []).map((id) => (
                                              <label key={id} className="inline-flex items-center gap-2 text-xs text-slate-700 w-full justify-between">
                                                <span className="font-mono truncate">{id.split('__').slice(-1)[0]}</span>
                                                <select
                                                  value={pickTri(resourceRuleSelect, id)}
                                                  onChange={(event) => setResourceRuleSelect((prev) => ({ ...prev, [id]: event.target.value as TriSelect }))}
                                                  className="h-6 text-[11px] border border-slate-300 rounded px-1 bg-white"
                                                >
                                                  <option value="inherit">Inherit</option>
                                                  <option value="allow">Allow</option>
                                                  <option value="deny">Deny</option>
                                                </select>
                                              </label>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </details>
                                  ))}
                                </div>
                              </details>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <textarea
                        rows={4}
                        className="input w-full font-mono text-xs resize-none pr-12 pt-3"
                        placeholder="Generated token will appear here."
                        value={generatedToken}
                        readOnly
                      />
                      <button
                        type="button"
                        disabled={!generatedToken.trim()}
                        onClick={() => { void copyText(generatedToken, 'Token copied'); }}
                        className="absolute right-3 top-3 h-8 w-8 rounded-md border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Copy token"
                        aria-label="Copy token"
                      >
                        <i className="fas fa-copy text-sm" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">{tokenMeta}</p>
                  </section>

                  <section className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Existing Tokens</h3>
                      <button
                        type="button"
                        onClick={handleRefreshTokens}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 text-sm"
                      >
                        Refresh
                      </button>
                    </div>

                    <div id="tokenTableWrap" className="overflow-x-auto">
                      {tokens.length === 0 ? (
                        <p className="text-sm text-slate-500">No tokens found.</p>
                      ) : (
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left border-b border-slate-200">
                              <th className="py-2 pr-4 font-semibold text-slate-700">Token Name</th>
                              <th className="py-2 pr-4 font-semibold text-slate-700">User</th>
                              <th className="py-2 pr-4 font-semibold text-slate-700">Created</th>
                              <th className="py-2 pr-4 font-semibold text-slate-700">Expires</th>
                              <th className="py-2 pr-4 font-semibold text-slate-700">Status</th>
                              <th className="py-2 pr-4 font-semibold text-slate-700">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tokens.map((token) => (
                              <tr key={token.id} className="border-b border-slate-100">
                                <td className="py-2 pr-4">{token.tokenName || ''}</td>
                                <td className="py-2 pr-4">{token.subjectUsername}</td>
                                <td className="py-2 pr-4 text-slate-600">{token.createdAt || '-'}</td>
                                <td className="py-2 pr-4 text-slate-600">{formatTokenExpiry(token)}</td>
                                <td className="py-2 pr-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${token.revokedAt ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {token.revokedAt ? 'Revoked' : 'Active'}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => { void handleShowToken(token.id); }}
                                    className="show-token-btn px-2 py-1 rounded border border-slate-200 hover:border-blue-400 text-xs"
                                  >
                                    Show Token
                                  </button>
                                  {!token.revokedAt && (
                                    <button
                                      type="button"
                                      onClick={() => { void handleRevokeToken(token.id); }}
                                      className="revoke-token-btn px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 text-xs"
                                    >
                                      Revoke
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'policy' && !isSaasMode && (
                <div id="policyTabPanel" className="p-5 space-y-6">
                  <section className="card p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">Token Requirement Policy</h3>
                      <button
                        type="button"
                        onClick={() => { void handleSavePolicy(); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
                      >
                        Save Policy
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">Configure where token is required: Application, User, MCP Server, and Tool level.</p>

                    <div id="tokenPolicyTree" className="max-h-[28rem] overflow-auto border border-slate-200 rounded-lg p-3 space-y-3 bg-white">
                      <div className="border border-slate-200 rounded-lg bg-slate-50/50">
                        <div className="px-3 py-2 border-b border-slate-200 text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <select
                            value={policyRootRule}
                            onChange={(event) => setPolicyRootRule(event.target.value as PolicySelect)}
                            className="h-7 text-xs border border-slate-300 rounded px-1 bg-white"
                          >
                            <option value="require">Require Token</option>
                            <option value="no-token">No Token</option>
                          </select>
                          <span className="flex items-center gap-2">
                            <i className="fas fa-globe text-slate-500" />
                            <span>Application (All MCP)</span>
                          </span>
                        </div>

                        <div className="p-2 space-y-2">
                          {groupedUsers.map((group) => (
                            <details key={`policy-${group.username}`} className="border border-slate-200 rounded-md bg-white" open>
                              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-800 flex items-center gap-2">
                                <select
                                  value={pickPolicy(policyUserSelect, group.username)}
                                  onChange={(event) => handlePolicyUserChange(group.username, event.target.value as PolicySelect)}
                                  className="h-7 text-xs border border-slate-300 rounded px-1 bg-white"
                                >
                                  <option value="inherit">Inherit</option>
                                  <option value="require">Require Token</option>
                                  <option value="no-token">No Token</option>
                                </select>
                                <span className="flex items-center gap-2">
                                  <i className="fas fa-user text-slate-500" />
                                  <span>{group.displayName}</span>
                                  <span className="text-[11px] text-slate-500">({group.role})</span>
                                </span>
                              </summary>

                              <div className="px-3 pb-3 space-y-2">
                                {group.servers.length === 0 && <p className="text-xs text-slate-400 px-1 py-2">No servers for this user</p>}
                                {group.servers.map((server) => (
                                  <details key={`policy-${server.id}`} className="border border-slate-200 rounded-md bg-slate-50/50">
                                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-800 flex items-center gap-2">
                                      <select
                                        value={pickPolicy(policyServerSelect, server.id)}
                                        onChange={(event) => handlePolicyServerChange(server.id, event.target.value as PolicySelect)}
                                        className="h-7 text-xs border border-slate-300 rounded px-1 bg-white mr-1"
                                      >
                                        <option value="inherit">Inherit</option>
                                        <option value="require">Require Token</option>
                                        <option value="no-token">No Token</option>
                                      </select>
                                      <span className="inline-flex items-center gap-2">
                                        <i className={`fas ${getMcpTypeIcon(server.type)} text-slate-500`} />
                                        <span>{getMcpDisplayName(server)}</span>
                                      </span>
                                    </summary>

                                    <div className="px-3 pb-3">
                                      <div className="text-xs font-semibold text-slate-600 mb-2">Tools</div>
                                      <div className="space-y-1 max-h-40 overflow-auto">
                                        {(server.tools || []).length === 0 && <p className="text-xs text-slate-400">No tools</p>}
                                        {(server.tools || []).map((id) => (
                                          <label key={`policy-tool-${id}`} className="inline-flex items-center gap-2 text-xs text-slate-700 w-full justify-between">
                                            <span className="font-mono truncate">{id.split('__').slice(-1)[0]}</span>
                                            <select
                                              value={pickPolicy(policyToolSelect, id)}
                                              onChange={(event) => setPolicyToolSelect((prev) => ({ ...prev, [id]: event.target.value as PolicySelect }))}
                                              className="h-6 text-[11px] border border-slate-300 rounded px-1 bg-white"
                                            >
                                              <option value="inherit">Inherit</option>
                                              <option value="require">Require Token</option>
                                              <option value="no-token">No Token</option>
                                            </select>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  </details>
                                ))}
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {tokenModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70]"
            onClick={() => setTokenModalOpen(false)}
          />
          <div id="tokenModal" className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Token</h3>
                <button
                  type="button"
                  onClick={() => setTokenModalOpen(false)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800"
                  title="Close"
                >
                  <i className="fas fa-times text-sm" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <div className="relative">
                  <textarea rows={5} className="input w-full font-mono text-xs resize-none pr-24 pt-3" readOnly value={tokenModalDisplayValue} />
                  <div className="absolute right-3 top-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTokenModalMasked((current) => !current)}
                      className="h-8 w-8 rounded-md border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600"
                      title="Show / Hide Token"
                    >
                      <i className={`fas ${tokenModalMasked ? 'fa-eye' : 'fa-eye-slash'} text-sm`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { void copyText(tokenModalToken, 'Token copied'); }}
                      className="h-8 w-8 rounded-md border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600"
                      title="Copy Token"
                    >
                      <i className="fas fa-copy text-sm" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{tokenModalMeta}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

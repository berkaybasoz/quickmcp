import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../shared/api/http';

type TestMode = 'automated' | 'custom' | 'e2e';
type AutoTestType = 'quick' | 'full';
type CustomTestType = 'tools/call' | 'resources/list' | 'prompts/list';
type TransportType = 'all' | 'stdio' | 'sse' | 'streamable-http' | 'websocket';
type RunKind = 'none' | 'auto' | 'custom' | 'transport';

type ServerSummary = {
  id: string;
  name: string;
  type?: string;
};

type ServerTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

type ServerDetailsPayload = {
  config?: {
    name?: string;
    tools?: ServerTool[];
  };
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
};

type TransportListedTool = {
  name: string;
  description: string;
};

type TransportResult = {
  transport: Exclude<TransportType, 'all'>;
  status: 'success' | 'error';
  description: string;
  result?: string;
  error?: string;
  duration: number;
  protocolVersion?: string;
  listedTools?: TransportListedTool[];
};

const TEST_PAGE_TITLE = 'QuickMCP - Modern MCP Server Generator';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || 'Unknown error');
}

function getServerTypeIcon(type?: string): string {
  const t = String(type || '').toLowerCase();
  if (['mysql', 'postgresql', 'postgres', 'mssql', 'oracle', 'sqlite', 'mongodb', 'database'].includes(t)) return '🗄️';
  if (['rest', 'graphql', 'soap', 'rss', 'webhook', 'webpage', 'curl'].includes(t)) return '🌐';
  if (['openai', 'claude', 'gemini', 'grok', 'huggingface', 'llama', 'deepseek', 'azureopenai', 'mistral', 'cohere', 'perplexity', 'together', 'fireworks', 'groq', 'openrouter'].includes(t)) return '🤖';
  if (['csv', 'excel', 'localfs', 'ftp'].includes(t)) return '📄';
  if (['slack', 'discord', 'telegram', 'gmail', 'notion', 'airtable', 'hubspot', 'salesforce', 'github', 'gitlab'].includes(t)) return '🔌';
  return '🧩';
}

function serverOptionLabel(server: ServerSummary): string {
  return `${getServerTypeIcon(server.type)} ${String(server.name || server.id)}`;
}

function nextMcpRequestId(): string {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `mcp-fback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function postJsonRpc(url: string, message: unknown, extraHeaders?: Record<string, string>): Promise<any | null> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(extraHeaders || {})
    },
    body: JSON.stringify(message)
  });

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || `HTTP ${response.status}`);
  }
  if (payload?.error) {
    throw new Error(payload.error.message || 'MCP error');
  }
  return payload;
}

function extractServerToolsFromList(listPayload: any, serverId: string): TransportListedTool[] {
  const tools = Array.isArray(listPayload?.result?.tools) ? listPayload.result.tools : [];
  const prefix = `${serverId}__`;
  return tools
    .map((tool: any) => ({
      name: String(tool?.name || ''),
      description: String(tool?.description || '')
    }))
    .filter((tool: TransportListedTool) => tool.name.startsWith(prefix))
    .map((tool: TransportListedTool) => ({
      name: tool.name.slice(prefix.length),
      description: tool.description
    }));
}

async function resolveMcpTransportBaseUrl(): Promise<string> {
  try {
    const payload = await fetchJson<ApiEnvelope<Record<string, unknown>>>('/api/auth/config');
    const data = payload?.data && typeof payload.data === 'object' ? payload.data : {};
    const mcpPortRaw = data?.mcpPort ?? data?.mcpDefaultPort;
    const mcpPort = Number(mcpPortRaw);
    if (Number.isFinite(mcpPort) && mcpPort > 0) {
      return `${window.location.protocol}//${window.location.hostname}:${mcpPort}`;
    }
  } catch {}
  return `${window.location.protocol}//${window.location.host}`;
}

async function testStdioTransport(baseUrl: string): Promise<{ transport: 'stdio'; protocolVersion: string; listPayload: any }> {
  const init = await postJsonRpc(`${baseUrl}/api/mcp-stdio`, {
    jsonrpc: '2.0',
    id: nextMcpRequestId(),
    method: 'initialize',
    params: {}
  });

  const list = await postJsonRpc(`${baseUrl}/api/mcp-stdio`, {
    jsonrpc: '2.0',
    id: nextMcpRequestId(),
    method: 'tools/list',
    params: {}
  });

  return {
    transport: 'stdio',
    protocolVersion: init?.result?.protocolVersion || 'unknown',
    listPayload: list
  };
}

async function testSseTransport(baseUrl: string): Promise<{ transport: 'sse'; protocolVersion: string; listPayload: any }> {
  const controller = new AbortController();
  const sseResponse = await fetch(`${baseUrl}/sse`, {
    method: 'GET',
    headers: { Accept: 'text/event-stream' },
    signal: controller.signal
  });

  if (!sseResponse.ok || !sseResponse.body) {
    throw new Error(`SSE stream failed: HTTP ${sseResponse.status}`);
  }

  const reader = sseResponse.body.getReader();
  const decoder = new TextDecoder();
  let endpoint = '';
  let raw = '';

  while (!endpoint) {
    const chunk = await reader.read();
    if (chunk.done) break;
    raw += decoder.decode(chunk.value, { stream: true });
    const match = raw.match(/event:\s*endpoint\s*\n(?:.*\n)*?data:\s*([^\n]+)/);
    if (match && match[1]) endpoint = match[1].trim();
  }

  controller.abort();
  if (!endpoint) throw new Error('SSE endpoint event not received');

  const endpointUrl = endpoint.startsWith('http')
    ? endpoint
    : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const init = await postJsonRpc(endpointUrl, {
    jsonrpc: '2.0',
    id: nextMcpRequestId(),
    method: 'initialize',
    params: {}
  });

  const list = await postJsonRpc(endpointUrl, {
    jsonrpc: '2.0',
    id: nextMcpRequestId(),
    method: 'tools/list',
    params: {}
  });

  return {
    transport: 'sse',
    protocolVersion: init?.result?.protocolVersion || 'unknown',
    listPayload: list
  };
}

async function testStreamableHttpTransport(baseUrl: string): Promise<{ transport: 'streamable-http'; protocolVersion: string; listPayload: any }> {
  const init = await postJsonRpc(`${baseUrl}/mcp`, {
    jsonrpc: '2.0',
    id: nextMcpRequestId(),
    method: 'initialize',
    params: {}
  });

  const list = await postJsonRpc(`${baseUrl}/mcp`, {
    jsonrpc: '2.0',
    id: nextMcpRequestId(),
    method: 'tools/list',
    params: {}
  });

  return {
    transport: 'streamable-http',
    protocolVersion: init?.result?.protocolVersion || 'unknown',
    listPayload: list
  };
}

async function testWebSocketTransport(baseUrl: string): Promise<{ transport: 'websocket'; protocolVersion: string; listPayload: any }> {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = baseUrl.replace(/^https?:/, wsProtocol);

  const result = await new Promise<{ transport: 'websocket'; protocolVersion: string; listPayload: any }>((resolve, reject) => {
    const ws = new WebSocket(`${wsHost}/ws`);
    const expected = new Map<string, 'initialize' | 'tools/list'>();
    const timeout = window.setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error('WebSocket transport timeout'));
    }, 10000);

    const finish = (error?: unknown, value?: { transport: 'websocket'; protocolVersion: string; listPayload: any }) => {
      window.clearTimeout(timeout);
      try { ws.close(); } catch {}
      if (error) reject(error);
      else if (value) resolve(value);
      else reject(new Error('WebSocket transport failed'));
    };

    ws.onopen = () => {
      const initId = nextMcpRequestId();
      const listId = nextMcpRequestId();
      expected.set(initId, 'initialize');
      expected.set(listId, 'tools/list');
      ws.send(JSON.stringify({ jsonrpc: '2.0', id: initId, method: 'initialize', params: {} }));
      ws.send(JSON.stringify({ jsonrpc: '2.0', id: listId, method: 'tools/list', params: {} }));
    };

    let protocolVersion = 'unknown';
    let listPayload: any = null;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data || '{}'));
        if (payload?.error) {
          finish(new Error(payload.error.message || 'WebSocket MCP error'));
          return;
        }

        const kind = expected.get(String(payload?.id || ''));
        if (kind === 'initialize') {
          protocolVersion = payload?.result?.protocolVersion || 'unknown';
          expected.delete(String(payload.id));
        } else if (kind === 'tools/list') {
          listPayload = payload;
          expected.delete(String(payload.id));
        }

        if (expected.size === 0) {
          finish(undefined, { transport: 'websocket', protocolVersion, listPayload });
        }
      } catch (error) {
        finish(error);
      }
    };

    ws.onerror = () => finish(new Error('WebSocket connection failed'));
  });

  return result;
}

function generateParamsFromSchema(schema: unknown): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  if (!schema || typeof schema !== 'object') return next;

  const properties = (schema as { properties?: Record<string, { type?: string; description?: string }> }).properties;
  if (!properties || typeof properties !== 'object') return next;

  Object.entries(properties).forEach(([key, prop]) => {
    if (key === 'limit') {
      next[key] = 10;
      return;
    }
    if (key === 'offset') {
      next[key] = 0;
      return;
    }

    const type = String(prop?.type || '');
    if (type === 'string') next[key] = String(prop?.description || 'example_value');
    else if (type === 'number' || type === 'integer') next[key] = 0;
    else if (type === 'boolean') next[key] = false;
    else next[key] = 'value';
  });

  return next;
}

function formatAutoTestResults(testData: unknown): string {
  const data = (testData && typeof testData === 'object') ? (testData as any) : {};
  if (data.serverName && Array.isArray(data.results)) {
    const successCount = data.results.filter((r: any) => r?.status === 'success').length;
    const failedCount = data.results.filter((r: any) => r?.status === 'error').length;

    let output = `=== Test Results for ${data.serverName} ===\n`;
    output += `Total Tools: ${data.toolsCount ?? 0}\n`;
    output += `Tests Run: ${data.testsRun ?? 0}\n`;
    output += `PASS: ${successCount} | FAIL: ${failedCount}\n\n`;

    data.results.forEach((result: any) => {
      const status = result?.status === 'success' ? 'PASS' : 'FAIL';
      output += `${status} ${result?.tool || '-'}\n`;
      output += `   Description: ${result?.description || '-'}\n`;
      if (result?.parameters && typeof result.parameters === 'object' && Object.keys(result.parameters).length > 0) {
        output += `   Parameters: ${JSON.stringify(result.parameters)}\n`;
      }
      if (result?.status === 'success') {
        output += `   Result: ${result?.result || '-'}\n`;
        if (typeof result?.rowCount === 'number') {
          output += `   Rows: ${result.rowCount}\n`;
        }
      } else if (result?.error) {
        output += `   Error: ${result.error}\n`;
      }
      output += '\n';
    });

    return output;
  }

  if (data.testSuite) {
    let output = `=== Test Suite: ${data.testSuite.name || '-'} ===\n`;
    output += `Description: ${data.testSuite.description || '-'}\n`;
    output += `Duration: ${data.duration ?? 0}ms\n`;
    output += `Results: ${data.passedTests ?? 0}/${data.totalTests ?? 0} tests passed\n\n`;

    const results = Array.isArray(data.results) ? data.results : [];
    results.forEach((testResult: any) => {
      const status = testResult?.passed ? 'PASS' : 'FAIL';
      output += `${status} ${testResult?.testCase?.name || '-'} (${testResult?.duration ?? 0}ms)\n`;
      if (!testResult?.passed) {
        output += `   Error: ${testResult?.error || testResult?.response?.error || 'Test assertion failed'}\n`;
      }
      if (testResult?.response?.data) {
        const dataPreview = JSON.stringify(testResult.response.data, null, 2).slice(0, 200);
        output += `   Response: ${dataPreview}${dataPreview.length >= 200 ? '...' : ''}\n`;
      }
      output += '\n';
    });

    return output;
  }

  return JSON.stringify(testData, null, 2);
}

function formatCustomTestResult(testData: unknown): string {
  const data = (testData && typeof testData === 'object') ? (testData as any) : {};

  if (data.tool) {
    let output = '=== Custom Test Result ===\n';
    output += `Tool: ${data.tool}\n`;
    output += `Status: ${data.status === 'success' ? 'PASS' : 'FAIL'}\n`;
    if (data.description) output += `Description: ${data.description}\n`;
    if (data.parameters && typeof data.parameters === 'object' && Object.keys(data.parameters).length > 0) {
      output += `Parameters: ${JSON.stringify(data.parameters)}\n`;
    }
    output += '\n';

    if (data.status === 'success') {
      if (data.result) {
        output += `Result: ${typeof data.result === 'object' ? JSON.stringify(data.result, null, 2) : data.result}\n`;
      }
      if (typeof data.rowCount === 'number') output += `Rows: ${data.rowCount}\n`;
    } else if (data.error) {
      output += `Error: ${data.error}\n`;
    }

    return output;
  }

  if (data.testCase) {
    let output = '=== Custom Test Result ===\n';
    output += `Test: ${data.testCase?.name || '-'}\n`;
    output += `Duration: ${data.duration ?? 0}ms\n`;
    output += `Status: ${data.passed ? 'PASS' : 'FAIL'}\n\n`;

    if (!data.passed) {
      output += `Error: ${data.error || data.response?.error || 'Test assertion failed'}\n\n`;
    }

    if (data.response?.data) {
      output += `Response:\n${JSON.stringify(data.response.data, null, 2)}\n`;
    }

    return output;
  }

  return JSON.stringify(testData, null, 2);
}

function formatTransportResults(
  serverName: string,
  expectedTools: TransportListedTool[],
  results: TransportResult[]
): string {
  let output = '';

  results.forEach((result) => {
    const prettyTransport = result.transport === 'streamable-http' ? 'streamable_http' : result.transport;
    const listedMap = new Map((result.listedTools || []).map((tool) => [tool.name, tool]));
    const toolsToReport = expectedTools.length > 0 ? expectedTools : Array.from(listedMap.values());

    const toolRows = toolsToReport.map((tool) => {
      const listed = listedMap.get(tool.name);
      if (result.status !== 'success') {
        return {
          tool: tool.name,
          description: tool.description || listed?.description || 'No description',
          status: 'error' as const,
          error: result.error || 'Unknown transport error'
        };
      }
      if (listed) {
        return {
          tool: tool.name,
          description: tool.description || listed.description || 'No description',
          status: 'success' as const,
          result: 'Tool is listed via transport'
        };
      }
      return {
        tool: tool.name,
        description: tool.description || 'No description',
        status: 'error' as const,
        error: 'Tool not returned by transport tools/list'
      };
    });

    const successCount = toolRows.filter((row) => row.status === 'success').length;
    const failedCount = toolRows.filter((row) => row.status === 'error').length;

    output += `=== Test Results for ${serverName} (${prettyTransport}) ===\n`;
    output += `Total Tools: ${toolRows.length}\n`;
    output += `Tests Run: ${toolRows.length}\n`;
    output += `PASS: ${successCount} | FAIL: ${failedCount}\n\n`;

    toolRows.forEach((row) => {
      const rowStatus = row.status === 'success' ? 'PASS' : 'FAIL';
      output += `${rowStatus} ${row.tool}\n`;
      output += `   Description: ${row.description}\n`;
      if (row.status === 'success') {
        output += `   Result: ${row.result}\n`;
      } else {
        output += `   Error: ${row.error}\n`;
      }
      output += '\n';
    });

    if (result.status === 'success') {
      output += `Transport Protocol: ${result.protocolVersion || 'unknown'}\n`;
      output += `Transport Duration: ${result.duration}ms\n`;
      output += `Tools Returned by Transport: ${(result.listedTools || []).length}\n`;
    } else {
      output += `Transport Error: ${result.error || 'Unknown'}\n`;
      output += `Transport Duration: ${result.duration}ms\n`;
    }
    output += '\n';
  });

  return output;
}

function tabButtonClass(active: boolean, locked = false): string {
  if (locked) {
    return 'px-4 py-2.5 rounded-t-lg text-sm font-semibold border border-transparent text-slate-400 cursor-not-allowed';
  }
  if (active) {
    return 'px-4 py-2.5 rounded-t-lg text-sm font-semibold border border-slate-200 border-b-white bg-white text-slate-900 -mb-px';
  }
  return 'px-4 py-2.5 rounded-t-lg text-sm font-semibold border border-transparent text-slate-600 hover:text-blue-700 hover:bg-white/70';
}

export function TestServersPage() {
  const [testMode, setTestMode] = useState<TestMode>('automated');
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const [serversError, setServersError] = useState('');

  const [autoServerId, setAutoServerId] = useState('');
  const [customServerId, setCustomServerId] = useState('');
  const [transportServerId, setTransportServerId] = useState('');

  const [autoTestType, setAutoTestType] = useState<AutoTestType>('quick');
  const [testType, setTestType] = useState<CustomTestType>('tools/call');
  const [customToolName, setCustomToolName] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [testParams, setTestParams] = useState('{}');
  const [transportType, setTransportType] = useState<TransportType>('all');

  const [tools, setTools] = useState<ServerTool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [pendingToolPref, setPendingToolPref] = useState('');

  const [runKind, setRunKind] = useState<RunKind>('none');
  const [runningMessage, setRunningMessage] = useState('Running...');
  const [resultText, setResultText] = useState('');
  const [errorText, setErrorText] = useState('');

  const fallbackServerId = customServerId || autoServerId || '';
  const customServerForTools = customServerId || autoServerId || '';

  const autoRunLabel = useMemo(() => {
    if (runKind !== 'auto') return 'Run';
    return autoTestType === 'full' ? 'Running Full Test...' : 'Running Quick Test...';
  }, [runKind, autoTestType]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = TEST_PAGE_TITLE;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadServers = async () => {
      try {
        const payload = await fetchJson<ApiEnvelope<ServerSummary[]>>('/api/servers');
        const serverRows = Array.isArray(payload?.data)
          ? payload.data.filter((row) => row && typeof row.id === 'string')
          : [];

        if (cancelled) return;
        setServers(serverRows);

        if (serverRows.length === 0) {
          setServersError('No servers available - Generate a server first');
          return;
        }

        setServersError('');

        const params = new URLSearchParams(window.location.search);
        const querySelect = String(params.get('select') || '').trim();
        const storedSelect = String(localStorage.getItem('prefTestServerId') || '').trim();
        const preferredServerId = querySelect || storedSelect;

        const queryTool = String(params.get('tool') || '').trim();
        const storedTool = String(localStorage.getItem('prefTestToolName') || '').trim();
        const preferredTool = queryTool || storedTool;

        if (preferredServerId && serverRows.some((server) => server.id === preferredServerId)) {
          setAutoServerId(preferredServerId);
          setCustomServerId(preferredServerId);
          setTransportServerId(preferredServerId);
        }

        if (preferredTool) {
          setTestType('tools/call');
          setPendingToolPref(preferredTool);
        }

        localStorage.removeItem('prefTestServerId');
        localStorage.removeItem('prefTestToolName');
      } catch (error) {
        if (cancelled) return;
        setServers([]);
        setServersError(toErrorMessage(error));
      }
    };

    void loadServers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTools = async () => {
      if (testType !== 'tools/call' || !customServerForTools) {
        setTools([]);
        return;
      }

      setToolsLoading(true);
      try {
        const payload = await fetchJson<ApiEnvelope<ServerDetailsPayload>>(`/api/servers/${encodeURIComponent(customServerForTools)}`);
        const toolRows = Array.isArray(payload?.data?.config?.tools)
          ? payload.data!.config!.tools!.map((tool) => ({
              name: String(tool?.name || ''),
              description: String(tool?.description || ''),
              inputSchema: tool?.inputSchema
            })).filter((tool) => tool.name)
          : [];

        if (cancelled) return;
        setTools(toolRows);

        if (toolRows.length === 0) {
          setCustomToolName('');
          return;
        }

        if (pendingToolPref && toolRows.some((tool) => tool.name === pendingToolPref)) {
          const picked = toolRows.find((tool) => tool.name === pendingToolPref)!;
          setCustomToolName(picked.name);
          setTestParams(JSON.stringify(generateParamsFromSchema(picked.inputSchema), null, 2));
          setPendingToolPref('');
          return;
        }

        if (!toolRows.some((tool) => tool.name === customToolName)) {
          const first = toolRows[0];
          setCustomToolName(first.name);
          setTestParams(JSON.stringify(generateParamsFromSchema(first.inputSchema), null, 2));
        }
      } catch {
        if (cancelled) return;
        setTools([]);
        setCustomToolName('');
      } finally {
        if (!cancelled) setToolsLoading(false);
      }
    };

    void loadTools();
    return () => {
      cancelled = true;
    };
  }, [testType, customServerForTools, pendingToolPref, customToolName]);

  const handleToolSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    setCustomToolName(next);

    const picked = tools.find((tool) => tool.name === next);
    if (!picked) {
      setTestParams('{}');
      return;
    }
    const generated = generateParamsFromSchema(picked.inputSchema);
    setTestParams(JSON.stringify(generated, null, 2));
  };

  const runAutoTests = async () => {
    const serverId = autoServerId || customServerId;
    if (!serverId) {
      setErrorText('Please select a server to test');
      setResultText('');
      return;
    }

    const runAll = autoTestType === 'full';
    setRunKind('auto');
    setRunningMessage(runAll ? 'Running all tests... This may take a while.' : 'Running quick tests...');
    setErrorText('');
    setResultText('');

    try {
      const payload = await fetchJson<ApiEnvelope<unknown>>(`/api/servers/${encodeURIComponent(serverId)}/test`, {
        method: 'POST',
        body: JSON.stringify({ runAll })
      });

      if (!payload?.success) {
        throw new Error(String(payload?.error || payload?.message || 'Test run failed'));
      }

      setResultText(formatAutoTestResults(payload.data));
    } catch (error) {
      setErrorText(toErrorMessage(error));
    } finally {
      setRunKind('none');
      setRunningMessage('Running...');
    }
  };

  const runCustomTest = async () => {
    const serverId = customServerId || autoServerId;
    const name = testType === 'tools/call' ? customToolName : customNameInput.trim();

    if (!serverId || !name) {
      setErrorText('Please select a server and enter test name');
      setResultText('');
      return;
    }

    let params: unknown = {};
    const trimmed = String(testParams || '').trim();
    if (trimmed) {
      try {
        params = JSON.parse(trimmed);
      } catch {
        setErrorText('Invalid JSON in parameters');
        setResultText('');
        return;
      }
    }

    setRunKind('custom');
    setRunningMessage('Running custom request...');
    setErrorText('');
    setResultText('');

    try {
      const payload = await fetchJson<ApiEnvelope<unknown>>(`/api/servers/${encodeURIComponent(serverId)}/test`, {
        method: 'POST',
        body: JSON.stringify({
          testType,
          toolName: name,
          parameters: params
        })
      });

      if (!payload?.success) {
        throw new Error(String(payload?.error || payload?.message || 'Custom test failed'));
      }

      setResultText(formatCustomTestResult(payload.data));
    } catch (error) {
      setErrorText(toErrorMessage(error));
    } finally {
      setRunKind('none');
      setRunningMessage('Running...');
    }
  };

  const runTransportTests = async () => {
    const serverId = transportServerId || autoServerId || customServerId;
    if (!serverId) {
      setErrorText('Please select a server before running transport tests');
      setResultText('');
      return;
    }

    const shouldRunAll = transportType === 'all';
    const transports: Array<Exclude<TransportType, 'all'>> = shouldRunAll
      ? ['stdio', 'sse', 'streamable-http', 'websocket']
      : [transportType as Exclude<TransportType, 'all'>];

    setRunKind('transport');
    setRunningMessage(shouldRunAll ? 'Running all transport tests...' : `Running ${transportType} transport test...`);
    setErrorText('');
    setResultText('');

    try {
      const baseUrl = await resolveMcpTransportBaseUrl();
      const serverPayload = await fetchJson<ApiEnvelope<ServerDetailsPayload>>(`/api/servers/${encodeURIComponent(serverId)}`);
      if (!serverPayload?.success || !serverPayload?.data?.config) {
        throw new Error(String(serverPayload?.error || serverPayload?.message || 'Failed to load selected server details'));
      }

      const serverName = String(serverPayload.data.config.name || serverId);
      const expectedTools: TransportListedTool[] = Array.isArray(serverPayload.data.config.tools)
        ? serverPayload.data.config.tools
            .map((tool) => ({
              name: String(tool?.name || ''),
              description: String(tool?.description || '')
            }))
            .filter((tool) => tool.name)
        : [];

      const transportResults: TransportResult[] = [];

      for (const transport of transports) {
        const startedAt = Date.now();
        try {
          let data: { transport: Exclude<TransportType, 'all'>; protocolVersion: string; listPayload: any };
          if (transport === 'stdio') data = await testStdioTransport(baseUrl);
          else if (transport === 'sse') data = await testSseTransport(baseUrl);
          else if (transport === 'streamable-http') data = await testStreamableHttpTransport(baseUrl);
          else data = await testWebSocketTransport(baseUrl);

          transportResults.push({
            transport,
            status: 'success',
            description: `MCP ${transport.toUpperCase()} initialize + tools/list`,
            result: 'Transport request flow successful',
            duration: Date.now() - startedAt,
            protocolVersion: data.protocolVersion || 'unknown',
            listedTools: extractServerToolsFromList(data.listPayload, serverId)
          });
        } catch (error) {
          transportResults.push({
            transport,
            status: 'error',
            description: `MCP ${transport.toUpperCase()} initialize + tools/list`,
            error: toErrorMessage(error),
            duration: Date.now() - startedAt
          });
        }
      }

      setResultText(formatTransportResults(serverName, expectedTools, transportResults));
    } catch (error) {
      setErrorText(toErrorMessage(error));
    } finally {
      setRunKind('none');
      setRunningMessage('Running...');
    }
  };

  return (
    <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-modern px-8 pt-0 pb-8 relative z-0">
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
          <div id="test-tab" className="tab-content animate-fade-in">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900">Test Suite</h2>
              <p className="text-slate-600">Verify your server functionality.</p>
            </div>

            <div className="card mb-6 p-0 overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50/80">
                <div className="px-5 pt-4">
                  <nav className="flex items-end gap-1" aria-label="Test Suite tabs">
                    <button
                      type="button"
                      data-test-mode-tab="automated"
                      className={tabButtonClass(testMode === 'automated')}
                      onClick={() => setTestMode('automated')}
                    >
                      Automated Testing
                    </button>
                    <button
                      type="button"
                      data-test-mode-tab="custom"
                      className={tabButtonClass(testMode === 'custom')}
                      onClick={() => setTestMode('custom')}
                    >
                      Custom Request
                    </button>
                    <button
                      type="button"
                      data-test-mode-tab="e2e"
                      data-test-mode-locked="true"
                      disabled
                      aria-disabled="true"
                      title="E2E Testing yakında aktif olacak"
                      className={tabButtonClass(false, true)}
                    >
                      <i className="fas fa-lock mr-2 text-xs"></i>
                      E2E Testing
                    </button>
                  </nav>
                </div>
              </div>

              <div className={testMode === 'automated' ? 'p-6' : 'p-6 hidden'} data-test-mode-panel="automated">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_auto] gap-3 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Select Server</label>
                    <select id="autoTestServerSelect" className="input" value={autoServerId} onChange={(e) => setAutoServerId(e.target.value)}>
                      <option value="">Select a server to test</option>
                      {servers.map((server) => (
                        <option key={server.id} value={server.id}>{serverOptionLabel(server)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Type</label>
                    <select
                      id="autoTestType"
                      className="input"
                      value={autoTestType}
                      onChange={(e) => setAutoTestType((e.target.value === 'full' ? 'full' : 'quick'))}
                    >
                      <option value="quick">Quick Test</option>
                      <option value="full">Full Test</option>
                    </select>
                  </div>
                  <div className="flex">
                    <button
                      type="button"
                      id="runAutoTestsBtn"
                      onClick={runAutoTests}
                      disabled={runKind !== 'none'}
                      className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-md whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <i id="autoTestRunIcon" className={runKind === 'auto' ? 'fas fa-spinner fa-spin mr-2' : 'fas fa-play mr-2'}></i>
                      <span id="autoTestRunText">{autoRunLabel}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className={testMode === 'custom' ? 'p-6' : 'p-6 hidden'} data-test-mode-panel="custom">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Select Server</label>
                    <select id="customTestServerSelect" className="input" value={customServerId} onChange={(e) => setCustomServerId(e.target.value)}>
                      <option value="">Select a server to test</option>
                      {servers.map((server) => (
                        <option key={server.id} value={server.id}>{serverOptionLabel(server)}</option>
                      ))}
                    </select>
                    <select id="testServerSelect" className="hidden" value={fallbackServerId} onChange={(e) => setCustomServerId(e.target.value)}>
                      <option value="">Select a server to test</option>
                      {servers.map((server) => (
                        <option key={`hidden-${server.id}`} value={server.id}>{serverOptionLabel(server)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Type</label>
                      <select
                        id="testType"
                        className="input"
                        value={testType}
                        onChange={(e) => setTestType((e.target.value as CustomTestType) || 'tools/call')}
                      >
                        <option value="tools/call">Tool Call</option>
                        <option value="resources/list">Resource List</option>
                        <option value="prompts/list">Prompt List</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Name</label>
                      <div id="testNameContainer">
                        {testType === 'tools/call' && customServerForTools ? (
                          <select id="testName" className="input" value={customToolName} onChange={handleToolSelectChange}>
                            <option value="">{toolsLoading ? 'Loading tools...' : 'Select a tool to test'}</option>
                            {tools.map((tool) => (
                              <option key={tool.name} value={tool.name}>{`${tool.name} - ${tool.description || ''}`}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            id="testName"
                            placeholder="Enter test name"
                            className="input"
                            value={customNameInput}
                            onChange={(e) => setCustomNameInput(e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Params (JSON)</label>
                    <textarea
                      id="testParams"
                      rows={3}
                      className="input font-mono text-xs"
                      placeholder="{}"
                      value={testParams}
                      onChange={(e) => setTestParams(e.target.value)}
                    ></textarea>
                  </div>

                  <button
                    type="button"
                    id="runCustomTestBtn"
                    onClick={runCustomTest}
                    disabled={runKind !== 'none'}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <i className={runKind === 'custom' ? 'fas fa-spinner fa-spin mr-2' : 'fas fa-paper-plane mr-2'}></i>
                    Send Request
                  </button>
                </div>
              </div>

              <div className={testMode === 'e2e' ? 'p-6' : 'p-6 hidden'} data-test-mode-panel="e2e">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_auto] gap-3 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Select Server</label>
                    <select id="transportTestServerSelect" className="input" value={transportServerId} onChange={(e) => setTransportServerId(e.target.value)}>
                      <option value="">Select a server to test</option>
                      {servers.map((server) => (
                        <option key={`transport-${server.id}`} value={server.id}>{serverOptionLabel(server)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Transport</label>
                    <select
                      id="transportType"
                      className="input"
                      value={transportType}
                      onChange={(e) => setTransportType((e.target.value as TransportType) || 'all')}
                    >
                      <option value="all">All</option>
                      <option value="stdio">STDIO</option>
                      <option value="sse">SSE</option>
                      <option value="streamable-http">Streamable HTTP</option>
                      <option value="websocket">WebSocket</option>
                    </select>
                  </div>

                  <div className="flex">
                    <button
                      type="button"
                      id="runTransportTestBtn"
                      onClick={runTransportTests}
                      disabled={runKind !== 'none'}
                      className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-md whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <i className={runKind === 'transport' ? 'fas fa-spinner fa-spin mr-2' : 'fas fa-network-wired mr-2'}></i>
                      Run Transport Test
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div id="test-loading" className={runKind === 'none' ? 'hidden text-center text-sm text-blue-600 py-2' : 'text-center text-sm text-blue-600 py-2'}>
              {runningMessage}
            </div>
            <div id="test-error" className={errorText ? 'text-sm text-red-600 bg-red-50 p-3 rounded' : 'hidden text-sm text-red-600 bg-red-50 p-3 rounded'}>
              {errorText}
            </div>
            {serversError ? <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded">{serversError}</div> : null}

            <div className="card mt-8">
              <div className="p-4 border-b border-slate-200/60 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Results</h3>
                <span className="text-xs text-slate-500 font-mono">JSON Output</span>
              </div>
              <div className="p-0">
                <pre
                  id="test-results"
                  className={resultText ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-blue-300 p-6 text-xs font-mono overflow-auto max-h-96 border border-slate-200 dark:border-slate-700 rounded-lg whitespace-pre-wrap' : 'hidden bg-white dark:bg-slate-900 text-slate-800 dark:text-blue-300 p-6 text-xs font-mono overflow-auto max-h-96 border border-slate-200 dark:border-slate-700 rounded-lg whitespace-pre-wrap'}
                >
                  {resultText}
                </pre>
                <div id="no-results" className={resultText ? 'hidden p-12 text-center text-slate-400' : 'p-12 text-center text-slate-400'}>
                  <i className="fas fa-terminal text-3xl mb-3 opacity-50"></i>
                  <p>No results to display</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

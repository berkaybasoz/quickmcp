import { useState } from 'react';
import { useGenerateStore } from '../store/useGenerateStore';
import { DataSourceType, isDatabase, isConnectionTemplateSource } from '../types';

// ─── Curl parser ──────────────────────────────────────────────────────────────

function parseCurlCommand(raw: string): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
} {
  let str = raw.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (str.startsWith('curl')) str = str.slice(4).trim();

  let method = 'GET';
  let url = '';
  const headers: Record<string, string> = {};
  let body = '';

  // Extract method
  const methodMatch = str.match(/-X\s+([A-Z]+)|--request\s+([A-Z]+)/);
  if (methodMatch) method = (methodMatch[1] || methodMatch[2]).toUpperCase();

  // Extract URL
  const quotedUrl = str.match(/(?:^|\s)(https?:\/\/[^\s'"]+|'https?:\/\/[^']+'|"https?:\/\/[^"]+")/);
  if (quotedUrl) {
    url = quotedUrl[1].replace(/^['"]|['"]$/g, '');
  }

  // Extract headers
  const headerRe = /(?:-H|--header)\s+['"]([^'"]+)['"]/g;
  let hm: RegExpExecArray | null;
  while ((hm = headerRe.exec(str)) !== null) {
    const idx = hm[1].indexOf(':');
    if (idx > 0) {
      headers[hm[1].slice(0, idx).trim()] = hm[1].slice(idx + 1).trim();
    }
  }

  // Extract body
  const bodyMatch = str.match(/(?:-d|--data(?:-raw)?)\s+['"]([^'"]*)['"]/);
  if (bodyMatch) {
    body = bodyMatch[1];
    if (!methodMatch) method = 'POST';
  }

  return { url, method, headers, body };
}

// ─── Preview HTML helpers ─────────────────────────────────────────────────────

interface PreviewCardOpts {
  icon: string;
  color: string;
  typeLabel: string;
  title: string;
  subtitle: string;
  details: Array<{ label: string; value: string }>;
  tools: string[];
  cardBg?: string; // optional override for outer card bg+border classes
}

function buildGenericPreviewHtml(opts: PreviewCardOpts): string {
  const { icon, color, typeLabel, title, subtitle, details, tools, cardBg } = opts;
  const outerCls = cardBg ?? 'bg-slate-50 border-2 border-slate-300';

  const detailsHtml = details.filter((d) => d.value).map((d) => `
    <div>
      <span class="text-slate-500">${d.label}:</span>
      <span class="ml-2 font-mono text-slate-700 break-all">${d.value}</span>
    </div>`).join('');

  const toolsHtml = tools.map((t) => `
    <div class="flex items-start gap-2 text-sm">
      <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
      <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t}</code>
    </div>`).join('');

  return `
<div class="space-y-4">
  <div class="${outerCls} rounded-xl p-6">
    <div class="flex items-start gap-4">
      <div class="w-12 h-12 rounded-lg bg-${color}-100 text-${color}-600 flex items-center justify-center flex-shrink-0">
        <i class="fas fa-${icon} text-2xl"></i>
      </div>
      <div class="flex-1">
        <h3 class="font-bold text-slate-900 text-lg mb-1">${typeLabel} — ${title}</h3>
        <p class="text-slate-700 mb-3">${subtitle}</p>
        ${detailsHtml ? `
        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
          <div class="grid grid-cols-1 gap-2 text-sm">${detailsHtml}</div>
        </div>` : ''}
        ${tools.length ? `
        <div class="bg-white rounded-lg p-4 border border-slate-200">
          <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
          <div class="grid grid-cols-2 gap-2">${toolsHtml}</div>
        </div>` : ''}
      </div>
    </div>
  </div>
</div>`;
}

// ─── AI model preview ─────────────────────────────────────────────────────────

function buildAIModelPreviewHtml(opts: {
  img: string; alt: string; title: string; apiDesc: string;
  baseUrl: string; tools: { name: string; desc: string }[];
}): string {
  const toolRows = opts.tools.map(t =>
    `<div class="flex items-start gap-2 text-sm"><i class="fas fa-wrench text-slate-400 mt-0.5"></i><div><code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code><p class="text-xs text-slate-500 mt-0.5">${t.desc}</p></div></div>`
  ).join('');
  return `<div class="space-y-4"><div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6"><div class="flex items-start gap-4"><div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0"><img src="/images/app/${opts.img}" alt="${opts.alt}" class="w-8 h-8 object-contain" /></div><div class="flex-1"><h3 class="font-bold text-slate-900 text-lg mb-2">${opts.title} Configuration</h3><p class="text-slate-700 mb-3">This server will generate tools to interact with ${opts.apiDesc}.</p><div class="bg-white rounded-lg p-4 mb-3 border border-slate-200"><div class="grid grid-cols-2 gap-4 text-sm"><div><span class="text-slate-500">Base URL:</span><span class="ml-2 font-mono text-slate-700">${opts.baseUrl || 'Not set'}</span></div></div></div><div class="bg-white rounded-lg p-4 mb-3 border border-slate-200"><label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${opts.tools.length})</label><div class="grid grid-cols-2 gap-2">${toolRows}</div></div></div></div></div></div>`;
}

// ─── DB/CSV/REST preview (with table/tool checkboxes) ─────────────────────────

export function buildDbTablePreviewHtml(parsedData: any[]): string {
  if (!parsedData || parsedData.length === 0) {
    return '<p class="text-slate-500 text-sm">No tables found.</p>';
  }

  const TOOL_COLORS: Record<string, string> = {
    get: 'text-blue-600 border-blue-300 focus:ring-blue-500',
    create: 'text-green-600 border-green-300 focus:ring-green-500',
    update: 'text-yellow-600 border-yellow-300 focus:ring-yellow-500',
    delete: 'text-red-600 border-red-300 focus:ring-red-500',
    count: 'text-purple-600 border-purple-300 focus:ring-purple-500',
    min: 'text-indigo-600 border-indigo-300 focus:ring-indigo-500',
    max: 'text-pink-600 border-pink-300 focus:ring-pink-500',
    sum: 'text-teal-600 border-teal-300 focus:ring-teal-500',
    avg: 'text-orange-600 border-orange-300 focus:ring-orange-500',
  };

  let html = '<div class="space-y-4">';
  html += `
    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div class="flex items-start space-x-3">
        <i class="fas fa-info-circle text-blue-500 mt-1"></i>
        <div>
          <h3 class="font-semibold text-blue-900 mb-1">Configure Your MCP Server</h3>
          <p class="text-blue-800 text-sm">Select which tables to include and choose which tools to generate for each table. All tools are enabled by default.</p>
        </div>
      </div>
    </div>`;

  parsedData.forEach((data: any, index: number) => {
    const tableName = data.tableName || `Table ${index + 1}`;
    const panelId = `table-panel-${index}`;
    const headers: string[] = data.headers || [];
    const rowCount: number = data.metadata?.rowCount ?? (data.rows?.length ?? 0);
    const columnCount: number = data.metadata?.columnCount ?? headers.length;
    const dataTypes: Record<string, string> = data.metadata?.dataTypes || {};

    const numericColumns = headers.filter((h: string) => {
      const t = (dataTypes[h] || '').toLowerCase();
      return t === 'integer' || t === 'number' || t === 'float' || t === 'decimal' || t === 'numeric';
    });

    const BASIC_TOOLS = ['get', 'create', 'update', 'delete', 'count'];
    const AGG_TOOLS = ['min', 'max', 'sum', 'avg'];
    const tools = numericColumns.length > 0 ? [...BASIC_TOOLS, ...AGG_TOOLS] : BASIC_TOOLS;

    const toolCheckboxes = tools.map((t) => {
      const cls = TOOL_COLORS[t] || 'text-gray-700 border-gray-300';
      return `
        <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
          <input type="checkbox" id="tool-${t}-${index}" class="w-4 h-4 ${cls} border rounded focus:ring-2" checked>
          <span class="text-sm font-medium text-gray-700">${t.toUpperCase()}</span>
        </label>`;
    }).join('');

    const rows: any[][] = data.rows || [];
    let tableDataHtml = '';
    if (headers.length > 0) {
      const headerCells = headers.map((h: string) =>
        `<th class="px-3 py-2 text-left font-medium text-gray-700">${h} <span class="text-xs text-gray-500">(${dataTypes[h] || 'string'})</span></th>`
      ).join('');
      const dataRows = rows.slice(0, 5).map((row: any[], ri: number) =>
        `<tr class="${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">${row.map((cell: any) => `<td class="px-3 py-2 text-gray-900">${cell ?? ''}</td>`).join('')}</tr>`
      ).join('');
      const moreRow = rows.length > 5
        ? `<tr><td colspan="${headers.length}" class="px-3 py-2 text-center text-gray-500 italic">... and ${rows.length - 5} more rows</td></tr>`
        : '';
      tableDataHtml = `
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead><tr class="bg-gray-100">${headerCells}</tr></thead>
            <tbody>${dataRows}${moreRow}</tbody>
          </table>
        </div>`;
    }

    html += `
      <div class="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden mb-4 table-selection-panel">
        <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" id="table-select-${index}" data-table-name="${tableName}"
                     class="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                     checked onchange="window.toggleTableSelection(${index})">
              <div>
                <h4 class="font-semibold text-gray-900 text-lg">${tableName}</h4>
                <p class="text-sm text-gray-600">${rowCount} rows, ${columnCount} columns</p>
              </div>
            </label>
            <button class="text-gray-400 hover:text-gray-600 transition-colors" onclick="window.toggleTableDetails('${panelId}')">
              <i id="${panelId}-icon" class="fas fa-chevron-down transition-transform"></i>
            </button>
          </div>
        </div>

        <div id="table-tools-${index}" class="bg-blue-50 p-4 border-b border-gray-200">
          <h5 class="font-medium text-gray-900 mb-3">
            <i class="fas fa-tools mr-2 text-blue-500"></i>Select Tools to Generate
          </h5>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            ${toolCheckboxes}
          </div>
          ${numericColumns.length > 0 ? `
          <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-sm text-green-800">
              <i class="fas fa-calculator mr-2"></i>
              <strong>Aggregate tools available:</strong> This table has ${numericColumns.length} numeric column(s):
              <span class="font-mono">${numericColumns.join(', ')}</span>
            </p>
          </div>` : ''}
          <div class="mt-4 flex items-center space-x-4">
            <button onclick="window.selectAllTools(${index})" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
              <i class="fas fa-check-square mr-1"></i>Select All
            </button>
            <button onclick="window.deselectAllTools(${index})" class="text-sm text-gray-600 hover:text-gray-800 font-medium">
              <i class="fas fa-square mr-1"></i>Deselect All
            </button>
            <button onclick="window.selectOnlyBasicTools(${index})" class="text-sm text-green-600 hover:text-green-800 font-medium">
              <i class="fas fa-check mr-1"></i>Basic Only
            </button>
          </div>
        </div>

        <div id="${panelId}" class="p-4 hidden">
          ${tableDataHtml}
        </div>
      </div>`;
  });

  html += '</div>';
  return html;
}

export function buildRestEndpointsPreviewHtml(parsedData: any[]): string {
  if (!parsedData || parsedData.length === 0) {
    return '<p class="text-slate-500 text-sm">No endpoints found.</p>';
  }

  const rows = parsedData.map((ep: any, i: number) => {
    const method = (ep.method || 'GET').toUpperCase();
    return `
    <label class="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
      <input type="checkbox" id="rest-endpoint-${i}" data-endpoint-path="${ep.path || ''}" data-endpoint-method="${method}" checked
             class="w-4 h-4 text-blue-600 border-gray-300 rounded">
      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-700">${method}</span>
      <span class="font-mono text-sm text-slate-800 truncate">${ep.path || ep.operationId || ''}</span>
      ${ep.summary ? `<span class="text-xs text-slate-500 truncate">${ep.summary}</span>` : ''}
    </label>`;
  }).join('');

  return `
<div class="space-y-4">
  <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
    <div class="flex items-start space-x-3">
      <i class="fas fa-info-circle text-blue-500 mt-1"></i>
      <div>
        <h3 class="font-semibold text-blue-900 mb-1">Configure Your MCP Server</h3>
        <p class="text-blue-800 text-sm">Select which endpoints to include as tools in your MCP server.</p>
      </div>
    </div>
  </div>
  <div class="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
    <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
      <h4 class="font-semibold text-gray-900 text-lg">Discovered Endpoints</h4>
      <p class="text-sm text-gray-600">Select endpoints to generate as tools.</p>
    </div>
    <div class="p-4 space-y-2">${rows}</div>
  </div>
</div>`;
}

// ─── Redis/Hazelcast group preview ────────────────────────────────────────────

export function buildConnectionGroupPreviewHtml(parsedData: any[], prefix: string): string {
  if (!parsedData || parsedData.length === 0) {
    return '<p class="text-slate-500 text-sm">No groups found.</p>';
  }

  const infoText: Record<string, { title: string; subtitle: string }> = {
    redis: { title: 'Configure Redis Tool Groups', subtitle: 'Select group(s) and specific tools to include in your MCP server. Example groups: MAPS, QUEUES, DIAGNOSTICS, STRINGS.' },
    hazelcast: { title: 'Configure Hazelcast Tool Groups', subtitle: 'Select group(s) and specific tools to include in your MCP server. Example groups: MAPS, QUEUES, SETS, LISTS, TOPICS, DIAGNOSTICS.' },
    kafka: { title: 'Configure Kafka Tool Groups', subtitle: 'Select group(s) and specific tools to include in your MCP server.' },
  };
  const info = infoText[prefix] || { title: 'Configure Tool Groups', subtitle: 'Select groups and tools to include.' };

  let html = `<div class="space-y-4">
    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div class="flex items-start space-x-3">
        <i class="fas fa-info-circle text-blue-500 mt-1"></i>
        <div>
          <h3 class="font-semibold text-blue-900 mb-1">${info.title}</h3>
          <p class="text-blue-800 text-sm">${info.subtitle}</p>
        </div>
      </div>
    </div>`;

  parsedData.forEach((group: any, i: number) => {
    const groupName = group.tableName || group.name || group.group || `GROUP_${i + 1}`;
    const rows: any[][] = Array.isArray(group.rows) ? group.rows : [];
    const panelId = `${prefix}-group-tools-${i}`;
    const iconId = `${prefix}-group-icon-${i}`;

    const toolItems = rows.map((row: any[], ti: number) => {
      const toolName = String(row?.[0] || '').trim();
      const toolDesc = String(row?.[1] || '');
      return `
        <label class="flex items-start gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
          <input type="checkbox" id="${prefix}-tool-${i}-${ti}" data-tool-name="${toolName}" checked
                 class="w-4 h-4 text-blue-600 border-gray-300 rounded mt-0.5">
          <div>
            <div class="text-sm font-mono text-gray-900">${toolName}</div>
            ${toolDesc ? `<div class="text-xs text-gray-600">${toolDesc}</div>` : ''}
          </div>
        </label>`;
    }).join('');

    html += `
      <div class="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden mb-4">
        <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" id="${prefix}-group-select-${i}" checked
                     onchange="window.toggle${prefix.charAt(0).toUpperCase() + prefix.slice(1)}GroupSelection(${i})"
                     class="w-4 h-4 text-blue-600 border-gray-300 rounded">
              <div>
                <h4 class="font-semibold text-gray-900 text-lg">${groupName}</h4>
                <p class="text-sm text-gray-600">${rows.length} tool(s)</p>
              </div>
            </label>
            <button class="text-gray-400 hover:text-gray-700 transition-colors"
                    onclick="window.toggleGroupDetails('${panelId}', '${iconId}')" title="Expand/Collapse">
              <i id="${iconId}" class="fas fa-chevron-down transition-transform"></i>
            </button>
          </div>
        </div>
        <div id="${panelId}" class="hidden p-4 bg-blue-50 border-b border-gray-200 space-y-2">
          ${toolItems}
          <div class="pt-2 flex items-center gap-4">
            <button onclick="window.selectAllGroupTools('${prefix}', ${i})" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
              <i class="fas fa-check-square mr-1"></i>Select All
            </button>
            <button onclick="window.deselectAllGroupTools('${prefix}', ${i})" class="text-sm text-gray-600 hover:text-gray-800 font-medium">
              <i class="fas fa-square mr-1"></i>Deselect All
            </button>
          </div>
        </div>
      </div>`;
  });

  html += '</div>';
  return html;
}

// ─── Direct data source builders ─────────────────────────────────────────────

interface DirectResult {
  dataSource: Record<string, any>;
  parsedData: any[] | null;
  html: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type S = ReturnType<typeof useGenerateStore.getState>;

function card(type: string, s: S): DirectResult {
  const T = DataSourceType;

  // ── HTTP / Web ───────────────────────────────────────────────────────────────
  if (type === T.Webpage) {
    const ds = { type, name: s.webUrl, url: s.webUrl };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'rocket', color: 'blue', typeLabel: 'Web Page',
        title: s.webUrl || 'Web Page', subtitle: 'This server will fetch HTML content from the specified URL at runtime.',
        cardBg: 'bg-indigo-50 border-2 border-indigo-200',
        details: [
          { label: 'URL', value: s.webUrl },
        ],
        tools: ['fetch_webpage'],
      }),
    };
  }

  if (type === T.Curl) {
    let ds: Record<string, any>;
    if (s.curlMode === 'paste') {
      const parsed = parseCurlCommand(s.curlCommand);
      ds = { type, url: parsed.url, method: parsed.method, headers: parsed.headers, body: parsed.body };
    } else {
      let headers: Record<string, string> = {};
      try { headers = JSON.parse(s.curlHeaders || '{}'); } catch { headers = {}; }
      ds = { type, url: s.curlUrl, method: s.curlMethod, headers, body: s.curlBody };
    }
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'terminal', color: 'sky', typeLabel: 'cURL',
        title: ds.url || 'cURL Request', subtitle: 'This server will generate a single tool to execute the configured cURL request.',
        cardBg: 'bg-sky-50 border-2 border-sky-200',
        details: [
          { label: 'Method', value: ds.method },
          { label: 'URL', value: ds.url },
        ],
        tools: ['execute_curl_request'],
      }),
    };
  }

  if (type === T.GraphQL) {
    let headers: Record<string, string> = {};
    try { headers = JSON.parse(s.graphqlHeaders || '{}'); } catch { headers = {}; }
    const ds = { type, name: 'GraphQL', baseUrl: s.graphqlBaseUrl, headers };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'project-diagram', color: 'pink', typeLabel: 'GraphQL',
        title: s.graphqlBaseUrl || 'GraphQL API', subtitle: 'Execute GraphQL queries and mutations',
        details: [{ label: 'Endpoint', value: s.graphqlBaseUrl }],
        tools: ['execute_query', 'execute_mutation', 'get_schema'],
      }),
    };
  }

  if (type === T.Soap) {
    let headers: Record<string, string> = {};
    try { headers = JSON.parse(s.soapHeaders || '{}'); } catch { headers = {}; }
    const ds = { type, name: 'SOAP', baseUrl: s.soapBaseUrl, wsdlUrl: s.soapWsdlUrl, soapAction: s.soapAction, headers };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'exchange-alt', color: 'indigo', typeLabel: 'SOAP',
        title: s.soapBaseUrl || 'SOAP Service', subtitle: 'SOAP web service',
        details: [
          { label: 'Base URL', value: s.soapBaseUrl },
          { label: 'WSDL URL', value: s.soapWsdlUrl },
        ],
        tools: ['call_operation', 'get_wsdl'],
      }),
    };
  }

  if (type === T.Rss) {
    const ds = { type, name: 'RSS/Atom', feedUrl: s.rssFeedUrl };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'rss', color: 'orange', typeLabel: 'RSS/Atom Feed',
        title: s.rssFeedUrl || 'RSS Feed', subtitle: 'Read RSS/Atom feed entries',
        details: [{ label: 'Feed URL', value: s.rssFeedUrl }],
        tools: ['get_feed', 'list_entries'],
      }),
    };
  }

  // ── GitHub ───────────────────────────────────────────────────────────────────
  if (type === T.GitHub) {
    const ds = { type, name: 'GitHub', token: s.githubToken, owner: s.githubOwner, repo: s.githubRepo };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'code-branch', color: 'slate', typeLabel: 'GitHub',
        title: s.githubOwner && s.githubRepo ? `${s.githubOwner}/${s.githubRepo}` : 'GitHub Repository',
        subtitle: 'Manage GitHub repositories, issues and pull requests',
        details: [
          { label: 'Owner', value: s.githubOwner },
          { label: 'Repository', value: s.githubRepo },
        ],
        tools: ['list_repos', 'get_repo', 'list_issues', 'create_issue', 'list_pull_requests', 'get_file', 'list_commits'],
      }),
    };
  }

  // ── MongoDB ──────────────────────────────────────────────────────────────────
  if (type === T.MongoDB) {
    const ds = { type, name: 'MongoDB', host: s.mongoHost, port: Number(s.mongoPort), database: s.mongoDatabase, username: s.mongoUsername, password: s.mongoPassword, authSource: s.mongoAuthSource };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'leaf', color: 'green', typeLabel: 'MongoDB',
        title: s.mongoDatabase || 'MongoDB', subtitle: `${s.mongoHost}:${s.mongoPort}`,
        details: [
          { label: 'Host', value: s.mongoHost },
          { label: 'Port', value: s.mongoPort },
          { label: 'Database', value: s.mongoDatabase },
          { label: 'User', value: s.mongoUsername },
        ],
        tools: ['find_documents', 'insert_document', 'update_documents', 'delete_documents', 'aggregate', 'count_documents'],
      }),
    };
  }

  // ── Prometheus / Grafana ─────────────────────────────────────────────────────
  if (type === T.Prometheus) {
    const ds = { type, name: 'Prometheus', baseUrl: s.prometheusBaseUrl };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'fire', color: 'orange', typeLabel: 'Prometheus',
        title: s.prometheusBaseUrl || 'Prometheus', subtitle: 'Query Prometheus metrics',
        details: [{ label: 'Base URL', value: s.prometheusBaseUrl }],
        tools: ['query', 'query_range', 'list_metrics', 'get_targets', 'get_alerts'],
      }),
    };
  }

  if (type === T.Grafana) {
    const ds: Record<string, any> = { type, name: 'Grafana', baseUrl: s.grafanaBaseUrl, authType: s.grafanaAuthType };
    if (s.grafanaAuthType === 'apiKey') ds.apiKey = s.grafanaApiKey;
    else { ds.username = s.grafanaUsername; ds.password = s.grafanaPassword; }
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'chart-bar', color: 'orange', typeLabel: 'Grafana',
        title: s.grafanaBaseUrl || 'Grafana', subtitle: 'Access Grafana dashboards and alerts',
        details: [
          { label: 'Base URL', value: s.grafanaBaseUrl },
          { label: 'Auth', value: s.grafanaAuthType === 'apiKey' ? 'API Key' : 'Basic Auth' },
        ],
        tools: ['list_dashboards', 'get_dashboard', 'list_data_sources', 'get_alerts', 'query_data_source'],
      }),
    };
  }

  // ── Email / Gmail ────────────────────────────────────────────────────────────
  if (type === T.Email) {
    const ds = { type, name: 'Email', mode: s.emailMode, imapHost: s.emailImapHost, imapPort: Number(s.emailImapPort), smtpHost: s.emailSmtpHost, smtpPort: Number(s.emailSmtpPort), username: s.emailUsername, password: s.emailPassword, secure: s.emailSecure };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'envelope', color: 'blue', typeLabel: 'Email (IMAP/SMTP)',
        title: s.emailUsername || 'Email Account', subtitle: `Mode: ${s.emailMode}`,
        details: [
          { label: 'IMAP Host', value: s.emailImapHost },
          { label: 'SMTP Host', value: s.emailSmtpHost },
          { label: 'Username', value: s.emailUsername },
        ],
        tools: ['list_folders', 'list_emails', 'get_email', 'send_email', 'reply_email'],
      }),
    };
  }

  if (type === T.Gmail) {
    const ds = { type, name: 'Gmail', mode: s.gmailMode, imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587, username: s.gmailUsername, password: s.gmailPassword, secure: s.gmailSecure };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'envelope', color: 'red', typeLabel: 'Gmail',
        title: s.gmailUsername || 'Gmail Account', subtitle: `Mode: ${s.gmailMode}`,
        details: [
          { label: 'Username', value: s.gmailUsername },
          { label: 'Mode', value: s.gmailMode },
        ],
        tools: ['list_emails', 'get_email', 'send_email', 'reply_email'],
      }),
    };
  }

  // ── Slack / Discord ──────────────────────────────────────────────────────────
  if (type === T.Slack) {
    const ds = { type, name: 'Slack', botToken: s.slackBotToken, defaultChannel: s.slackDefaultChannel };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'slack', color: 'purple', typeLabel: 'Slack',
        title: 'Slack Workspace', subtitle: s.slackDefaultChannel ? `Default: ${s.slackDefaultChannel}` : 'Manage messages and channels',
        details: [{ label: 'Default Channel', value: s.slackDefaultChannel }],
        tools: ['list_channels', 'send_message', 'list_messages', 'get_channel_info', 'list_users'],
      }),
    };
  }

  if (type === T.Discord) {
    const ds = { type, name: 'Discord', botToken: s.discordBotToken, defaultGuildId: s.discordDefaultGuildId, defaultChannelId: s.discordDefaultChannelId };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'comment-dots', color: 'indigo', typeLabel: 'Discord',
        title: 'Discord Server', subtitle: 'Manage Discord messages and channels',
        details: [
          { label: 'Guild ID', value: s.discordDefaultGuildId },
          { label: 'Channel ID', value: s.discordDefaultChannelId },
        ],
        tools: ['list_guilds', 'list_channels', 'send_message', 'list_messages', 'create_channel'],
      }),
    };
  }

  // ── Docker / Kubernetes / OpenShift ─────────────────────────────────────────
  if (type === T.Docker) {
    const ds = { type, name: 'Docker', dockerPath: s.dockerPath };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'docker', color: 'blue', typeLabel: 'Docker',
        title: 'Docker', subtitle: 'Manage Docker containers and images',
        details: [{ label: 'Docker Path', value: s.dockerPath }],
        tools: ['list_containers', 'start_container', 'stop_container', 'list_images', 'pull_image', 'inspect_container'],
      }),
    };
  }

  if (type === T.Kubernetes) {
    const ds = { type, name: 'Kubernetes', kubectlPath: s.kubectlPath, kubeconfig: s.kubeconfigPath, namespace: s.kubernetesNamespace };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'dharmachakra', color: 'blue', typeLabel: 'Kubernetes',
        title: 'Kubernetes', subtitle: `Namespace: ${s.kubernetesNamespace || 'default'}`,
        details: [
          { label: 'kubectl Path', value: s.kubectlPath },
          { label: 'Namespace', value: s.kubernetesNamespace },
          { label: 'Kubeconfig', value: s.kubeconfigPath },
        ],
        tools: ['list_pods', 'get_pod', 'list_deployments', 'scale_deployment', 'list_services', 'list_namespaces'],
      }),
    };
  }

  if (type === T.OpenShift) {
    const ds = { type, name: 'OpenShift', kubectlPath: s.kubectlPath, kubeconfig: s.kubeconfigPath, namespace: s.kubernetesNamespace };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'dharmachakra', color: 'red', typeLabel: 'OpenShift',
        title: 'OpenShift', subtitle: `Namespace: ${s.kubernetesNamespace || 'default'}`,
        details: [
          { label: 'Namespace', value: s.kubernetesNamespace },
          { label: 'Kubeconfig', value: s.kubeconfigPath },
        ],
        tools: ['list_pods', 'get_pod', 'list_deployments', 'scale_deployment', 'list_routes', 'list_projects'],
      }),
    };
  }

  // ── Elasticsearch / OpenSearch ────────────────────────────────────────────────
  if (type === T.Elasticsearch) {
    const ds = { type, name: 'Elasticsearch', baseUrl: s.esBaseUrl };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'search', color: 'yellow', typeLabel: 'Elasticsearch',
        title: s.esBaseUrl || 'Elasticsearch', subtitle: 'Search and analytics engine',
        details: [{ label: 'Base URL', value: s.esBaseUrl }],
        tools: ['search', 'get_document', 'index_document', 'update_document', 'delete_document', 'list_indices'],
      }),
    };
  }

  if (type === T.OpenSearch) {
    const ds = { type, name: 'OpenSearch', baseUrl: s.opensearchBaseUrl };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'search', color: 'blue', typeLabel: 'OpenSearch',
        title: s.opensearchBaseUrl || 'OpenSearch', subtitle: 'OpenSearch engine',
        details: [{ label: 'Base URL', value: s.opensearchBaseUrl }],
        tools: ['search', 'get_document', 'index_document', 'update_document', 'delete_document', 'list_indices'],
      }),
    };
  }

  // ── FTP / LocalFS ────────────────────────────────────────────────────────────
  if (type === T.Ftp) {
    const ds = { type, name: 'FTP', host: s.ftpHost, port: Number(s.ftpPort), username: s.ftpUsername, password: s.ftpPassword, basePath: s.ftpBasePath, secure: s.ftpSecure };
    const isSftp = Number(s.ftpPort) === 22;
    const protocolName = isSftp ? 'SFTP' : (s.ftpSecure ? 'FTPS' : 'FTP');
    const ftpTools = [
      { name: 'list_files', desc: 'List files and directories in a path' },
      { name: 'download_file', desc: 'Download a file from server' },
      { name: 'upload_file', desc: 'Upload a file to server' },
      { name: 'delete_file', desc: 'Delete a file from server' },
      { name: 'create_directory', desc: 'Create a new directory' },
      { name: 'delete_directory', desc: 'Delete a directory' },
      { name: 'rename', desc: 'Rename a file or directory' },
      { name: 'get_file_info', desc: 'Get information about a file' },
    ];
    const ftpHtml = `<div class="space-y-4"><div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6"><div class="flex items-start gap-4"><div class="w-12 h-12 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0"><i class="fas fa-folder-open text-2xl"></i></div><div class="flex-1"><h3 class="font-bold text-slate-900 text-lg mb-2">${protocolName} Server Configuration</h3><p class="text-slate-700 mb-3">This server will generate tools to interact with ${isSftp ? 'an SFTP (SSH)' : 'an FTP'} server.</p><div class="bg-white rounded-lg p-4 mb-3 border border-slate-200"><div class="grid grid-cols-2 gap-4 text-sm"><div><span class="text-slate-500">Host:</span><span class="ml-2 font-mono text-slate-700">${s.ftpHost || 'Not set'}</span></div><div><span class="text-slate-500">Port:</span><span class="ml-2 font-mono text-slate-700">${s.ftpPort || 21}</span></div><div><span class="text-slate-500">Username:</span><span class="ml-2 font-mono text-slate-700">${s.ftpUsername || 'Not set'}</span></div><div><span class="text-slate-500">Protocol:</span><span class="ml-2 font-mono text-slate-700">${protocolName}</span></div><div><span class="text-slate-500">Base Path:</span><span class="ml-2 font-mono text-slate-700">${s.ftpBasePath || '/'}</span></div></div></div><div class="bg-white rounded-lg p-4 mb-3 border border-slate-200"><label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${ftpTools.length})</label><div class="grid grid-cols-2 gap-2">${ftpTools.map(t => `<div class="flex items-start gap-2 text-sm"><i class="fas fa-wrench text-slate-400 mt-0.5"></i><div><code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code><p class="text-xs text-slate-500 mt-0.5">${t.desc}</p></div></div>`).join('')}</div></div><div class="space-y-2 text-sm text-slate-700"><div class="flex items-start gap-2"><i class="fas fa-check-circle mt-0.5 text-green-500"></i><span>All ${protocolName} tools will use your credentials for authentication.</span></div><div class="flex items-start gap-2"><i class="fas fa-check-circle mt-0.5 text-green-500"></i><span>File paths can be specified when calling tools.</span></div>${isSftp ? '<div class="flex items-start gap-2"><i class="fas fa-lock mt-0.5 text-blue-500"></i><span>Connection is secured via SSH.</span></div>' : ''}</div></div></div></div></div>`;
    return { dataSource: ds, parsedData: null, html: ftpHtml };
  }

  if (type === T.LocalFS) {
    const ds = { type, name: 'LocalFS', basePath: s.localfsBasePath, allowWrite: s.localfsAllowWrite, allowDelete: s.localfsAllowDelete };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'hdd', color: 'slate', typeLabel: 'Local File System',
        title: s.localfsBasePath || 'Local File System', subtitle: `Read${s.localfsAllowWrite ? ' + Write' : ''}${s.localfsAllowDelete ? ' + Delete' : ''}`,
        details: [
          { label: 'Base Path', value: s.localfsBasePath },
          { label: 'Allow Write', value: s.localfsAllowWrite ? 'Yes' : 'No' },
          { label: 'Allow Delete', value: s.localfsAllowDelete ? 'Yes' : 'No' },
        ],
        tools: ['list_files', 'read_file', ...(s.localfsAllowWrite ? ['write_file', 'create_directory'] : []), ...(s.localfsAllowDelete ? ['delete_file'] : [])],
      }),
    };
  }

  // ── X (Twitter) ──────────────────────────────────────────────────────────────
  if (type === T.X) {
    const ds = { type, name: 'X', token: s.xToken, username: s.xUsername };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'at', color: 'slate', typeLabel: 'X (Twitter)',
        title: s.xUsername ? `@${s.xUsername}` : 'X (Twitter)', subtitle: 'Post and search tweets',
        details: [{ label: 'Username', value: s.xUsername }],
        tools: ['get_user_by_username', 'get_user', 'get_user_tweets', 'search_recent_tweets', 'get_tweet', 'create_tweet'],
      }),
    };
  }

  // ── Social ───────────────────────────────────────────────────────────────────
  if (type === T.Facebook) {
    const ds = { type, name: 'Facebook', baseUrl: s.facebookBaseUrl, apiVersion: s.facebookApiVersion, accessToken: s.facebookAccessToken, userId: s.facebookUserId, pageId: s.facebookPageId };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'facebook', color: 'blue', typeLabel: 'Facebook', title: 'Facebook', subtitle: `API ${s.facebookApiVersion}`, details: [{ label: 'Base URL', value: s.facebookBaseUrl }], tools: ['get_user', 'get_pages', 'get_page_posts', 'get_post', 'search', 'get_page_insights'] }),
    };
  }

  if (type === T.Instagram) {
    const ds = { type, name: 'Instagram', baseUrl: s.instagramBaseUrl, accessToken: s.instagramAccessToken, userId: s.instagramUserId };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'instagram', color: 'pink', typeLabel: 'Instagram', title: 'Instagram', subtitle: s.instagramUserId || 'Instagram API', details: [{ label: 'Base URL', value: s.instagramBaseUrl }], tools: ['get_user', 'get_user_media', 'get_media', 'get_media_comments'] }),
    };
  }

  if (type === T.TikTok) {
    const ds = { type, name: 'TikTok', baseUrl: s.tiktokBaseUrl, accessToken: s.tiktokAccessToken, userId: s.tiktokUserId };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'music', color: 'slate', typeLabel: 'TikTok', title: 'TikTok', subtitle: s.tiktokUserId || 'TikTok API', details: [{ label: 'Base URL', value: s.tiktokBaseUrl }], tools: ['get_user_info', 'list_videos', 'get_video', 'search_videos'] }),
    };
  }

  if (type === T.Reddit) {
    const ds = { type, name: 'Reddit', accessToken: s.redditAccessToken, userAgent: s.redditUserAgent, subreddit: s.redditSubreddit, username: s.redditUsername };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'reddit', color: 'orange', typeLabel: 'Reddit', title: s.redditSubreddit || 'Reddit', subtitle: s.redditUsername ? `u/${s.redditUsername}` : 'Reddit API', details: [{ label: 'Default Subreddit', value: s.redditSubreddit }, { label: 'Username', value: s.redditUsername }], tools: ['get_user', 'get_subreddit', 'list_hot', 'list_new', 'search_posts', 'get_post', 'create_post', 'add_comment'] }),
    };
  }

  if (type === T.LinkedIn) {
    const ds = { type, name: 'LinkedIn', accessToken: s.linkedinAccessToken, personId: s.linkedinPersonId, organizationId: s.linkedinOrganizationId };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'linkedin', color: 'blue', typeLabel: 'LinkedIn', title: 'LinkedIn', subtitle: 'Manage professional network content', details: [{ label: 'Person ID', value: s.linkedinPersonId }, { label: 'Organization ID', value: s.linkedinOrganizationId }], tools: ['get_profile', 'get_organization', 'list_connections', 'list_posts', 'create_post', 'get_post', 'search_people', 'search_companies'] }),
    };
  }

  if (type === T.YouTube) {
    const ds = { type, name: 'YouTube', apiKey: s.youtubeApiKey, accessToken: s.youtubeAccessToken, channelId: s.youtubeChannelId };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'youtube', color: 'red', typeLabel: 'YouTube', title: s.youtubeChannelId || 'YouTube', subtitle: 'Manage YouTube videos and channels', details: [{ label: 'Channel ID', value: s.youtubeChannelId }], tools: ['search', 'get_channel', 'list_channel_videos', 'list_playlists', 'list_playlist_items', 'get_video', 'get_comments', 'post_comment', 'rate_video'] }),
    };
  }

  if (type === T.WhatsAppBusiness) {
    const ds = { type, name: 'WhatsApp Business', accessToken: s.whatsappAccessToken, phoneNumberId: s.whatsappPhoneNumberId, businessAccountId: s.whatsappBusinessAccountId };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'whatsapp', color: 'green', typeLabel: 'WhatsApp Business', title: 'WhatsApp Business', subtitle: s.whatsappPhoneNumberId || 'WhatsApp API', details: [{ label: 'Phone Number ID', value: s.whatsappPhoneNumberId }], tools: ['send_text_message', 'send_template_message', 'send_media_message', 'get_message_templates', 'get_phone_numbers', 'get_business_profile', 'set_business_profile'] }),
    };
  }

  if (type === T.Threads) {
    const ds = { type, name: 'Threads', accessToken: s.threadsAccessToken, userId: s.threadsUserId };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'at', color: 'slate', typeLabel: 'Threads', title: 'Threads', subtitle: s.threadsUserId || 'Threads API', details: [{ label: 'User ID', value: s.threadsUserId }], tools: ['get_user', 'list_threads', 'get_thread', 'create_thread', 'delete_thread', 'get_thread_insights'] }),
    };
  }

  if (type === T.Telegram) {
    const ds = { type, name: 'Telegram', baseUrl: s.telegramBaseUrl, botToken: s.telegramBotToken, defaultChatId: s.telegramChatId };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'telegram', color: 'blue', typeLabel: 'Telegram', title: 'Telegram Bot', subtitle: s.telegramChatId ? `Default chat: ${s.telegramChatId}` : 'Telegram Bot API', details: [{ label: 'Base URL', value: s.telegramBaseUrl }], tools: ['get_me', 'get_updates', 'send_message'] }),
    };
  }

  if (type === T.Spotify) {
    const ds = { type, name: 'Spotify', baseUrl: s.spotifyBaseUrl, accessToken: s.spotifyAccessToken };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'spotify', color: 'green', typeLabel: 'Spotify', title: 'Spotify', subtitle: 'Access music library and playback', details: [{ label: 'Base URL', value: s.spotifyBaseUrl }], tools: ['search', 'get_track', 'get_artist', 'get_album', 'get_playlist'] }),
    };
  }

  if (type === T.Sonos) {
    const ds = { type, name: 'Sonos', baseUrl: s.sonosBaseUrl, accessToken: s.sonosAccessToken };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'volume-up', color: 'slate', typeLabel: 'Sonos', title: 'Sonos', subtitle: 'Control Sonos speakers', details: [{ label: 'Base URL', value: s.sonosBaseUrl }], tools: ['list_households', 'list_groups', 'play', 'pause', 'set_volume'] }),
    };
  }

  if (type === T.Shazam) {
    const ds = { type, name: 'Shazam', baseUrl: s.shazamBaseUrl, apiKey: s.shazamApiKey, apiHost: s.shazamApiHost };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'music', color: 'blue', typeLabel: 'Shazam', title: 'Shazam', subtitle: 'Identify and discover music', details: [{ label: 'Base URL', value: s.shazamBaseUrl }, { label: 'API Host', value: s.shazamApiHost }], tools: ['search', 'get_track', 'get_artist', 'get_charts'] }),
    };
  }

  if (type === T.PhilipsHue) {
    const ds = { type, name: 'Philips Hue', baseUrl: s.philipshueBaseUrl, accessToken: s.philipshueAccessToken };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'lightbulb', color: 'yellow', typeLabel: 'Philips Hue', title: 'Philips Hue', subtitle: 'Control smart lights', details: [{ label: 'Base URL', value: s.philipshueBaseUrl }], tools: ['list_lights', 'get_light', 'set_light_state', 'list_groups', 'set_group_state'] }),
    };
  }

  if (type === T.EightSleep) {
    const ds = { type, name: 'Eight Sleep', baseUrl: s.eightsleepBaseUrl, accessToken: s.eightsleepAccessToken };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'bed', color: 'slate', typeLabel: 'Eight Sleep', title: 'Eight Sleep', subtitle: 'Control sleep tracking and pod', details: [{ label: 'Base URL', value: s.eightsleepBaseUrl }], tools: ['get_user', 'get_sessions', 'get_trends', 'set_pod_temperature'] }),
    };
  }

  if (type === T.HomeAssistant) {
    const ds = { type, name: 'Home Assistant', baseUrl: s.homeassistantBaseUrl, accessToken: s.homeassistantAccessToken };
    return {
      dataSource: ds, parsedData: null,
      html: buildGenericPreviewHtml({ icon: 'home', color: 'blue', typeLabel: 'Home Assistant', title: 'Home Assistant', subtitle: 'Automate your smart home', details: [{ label: 'Base URL', value: s.homeassistantBaseUrl }], tools: ['get_states', 'get_services', 'call_service', 'get_config'] }),
    };
  }

  // ── Apple / misc local apps ──────────────────────────────────────────────────
  if (type === T.AppleNotes) {
    const ds = { type, name: 'Apple Notes', baseUrl: s.applenotesBaseUrl, accessToken: s.applenotesAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'sticky-note', color: 'yellow', typeLabel: 'Apple Notes', title: 'Apple Notes', subtitle: 'Manage Apple Notes', details: [{ label: 'Base URL', value: s.applenotesBaseUrl }], tools: ['list_notes', 'get_note', 'create_note', 'update_note', 'delete_note'] }) };
  }
  if (type === T.AppleReminders) {
    const ds = { type, name: 'Apple Reminders', baseUrl: s.appleremindersBaseUrl, accessToken: s.appleremindersAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'bell', color: 'red', typeLabel: 'Apple Reminders', title: 'Apple Reminders', subtitle: 'Manage Apple Reminders', details: [{ label: 'Base URL', value: s.appleremindersBaseUrl }], tools: ['list_lists', 'list_reminders', 'create_reminder', 'complete_reminder', 'delete_reminder'] }) };
  }
  if (type === T.Things3) {
    const ds = { type, name: 'Things 3', baseUrl: s.things3BaseUrl, accessToken: s.things3AccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'check-square', color: 'blue', typeLabel: 'Things 3', title: 'Things 3', subtitle: 'Manage Things 3 tasks', details: [{ label: 'Base URL', value: s.things3BaseUrl }], tools: ['list_areas', 'list_projects', 'list_tasks', 'create_task', 'complete_task'] }) };
  }
  if (type === T.Obsidian) {
    const ds = { type, name: 'Obsidian', baseUrl: s.obsidianBaseUrl, accessToken: s.obsidianAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'book', color: 'violet', typeLabel: 'Obsidian', title: 'Obsidian', subtitle: 'Manage Obsidian vault', details: [{ label: 'Base URL', value: s.obsidianBaseUrl }], tools: ['list_notes', 'get_note', 'create_note', 'update_note', 'delete_note', 'search_notes'] }) };
  }
  if (type === T.BearNotes) {
    const ds = { type, name: 'Bear Notes', baseUrl: s.bearnotesBaseUrl, accessToken: s.bearnotesAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'paw', color: 'red', typeLabel: 'Bear Notes', title: 'Bear Notes', subtitle: 'Manage Bear Notes', details: [{ label: 'Base URL', value: s.bearnotesBaseUrl }], tools: ['list_notes', 'get_note', 'create_note', 'update_note', 'delete_note'] }) };
  }
  if (type === T.IMessage) {
    const ds = { type, name: 'iMessage', baseUrl: s.imessageBaseUrl, accessToken: s.imessageAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'comment', color: 'blue', typeLabel: 'iMessage', title: 'iMessage', subtitle: 'Send and read iMessages', details: [{ label: 'Base URL', value: s.imessageBaseUrl }], tools: ['list_conversations', 'get_messages', 'send_message'] }) };
  }

  if (type === T.Zoom) {
    const ds = { type, name: 'Zoom', baseUrl: s.zoomBaseUrl, accessToken: s.zoomAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'video', color: 'blue', typeLabel: 'Zoom', title: 'Zoom', subtitle: 'Manage Zoom meetings', details: [{ label: 'Base URL', value: s.zoomBaseUrl }], tools: ['list_meetings', 'get_meeting', 'create_meeting', 'list_recordings', 'get_recording'] }) };
  }
  if (type === T.MicrosoftTeams) {
    const ds = { type, name: 'Microsoft Teams', baseUrl: s.microsoftteamsBaseUrl, accessToken: s.microsoftteamsAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'users', color: 'violet', typeLabel: 'Microsoft Teams', title: 'Microsoft Teams', subtitle: 'Manage Teams messages', details: [{ label: 'Base URL', value: s.microsoftteamsBaseUrl }], tools: ['list_teams', 'list_channels', 'send_message', 'list_messages', 'get_message'] }) };
  }
  if (type === T.Signal) {
    const ds = { type, name: 'Signal', baseUrl: s.signalBaseUrl, accessToken: s.signalAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'lock', color: 'blue', typeLabel: 'Signal', title: 'Signal', subtitle: 'Send Signal messages', details: [{ label: 'CLI REST URL', value: s.signalBaseUrl }], tools: ['send_message', 'list_groups', 'create_group', 'list_messages'] }) };
  }

  // ── AI Models ────────────────────────────────────────────────────────────────
  if (type === T.OpenAI) {
    const ds = { type, name: 'OpenAI', apiKey: s.openaiApiKey, defaultModel: s.openaiModel };
    return { dataSource: ds, parsedData: null, html: buildAIModelPreviewHtml({ img: 'openai.png', alt: 'OpenAI', title: 'OpenAI', apiDesc: 'OpenAI API', baseUrl: 'https://api.openai.com/v1', tools: [{ name: 'chat', desc: 'Create chat completions' }, { name: 'embeddings', desc: 'Create embeddings' }, { name: 'moderations', desc: 'Moderate text' }, { name: 'images', desc: 'Generate images' }, { name: 'audio_speech', desc: 'Text to speech' }, { name: 'audio_transcriptions', desc: 'Transcribe audio' }, { name: 'audio_translations', desc: 'Translate audio' }] }) };
  }
  if (type === T.Claude) {
    const ds = { type, name: 'Claude', apiKey: s.claudeApiKey, defaultModel: s.claudeModel, apiVersion: s.claudeApiVersion };
    return { dataSource: ds, parsedData: null, html: buildAIModelPreviewHtml({ img: 'claude.png', alt: 'Claude', title: 'Claude', apiDesc: 'Anthropic API', baseUrl: 'https://api.anthropic.com/v1', tools: [{ name: 'chat', desc: 'Create messages' }] }) };
  }
  if (type === T.Gemini) {
    const ds = { type, name: 'Gemini', apiKey: s.geminiApiKey, defaultModel: s.geminiModel };
    return { dataSource: ds, parsedData: null, html: buildAIModelPreviewHtml({ img: 'gemini.png', alt: 'Gemini', title: 'Gemini', apiDesc: 'Gemini API', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', tools: [{ name: 'chat', desc: 'Generate content' }, { name: 'embeddings', desc: 'Create embeddings' }] }) };
  }
  if (type === T.Grok) {
    const ds = { type, name: 'Grok', apiKey: s.grokApiKey, defaultModel: s.grokModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'slate', typeLabel: 'Grok (xAI)', title: `Grok — ${s.grokModel}`, subtitle: 'Access xAI Grok models', details: [{ label: 'Model', value: s.grokModel }], tools: ['chat_completion', 'list_models'] }) };
  }
  if (type === T.FalAI) {
    const ds = { type, name: 'fal.ai', baseUrl: s.falaiBaseUrl, apiKey: s.falaiApiKey };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'bolt', color: 'violet', typeLabel: 'fal.ai', title: 'fal.ai', subtitle: 'Run AI models on fal.ai', details: [{ label: 'Base URL', value: s.falaiBaseUrl }], tools: ['run_model', 'queue_run', 'check_status', 'get_result'] }) };
  }
  if (type === T.HuggingFace) {
    const ds = { type, name: 'Hugging Face', baseUrl: s.huggingfaceBaseUrl, apiKey: s.huggingfaceApiKey, defaultModel: s.huggingfaceDefaultModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'yellow', typeLabel: 'Hugging Face', title: 'Hugging Face', subtitle: s.huggingfaceDefaultModel || 'Inference API', details: [{ label: 'Base URL', value: s.huggingfaceBaseUrl }, { label: 'Default Model', value: s.huggingfaceDefaultModel }], tools: ['text_generation', 'text_classification', 'image_classification', 'summarization', 'translation'] }) };
  }
  if (type === T.Llama) {
    const ds = { type, name: 'Llama (Ollama)', baseUrl: s.llamaBaseUrl, defaultModel: s.llamaModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'orange', typeLabel: 'Llama (Ollama)', title: `Llama — ${s.llamaModel}`, subtitle: 'Local Llama via Ollama', details: [{ label: 'Base URL', value: s.llamaBaseUrl }, { label: 'Model', value: s.llamaModel }], tools: ['chat', 'generate', 'list_models', 'pull_model'] }) };
  }
  if (type === T.DeepSeek) {
    const ds = { type, name: 'DeepSeek', baseUrl: s.deepseekBaseUrl, apiKey: s.deepseekApiKey, defaultModel: s.deepseekModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'blue', typeLabel: 'DeepSeek', title: `DeepSeek — ${s.deepseekModel}`, subtitle: 'Access DeepSeek AI models', details: [{ label: 'Model', value: s.deepseekModel }], tools: ['chat_completion', 'list_models'] }) };
  }
  if (type === T.AzureOpenAI) {
    const ds = { type, name: 'Azure OpenAI', baseUrl: s.azureOpenAIBaseUrl, apiKey: s.azureOpenAIApiKey, apiVersion: s.azureOpenAIApiVersion, deployment: s.azureOpenAIDeployment };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'blue', typeLabel: 'Azure OpenAI', title: `Azure OpenAI — ${s.azureOpenAIDeployment || 'deployment'}`, subtitle: s.azureOpenAIBaseUrl || 'Azure Cognitive Services', details: [{ label: 'Deployment', value: s.azureOpenAIDeployment }, { label: 'API Version', value: s.azureOpenAIApiVersion }], tools: ['chat_completion', 'text_completion', 'create_embedding', 'create_image'] }) };
  }
  if (type === T.Mistral) {
    const ds = { type, name: 'Mistral AI', baseUrl: s.mistralBaseUrl, apiKey: s.mistralApiKey, defaultModel: s.mistralModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'orange', typeLabel: 'Mistral AI', title: `Mistral — ${s.mistralModel}`, subtitle: 'Access Mistral AI models', details: [{ label: 'Model', value: s.mistralModel }], tools: ['chat_completion', 'list_models'] }) };
  }
  if (type === T.Cohere) {
    const ds = { type, name: 'Cohere', baseUrl: s.cohereBaseUrl, apiKey: s.cohereApiKey, defaultModel: s.cohereModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'violet', typeLabel: 'Cohere', title: `Cohere — ${s.cohereModel}`, subtitle: 'Access Cohere AI models', details: [{ label: 'Model', value: s.cohereModel }], tools: ['chat', 'generate', 'embed', 'rerank', 'classify'] }) };
  }
  if (type === T.Perplexity) {
    const ds = { type, name: 'Perplexity AI', baseUrl: s.perplexityBaseUrl, apiKey: s.perplexityApiKey, defaultModel: s.perplexityModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'search', color: 'blue', typeLabel: 'Perplexity AI', title: `Perplexity — ${s.perplexityModel}`, subtitle: 'AI-powered search and answers', details: [{ label: 'Model', value: s.perplexityModel }], tools: ['chat_completion', 'list_models'] }) };
  }
  if (type === T.Together) {
    const ds = { type, name: 'Together AI', baseUrl: s.togetherBaseUrl, apiKey: s.togetherApiKey, defaultModel: s.togetherModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'blue', typeLabel: 'Together AI', title: s.togetherModel ? `Together — ${s.togetherModel}` : 'Together AI', subtitle: 'Access open-source models via Together', details: [{ label: 'Model', value: s.togetherModel }], tools: ['chat_completion', 'completions', 'list_models'] }) };
  }
  if (type === T.Fireworks) {
    const ds = { type, name: 'Fireworks AI', baseUrl: s.fireworksBaseUrl, apiKey: s.fireworksApiKey, defaultModel: s.fireworksModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'fire', color: 'red', typeLabel: 'Fireworks AI', title: s.fireworksModel ? `Fireworks — ${s.fireworksModel}` : 'Fireworks AI', subtitle: 'Fast inference for open-source models', details: [{ label: 'Model', value: s.fireworksModel }], tools: ['chat_completion', 'completions', 'list_models'] }) };
  }
  if (type === T.Groq) {
    const ds = { type, name: 'Groq', baseUrl: s.groqBaseUrl, apiKey: s.groqApiKey, defaultModel: s.groqModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'bolt', color: 'orange', typeLabel: 'Groq', title: `Groq — ${s.groqModel}`, subtitle: 'Ultra-fast LLM inference', details: [{ label: 'Model', value: s.groqModel }], tools: ['chat_completion', 'list_models'] }) };
  }
  if (type === T.OpenRouter) {
    const ds = { type, name: 'OpenRouter', baseUrl: s.openrouterBaseUrl, apiKey: s.openrouterApiKey, defaultModel: s.openrouterModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'route', color: 'violet', typeLabel: 'OpenRouter', title: s.openrouterModel ? `OpenRouter — ${s.openrouterModel}` : 'OpenRouter', subtitle: 'Access multiple AI models', details: [{ label: 'Model', value: s.openrouterModel }], tools: ['chat_completion', 'list_models'] }) };
  }

  // ── Infrastructure ───────────────────────────────────────────────────────────
  if (type === T.Jenkins) {
    const ds = { type, name: 'Jenkins', baseUrl: s.jenkinsBaseUrl, username: s.jenkinsUsername, apiToken: s.jenkinsApiToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'cogs', color: 'slate', typeLabel: 'Jenkins', title: s.jenkinsBaseUrl || 'Jenkins', subtitle: 'Manage CI/CD pipelines', details: [{ label: 'Base URL', value: s.jenkinsBaseUrl }, { label: 'Username', value: s.jenkinsUsername }], tools: ['list_jobs', 'get_job', 'build_job', 'list_builds', 'get_build_log'] }) };
  }
  if (type === T.DockerHub) {
    const ds = { type, name: 'Docker Hub', baseUrl: s.dockerhubBaseUrl };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'docker', color: 'blue', typeLabel: 'Docker Hub', title: 'Docker Hub', subtitle: 'Search and manage container images', details: [{ label: 'Base URL', value: s.dockerhubBaseUrl }], tools: ['search_images', 'get_image', 'list_tags', 'get_tag'] }) };
  }
  if (type === T.Npm) {
    const ds = { type, name: 'npm', baseUrl: s.npmBaseUrl };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'cube', color: 'red', typeLabel: 'npm Registry', title: 'npm', subtitle: 'Search and manage npm packages', details: [{ label: 'Base URL', value: s.npmBaseUrl }], tools: ['search_packages', 'get_package', 'get_package_version', 'list_versions'] }) };
  }
  if (type === T.Nuget) {
    const ds = { type, name: 'NuGet', baseUrl: s.nugetBaseUrl, registrationBaseUrl: s.nugetRegistrationBaseUrl };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'cube', color: 'blue', typeLabel: 'NuGet Registry', title: 'NuGet', subtitle: '.NET package registry', details: [{ label: 'Base URL', value: s.nugetBaseUrl }], tools: ['search_packages', 'get_package', 'list_versions', 'get_dependencies'] }) };
  }
  if (type === T.Maven) {
    const ds = { type, name: 'Maven Central', baseUrl: s.mavenBaseUrl };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'cube', color: 'red', typeLabel: 'Maven Central', title: 'Maven Central', subtitle: 'Java/JVM package registry', details: [{ label: 'Base URL', value: s.mavenBaseUrl }], tools: ['search_packages', 'get_artifact', 'list_versions'] }) };
  }
  if (type === T.Gradle) {
    const ds = { type, name: 'Gradle Plugins', baseUrl: s.gradleBaseUrl };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'cube', color: 'green', typeLabel: 'Gradle Plugin Portal', title: 'Gradle Plugins', subtitle: 'Gradle plugin registry', details: [{ label: 'Base URL', value: s.gradleBaseUrl }], tools: ['search_plugins', 'get_plugin', 'list_versions'] }) };
  }
  if (type === T.Nexus) {
    const ds = { type, name: 'Nexus Repository', baseUrl: s.nexusBaseUrl, apiKey: s.nexusApiKey, username: s.nexusUsername, password: s.nexusPassword };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'server', color: 'blue', typeLabel: 'Nexus Repository', title: s.nexusBaseUrl || 'Nexus Repository', subtitle: 'Sonatype Nexus artifact registry', details: [{ label: 'Base URL', value: s.nexusBaseUrl }, { label: 'Username', value: s.nexusUsername }], tools: ['search_components', 'get_component', 'list_repositories', 'upload_component', 'delete_component'] }) };
  }
  if (type === T.N8n) {
    const ds = { type, name: 'n8n', baseUrl: s.n8nBaseUrl, apiKey: s.n8nApiKey, apiPath: s.n8nApiPath, enabledTools: s.n8nSelectedTools };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'project-diagram', color: 'orange', typeLabel: 'n8n', title: s.n8nBaseUrl || 'n8n', subtitle: `Tool groups: ${s.n8nSelectedTools.join(', ') || 'none selected'}`, details: [{ label: 'Base URL', value: s.n8nBaseUrl }, { label: 'API Path', value: s.n8nApiPath }], tools: ['list_workflows', 'get_workflow', 'execute_workflow', 'activate_workflow', 'deactivate_workflow'] }) };
  }

  // ── Productivity ─────────────────────────────────────────────────────────────
  if (type === T.Supabase) {
    const ds = { type, name: 'Supabase', baseUrl: s.supabaseBaseUrl, apiKey: s.supabaseApiKey };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'bolt', color: 'green', typeLabel: 'Supabase', title: s.supabaseBaseUrl || 'Supabase', subtitle: 'Supabase REST API', details: [{ label: 'REST URL', value: s.supabaseBaseUrl }], tools: ['select_rows', 'insert_row', 'update_rows', 'delete_rows'] }) };
  }
  if (type === T.Trello) {
    const ds = { type, name: 'Trello', baseUrl: s.trelloBaseUrl, apiKey: s.trelloApiKey, apiToken: s.trelloApiToken, memberId: s.trelloMemberId, boardId: s.trelloBoardId, listId: s.trelloListId };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'columns', color: 'blue', typeLabel: 'Trello', title: 'Trello', subtitle: s.trelloBoardId ? `Board: ${s.trelloBoardId}` : 'Manage boards and cards', details: [{ label: 'Base URL', value: s.trelloBaseUrl }], tools: ['get_member', 'list_boards', 'get_board', 'list_lists', 'list_cards', 'get_card', 'create_card'] }) };
  }
  if (type === T.GitLab) {
    const ds = { type, name: 'GitLab', baseUrl: s.gitlabBaseUrl, token: s.gitlabToken, projectId: s.gitlabProjectId };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'code-branch', color: 'orange', typeLabel: 'GitLab', title: s.gitlabBaseUrl || 'GitLab', subtitle: s.gitlabProjectId ? `Project: ${s.gitlabProjectId}` : 'Manage repositories and issues', details: [{ label: 'Base URL', value: s.gitlabBaseUrl }, { label: 'Project ID', value: s.gitlabProjectId }], tools: ['list_projects', 'get_project', 'list_issues', 'create_issue', 'list_merge_requests', 'get_file'] }) };
  }
  if (type === T.Bitbucket) {
    const ds = { type, name: 'Bitbucket', baseUrl: s.bitbucketBaseUrl, username: s.bitbucketUsername, appPassword: s.bitbucketAppPassword, workspace: s.bitbucketWorkspace, repoSlug: s.bitbucketRepoSlug };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'code-branch', color: 'blue', typeLabel: 'Bitbucket', title: 'Bitbucket', subtitle: s.bitbucketWorkspace ? `Workspace: ${s.bitbucketWorkspace}` : 'Manage repositories', details: [{ label: 'Workspace', value: s.bitbucketWorkspace }, { label: 'Repo', value: s.bitbucketRepoSlug }], tools: ['list_repos', 'get_repo', 'list_issues', 'create_issue', 'list_pull_requests', 'get_file'] }) };
  }
  if (type === T.GDrive) {
    const ds = { type, name: 'Google Drive', baseUrl: s.gdriveBaseUrl, accessToken: s.gdriveAccessToken, rootFolderId: s.gdriveRootFolderId };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'folder', color: 'yellow', typeLabel: 'Google Drive', title: 'Google Drive', subtitle: s.gdriveRootFolderId ? `Root: ${s.gdriveRootFolderId}` : 'Manage files in Google Drive', details: [{ label: 'Base URL', value: s.gdriveBaseUrl }], tools: ['list_files', 'get_file', 'download_file', 'upload_file', 'create_folder'] }) };
  }
  if (type === T.GoogleCalendar) {
    const ds = { type, name: 'Google Calendar', baseUrl: s.gcalBaseUrl, accessToken: s.gcalAccessToken, calendarId: s.gcalCalendarId };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'calendar', color: 'blue', typeLabel: 'Google Calendar', title: 'Google Calendar', subtitle: `Calendar: ${s.gcalCalendarId || 'primary'}`, details: [{ label: 'Base URL', value: s.gcalBaseUrl }, { label: 'Calendar ID', value: s.gcalCalendarId }], tools: ['list_calendars', 'list_events', 'get_event', 'create_event', 'update_event'] }) };
  }
  if (type === T.GoogleDocs) {
    const ds = { type, name: 'Google Docs', baseUrl: s.gdocsBaseUrl, accessToken: s.gdocsAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'file-alt', color: 'blue', typeLabel: 'Google Docs', title: 'Google Docs', subtitle: 'Manage Google Docs documents', details: [{ label: 'Base URL', value: s.gdocsBaseUrl }], tools: ['list_documents', 'get_document', 'create_document', 'update_document', 'delete_document'] }) };
  }
  if (type === T.GoogleSheets) {
    const ds = { type, name: 'Google Sheets', baseUrl: s.sheetsBaseUrl, accessToken: s.sheetsAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'table', color: 'green', typeLabel: 'Google Sheets', title: 'Google Sheets', subtitle: 'Read and write spreadsheet data', details: [{ label: 'Base URL', value: s.sheetsBaseUrl }], tools: ['list_spreadsheets', 'get_spreadsheet', 'read_range', 'write_range', 'append_rows'] }) };
  }
  if (type === T.Airtable) {
    const ds = { type, name: 'Airtable', baseUrl: s.airtableBaseUrl, accessToken: s.airtableAccessToken, baseId: s.airtableBaseId, tableName: s.airtableTableName };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'table', color: 'yellow', typeLabel: 'Airtable', title: 'Airtable', subtitle: s.airtableBaseId ? `Base: ${s.airtableBaseId}` : 'Manage Airtable records', details: [{ label: 'Base URL', value: s.airtableBaseUrl }, { label: 'Base ID', value: s.airtableBaseId }, { label: 'Table', value: s.airtableTableName }], tools: ['list_bases', 'list_tables', 'list_records', 'create_record', 'update_record'] }) };
  }
  if (type === T.Asana) {
    const ds = { type, name: 'Asana', baseUrl: s.asanaBaseUrl, accessToken: s.asanaAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'tasks', color: 'pink', typeLabel: 'Asana', title: 'Asana', subtitle: 'Manage tasks and projects', details: [{ label: 'Base URL', value: s.asanaBaseUrl }], tools: ['list_workspaces', 'list_projects', 'list_tasks', 'create_task', 'update_task'] }) };
  }
  if (type === T.Monday) {
    const ds = { type, name: 'Monday.com', baseUrl: s.mondayBaseUrl, apiKey: s.mondayApiKey };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'th-large', color: 'red', typeLabel: 'Monday.com', title: 'Monday.com', subtitle: 'Manage boards and items', details: [{ label: 'Base URL', value: s.mondayBaseUrl }], tools: ['list_boards', 'list_items', 'create_item', 'update_item', 'delete_item'] }) };
  }
  if (type === T.ClickUp) {
    const ds = { type, name: 'ClickUp', baseUrl: s.clickupBaseUrl, accessToken: s.clickupAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'check-circle', color: 'violet', typeLabel: 'ClickUp', title: 'ClickUp', subtitle: 'Manage spaces and tasks', details: [{ label: 'Base URL', value: s.clickupBaseUrl }], tools: ['list_spaces', 'list_folders', 'list_lists', 'list_tasks', 'create_task'] }) };
  }
  if (type === T.Linear) {
    const ds = { type, name: 'Linear', baseUrl: s.linearBaseUrl, accessToken: s.linearAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'layer-group', color: 'violet', typeLabel: 'Linear', title: 'Linear', subtitle: 'Manage engineering issues', details: [{ label: 'Base URL', value: s.linearBaseUrl }], tools: ['list_teams', 'list_projects', 'list_issues', 'create_issue', 'update_issue'] }) };
  }
  if (type === T.Jira) {
    const ds = { type, name: 'Jira', apiVersion: s.jiraApiVersion, host: s.jiraHost, email: s.jiraEmail, apiToken: s.jiraApiToken, projectKey: s.jiraProjectKey || undefined };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'jira', color: 'blue', typeLabel: 'Jira', title: s.jiraHost || 'Jira', subtitle: `${s.jiraEmail || ''} · API ${s.jiraApiVersion}`, details: [{ label: 'Host', value: s.jiraHost }, { label: 'Email', value: s.jiraEmail }, { label: 'API Version', value: s.jiraApiVersion }, ...(s.jiraProjectKey ? [{ label: 'Project Key', value: s.jiraProjectKey }] : [])], tools: ['search_issues', 'get_issue', 'create_issue', 'update_issue', 'add_comment', 'get_transitions', 'transition_issue', 'list_projects', 'get_project', 'get_user', 'assign_issue', 'get_issue_comments'] }) };
  }
  if (type === T.Confluence) {
    const ds = { type, name: 'Confluence', host: s.confluenceHost, email: s.confluenceEmail, apiToken: s.confluenceApiToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'book', color: 'blue', typeLabel: 'Confluence', title: s.confluenceHost || 'Confluence', subtitle: s.confluenceEmail || '', details: [{ label: 'Host', value: s.confluenceHost }, { label: 'Email', value: s.confluenceEmail }], tools: ['list_spaces', 'get_space', 'list_pages', 'get_page', 'create_page', 'update_page', 'search'] }) };
  }
  if (type === T.Notion) {
    const ds = { type, name: 'Notion', baseUrl: s.notionBaseUrl, notionVersion: s.notionVersion, accessToken: s.notionAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'book-open', color: 'slate', typeLabel: 'Notion', title: 'Notion', subtitle: `API version: ${s.notionVersion}`, details: [{ label: 'Base URL', value: s.notionBaseUrl }, { label: 'Version', value: s.notionVersion }], tools: ['search', 'get_page', 'get_database', 'query_database', 'create_page', 'update_page'] }) };
  }
  if (type === T.Dropbox) {
    const ds = { type, name: 'Dropbox', baseUrl: s.dropboxBaseUrl, contentBaseUrl: s.dropboxContentBaseUrl, accessToken: s.dropboxAccessToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'dropbox', color: 'blue', typeLabel: 'Dropbox', title: 'Dropbox', subtitle: 'Manage files in Dropbox', details: [{ label: 'API URL', value: s.dropboxBaseUrl }], tools: ['list_folder', 'get_metadata', 'search', 'download', 'upload'] }) };
  }

  // ── Default fallback ─────────────────────────────────────────────────────────
  const ds = { type, name: type };
  return {
    dataSource: ds,
    parsedData: null,
    html: buildGenericPreviewHtml({
      icon: 'plug', color: 'slate', typeLabel: type,
      title: type, subtitle: 'Data source configured',
      details: [], tools: [],
    }),
  };
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useHandleNextToStep3() {
  const [parseLoading, setParseLoading] = useState(false);
  const store = useGenerateStore();

  async function handleNextToStep3() {
    const type = store.selectedType;
    if (!type) return;

    setParseLoading(true);

    try {
      const isDbType = isDatabase(type);
      const isConnTemplate = isConnectionTemplateSource(type);
      const isParseType = type === DataSourceType.CSV || type === DataSourceType.Excel || isDbType || isConnTemplate || type === DataSourceType.Rest;

      if (isParseType) {
        let body: BodyInit;
        let headers: Record<string, string> = {};

        if (type === DataSourceType.CSV || type === DataSourceType.Excel) {
          if (!store.csvExcelFile && !store.csvExcelFilePath) {
            throw new Error('Please select a file first.');
          }
          const fd = new FormData();
          fd.append('type', type);
          if (store.csvExcelFile) {
            fd.append('file', store.csvExcelFile);
          } else {
            fd.append('filePath', store.csvExcelFilePath);
          }
          body = fd;
        } else if (type === DataSourceType.Rest) {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify({ type: 'rest', swaggerUrl: store.swaggerUrl });
        } else if (isDbType) {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify({
            type,
            connection: {
              type,
              host: store.dbHost,
              port: Number(store.dbPort),
              database: store.dbName,
              username: store.dbUser,
              password: store.dbPassword,
            },
          });
        } else {
          // connection template (Redis, Hazelcast, Kafka)
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify({
            type,
            dbHost: store.dbHost,
            dbPort: Number(store.dbPort),
            dbName: store.dbName,
            dbUser: store.dbUser,
            dbPassword: store.dbPassword,
          });
        }

        const res = await fetch('/api/parse', { method: 'POST', headers, body });
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Parse failed');
        }

        const parsedData: any[] = data.data?.parsedData || [];

        // Build currentDataSource in the format generateApi.ts expects per type
        let currentDs: any;
        if (type === DataSourceType.Rest) {
          currentDs = { type, swaggerUrl: store.swaggerUrl };
        } else if (type === DataSourceType.Redis) {
          currentDs = { type, host: store.dbHost, port: Number(store.dbPort), database: store.dbName, username: store.dbUser, password: store.dbPassword };
        } else if (type === DataSourceType.Hazelcast) {
          currentDs = { type, host: store.dbHost, port: Number(store.dbPort), clusterName: store.dbName, username: store.dbUser, password: store.dbPassword };
        } else if (type === DataSourceType.Kafka) {
          currentDs = { type, host: store.dbHost, port: Number(store.dbPort), topic: store.dbName, username: store.dbUser, password: store.dbPassword };
        } else if (isDbType) {
          // SQL types: generateApi reads dataSource.connection
          currentDs = {
            type,
            connection: { type, host: store.dbHost, port: Number(store.dbPort), database: store.dbName, username: store.dbUser, password: store.dbPassword },
          };
        } else {
          currentDs = { type, host: store.dbHost, port: Number(store.dbPort), database: store.dbName, username: store.dbUser, password: store.dbPassword, swaggerUrl: store.swaggerUrl };
        }
        store.setCurrentDataSource(currentDs);
        store.setCurrentParsedData(parsedData);

        // Build preview HTML with checkboxes
        let html: string;
        if (type === DataSourceType.Rest) {
          html = buildRestEndpointsPreviewHtml(parsedData);
        } else if (isConnTemplate) {
          const prefix = type === DataSourceType.Redis ? 'redis' : type === DataSourceType.Hazelcast ? 'hazelcast' : 'kafka';
          html = buildConnectionGroupPreviewHtml(parsedData, prefix);
        } else {
          html = buildDbTablePreviewHtml(parsedData);
        }
        store.setPreviewHtml(html);

      } else {
        // Direct type: build from store
        const result = card(type, store as unknown as S);
        store.setCurrentDataSource(result.dataSource);
        store.setCurrentParsedData(result.parsedData);
        store.setPreviewHtml(result.html);
      }

      store.setStep(3);
    } catch (err: any) {
      // surface error without crashing
      const msg = err?.message || 'An error occurred while loading the preview.';
      store.setPreviewHtml(`<div class="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">${msg}</div>`);
      store.setCurrentParsedData(null);
      store.setStep(3);
    } finally {
      setParseLoading(false);
    }
  }

  return { handleNextToStep3, parseLoading };
}

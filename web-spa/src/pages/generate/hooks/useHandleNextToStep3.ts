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
}

function badge(text: string): string {
  return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">${text}</span>`;
}

function detailRow(label: string, value: string): string {
  if (!value) return '';
  return `
    <div class="flex justify-between gap-4 py-1 border-b border-slate-50 last:border-0">
      <span class="text-xs text-slate-500 font-medium">${label}</span>
      <span class="text-xs text-slate-700 font-mono truncate max-w-[240px]">${value}</span>
    </div>`;
}

function buildGenericPreviewHtml(opts: PreviewCardOpts): string {
  const { icon, color, typeLabel, title, subtitle, details, tools } = opts;
  const detailRows = details.map((d) => detailRow(d.label, d.value)).join('');
  const toolBadges = tools.map(badge).join('');

  return `
<div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
  <div class="flex items-center gap-4 p-5 border-b border-slate-100">
    <div class="w-12 h-12 rounded-xl bg-${color}-100 flex items-center justify-center flex-shrink-0">
      <i class="fas fa-${icon} text-${color}-600 text-xl"></i>
    </div>
    <div class="min-w-0">
      <div class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">${typeLabel}</div>
      <h3 class="text-lg font-bold text-slate-900">${title}</h3>
      <p class="text-sm text-slate-500">${subtitle}</p>
    </div>
  </div>
  <div class="p-5 space-y-4">
    ${detailRows ? `<div class="space-y-0.5 text-sm">${detailRows}</div>` : ''}
    ${tools.length ? `
    <div>
      <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Generated Tools</p>
      <div class="flex flex-wrap gap-1.5">${toolBadges}</div>
    </div>` : ''}
  </div>
</div>`;
}

// ─── DB/CSV/REST preview (with table/tool checkboxes) ─────────────────────────

export function buildDbTablePreviewHtml(parsedData: any[]): string {
  if (!parsedData || parsedData.length === 0) {
    return '<p class="text-slate-500 text-sm">No tables found.</p>';
  }

  const DEFAULT_TOOLS = ['get', 'create', 'update', 'delete', 'count', 'min', 'max', 'sum', 'avg'];

  const rows = parsedData.map((table: any, i: number) => {
    const toolCheckboxes = DEFAULT_TOOLS.map((t) => `
      <label class="flex items-center gap-1 text-xs text-slate-600 cursor-pointer select-none">
        <input type="checkbox" id="tool-${t}-${i}" checked class="w-3 h-3 accent-blue-600" />
        ${t}
      </label>`).join('');

    return `
    <div class="border border-slate-200 rounded-lg overflow-hidden mb-3">
      <div class="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer" onclick="window.toggleTableDetails(${i})">
        <input type="checkbox" id="table-select-${i}" data-table-name="${table.name || table.tableName || ''}" checked
               class="w-4 h-4 accent-blue-600 flex-shrink-0" onclick="event.stopPropagation();window.toggleTableSelection(${i})" />
        <span class="font-semibold text-slate-800 flex-1 text-sm">${table.name || table.tableName || 'Table ' + i}</span>
        <span class="text-xs text-slate-400">${(table.columns || []).length} columns</span>
        <i class="fas fa-chevron-down text-xs text-slate-400 transition-transform" id="table-chevron-${i}"></i>
      </div>
      <div id="table-details-${i}" class="px-4 py-3 hidden">
        ${table.columns && table.columns.length ? `
        <div class="mb-3">
          <p class="text-xs font-semibold text-slate-500 mb-1.5">Columns</p>
          <div class="flex flex-wrap gap-1.5">
            ${table.columns.map((c: any) => `<span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">${typeof c === 'string' ? c : c.name || c.column_name || c}</span>`).join('')}
          </div>
        </div>` : ''}
        <div>
          <p class="text-xs font-semibold text-slate-500 mb-1.5">Tools</p>
          <div class="flex flex-wrap gap-3">${toolCheckboxes}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  return `
<div class="mb-3 flex items-center justify-between">
  <h4 class="font-bold text-slate-900">${parsedData.length} table${parsedData.length !== 1 ? 's' : ''} detected</h4>
</div>
${rows}`;
}

export function buildRestEndpointsPreviewHtml(parsedData: any[]): string {
  if (!parsedData || parsedData.length === 0) {
    return '<p class="text-slate-500 text-sm">No endpoints found.</p>';
  }

  const methodColor: Record<string, string> = {
    GET: 'bg-green-100 text-green-700',
    POST: 'bg-blue-100 text-blue-700',
    PUT: 'bg-amber-100 text-amber-700',
    PATCH: 'bg-orange-100 text-orange-700',
    DELETE: 'bg-red-100 text-red-700',
  };

  const rows = parsedData.map((ep: any, i: number) => {
    const method = (ep.method || 'GET').toUpperCase();
    const colorCls = methodColor[method] || 'bg-slate-100 text-slate-700';
    return `
    <div class="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <input type="checkbox" id="rest-endpoint-${i}" data-endpoint-path="${ep.path || ''}" data-endpoint-method="${method}" checked
             class="w-4 h-4 accent-blue-600 flex-shrink-0" />
      <span class="text-xs font-bold px-2 py-0.5 rounded ${colorCls} font-mono flex-shrink-0">${method}</span>
      <span class="text-sm font-mono text-slate-700 truncate">${ep.path || ep.operationId || ''}</span>
      ${ep.summary ? `<span class="text-xs text-slate-400 ml-auto truncate max-w-[200px]">${ep.summary}</span>` : ''}
    </div>`;
  }).join('');

  return `
<div class="mb-3">
  <h4 class="font-bold text-slate-900">${parsedData.length} endpoint${parsedData.length !== 1 ? 's' : ''} detected</h4>
</div>
<div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
  <div class="px-4 py-3 divide-y divide-slate-50">${rows}</div>
</div>`;
}

// ─── Redis/Hazelcast group preview ────────────────────────────────────────────

export function buildConnectionGroupPreviewHtml(parsedData: any[], prefix: string): string {
  if (!parsedData || parsedData.length === 0) {
    return '<p class="text-slate-500 text-sm">No groups found.</p>';
  }

  const rows = parsedData.map((group: any, i: number) => {
    const toolCheckboxes = (group.tools || []).map((t: string) => `
      <label class="flex items-center gap-1 text-xs text-slate-600 cursor-pointer select-none">
        <input type="checkbox" data-tool-name="${t}" checked class="w-3 h-3 accent-blue-600" />
        ${t}
      </label>`).join('');

    return `
    <div class="border border-slate-200 rounded-lg overflow-hidden mb-3">
      <div class="flex items-center gap-3 px-4 py-3 bg-slate-50">
        <input type="checkbox" id="${prefix}-group-select-${i}" checked class="w-4 h-4 accent-blue-600 flex-shrink-0" />
        <span class="font-semibold text-slate-800 flex-1 text-sm">${group.name || group.group || 'Group ' + i}</span>
      </div>
      ${toolCheckboxes ? `
      <div id="${prefix}-group-tools-${i}" class="px-4 py-3">
        <div class="flex flex-wrap gap-3">${toolCheckboxes}</div>
      </div>` : ''}
    </div>`;
  }).join('');

  return `<div class="mb-3"><h4 class="font-bold text-slate-900">${parsedData.length} group${parsedData.length !== 1 ? 's' : ''} detected</h4></div>${rows}`;
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
    const ds = { type, alias: s.webToolAlias || undefined, name: s.webUrl, url: s.webUrl };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'globe', color: 'cyan', typeLabel: 'Web Page',
        title: s.webUrl || 'Web Page', subtitle: 'Fetches and scrapes a web page',
        details: [
          { label: 'URL', value: s.webUrl },
          { label: 'Alias', value: s.webToolAlias },
        ],
        tools: ['get_page_content', 'extract_links', 'screenshot'],
      }),
    };
  }

  if (type === T.Curl) {
    let ds: Record<string, any>;
    if (s.curlMode === 'paste') {
      const parsed = parseCurlCommand(s.curlCommand);
      ds = { type, alias: s.curlToolAlias || undefined, url: parsed.url, method: parsed.method, headers: parsed.headers, body: parsed.body };
    } else {
      let headers: Record<string, string> = {};
      try { headers = JSON.parse(s.curlHeaders || '{}'); } catch { headers = {}; }
      ds = { type, alias: s.curlToolAlias || undefined, url: s.curlUrl, method: s.curlMethod, headers, body: s.curlBody };
    }
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'terminal', color: 'slate', typeLabel: 'cURL',
        title: ds.url || 'cURL Request', subtitle: `${ds.method} request`,
        details: [
          { label: 'URL', value: ds.url },
          { label: 'Method', value: ds.method },
        ],
        tools: ['execute_request'],
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
    const ds = { type, name: 'MongoDB', host: s.mongoHost, port: s.mongoPort, database: s.mongoDatabase, username: s.mongoUsername, password: s.mongoPassword, authSource: s.mongoAuthSource };
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
    const ds = { type, name: 'Email', mode: s.emailMode, imapHost: s.emailImapHost, imapPort: s.emailImapPort, smtpHost: s.emailSmtpHost, smtpPort: s.emailSmtpPort, username: s.emailUsername, password: s.emailPassword, secure: s.emailSecure };
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
    const ds = { type, name: 'Gmail', mode: s.gmailMode, imapHost: 'imap.gmail.com', imapPort: '993', smtpHost: 'smtp.gmail.com', smtpPort: '587', username: s.gmailUsername, password: s.gmailPassword, secure: s.gmailSecure };
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
    const ds = { type, name: 'FTP', host: s.ftpHost, port: s.ftpPort, username: s.ftpUsername, password: s.ftpPassword, basePath: s.ftpBasePath, secure: s.ftpSecure };
    return {
      dataSource: ds,
      parsedData: null,
      html: buildGenericPreviewHtml({
        icon: 'server', color: 'slate', typeLabel: 'FTP',
        title: s.ftpHost || 'FTP Server', subtitle: `${s.ftpSecure ? 'FTPS' : 'FTP'} — port ${s.ftpPort}`,
        details: [
          { label: 'Host', value: s.ftpHost },
          { label: 'Port', value: s.ftpPort },
          { label: 'Username', value: s.ftpUsername },
          { label: 'Base Path', value: s.ftpBasePath },
        ],
        tools: ['list_files', 'get_file', 'upload_file', 'delete_file', 'create_directory'],
      }),
    };
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
    const ds = { type, name: 'Telegram', baseUrl: s.telegramBaseUrl, botToken: s.telegramBotToken, chatId: s.telegramChatId };
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
    const ds = { type, name: 'OpenAI', apiKey: s.openaiApiKey, model: s.openaiModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'green', typeLabel: 'OpenAI', title: `OpenAI — ${s.openaiModel}`, subtitle: 'Access GPT models', details: [{ label: 'Model', value: s.openaiModel }], tools: ['chat_completion', 'text_completion', 'create_image', 'create_embedding', 'list_models'] }) };
  }
  if (type === T.Claude) {
    const ds = { type, name: 'Claude', apiKey: s.claudeApiKey, model: s.claudeModel, apiVersion: s.claudeApiVersion };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'orange', typeLabel: 'Claude (Anthropic)', title: `Claude — ${s.claudeModel}`, subtitle: 'Access Anthropic Claude models', details: [{ label: 'Model', value: s.claudeModel }, { label: 'API Version', value: s.claudeApiVersion }], tools: ['chat', 'count_tokens', 'list_models'] }) };
  }
  if (type === T.Gemini) {
    const ds = { type, name: 'Gemini', apiKey: s.geminiApiKey, model: s.geminiModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'blue', typeLabel: 'Google Gemini', title: `Gemini — ${s.geminiModel}`, subtitle: 'Access Google Gemini models', details: [{ label: 'Model', value: s.geminiModel }], tools: ['generate_content', 'chat', 'embed_content', 'list_models'] }) };
  }
  if (type === T.Grok) {
    const ds = { type, name: 'Grok', apiKey: s.grokApiKey, model: s.grokModel };
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
    const ds = { type, name: 'Llama (Ollama)', baseUrl: s.llamaBaseUrl, model: s.llamaModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'orange', typeLabel: 'Llama (Ollama)', title: `Llama — ${s.llamaModel}`, subtitle: 'Local Llama via Ollama', details: [{ label: 'Base URL', value: s.llamaBaseUrl }, { label: 'Model', value: s.llamaModel }], tools: ['chat', 'generate', 'list_models', 'pull_model'] }) };
  }
  if (type === T.DeepSeek) {
    const ds = { type, name: 'DeepSeek', baseUrl: s.deepseekBaseUrl, apiKey: s.deepseekApiKey, model: s.deepseekModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'blue', typeLabel: 'DeepSeek', title: `DeepSeek — ${s.deepseekModel}`, subtitle: 'Access DeepSeek AI models', details: [{ label: 'Model', value: s.deepseekModel }], tools: ['chat_completion', 'list_models'] }) };
  }
  if (type === T.AzureOpenAI) {
    const ds = { type, name: 'Azure OpenAI', baseUrl: s.azureOpenAIBaseUrl, apiKey: s.azureOpenAIApiKey, apiVersion: s.azureOpenAIApiVersion, deployment: s.azureOpenAIDeployment };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'blue', typeLabel: 'Azure OpenAI', title: `Azure OpenAI — ${s.azureOpenAIDeployment || 'deployment'}`, subtitle: s.azureOpenAIBaseUrl || 'Azure Cognitive Services', details: [{ label: 'Deployment', value: s.azureOpenAIDeployment }, { label: 'API Version', value: s.azureOpenAIApiVersion }], tools: ['chat_completion', 'text_completion', 'create_embedding', 'create_image'] }) };
  }
  if (type === T.Mistral) {
    const ds = { type, name: 'Mistral AI', baseUrl: s.mistralBaseUrl, apiKey: s.mistralApiKey, model: s.mistralModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'orange', typeLabel: 'Mistral AI', title: `Mistral — ${s.mistralModel}`, subtitle: 'Access Mistral AI models', details: [{ label: 'Model', value: s.mistralModel }], tools: ['chat_completion', 'list_models'] }) };
  }
  if (type === T.Cohere) {
    const ds = { type, name: 'Cohere', baseUrl: s.cohereBaseUrl, apiKey: s.cohereApiKey, model: s.cohereModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'violet', typeLabel: 'Cohere', title: `Cohere — ${s.cohereModel}`, subtitle: 'Access Cohere AI models', details: [{ label: 'Model', value: s.cohereModel }], tools: ['chat', 'generate', 'embed', 'rerank', 'classify'] }) };
  }
  if (type === T.Perplexity) {
    const ds = { type, name: 'Perplexity AI', baseUrl: s.perplexityBaseUrl, apiKey: s.perplexityApiKey, model: s.perplexityModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'search', color: 'blue', typeLabel: 'Perplexity AI', title: `Perplexity — ${s.perplexityModel}`, subtitle: 'AI-powered search and answers', details: [{ label: 'Model', value: s.perplexityModel }], tools: ['chat_completion', 'list_models'] }) };
  }
  if (type === T.Together) {
    const ds = { type, name: 'Together AI', baseUrl: s.togetherBaseUrl, apiKey: s.togetherApiKey, model: s.togetherModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'robot', color: 'blue', typeLabel: 'Together AI', title: s.togetherModel ? `Together — ${s.togetherModel}` : 'Together AI', subtitle: 'Access open-source models via Together', details: [{ label: 'Model', value: s.togetherModel }], tools: ['chat_completion', 'completions', 'list_models'] }) };
  }
  if (type === T.Fireworks) {
    const ds = { type, name: 'Fireworks AI', baseUrl: s.fireworksBaseUrl, apiKey: s.fireworksApiKey, model: s.fireworksModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'fire', color: 'red', typeLabel: 'Fireworks AI', title: s.fireworksModel ? `Fireworks — ${s.fireworksModel}` : 'Fireworks AI', subtitle: 'Fast inference for open-source models', details: [{ label: 'Model', value: s.fireworksModel }], tools: ['chat_completion', 'completions', 'list_models'] }) };
  }
  if (type === T.Groq) {
    const ds = { type, name: 'Groq', baseUrl: s.groqBaseUrl, apiKey: s.groqApiKey, model: s.groqModel };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'bolt', color: 'orange', typeLabel: 'Groq', title: `Groq — ${s.groqModel}`, subtitle: 'Ultra-fast LLM inference', details: [{ label: 'Model', value: s.groqModel }], tools: ['chat_completion', 'list_models'] }) };
  }
  if (type === T.OpenRouter) {
    const ds = { type, name: 'OpenRouter', baseUrl: s.openrouterBaseUrl, apiKey: s.openrouterApiKey, model: s.openrouterModel };
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
    const ds = { type, name: 'Jira', apiVersion: 'rest/api/3', host: s.jiraHost, email: s.jiraEmail, apiToken: s.jiraApiToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'jira', color: 'blue', typeLabel: 'Jira', title: s.jiraHost || 'Jira', subtitle: `${s.jiraEmail || ''}`, details: [{ label: 'Host', value: s.jiraHost }, { label: 'Email', value: s.jiraEmail }], tools: ['list_projects', 'get_project', 'list_issues', 'get_issue', 'create_issue', 'update_issue', 'add_comment', 'list_sprints', 'get_sprint', 'list_transitions', 'transition_issue', 'assign_issue'] }) };
  }
  if (type === T.Confluence) {
    const ds = { type, name: 'Confluence', host: s.confluenceHost, email: s.confluenceEmail, apiToken: s.confluenceApiToken };
    return { dataSource: ds, parsedData: null, html: buildGenericPreviewHtml({ icon: 'book', color: 'blue', typeLabel: 'Confluence', title: s.confluenceHost || 'Confluence', subtitle: s.confluenceEmail || '', details: [{ label: 'Host', value: s.confluenceHost }, { label: 'Email', value: s.confluenceEmail }], tools: ['list_spaces', 'get_space', 'list_pages', 'get_page', 'create_page', 'update_page', 'search'] }) };
  }
  if (type === T.Notion) {
    const ds = { type, name: 'Notion', baseUrl: s.notionBaseUrl, version: s.notionVersion, accessToken: s.notionAccessToken };
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
              port: store.dbPort,
              db: store.dbName,
              user: store.dbUser,
              password: store.dbPassword,
            },
          });
        } else {
          // connection template (Redis, Hazelcast, Kafka)
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify({
            type,
            host: store.dbHost,
            port: store.dbPort,
            password: store.dbPassword,
          });
        }

        const res = await fetch('/api/parse', { method: 'POST', headers, body });
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Parse failed');
        }

        const parsedData: any[] = data.tables || data.endpoints || data.groups || [];
        store.setCurrentDataSource({ type, host: store.dbHost, port: store.dbPort, db: store.dbName, user: store.dbUser, password: store.dbPassword, swaggerUrl: store.swaggerUrl });
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

import { SQLiteManager, ServerConfig, ToolDefinition, ResourceDefinition } from './database/sqlite-manager';
import { ActiveDatabaseConnection, DataSourceType } from './types';
import sql from 'mssql';
import mysql from 'mysql2/promise';
import { Pool } from 'pg';
import { MongoClient } from 'mongodb';

export class DynamicMCPExecutor {
  private sqliteManager: SQLiteManager;
  private dbConnections: Map<string, ActiveDatabaseConnection> = new Map();

  constructor() {
    this.sqliteManager = new SQLiteManager();
  }

  async getAllTools(): Promise<any[]> {
    const tools = this.sqliteManager.getAllTools();

    return tools.map(tool => ({
      name: `${tool.server_id}__${tool.name}`,
      description: `[${tool.server_id}] ${tool.description}`,
      inputSchema: typeof tool.inputSchema === 'string' ? JSON.parse(tool.inputSchema) : tool.inputSchema
    }));
  }

  async getAllResources(): Promise<any[]> {
    const resources = this.sqliteManager.getAllResources();

    return resources.map(resource => ({
      name: `${resource.server_id}__${resource.name}`,
      description: `[${resource.server_id}] ${resource.description}`,
      uri: resource.uri_template
    }));
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    try {
      const [serverId, actualToolName] = this.parseToolName(toolName);
      const tool = this.getTool(serverId, actualToolName);
      const serverConfig = this.getServerConfig(serverId);
      const queryConfig = this.parseQueryConfig(tool.sqlQuery);

      if (queryConfig?.type === DataSourceType.Rest) {
        return await this.executeRestCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Webpage) {
        return await this.executeWebpageFetch(queryConfig);
      }

      if (queryConfig?.type === DataSourceType.Curl) {
        return await this.executeCurlRequest(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.GitHub) {
        return await this.executeGitHubCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.X) {
        return await this.executeXCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Prometheus) {
        return await this.executePrometheusCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Grafana) {
        return await this.executeGrafanaCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.MongoDB) {
        return await this.executeMongoDBCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Facebook) {
        return await this.executeFacebookCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Dropbox) {
        return await this.executeDropboxCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Trello) {
        return await this.executeTrelloCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.GitLab) {
        return await this.executeGitLabCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Bitbucket) {
        return await this.executeBitbucketCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Jira) {
        return await this.executeJiraCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Confluence) {
        return await this.executeConfluenceCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Ftp) {
        return await this.executeFtpCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.LocalFS) {
        return await this.executeLocalFSCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Email) {
        return await this.executeEmailCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Slack) {
        return await this.executeSlackCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Discord) {
        return await this.executeDiscordCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Docker) {
        return await this.executeDockerCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Kubernetes) {
        return await this.executeKubernetesCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.Elasticsearch) {
        return await this.executeElasticsearchCall(queryConfig, args);
      }

      if (queryConfig?.type === DataSourceType.OpenShift) {
        return await this.executeOpenShiftCall(queryConfig, args);
      }

      return await this.executeDatabaseQuery(serverId, serverConfig, tool, args);

    } catch (error) {
      console.error(`❌ Error executing tool ${toolName}:`, error);
      throw error;
    }
  }

  private async executeDiscordCall(queryConfig: any, args: any): Promise<any> {
    const { botToken, defaultGuildId, defaultChannelId, operation } = queryConfig;

    const baseUrl = 'https://discord.com/api/v10';
    const headers: Record<string, string> = {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json'
    };

    console.error(`💬 Discord operation: ${operation}`);

    try {
      let result: any = [];
      switch (operation) {
        case 'listGuilds': {
          const response = await fetch(`${baseUrl}/users/@me/guilds`, { headers });
          const data: any = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to list guilds');
          result = (Array.isArray(data) ? data : []).map((g: any) => ({
            id: g.id,
            name: g.name,
            owner: g.owner,
            permissions: g.permissions,
            approximate_member_count: g.approximate_member_count
          }));
          break;
        }

        case 'listChannels': {
          const guildId = args.guildId || defaultGuildId;
          if (!guildId) throw new Error('guildId is required');
          const response = await fetch(`${baseUrl}/guilds/${guildId}/channels`, { headers });
          const data: any = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to list channels');
          result = (Array.isArray(data) ? data : []).map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            parent_id: c.parent_id,
            topic: c.topic
          }));
          break;
        }

        case 'listMembers': {
          const guildId = args.guildId || defaultGuildId;
          if (!guildId) throw new Error('guildId is required');
          const limit = Math.max(1, Math.min(1000, Number(args.limit) || 100));
          const response = await fetch(`${baseUrl}/guilds/${guildId}/members?limit=${limit}`, { headers });
          const data: any = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to list members');
          result = (Array.isArray(data) ? data : []).map((m: any) => ({
            user_id: m.user?.id,
            username: `${m.user?.username}#${m.user?.discriminator}`,
            nick: m.nick,
            joined_at: m.joined_at,
            roles: m.roles
          }));
          break;
        }

        case 'sendMessage': {
          const channelId = args.channelId || defaultChannelId;
          if (!channelId) throw new Error('channelId is required');
          const body: any = { content: args.content };
          if (args.replyToMessageId) {
            body.message_reference = { message_id: args.replyToMessageId };
          }
          const response = await fetch(`${baseUrl}/channels/${channelId}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          const data: any = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to send message');
          result = [{
            success: true,
            id: data.id,
            channel_id: data.channel_id,
            content: data.content
          }];
          break;
        }

        case 'getChannelMessages': {
          const channelId = args.channelId || defaultChannelId;
          if (!channelId) throw new Error('channelId is required');
          const limit = Math.max(1, Math.min(100, Number(args.limit) || 20));
          const response = await fetch(`${baseUrl}/channels/${channelId}/messages?limit=${limit}`, { headers });
          const data: any = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to get channel messages');
          result = (Array.isArray(data) ? data : []).map((m: any) => ({
            id: m.id,
            author_id: m.author?.id,
            author_username: `${m.author?.username}#${m.author?.discriminator}`,
            content: m.content,
            timestamp: m.timestamp
          }));
          break;
        }

        case 'getUserInfo': {
          const userId = args.userId;
          if (!userId) throw new Error('userId is required');
          const guildId = args.guildId || defaultGuildId;
          // Try guild member endpoint if guild available
          if (guildId) {
            const response = await fetch(`${baseUrl}/guilds/${guildId}/members/${userId}`, { headers });
            const data: any = await response.json();
            if (response.ok) {
              result = [{
                user_id: data.user?.id,
                username: `${data.user?.username}#${data.user?.discriminator}`,
                nick: data.nick,
                joined_at: data.joined_at,
                roles: data.roles
              }];
              break;
            }
          }
          // Fallback: public user endpoint (might be restricted)
          const response = await fetch(`${baseUrl}/users/${userId}`, { headers });
          const data: any = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to get user info');
          result = [{ id: data.id, username: `${data.username}#${data.discriminator}` }];
          break;
        }

        case 'addReaction': {
          const channelId = args.channelId || defaultChannelId;
          if (!channelId) throw new Error('channelId is required');
          const messageId = args.messageId;
          const emoji = args.emoji;
          if (!messageId || !emoji) throw new Error('messageId and emoji are required');
          const encodedEmoji = encodeURIComponent(emoji);
          const response = await fetch(`${baseUrl}/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`, {
            method: 'PUT',
            headers
          });
          if (!response.ok && response.status !== 204) {
            const data: any = await response.json().catch(() => ({}));
            throw new Error(data.message || `Failed to add reaction (${response.status})`);
          }
          result = [{ success: true }];
          break;
        }

        default:
          throw new Error(`Unknown Discord operation: ${operation}`);
      }

      console.error(`✅ Discord operation ${operation} completed successfully`);

      return {
        success: true,
        data: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1
      };
    } catch (error) {
      console.error(`❌ Discord error:`, error);
      return {
        success: false,
        error: `Discord error: ${error instanceof Error ? error.message : String(error)}`,
        data: [{ error: error instanceof Error ? error.message : String(error) }],
        rowCount: 1
      };
    }
  }

  private async executeDockerCall(queryConfig: any, args: any): Promise<any> {
    const { dockerPath = 'docker', operation } = queryConfig;
    console.error(`🐳 Docker operation: ${operation}`);

    const run = async (cmd: string, cmdArgs: string[], parse: 'json' | 'lines' | 'text' = 'json') => {
      const { execFile } = await import('child_process');
      return new Promise<any[]>((resolve, reject) => {
        // Debug: show command for diagnosis
        console.error(`🐳 docker exec: ${cmd} ${cmdArgs.join(' ')}`);
        const child = execFile(cmd, cmdArgs, { maxBuffer: 10 * 1024 * 1024, timeout: 8000 }, (err, stdout, stderr) => {
          if (err) {
            const msg = (stderr && stderr.trim()) || err.message || 'docker command failed';
            console.error(`🐳 docker error: ${msg}`);
            return reject(new Error(`${msg}`));
          }
          try {
            if (parse === 'json') {
              // Some docker commands output JSON per line when using Go template
              const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
              const items = lines.map(line => {
                try { return JSON.parse(line); } catch { return null; }
              }).filter(Boolean) as any[];
              resolve(items);
            } else if (parse === 'lines') {
              const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
              resolve(lines.map(l => ({ line: l })));
            } else {
              resolve([{ output: stdout }]);
            }
          } catch (e) {
            resolve([{ output: stdout }]);
          }
        });
      });
    };

    // Try to resolve a working docker binary path
    const resolveDockerBin = async (): Promise<string> => {
      const isWin = process.platform === 'win32';
      const pf = process.env['ProgramFiles'] || 'C:\\\\Program Files';

      const candidates = [
        dockerPath,
        process.env.DOCKER_PATH,
        // macOS/Linux common locations
        '/opt/homebrew/bin/docker', // Apple Silicon Homebrew
        '/usr/local/bin/docker',     // Intel mac / common
        '/usr/bin/docker',
        '/bin/docker',
        // Windows typical installs (Docker Desktop)
        isWin ? `${pf}\\Docker\\Docker\\resources\\bin\\docker.exe` : undefined,
        isWin ? `${pf}\\Docker\\Docker\\resources\\bin\\com.docker.cli.exe` : undefined,
      ].filter((p): p is string => !!p);

      for (const bin of candidates) {
        try {
          // If docker is present, this should run even if daemon is down
          // '--version' prints client version without connecting to daemon
          await run(bin, ['--version'], 'text');
          return bin;
        } catch (e: any) {
          if (typeof e?.message === 'string' && e.message.includes('ENOENT')) {
            continue; // not found, try next
          }
          // If binary exists but daemon not running, still accept this bin
          if (typeof e?.message === 'string' && (e.message.includes('Cannot connect to the Docker daemon') || e.message.includes('permission denied'))) {
            return bin;
          }
          // Some environments print version to stderr; allow this bin anyway
          if (typeof e?.message === 'string' && e.message.toLowerCase().includes('version')) {
            return bin;
          }
        }
      }
      // Fallback to provided dockerPath; subsequent runs will error with a clear message
      return dockerPath;
    };

    const bin = await resolveDockerBin();
    console.error(`🐳 docker bin selected: ${bin}`);

    try {
      // Preflight: ensure daemon reachable; provide clear error instead of generic timeout
      try {
        await run(bin, ['info'], 'text');
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          error: `Docker daemon not reachable: ${msg}. Start Docker Desktop/Engine or fix DOCKER_HOST/context.`,
          data: [{ error: msg }],
          rowCount: 1
        };
      }

      let result: any[] = [];
      switch (operation) {
        case 'listImages': {
          result = await run(bin, ['images', '--format', '{{json .}}'], 'json');
          break;
        }
        case 'listContainers': {
          const all = args.all !== false; // default true
          const baseArgs = ['ps', all ? '-a' : '', '--format', '{{json .}}'].filter(Boolean) as string[];
          result = await run(bin, baseArgs, 'json');
          break;
        }
        case 'inspectContainer': {
          if (!args.id) throw new Error('id is required');
          // docker inspect outputs a JSON array
          const { execFile } = await import('child_process');
          const out = await new Promise<string>((resolve, reject) => {
            execFile(bin, ['inspect', String(args.id)], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
              if (err) reject(new Error(stderr || err.message)); else resolve(stdout);
            });
          });
          const arr = JSON.parse(out);
          result = Array.isArray(arr) ? arr : [arr];
          break;
        }
        case 'startContainer': {
          if (!args.id) throw new Error('id is required');
          await run(bin, ['start', String(args.id)], 'text');
          result = [{ success: true }];
          break;
        }
        case 'stopContainer': {
          if (!args.id) throw new Error('id is required');
          await run(bin, ['stop', String(args.id)], 'text');
          result = [{ success: true }];
          break;
        }
        case 'restartContainer': {
          if (!args.id) throw new Error('id is required');
          await run(bin, ['restart', String(args.id)], 'text');
          result = [{ success: true }];
          break;
        }
        case 'removeContainer': {
          if (!args.id) throw new Error('id is required');
          const cmdArgs = ['rm'];
          if (args.force) cmdArgs.push('-f');
          cmdArgs.push(String(args.id));
          await run(bin, cmdArgs, 'text');
          result = [{ success: true }];
          break;
        }
        case 'removeImage': {
          if (!args.id) throw new Error('id is required');
          const cmdArgs = ['rmi'];
          if (args.force) cmdArgs.push('-f');
          cmdArgs.push(String(args.id));
          await run(bin, cmdArgs, 'text');
          result = [{ success: true }];
          break;
        }
        case 'pullImage': {
          if (!args.name) throw new Error('name is required');
          const lines = await run(bin, ['pull', String(args.name)], 'lines');
          result = lines;
          break;
        }
        case 'getLogs': {
          if (!args.id) throw new Error('id is required');
          const tail = Math.max(1, Math.min(10000, Number(args.tail) || 100));
          const lines = await run(bin, ['logs', '--tail', String(tail), String(args.id)], 'lines');
          result = lines.map((l: any) => ({ log: l.line }));
          break;
        }
        case 'execInContainer': {
          if (!args.id || !args.cmd) throw new Error('id and cmd are required');
          // Split command respecting spaces simply (user supplies full command string)
          const cmdParts = String(args.cmd).split(' ').filter(Boolean);
          const { execFile } = await import('child_process');
          const out = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            execFile(bin, ['exec', String(args.id), ...cmdParts], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
              if (err) reject(new Error(stderr || err.message)); else resolve({ stdout, stderr });
            });
          });
          result = [{ stdout: out.stdout, stderr: out.stderr }];
          break;
        }
        default:
          throw new Error(`Unknown Docker operation: ${operation}`);
      }

      return {
        success: true,
        data: result,
        rowCount: result.length
      };
    } catch (error) {
      console.error('❌ Docker error:', error);
      return {
        success: false,
        error: `Docker error: ${error instanceof Error ? error.message : String(error)}`,
        data: [{ error: error instanceof Error ? error.message : String(error) }],
        rowCount: 1
      };
    }
  }

  private async executeKubernetesCall(queryConfig: any, args: any): Promise<any> {
    const { kubectlPath = 'kubectl', kubeconfig, namespace: defaultNamespace, operation } = queryConfig;
    console.error(`☸️ Kubernetes operation: ${operation}`);

    const run = async (cmd: string, cmdArgs: string[], parse: 'json' | 'lines' | 'text' = 'json') => {
      const { execFile } = await import('child_process');
      return new Promise<any[]>((resolve, reject) => {
        console.error(`☸️ kubectl exec: ${cmd} ${cmdArgs.join(' ')}`);
        execFile(cmd, cmdArgs, { maxBuffer: 10 * 1024 * 1024, timeout: 8000 }, (err, stdout, stderr) => {
          if (err) {
            const msg = (stderr && stderr.trim()) || err.message || 'kubectl command failed';
            console.error(`☸️ kubectl error: ${msg}`);
            return reject(new Error(`${msg}`));
          }
          try {
            if (parse === 'json') {
              const parsed = JSON.parse(stdout);
              resolve(Array.isArray(parsed) ? parsed : [parsed]);
            } else if (parse === 'lines') {
              const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
              resolve(lines.map(l => ({ line: l })));
            } else {
              resolve([{ output: stdout }]);
            }
          } catch (e) {
            resolve([{ output: stdout }]);
          }
        });
      });
    };

    const resolveKubectlBin = async (): Promise<string> => {
      const isWin = process.platform === 'win32';
      const pf = process.env['ProgramFiles'] || 'C:\\\\Program Files';

      const candidates = [
        kubectlPath,
        process.env.KUBECTL_PATH,
        '/opt/homebrew/bin/kubectl',
        '/usr/local/bin/kubectl',
        '/usr/bin/kubectl',
        '/bin/kubectl',
        isWin ? `${pf}\\Kubernetes\\kubectl.exe` : undefined,
      ].filter((p): p is string => !!p);

      for (const bin of candidates) {
        try {
          await run(bin, ['version', '--client', '-o', 'json'], 'json');
          return bin;
        } catch (e: any) {
          if (typeof e?.message === 'string' && e.message.includes('ENOENT')) {
            continue;
          }
          if (typeof e?.message === 'string' && e.message.toLowerCase().includes('version')) {
            return bin;
          }
        }
      }
      return kubectlPath;
    };

    const bin = await resolveKubectlBin();
    console.error(`☸️ kubectl bin selected: ${bin}`);

    const baseArgs: string[] = [];
    if (kubeconfig) {
      baseArgs.push('--kubeconfig', String(kubeconfig));
    }

    const withNamespace = (ns?: string) => {
      const finalNs = ns || defaultNamespace;
      return finalNs ? ['-n', String(finalNs)] : [];
    };

    try {
      let result: any[] = [];
      switch (operation) {
        case 'listContexts': {
          result = await run(bin, [...baseArgs, 'config', 'get-contexts', '-o', 'name'], 'lines');
          break;
        }
        case 'getCurrentContext': {
          const lines = await run(bin, [...baseArgs, 'config', 'current-context'], 'lines');
          result = lines.map(l => ({ context: l.line }));
          break;
        }
        case 'listNamespaces': {
          result = await run(bin, [...baseArgs, 'get', 'namespaces', '-o', 'json'], 'json');
          break;
        }
        case 'listPods': {
          const nsArgs = withNamespace(args.namespace);
          result = await run(bin, [...baseArgs, 'get', 'pods', ...nsArgs, '-o', 'json'], 'json');
          break;
        }
        case 'getPod': {
          if (!args.name) throw new Error('name is required');
          const nsArgs = withNamespace(args.namespace);
          result = await run(bin, [...baseArgs, 'get', 'pod', String(args.name), ...nsArgs, '-o', 'json'], 'json');
          break;
        }
        case 'describePod': {
          if (!args.name) throw new Error('name is required');
          const nsArgs = withNamespace(args.namespace);
          result = await run(bin, [...baseArgs, 'describe', 'pod', String(args.name), ...nsArgs], 'text');
          break;
        }
        case 'listDeployments': {
          const nsArgs = withNamespace(args.namespace);
          result = await run(bin, [...baseArgs, 'get', 'deployments', ...nsArgs, '-o', 'json'], 'json');
          break;
        }
        case 'scaleDeployment': {
          if (!args.name || typeof args.replicas === 'undefined') throw new Error('name and replicas are required');
          const nsArgs = withNamespace(args.namespace);
          await run(bin, [...baseArgs, 'scale', 'deployment', String(args.name), ...nsArgs, `--replicas=${Number(args.replicas)}`], 'text');
          result = [{ success: true }];
          break;
        }
        case 'deletePod': {
          if (!args.name) throw new Error('name is required');
          const nsArgs = withNamespace(args.namespace);
          await run(bin, [...baseArgs, 'delete', 'pod', String(args.name), ...nsArgs], 'text');
          result = [{ success: true }];
          break;
        }
        default:
          throw new Error(`Unknown Kubernetes operation: ${operation}`);
      }

      return {
        success: true,
        data: result,
        rowCount: result.length
      };
    } catch (error) {
      console.error('❌ Kubernetes error:', error);
      return {
        success: false,
        error: `Kubernetes error: ${error instanceof Error ? error.message : String(error)}`,
        data: [{ error: error instanceof Error ? error.message : String(error) }],
        rowCount: 1
      };
    }
  }

  private async executeElasticsearchCall(queryConfig: any, args: any): Promise<any> {
    const { baseUrl, apiKey, username, password, index: defaultIndex, operation } = queryConfig;
    if (!baseUrl) {
      return {
        success: false,
        error: 'Elasticsearch baseUrl is missing',
        data: [{ error: 'Elasticsearch baseUrl is missing' }],
        rowCount: 1
      };
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = `ApiKey ${apiKey}`;
    } else if (username && password) {
      const token = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${token}`;
    }

    const resolveIndex = (override?: string) => override || defaultIndex || '';

    try {
      let result: any = null;
      switch (operation) {
        case 'listIndices': {
          const response = await fetch(`${baseUrl}/_cat/indices?format=json`, { headers });
          result = await response.json();
          if (!response.ok) throw new Error(result?.error?.reason || 'Failed to list indices');
          break;
        }
        case 'getClusterHealth': {
          const response = await fetch(`${baseUrl}/_cluster/health`, { headers });
          result = await response.json();
          if (!response.ok) throw new Error(result?.error?.reason || 'Failed to get cluster health');
          break;
        }
        case 'search': {
          const idx = resolveIndex(args.index);
          if (!idx) throw new Error('index is required');
          const size = Number.isFinite(Number(args.size)) ? Number(args.size) : 10;
          const body = args.query ? { query: args.query, size } : { size };
          const response = await fetch(`${baseUrl}/${encodeURIComponent(idx)}/_search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          result = await response.json();
          if (!response.ok) throw new Error(result?.error?.reason || 'Search failed');
          break;
        }
        case 'getDocument': {
          const idx = resolveIndex(args.index);
          if (!idx) throw new Error('index is required');
          if (!args.id) throw new Error('id is required');
          const response = await fetch(`${baseUrl}/${encodeURIComponent(idx)}/_doc/${encodeURIComponent(String(args.id))}`, { headers });
          result = await response.json();
          if (!response.ok) throw new Error(result?.error?.reason || 'Get document failed');
          break;
        }
        case 'indexDocument': {
          const idx = resolveIndex(args.index);
          if (!idx) throw new Error('index is required');
          if (!args.document) throw new Error('document is required');
          const refresh = args.refresh === false ? 'false' : 'true';
          const idPart = args.id ? `/${encodeURIComponent(String(args.id))}` : '';
          const response = await fetch(`${baseUrl}/${encodeURIComponent(idx)}/_doc${idPart}?refresh=${refresh}`, {
            method: args.id ? 'PUT' : 'POST',
            headers,
            body: JSON.stringify(args.document)
          });
          result = await response.json();
          if (!response.ok) throw new Error(result?.error?.reason || 'Index document failed');
          break;
        }
        case 'deleteDocument': {
          const idx = resolveIndex(args.index);
          if (!idx) throw new Error('index is required');
          if (!args.id) throw new Error('id is required');
          const response = await fetch(`${baseUrl}/${encodeURIComponent(idx)}/_doc/${encodeURIComponent(String(args.id))}`, {
            method: 'DELETE',
            headers
          });
          result = await response.json();
          if (!response.ok) throw new Error(result?.error?.reason || 'Delete document failed');
          break;
        }
        default:
          throw new Error(`Unknown Elasticsearch operation: ${operation}`);
      }

      const dataArray = Array.isArray(result) ? result : [result];
      return { success: true, data: dataArray, rowCount: dataArray.length };
    } catch (error) {
      console.error('❌ Elasticsearch error:', error);
      return {
        success: false,
        error: `Elasticsearch error: ${error instanceof Error ? error.message : String(error)}`,
        data: [{ error: error instanceof Error ? error.message : String(error) }],
        rowCount: 1
      };
    }
  }

  private async executeOpenShiftCall(queryConfig: any, args: any): Promise<any> {
    const { ocPath = 'oc', kubeconfig, namespace: defaultNamespace, operation } = queryConfig;
    console.error(`🟥 OpenShift operation: ${operation}`);

    const run = async (cmd: string, cmdArgs: string[], parse: 'json' | 'lines' | 'text' = 'json') => {
      const { execFile } = await import('child_process');
      return new Promise<any[]>((resolve, reject) => {
        console.error(`🟥 oc exec: ${cmd} ${cmdArgs.join(' ')}`);
        execFile(cmd, cmdArgs, { maxBuffer: 10 * 1024 * 1024, timeout: 8000 }, (err, stdout, stderr) => {
          if (err) {
            const msg = (stderr && stderr.trim()) || err.message || 'oc command failed';
            console.error(`🟥 oc error: ${msg}`);
            return reject(new Error(`${msg}`));
          }
          try {
            if (parse === 'json') {
              const parsed = JSON.parse(stdout);
              resolve(Array.isArray(parsed) ? parsed : [parsed]);
            } else if (parse === 'lines') {
              const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
              resolve(lines.map(l => ({ line: l })));
            } else {
              resolve([{ output: stdout }]);
            }
          } catch (e) {
            resolve([{ output: stdout }]);
          }
        });
      });
    };

    const resolveOcBin = async (): Promise<string> => {
      const isWin = process.platform === 'win32';
      const pf = process.env['ProgramFiles'] || 'C:\\\\Program Files';

      const candidates = [
        ocPath,
        process.env.OC_PATH,
        '/opt/homebrew/bin/oc',
        '/usr/local/bin/oc',
        '/usr/bin/oc',
        '/bin/oc',
        isWin ? `${pf}\\OpenShift\\oc.exe` : undefined,
      ].filter((p): p is string => !!p);

      for (const bin of candidates) {
        try {
          await run(bin, ['version'], 'text');
          return bin;
        } catch (e: any) {
          if (typeof e?.message === 'string' && e.message.includes('ENOENT')) {
            continue;
          }
          if (typeof e?.message === 'string' && e.message.toLowerCase().includes('openshift')) {
            return bin;
          }
        }
      }
      return ocPath;
    };

    const bin = await resolveOcBin();
    console.error(`🟥 oc bin selected: ${bin}`);

    const baseArgs: string[] = [];
    if (kubeconfig) {
      baseArgs.push('--kubeconfig', String(kubeconfig));
    }

    const withNamespace = (ns?: string) => {
      const finalNs = ns || defaultNamespace;
      return finalNs ? ['-n', String(finalNs)] : [];
    };

    try {
      let result: any[] = [];
      switch (operation) {
        case 'listProjects': {
          result = await run(bin, [...baseArgs, 'get', 'projects', '-o', 'json'], 'json');
          break;
        }
        case 'getCurrentProject': {
          const lines = await run(bin, [...baseArgs, 'project', '-q'], 'lines');
          result = lines.map(l => ({ project: l.line }));
          break;
        }
        case 'listPods': {
          const nsArgs = withNamespace(args.namespace);
          result = await run(bin, [...baseArgs, 'get', 'pods', ...nsArgs, '-o', 'json'], 'json');
          break;
        }
        case 'getPod': {
          if (!args.name) throw new Error('name is required');
          const nsArgs = withNamespace(args.namespace);
          result = await run(bin, [...baseArgs, 'get', 'pod', String(args.name), ...nsArgs, '-o', 'json'], 'json');
          break;
        }
        case 'listDeployments': {
          const nsArgs = withNamespace(args.namespace);
          result = await run(bin, [...baseArgs, 'get', 'deployments', ...nsArgs, '-o', 'json'], 'json');
          break;
        }
        case 'scaleDeployment': {
          if (!args.name || typeof args.replicas === 'undefined') throw new Error('name and replicas are required');
          const nsArgs = withNamespace(args.namespace);
          await run(bin, [...baseArgs, 'scale', 'deployment', String(args.name), ...nsArgs, `--replicas=${Number(args.replicas)}`], 'text');
          result = [{ success: true }];
          break;
        }
        case 'deletePod': {
          if (!args.name) throw new Error('name is required');
          const nsArgs = withNamespace(args.namespace);
          await run(bin, [...baseArgs, 'delete', 'pod', String(args.name), ...nsArgs], 'text');
          result = [{ success: true }];
          break;
        }
        default:
          throw new Error(`Unknown OpenShift operation: ${operation}`);
      }

      return {
        success: true,
        data: result,
        rowCount: result.length
      };
    } catch (error) {
      console.error('❌ OpenShift error:', error);
      return {
        success: false,
        error: `OpenShift error: ${error instanceof Error ? error.message : String(error)}`,
        data: [{ error: error instanceof Error ? error.message : String(error) }],
        rowCount: 1
      };
    }
  }

  private parseToolName(toolName: string): [string, string] {
    const parts = toolName.split('__');
    if (parts.length !== 2) {
      throw new Error(`Invalid tool name format: ${toolName}`);
    }
    return [parts[0], parts[1]];
  }

  private getTool(serverId: string, toolName: string): ToolDefinition {
    const tools = this.sqliteManager.getToolsForServer(serverId);
    const tool = tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${serverId}__${toolName}`);
    }
    return tool;
  }

  private getServerConfig(serverId: string): any {
    const serverConfig = this.sqliteManager.getServer(serverId);
    if (!serverConfig) {
      throw new Error(`Server not found: ${serverId}`);
    }
    return serverConfig;
  }

  private parseQueryConfig(sqlQuery: string): any {
    try {
      return JSON.parse(sqlQuery);
    } catch {
      return null;
    }
  }

  private async executeRestCall(queryConfig: any, args: any): Promise<any> {
    const { baseUrl, method, path } = queryConfig;
    const url = `${baseUrl}${path}`;
    console.error(`🌐 REST API call: ${method} ${url}`);

    const fetchOptions: any = {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    if (method !== 'GET' && Object.keys(args).length > 0) {
      fetchOptions.body = JSON.stringify(args);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    console.error(`✅ REST API response: ${response.status}`);
    return {
      success: true,
      data: Array.isArray(data) ? data : [data],
      rowCount: Array.isArray(data) ? data.length : 1
    };
  }

  private async executeWebpageFetch(queryConfig: any): Promise<any> {
    const url = queryConfig.url;
    console.error(`🌐 Fetching webpage: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    console.error(`✅ Fetched ${html.length} characters from ${url}`);
    return {
      success: true,
      data: [{
        url: url,
        html_content: html,
        content_length: html.length,
        status: response.status,
        content_type: response.headers.get('content-type') || 'unknown'
      }],
      rowCount: 1
    };
  }

  private async executeCurlRequest(queryConfig: any, args: any): Promise<any> {
    // Start with base config and override with runtime args
    const finalConfig = { ...queryConfig, ...args };
    
    const { url, method, headers, body } = finalConfig;

    if (!url) {
        throw new Error('URL is missing in cURL request configuration');
    }

    //console.error(`🚀 cURL Request: ${method || 'GET'} ${url}`);

    const fetchOptions: RequestInit = {
        method: method || 'GET',
        headers: headers || {},
    };

    if (body && Object.keys(body).length > 0 && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(body);
        // Ensure content-type is set for JSON body
        (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');
    
    let responseData: any;
    if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
    } else {
        responseData = await response.text();
    }

    console.error(`✅ cURL Response: ${response.status}`);
    
    if (!response.ok) {
        console.error(`❌ cURL request failed with status ${response.status}:`, responseData);
        // Still return a structured response for the tool output
        return {
            success: false,
            error: `Request failed with status ${response.status}`,
            data: [{
                status: response.status,
                response: responseData
            }],
            rowCount: 1
        };
    }

    const dataArray = Array.isArray(responseData) ? responseData : [responseData];

    return {
        success: true,
        data: dataArray,
        rowCount: dataArray.length
    };
  }

  private async executeGitHubCall(queryConfig: any, args: any): Promise<any> {
    const { token, endpoint, method, owner: defaultOwner, repo: defaultRepo } = queryConfig;

    // Use args owner/repo if provided, otherwise use defaults from config
    const owner = args.owner || defaultOwner;
    const repo = args.repo || defaultRepo;

    // Build the URL by replacing path parameters
    let url = `https://api.github.com${endpoint}`;

    // Replace path parameters like {owner}, {repo}, {path}, {issue_number}
    url = url.replace('{owner}', owner || '');
    url = url.replace('{repo}', repo || '');
    if (args.path) {
      url = url.replace('{path}', args.path);
    }
    if (args.issue_number) {
      url = url.replace('{issue_number}', args.issue_number);
    }
    if (args.username) {
      url = url.replace('/user', `/users/${args.username}`);
    }

    // Build query parameters for GET requests
    const queryParams: string[] = [];
    const bodyParams: any = {};

    for (const [key, value] of Object.entries(args)) {
      if (value === undefined || value === null) continue;

      // Skip path parameters
      if (['owner', 'repo', 'path', 'issue_number', 'username'].includes(key)) continue;

      if (method === 'GET') {
        queryParams.push(`${key}=${encodeURIComponent(String(value))}`);
      } else {
        bodyParams[key] = value;
      }
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    console.error(`🐙 GitHub API call: ${method} ${url}`);

    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'QuickMCP'
      }
    };

    if (method !== 'GET' && Object.keys(bodyParams).length > 0) {
      fetchOptions.body = JSON.stringify(bodyParams);
      (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');

    let responseData: any;
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    console.error(`✅ GitHub API response: ${response.status}`);

    if (!response.ok) {
      console.error(`❌ GitHub API error:`, responseData);
      return {
        success: false,
        error: `GitHub API error: ${response.status}`,
        data: [{
          status: response.status,
          message: responseData.message || responseData,
          documentation_url: responseData.documentation_url
        }],
        rowCount: 1
      };
    }

    // Handle different response types
    let dataArray: any[];
    if (Array.isArray(responseData)) {
      dataArray = responseData;
    } else if (responseData.items) {
      // Search results have items array
      dataArray = responseData.items;
    } else {
      dataArray = [responseData];
    }

    return {
      success: true,
      data: dataArray,
      rowCount: dataArray.length
    };
  }

  private async executeXCall(queryConfig: any, args: any): Promise<any> {
    const { token, endpoint, method, username: defaultUsername } = queryConfig;
    const bearerToken = String(token || '').trim();
    if (!bearerToken) {
      return { success: false, error: 'Missing X API token', data: [], rowCount: 0 };
    }
    if (/[^\x00-\x7F]/.test(bearerToken)) {
      return {
        success: false,
        error: 'X API token contains non-ASCII characters. Re-enter the token without quotes/ellipses.',
        data: [],
        rowCount: 0
      };
    }

    let url = `https://api.x.com${endpoint}`;

    const username = args.username || defaultUsername;
    if (username) {
      url = url.replace('{username}', encodeURIComponent(username));
    }
    if (args.user_id) {
      url = url.replace('{user_id}', encodeURIComponent(args.user_id));
    }
    if (args.tweet_id) {
      url = url.replace('{tweet_id}', encodeURIComponent(args.tweet_id));
    }

    const queryParams: string[] = [];
    const bodyParams: any = {};

    for (const [key, value] of Object.entries(args)) {
      if (value === undefined || value === null) continue;
      if (['username', 'user_id', 'tweet_id'].includes(key)) continue;

      if ((method || 'GET') === 'GET') {
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      } else {
        bodyParams[key] = value;
      }
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    console.error(`X API call: ${method} ${url}`);

    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'QuickMCP'
      }
    };

    if ((method || 'GET') !== 'GET' && Object.keys(bodyParams).length > 0) {
      fetchOptions.body = JSON.stringify(bodyParams);
    }

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');

    let responseData: any;
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    console.error(`✅ X API response: ${response.status}`);

    if (!response.ok) {
      console.error('❌ X API error:', responseData);
      return {
        success: false,
        error: `X API error: ${response.status}`,
        data: [{
          status: response.status,
          message: responseData?.title || responseData?.error || responseData?.detail || responseData
        }],
        rowCount: 1
      };
    }

    let dataArray: any[];
    if (responseData?.data) {
      dataArray = Array.isArray(responseData.data) ? responseData.data : [responseData.data];
    } else if (Array.isArray(responseData)) {
      dataArray = responseData;
    } else {
      dataArray = [responseData];
    }

    return {
      success: true,
      data: dataArray,
      rowCount: dataArray.length
    };
  }

  private async executePrometheusCall(queryConfig: any, args: any): Promise<any> {
    const { baseUrl, endpoint, method } = queryConfig;
    let url = `${String(baseUrl).replace(/\/$/, '')}${endpoint}`;

    const queryParams: string[] = [];
    for (const [key, value] of Object.entries(args || {})) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`));
      } else {
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    console.error(`📈 Prometheus API call: ${method || 'GET'} ${url}`);

    const response = await fetch(url, { method: method || 'GET' });
    const responseData: any = await response.json().catch(() => null);

    console.error(`✅ Prometheus API response: ${response.status}`);

    if (!response.ok) {
      console.error('❌ Prometheus API error:', responseData);
      return {
        success: false,
        error: `Prometheus API error: ${response.status}`,
        data: [{
          status: response.status,
          message: responseData?.error || responseData?.message || responseData
        }],
        rowCount: 1
      };
    }

    const dataArray = responseData ? [responseData] : [];
    return {
      success: true,
      data: dataArray,
      rowCount: dataArray.length
    };
  }

  private async executeGrafanaCall(queryConfig: any, args: any): Promise<any> {
    const { baseUrl, endpoint, method, authType, apiKey, username, password } = queryConfig;
    let url = `${String(baseUrl).replace(/\/$/, '')}${endpoint}`;

    if (args?.uid) url = url.replace('{uid}', encodeURIComponent(String(args.uid)));
    if (args?.id !== undefined) url = url.replace('{id}', encodeURIComponent(String(args.id)));

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authType === 'apiKey' && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (authType === 'basic' && username !== undefined && password !== undefined) {
      const authString = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${authString}`;
    }

    let body: any = null;
    const queryParams: string[] = [];

    if ((method || 'GET').toUpperCase() === 'GET') {
      for (const [key, value] of Object.entries(args || {})) {
        if (value === undefined || value === null) continue;
        if (['uid', 'id'].includes(key)) continue;
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`));
        } else {
          queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
        }
      }
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
    } else {
      body = args || {};
    }

    console.error(`📊 Grafana API call: ${method || 'GET'} ${url}`);

    const response = await fetch(url, {
      method: method || 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const responseData: any = await response.json().catch(() => null);

    console.error(`✅ Grafana API response: ${response.status}`);

    if (!response.ok) {
      console.error('❌ Grafana API error:', responseData);
      return {
        success: false,
        error: `Grafana API error: ${response.status}`,
        data: [{
          status: response.status,
          message: responseData?.message || responseData?.error || responseData
        }],
        rowCount: 1
      };
    }

    const dataArray = Array.isArray(responseData) ? responseData : (responseData ? [responseData] : []);
    return {
      success: true,
      data: dataArray,
      rowCount: dataArray.length
    };
  }

  private async executeMongoDBCall(queryConfig: any, args: any): Promise<any> {
    const { host, port, database: defaultDb, username, password, authSource, op } = queryConfig;
    const dbName = args.database || defaultDb;
    const mongoPort = port || 27017;

    if (!host || !dbName) {
      return { success: false, error: 'Missing MongoDB host or database', data: [], rowCount: 0 };
    }

    const credentials = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password || '')}@` : '';
    const uri = `mongodb://${credentials}${host}:${mongoPort}`;
    const client = new MongoClient(uri, {
      authSource: authSource || (username ? 'admin' : undefined)
    } as any);

    try {
      await client.connect();
      const db = client.db(dbName);

      if (op === 'list_databases') {
        const admin = client.db().admin();
        const res = await admin.listDatabases();
        const data = res?.databases || [];
        return { success: true, data, rowCount: data.length };
      }

      if (op === 'list_collections') {
        const cols = await db.listCollections().toArray();
        return { success: true, data: cols, rowCount: cols.length };
      }

      const collectionName = args.collection;
      if (!collectionName) {
        return { success: false, error: 'Missing collection', data: [], rowCount: 0 };
      }
      const collection = db.collection(collectionName);

      if (op === 'find') {
        const filter = args.filter || {};
        const limit = Number.isFinite(Number(args.limit)) ? Number(args.limit) : 50;
        const skip = Number.isFinite(Number(args.skip)) ? Number(args.skip) : 0;
        const data = await collection.find(filter).skip(skip).limit(limit).toArray();
        return { success: true, data, rowCount: data.length };
      }

      if (op === 'insert_one') {
        const document = args.document;
        if (!document || typeof document !== 'object') {
          return { success: false, error: 'Missing document', data: [], rowCount: 0 };
        }
        const res = await collection.insertOne(document);
        return { success: true, data: [{ insertedId: res.insertedId }], rowCount: 1 };
      }

      if (op === 'update_one') {
        const filter = args.filter || {};
        const update = args.update;
        const upsert = !!args.upsert;
        if (!update || typeof update !== 'object') {
          return { success: false, error: 'Missing update document', data: [], rowCount: 0 };
        }
        const res = await collection.updateOne(filter, update, { upsert });
        return {
          success: true,
          data: [{
            matchedCount: res.matchedCount,
            modifiedCount: res.modifiedCount,
            upsertedId: res.upsertedId
          }],
          rowCount: 1
        };
      }

      if (op === 'delete_one') {
        const filter = args.filter || {};
        const res = await collection.deleteOne(filter);
        return { success: true, data: [{ deletedCount: res.deletedCount }], rowCount: 1 };
      }

      if (op === 'aggregate') {
        const pipeline = Array.isArray(args.pipeline) ? args.pipeline : [];
        const allowDiskUse = !!args.allowDiskUse;
        const data = await collection.aggregate(pipeline, { allowDiskUse }).toArray();
        return { success: true, data, rowCount: data.length };
      }

      return { success: false, error: `Unsupported MongoDB op: ${op}`, data: [], rowCount: 0 };
    } catch (error: any) {
      return { success: false, error: error?.message || 'MongoDB error', data: [], rowCount: 0 };
    } finally {
      try { await client.close(); } catch {}
    }
  }

  private async executeFacebookCall(queryConfig: any, args: any): Promise<any> {
    const { baseUrl, apiVersion, accessToken, endpoint, method, userId: defaultUserId, pageId: defaultPageId } = queryConfig;
    const token = String(accessToken || '').trim();
    if (!baseUrl || !apiVersion || !token) {
      return { success: false, error: 'Missing Facebook baseUrl/apiVersion/accessToken', data: [], rowCount: 0 };
    }

    let url = `${String(baseUrl).replace(/\/$/, '')}/${String(apiVersion).replace(/^\//, '')}${endpoint}`;

    const userId = args.user_id || defaultUserId;
    const pageId = args.page_id || defaultPageId;
    if (url.includes('{user_id}')) {
      if (!userId) return { success: false, error: 'Missing user_id', data: [], rowCount: 0 };
      url = url.replace('{user_id}', encodeURIComponent(String(userId)));
    }
    if (url.includes('{page_id}')) {
      if (!pageId) return { success: false, error: 'Missing page_id', data: [], rowCount: 0 };
      url = url.replace('{page_id}', encodeURIComponent(String(pageId)));
    }
    if (args.post_id && url.includes('{post_id}')) {
      url = url.replace('{post_id}', encodeURIComponent(String(args.post_id)));
    }

    const queryParams: string[] = [];
    for (const [key, value] of Object.entries(args || {})) {
      if (value === undefined || value === null) continue;
      if (['user_id', 'page_id', 'post_id'].includes(key)) continue;
      queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
    queryParams.push(`access_token=${encodeURIComponent(token)}`);

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    console.error(`📘 Facebook API call: ${method || 'GET'} ${url}`);

    const response = await fetch(url, { method: method || 'GET' });
    const responseData: any = await response.json().catch(() => null);

    console.error(`✅ Facebook API response: ${response.status}`);

    if (!response.ok) {
      console.error('❌ Facebook API error:', responseData);
      return {
        success: false,
        error: `Facebook API error: ${response.status}`,
        data: [{
          status: response.status,
          message: responseData?.error?.message || responseData?.message || responseData
        }],
        rowCount: 1
      };
    }

    const dataArray = Array.isArray(responseData) ? responseData : (responseData ? [responseData] : []);
    return { success: true, data: dataArray, rowCount: dataArray.length };
  }

  private async executeDropboxCall(queryConfig: any, args: any): Promise<any> {
    const { baseUrl, contentBaseUrl, accessToken, endpoint, method } = queryConfig;
    const token = String(accessToken || '').trim();
    if (!baseUrl || !token || !endpoint) {
      return { success: false, error: 'Missing Dropbox baseUrl/accessToken/endpoint', data: [], rowCount: 0 };
    }

    const isContent = endpoint.startsWith('/files/download') || endpoint.startsWith('/files/upload');
    const rootUrl = isContent
      ? (contentBaseUrl || 'https://content.dropboxapi.com/2')
      : baseUrl;
    const url = `${String(rootUrl).replace(/\/$/, '')}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`
    };

    let body: any = undefined;
    if (endpoint === '/files/download') {
      headers['Dropbox-API-Arg'] = JSON.stringify({ path: args.path || '' });
    } else if (endpoint === '/files/upload') {
      headers['Content-Type'] = 'application/octet-stream';
      headers['Dropbox-API-Arg'] = JSON.stringify({
        path: args.path,
        mode: args.mode || 'add',
        autorename: args.autorename !== false,
        mute: !!args.mute,
        strict_conflict: !!args.strict_conflict
      });
      body = Buffer.from(String(args.contents || ''), 'utf8');
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(args || {});
    }

    console.error(`📦 Dropbox API call: ${method || 'POST'} ${url}`);

    const response = await fetch(url, { method: method || 'POST', headers, body });

    if (endpoint === '/files/download') {
      const content = await response.text();
      const metaHeader = response.headers.get('dropbox-api-result');
      const metadata = metaHeader ? JSON.parse(metaHeader) : null;
      if (!response.ok) {
        return {
          success: false,
          error: `Dropbox API error: ${response.status}`,
          data: [{ status: response.status, message: content || metadata }],
          rowCount: 1
        };
      }
      return { success: true, data: [{ metadata, content }], rowCount: 1 };
    }

    const responseData: any = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: `Dropbox API error: ${response.status}`,
        data: [{ status: response.status, message: responseData?.error_summary || responseData }],
        rowCount: 1
      };
    }

    const dataArray = Array.isArray(responseData) ? responseData : (responseData ? [responseData] : []);
    return { success: true, data: dataArray, rowCount: dataArray.length };
  }

  private async executeTrelloCall(queryConfig: any, args: any): Promise<any> {
    const { baseUrl, apiKey, apiToken, endpoint, method, memberId: defaultMemberId, boardId: defaultBoardId, listId: defaultListId } = queryConfig;
    if (!baseUrl || !apiKey || !apiToken) {
      return { success: false, error: 'Missing Trello baseUrl/apiKey/apiToken', data: [], rowCount: 0 };
    }

    let url = `${String(baseUrl).replace(/\/$/, '')}${endpoint}`;

    const memberId = args.member_id || defaultMemberId;
    const boardId = args.board_id || defaultBoardId;
    const listId = args.list_id || defaultListId;

    if (url.includes('{member_id}')) {
      if (!memberId) return { success: false, error: 'Missing member_id', data: [], rowCount: 0 };
      url = url.replace('{member_id}', encodeURIComponent(String(memberId)));
    }
    if (url.includes('{board_id}')) {
      if (!boardId) return { success: false, error: 'Missing board_id', data: [], rowCount: 0 };
      url = url.replace('{board_id}', encodeURIComponent(String(boardId)));
    }
    if (url.includes('{list_id}')) {
      if (!listId) return { success: false, error: 'Missing list_id', data: [], rowCount: 0 };
      url = url.replace('{list_id}', encodeURIComponent(String(listId)));
    }
    if (args.card_id && url.includes('{card_id}')) {
      url = url.replace('{card_id}', encodeURIComponent(String(args.card_id)));
    }

    const queryParams: string[] = [];
    queryParams.push(`key=${encodeURIComponent(String(apiKey))}`);
    queryParams.push(`token=${encodeURIComponent(String(apiToken))}`);

    const methodUpper = (method || 'GET').toUpperCase();
    let body: any = undefined;

    if (methodUpper === 'GET') {
      for (const [key, value] of Object.entries(args || {})) {
        if (value === undefined || value === null) continue;
        if (['member_id', 'board_id', 'list_id', 'card_id'].includes(key)) continue;
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    } else {
      const payload: Record<string, any> = {};
      for (const [key, value] of Object.entries(args || {})) {
        if (value === undefined || value === null) continue;
        if (['member_id', 'board_id', 'list_id', 'card_id'].includes(key)) continue;
        payload[key] = value;
      }
      body = JSON.stringify(payload);
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    console.error(`📝 Trello API call: ${methodUpper} ${url}`);

    const response = await fetch(url, {
      method: methodUpper,
      headers: { 'Content-Type': 'application/json' },
      body
    });
    const responseData: any = await response.json().catch(() => null);

    console.error(`✅ Trello API response: ${response.status}`);

    if (!response.ok) {
      console.error('❌ Trello API error:', responseData);
      return {
        success: false,
        error: `Trello API error: ${response.status}`,
        data: [{ status: response.status, message: responseData?.message || responseData }],
        rowCount: 1
      };
    }

    const dataArray = Array.isArray(responseData) ? responseData : (responseData ? [responseData] : []);
    return { success: true, data: dataArray, rowCount: dataArray.length };
  }

  private async executeGitLabCall(queryConfig: any, args: any): Promise<any> {
    const { baseUrl, token, endpoint, method, projectId: defaultProjectId } = queryConfig;
    if (!baseUrl || !token) {
      return { success: false, error: 'Missing GitLab baseUrl/token', data: [], rowCount: 0 };
    }

    let url = `${String(baseUrl).replace(/\/$/, '')}${endpoint}`;
    const projectId = args.project_id || defaultProjectId;
    if (url.includes('{project_id}')) {
      if (!projectId) return { success: false, error: 'Missing project_id', data: [], rowCount: 0 };
      url = url.replace('{project_id}', encodeURIComponent(String(projectId)));
    }
    if (args.file_path && url.includes('{file_path}')) {
      url = url.replace('{file_path}', encodeURIComponent(String(args.file_path)));
    }

    const methodUpper = (method || 'GET').toUpperCase();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'PRIVATE-TOKEN': String(token)
    };

    const queryParams: string[] = [];
    let body: any = undefined;

    if (methodUpper === 'GET') {
      for (const [key, value] of Object.entries(args || {})) {
        if (value === undefined || value === null) continue;
        if (['project_id', 'file_path'].includes(key)) continue;
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    } else {
      const payload: Record<string, any> = {};
      for (const [key, value] of Object.entries(args || {})) {
        if (value === undefined || value === null) continue;
        if (['project_id', 'file_path'].includes(key)) continue;
        payload[key] = value;
      }
      body = JSON.stringify(payload);
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    console.error(`🦊 GitLab API call: ${methodUpper} ${url}`);

    const response = await fetch(url, { method: methodUpper, headers, body });
    const responseData: any = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: `GitLab API error: ${response.status}`,
        data: [{ status: response.status, message: responseData?.message || responseData }],
        rowCount: 1
      };
    }

    const dataArray = Array.isArray(responseData) ? responseData : (responseData ? [responseData] : []);
    return { success: true, data: dataArray, rowCount: dataArray.length };
  }

  private async executeBitbucketCall(queryConfig: any, args: any): Promise<any> {
    const { baseUrl, username, appPassword, endpoint, method, workspace: defaultWorkspace, repoSlug: defaultRepoSlug } = queryConfig;
    if (!baseUrl || !username || !appPassword) {
      return { success: false, error: 'Missing Bitbucket baseUrl/username/appPassword', data: [], rowCount: 0 };
    }

    let url = `${String(baseUrl).replace(/\/$/, '')}${endpoint}`;
    const workspace = args.workspace || defaultWorkspace;
    const repoSlug = args.repo_slug || defaultRepoSlug;
    const ref = args.ref || 'main';

    if (url.includes('{workspace}')) {
      if (!workspace) return { success: false, error: 'Missing workspace', data: [], rowCount: 0 };
      url = url.replace('{workspace}', encodeURIComponent(String(workspace)));
    }
    if (url.includes('{repo_slug}')) {
      if (!repoSlug) return { success: false, error: 'Missing repo_slug', data: [], rowCount: 0 };
      url = url.replace('{repo_slug}', encodeURIComponent(String(repoSlug)));
    }
    if (url.includes('{ref}')) {
      url = url.replace('{ref}', encodeURIComponent(String(ref)));
    }
    if (args.path && url.includes('{path}')) {
      url = url.replace('{path}', encodeURIComponent(String(args.path)));
    }

    const methodUpper = (method || 'GET').toUpperCase();
    const authString = Buffer.from(`${username}:${appPassword}`).toString('base64');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authString}`
    };

    const queryParams: string[] = [];
    let body: any = undefined;

    if (methodUpper === 'GET') {
      for (const [key, value] of Object.entries(args || {})) {
        if (value === undefined || value === null) continue;
        if (['workspace', 'repo_slug', 'path', 'ref'].includes(key)) continue;
        queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    } else {
      const payload: Record<string, any> = {};
      for (const [key, value] of Object.entries(args || {})) {
        if (value === undefined || value === null) continue;
        if (['workspace', 'repo_slug', 'path', 'ref'].includes(key)) continue;
        payload[key] = value;
      }
      body = JSON.stringify(payload);
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    console.error(`🧩 Bitbucket API call: ${methodUpper} ${url}`);

    const response = await fetch(url, { method: methodUpper, headers, body });
    const responseData: any = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: `Bitbucket API error: ${response.status}`,
        data: [{ status: response.status, message: responseData?.error?.message || responseData }],
        rowCount: 1
      };
    }

    const dataArray = Array.isArray(responseData) ? responseData : (responseData ? [responseData] : []);
    return { success: true, data: dataArray, rowCount: dataArray.length };
  }

  private async executeJiraCall(queryConfig: any, args: any): Promise<any> {
    const { host, email, apiToken, endpoint, method, projectKey: defaultProjectKey, apiVersion } = queryConfig;

    // Build authorization header based on API version
    // v3 (Jira Cloud): Basic Auth with email:apiToken
    // v2 (Jira Server): Bearer token (PAT) or Basic Auth with username:password
    let authHeader: string;
    if (apiVersion === 'v3') {
      // Jira Cloud uses Basic Auth with email:apiToken
      const authString = Buffer.from(`${email}:${apiToken}`).toString('base64');
      authHeader = `Basic ${authString}`;
    } else {
      // Jira Server uses Bearer token (PAT) for newer versions
      // If apiToken looks like a PAT (no special chars), use Bearer
      // Otherwise fall back to Basic Auth
      if (apiToken && !apiToken.includes(':')) {
        authHeader = `Bearer ${apiToken}`;
      } else {
        const authString = Buffer.from(`${email}:${apiToken}`).toString('base64');
        authHeader = `Basic ${authString}`;
      }
    }

    // Build the URL by replacing path parameters
    // Check if host already includes protocol
    const baseUrl = host.startsWith('http://') || host.startsWith('https://') ? host : `https://${host}`;
    let url = `${baseUrl}${endpoint}`;

    // Use args projectKey if provided, otherwise use default from config
    const projectKey = args.projectKey || defaultProjectKey;

    // Replace path parameters like {issueKey}, {projectKey}
    if (args.issueKey) {
      url = url.replace('{issueKey}', args.issueKey);
    }
    if (projectKey) {
      url = url.replace('{projectKey}', projectKey);
    }

    // Build query parameters for GET requests
    const queryParams: string[] = [];
    const bodyParams: any = {};

    for (const [key, value] of Object.entries(args)) {
      if (value === undefined || value === null) continue;

      // Skip path parameters
      if (['issueKey', 'projectKey'].includes(key)) continue;

      if (method === 'GET') {
        // Handle arrays for fields parameter
        if (Array.isArray(value)) {
          queryParams.push(`${key}=${encodeURIComponent(value.join(','))}`);
        } else {
          queryParams.push(`${key}=${encodeURIComponent(String(value))}`);
        }
      } else {
        bodyParams[key] = value;
      }
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    console.error(`🎫 Jira API call: ${method} ${url}`);

    // Temporarily disable SSL verification for corporate Jira servers with self-signed certs
    const originalTlsReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    // Build request body for POST/PUT methods
    if (method === 'POST' || method === 'PUT') {
      let body: any = {};

      // Handle create_issue
      if (endpoint === '/rest/api/2/issue' && method === 'POST') {
        body = {
          fields: {
            project: { key: projectKey || args.projectKey },
            issuetype: { name: args.issueType },
            summary: args.summary
          }
        };
        if (args.description) {
          body.fields.description = {
            type: 'doc',
            version: 1,
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: args.description }]
            }]
          };
        }
        if (args.priority) {
          body.fields.priority = { name: args.priority };
        }
        if (args.assignee) {
          body.fields.assignee = { accountId: args.assignee };
        }
        if (args.labels) {
          body.fields.labels = args.labels;
        }
      }
      // Handle add_comment
      else if (endpoint.includes('/comment') && method === 'POST') {
        body = {
          body: {
            type: 'doc',
            version: 1,
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: args.body }]
            }]
          }
        };
      }
      // Handle transition_issue
      else if (endpoint.includes('/transitions') && method === 'POST') {
        body = {
          transition: { id: args.transitionId }
        };
        if (args.comment) {
          body.update = {
            comment: [{
              add: {
                body: {
                  type: 'doc',
                  version: 1,
                  content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: args.comment }]
                  }]
                }
              }
            }]
          };
        }
      }
      // Handle update_issue
      else if (endpoint.includes('/issue/') && method === 'PUT' && !endpoint.includes('/assignee')) {
        body = { fields: {} };
        if (args.summary) body.fields.summary = args.summary;
        if (args.description) {
          body.fields.description = {
            type: 'doc',
            version: 1,
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: args.description }]
            }]
          };
        }
        if (args.priority) body.fields.priority = { name: args.priority };
        if (args.labels) body.fields.labels = args.labels;
      }
      // Handle assign_issue
      else if (endpoint.includes('/assignee')) {
        body = { accountId: args.accountId === '-1' ? null : args.accountId };
      }
      else {
        body = bodyParams;
      }

      if (Object.keys(body).length > 0) {
        fetchOptions.body = JSON.stringify(body);
      }
    }

    try {
      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get('content-type');

      let responseData: any;
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        responseData = text ? JSON.parse(text) : {};
      } else {
        responseData = await response.text();
      }

      console.error(`✅ Jira API response: ${response.status}`);

      if (!response.ok) {
        console.error(`❌ Jira API error:`, responseData);
        return {
          success: false,
          error: `Jira API error: ${response.status}`,
          data: [{
            status: response.status,
            message: responseData.errorMessages?.join(', ') || responseData.message || JSON.stringify(responseData),
            errors: responseData.errors
          }],
          rowCount: 1
        };
      }

      // Handle different response types
      let dataArray: any[];
      if (Array.isArray(responseData)) {
        dataArray = responseData;
      } else if (responseData.issues) {
        // Search results have issues array
        dataArray = responseData.issues;
      } else if (responseData.values) {
        // Paginated results (projects)
        dataArray = responseData.values;
      } else if (responseData.transitions) {
        // Transitions list
        dataArray = responseData.transitions;
      } else if (responseData.comments) {
        // Comments list
        dataArray = responseData.comments;
      } else if (Object.keys(responseData).length === 0) {
        // Empty response (e.g., successful update/delete)
        dataArray = [{ success: true, message: 'Operation completed successfully' }];
      } else {
        dataArray = [responseData];
      }

      return {
        success: true,
        data: dataArray,
        rowCount: dataArray.length
      };
    } finally {
      // Restore original SSL verification setting
      if (originalTlsReject !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsReject;
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      }
    }
  }

  private async executeConfluenceCall(queryConfig: any, args: any): Promise<any> {
    const { host, email, apiToken, endpoint, method, spaceKey: defaultSpaceKey } = queryConfig;

    const authString = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const authHeader = `Basic ${authString}`;

    const baseUrl = host.startsWith('http://') || host.startsWith('https://') ? host : `https://${host}`;
    let url = `${baseUrl}${endpoint}`;

    const resolvedSpaceKey = args.spaceKey || defaultSpaceKey;

    if (args.pageId) {
      url = url.replace('{pageId}', args.pageId);
    }
    if (args.spaceKey) {
      url = url.replace('{spaceKey}', args.spaceKey);
    }

    const queryParams: string[] = [];
    const bodyParams: any = {};

    for (const [key, value] of Object.entries(args)) {
      if (value === undefined || value === null) continue;

      if (['pageId', 'spaceKey', 'parentId', 'title', 'body', 'version'].includes(key)) continue;

      if (method === 'GET') {
        if (Array.isArray(value)) {
          queryParams.push(`${key}=${encodeURIComponent(value.join(','))}`);
        } else {
          queryParams.push(`${key}=${encodeURIComponent(String(value))}`);
        }
      } else {
        bodyParams[key] = value;
      }
    }

    if (method === 'GET') {
      if (endpoint === '/wiki/rest/api/content' && !('type' in args)) {
        queryParams.push('type=page');
      }
      if (endpoint === '/wiki/rest/api/content/{pageId}' && !('expand' in args)) {
        queryParams.push('expand=body.storage,version,space');
      }
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    let requestBody: any = bodyParams;
    if (method !== 'GET' && endpoint.startsWith('/wiki/rest/api/content')) {
      if (!resolvedSpaceKey) {
        return {
          success: false,
          error: 'Confluence spaceKey is required for page operations',
          data: [],
          rowCount: 0
        };
      }
      requestBody = {
        type: 'page',
        title: args.title,
        space: { key: resolvedSpaceKey },
        body: {
          storage: {
            value: args.body || '',
            representation: 'storage'
          }
        }
      };
      if (args.parentId) {
        requestBody.ancestors = [{ id: String(args.parentId) }];
      }
      if (method === 'PUT') {
        requestBody.version = { number: Number(args.version) };
      }
    }

    console.error(`📚 Confluence API call: ${method} ${url}`);

    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (method !== 'GET') {
      fetchOptions.body = JSON.stringify(requestBody);
    }

    let responseData: any;
    try {
      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          error: `Confluence API error: ${response.status}`,
          data: [{ status: response.status, message: responseData.message || responseData }],
          rowCount: 1
        };
      }

      let dataArray: any[];
      if (Array.isArray(responseData)) {
        dataArray = responseData;
      } else if (responseData.results) {
        dataArray = responseData.results;
      } else {
        dataArray = [responseData];
      }

      return {
        success: true,
        data: dataArray,
        rowCount: dataArray.length
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Confluence API error: ${error?.message || error}`,
        data: [],
        rowCount: 0
      };
    }
  }

  private async executeFtpCall(queryConfig: any, args: any): Promise<any> {
    let { host, port, username, password, secure, basePath, operation } = queryConfig;

    // Clean up host - remove protocol prefixes
    let isSftp = false;
    if (host.startsWith('sftp://')) {
      host = host.replace('sftp://', '');
      isSftp = true;
    } else if (host.startsWith('ftp://')) {
      host = host.replace('ftp://', '');
    } else if (host.startsWith('ftps://')) {
      host = host.replace('ftps://', '');
      secure = true;
    }

    // Remove port from host if included (e.g., host:port format)
    if (host.includes(':')) {
      const parts = host.split(':');
      host = parts[0];
      if (!port) port = parseInt(parts[1]);
    }

    // Determine if SFTP based on port
    const effectivePort = port || 21;
    if (effectivePort === 22) {
      isSftp = true;
    }

    console.error(`📁 ${isSftp ? 'SFTP' : 'FTP'} operation: ${operation} on ${host}:${effectivePort}`);

    if (isSftp) {
      return await this.executeSftpCall(host, effectivePort, username, password, basePath, operation, args);
    }

    // Use basic-ftp for FTP/FTPS
    const { Client } = await import('basic-ftp');
    const client = new Client();

    try {
      // Connect to FTP server
      await client.access({
        host,
        port: effectivePort,
        user: username,
        password,
        secure: secure || false,
        secureOptions: secure ? { rejectUnauthorized: false } : undefined
      });

      console.error(`✅ Connected to FTP server ${host}`);

      let result: any;

      switch (operation) {
        case 'list': {
          const listPath = args.path || basePath || '/';
          const files = await client.list(listPath);
          result = files.map(file => ({
            name: file.name,
            type: file.type === 2 ? 'directory' : 'file',
            size: file.size,
            modifiedAt: file.modifiedAt?.toISOString(),
            permissions: file.permissions,
            user: file.user,
            group: file.group
          }));
          break;
        }

        case 'download': {
          const remotePath = args.remotePath;
          if (!remotePath) throw new Error('remotePath is required for download');

          // Download to a buffer using a writable stream
          const chunks: Buffer[] = [];
          const { Writable } = await import('stream');
          const writableStream = new Writable({
            write(chunk, encoding, callback) {
              chunks.push(Buffer.from(chunk));
              callback();
            }
          });

          await client.downloadTo(writableStream, remotePath);
          const content = Buffer.concat(chunks);

          result = [{
            remotePath,
            content: content.toString('base64'),
            size: content.length,
            encoding: 'base64'
          }];
          break;
        }

        case 'upload': {
          const remotePath = args.remotePath;
          const content = args.content;
          const isBase64 = args.isBase64;

          if (!remotePath) throw new Error('remotePath is required for upload');
          if (!content) throw new Error('content is required for upload');

          // Create a readable stream from content
          const { Readable } = await import('stream');
          const buffer = isBase64 ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf-8');
          const readableStream = Readable.from(buffer);

          await client.uploadFrom(readableStream, remotePath);

          result = [{
            success: true,
            remotePath,
            size: buffer.length,
            message: 'File uploaded successfully'
          }];
          break;
        }

        case 'deleteFile': {
          const remotePath = args.remotePath;
          if (!remotePath) throw new Error('remotePath is required for delete');

          await client.remove(remotePath);

          result = [{
            success: true,
            remotePath,
            message: 'File deleted successfully'
          }];
          break;
        }

        case 'mkdir': {
          const path = args.path;
          if (!path) throw new Error('path is required for mkdir');

          await client.ensureDir(path);

          result = [{
            success: true,
            path,
            message: 'Directory created successfully'
          }];
          break;
        }

        case 'rmdir': {
          const path = args.path;
          if (!path) throw new Error('path is required for rmdir');

          await client.removeDir(path);

          result = [{
            success: true,
            path,
            message: 'Directory deleted successfully'
          }];
          break;
        }

        case 'rename': {
          const oldPath = args.oldPath;
          const newPath = args.newPath;
          if (!oldPath || !newPath) throw new Error('oldPath and newPath are required for rename');

          await client.rename(oldPath, newPath);

          result = [{
            success: true,
            oldPath,
            newPath,
            message: 'Renamed successfully'
          }];
          break;
        }

        case 'stat': {
          const path = args.path;
          if (!path) throw new Error('path is required for stat');

          const size = await client.size(path);
          const lastMod = await client.lastMod(path);

          result = [{
            path,
            size,
            modifiedAt: lastMod?.toISOString()
          }];
          break;
        }

        default:
          throw new Error(`Unknown FTP operation: ${operation}`);
      }

      console.error(`✅ FTP operation ${operation} completed successfully`);

      return {
        success: true,
        data: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1
      };

    } catch (error) {
      console.error(`❌ FTP error:`, error);
      return {
        success: false,
        error: `FTP error: ${error instanceof Error ? error.message : String(error)}`,
        data: [{
          error: error instanceof Error ? error.message : String(error)
        }],
        rowCount: 1
      };
    } finally {
      client.close();
    }
  }

  private async executeSftpCall(host: string, port: number, username: string, password: string, basePath: string, operation: string, args: any): Promise<any> {
    // Dynamically import ssh2-sftp-client
    const SftpClient = (await import('ssh2-sftp-client')).default;
    const sftp = new SftpClient();

    try {
      // Connect to SFTP server
      await sftp.connect({
        host,
        port: port || 22,
        username,
        password,
        readyTimeout: 30000,
        retries: 2,
        retry_minTimeout: 2000
      });

      console.error(`✅ Connected to SFTP server ${host}`);

      let result: any;

      switch (operation) {
        case 'list': {
          const listPath = args.path || basePath || '/';
          const files = await sftp.list(listPath);
          result = files.map((file: any) => ({
            name: file.name,
            type: file.type === 'd' ? 'directory' : 'file',
            size: file.size,
            modifiedAt: file.modifyTime ? new Date(file.modifyTime).toISOString() : null,
            accessedAt: file.accessTime ? new Date(file.accessTime).toISOString() : null,
            owner: file.owner,
            group: file.group,
            rights: file.rights
          }));
          break;
        }

        case 'download': {
          const remotePath = args.remotePath;
          if (!remotePath) throw new Error('remotePath is required for download');

          const content = await sftp.get(remotePath);
          const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content as string);

          result = [{
            remotePath,
            content: buffer.toString('base64'),
            size: buffer.length,
            encoding: 'base64'
          }];
          break;
        }

        case 'upload': {
          const remotePath = args.remotePath;
          const content = args.content;
          const isBase64 = args.isBase64;

          if (!remotePath) throw new Error('remotePath is required for upload');
          if (!content) throw new Error('content is required for upload');

          const buffer = isBase64 ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf-8');
          await sftp.put(buffer, remotePath);

          result = [{
            success: true,
            remotePath,
            size: buffer.length,
            message: 'File uploaded successfully'
          }];
          break;
        }

        case 'deleteFile': {
          const remotePath = args.remotePath;
          if (!remotePath) throw new Error('remotePath is required for delete');

          await sftp.delete(remotePath);

          result = [{
            success: true,
            remotePath,
            message: 'File deleted successfully'
          }];
          break;
        }

        case 'mkdir': {
          const path = args.path;
          if (!path) throw new Error('path is required for mkdir');

          await sftp.mkdir(path, true); // recursive

          result = [{
            success: true,
            path,
            message: 'Directory created successfully'
          }];
          break;
        }

        case 'rmdir': {
          const path = args.path;
          if (!path) throw new Error('path is required for rmdir');

          await sftp.rmdir(path, true); // recursive

          result = [{
            success: true,
            path,
            message: 'Directory deleted successfully'
          }];
          break;
        }

        case 'rename': {
          const oldPath = args.oldPath;
          const newPath = args.newPath;
          if (!oldPath || !newPath) throw new Error('oldPath and newPath are required for rename');

          await sftp.rename(oldPath, newPath);

          result = [{
            success: true,
            oldPath,
            newPath,
            message: 'Renamed successfully'
          }];
          break;
        }

        case 'stat': {
          const path = args.path;
          if (!path) throw new Error('path is required for stat');

          const stats = await sftp.stat(path);

          result = [{
            path,
            size: stats.size,
            modifiedAt: stats.modifyTime ? new Date(stats.modifyTime).toISOString() : null,
            accessedAt: stats.accessTime ? new Date(stats.accessTime).toISOString() : null,
            isDirectory: stats.isDirectory,
            isFile: stats.isFile
          }];
          break;
        }

        default:
          throw new Error(`Unknown SFTP operation: ${operation}`);
      }

      console.error(`✅ SFTP operation ${operation} completed successfully`);

      return {
        success: true,
        data: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1
      };

    } catch (error) {
      console.error(`❌ SFTP error:`, error);
      return {
        success: false,
        error: `SFTP error: ${error instanceof Error ? error.message : String(error)}`,
        data: [{
          error: error instanceof Error ? error.message : String(error)
        }],
        rowCount: 1
      };
    } finally {
      await sftp.end();
    }
  }

  private async executeLocalFSCall(queryConfig: any, args: any): Promise<any> {
    const { basePath, allowWrite, allowDelete, operation } = queryConfig;
    const fs = await import('fs/promises');
    const path = await import('path');
    const { glob } = await import('glob');

    console.error(`📂 LocalFS operation: ${operation} in ${basePath}`);

    // Resolve path relative to basePath
    const resolvePath = (p: string) => {
      if (!p || p === '.') return basePath;
      // Prevent path traversal attacks
      const resolved = path.resolve(basePath, p);
      if (!resolved.startsWith(path.resolve(basePath))) {
        throw new Error('Path traversal not allowed');
      }
      return resolved;
    };

    try {
      let result: any;

      switch (operation) {
        case 'list': {
          const listPath = resolvePath(args.path || '.');
          const entries = await fs.readdir(listPath, { withFileTypes: true });
          result = await Promise.all(entries.map(async (entry) => {
            const fullPath = path.join(listPath, entry.name);
            try {
              const stats = await fs.stat(fullPath);
              return {
                name: entry.name,
                type: entry.isDirectory() ? 'directory' : 'file',
                size: stats.size,
                modifiedAt: stats.mtime.toISOString(),
                createdAt: stats.birthtime.toISOString()
              };
            } catch {
              return {
                name: entry.name,
                type: entry.isDirectory() ? 'directory' : 'file'
              };
            }
          }));
          break;
        }

        case 'read': {
          const filePath = resolvePath(args.path);
          const encoding = args.encoding || 'utf8';

          if (encoding === 'base64') {
            const content = await fs.readFile(filePath);
            result = [{
              path: args.path,
              content: content.toString('base64'),
              encoding: 'base64',
              size: content.length
            }];
          } else {
            const content = await fs.readFile(filePath, 'utf8');
            result = [{
              path: args.path,
              content,
              encoding: 'utf8',
              size: content.length
            }];
          }
          break;
        }

        case 'write': {
          if (allowWrite === false) {
            throw new Error('Write operations are not allowed');
          }
          const filePath = resolvePath(args.path);
          const content = args.encoding === 'base64'
            ? Buffer.from(args.content, 'base64')
            : args.content;

          // Ensure directory exists
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, content);

          result = [{
            success: true,
            path: args.path,
            message: 'File written successfully'
          }];
          break;
        }

        case 'deleteFile': {
          if (!allowDelete) {
            throw new Error('Delete operations are not allowed');
          }
          const filePath = resolvePath(args.path);
          await fs.unlink(filePath);

          result = [{
            success: true,
            path: args.path,
            message: 'File deleted successfully'
          }];
          break;
        }

        case 'mkdir': {
          if (allowWrite === false) {
            throw new Error('Write operations are not allowed');
          }
          const dirPath = resolvePath(args.path);
          await fs.mkdir(dirPath, { recursive: true });

          result = [{
            success: true,
            path: args.path,
            message: 'Directory created successfully'
          }];
          break;
        }

        case 'rmdir': {
          if (!allowDelete) {
            throw new Error('Delete operations are not allowed');
          }
          const dirPath = resolvePath(args.path);
          await fs.rm(dirPath, { recursive: args.recursive || false });

          result = [{
            success: true,
            path: args.path,
            message: 'Directory deleted successfully'
          }];
          break;
        }

        case 'rename': {
          if (allowWrite === false) {
            throw new Error('Write operations are not allowed');
          }
          const oldPath = resolvePath(args.oldPath);
          const newPath = resolvePath(args.newPath);
          await fs.rename(oldPath, newPath);

          result = [{
            success: true,
            oldPath: args.oldPath,
            newPath: args.newPath,
            message: 'Renamed successfully'
          }];
          break;
        }

        case 'stat': {
          const filePath = resolvePath(args.path);
          const stats = await fs.stat(filePath);

          result = [{
            path: args.path,
            size: stats.size,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            modifiedAt: stats.mtime.toISOString(),
            createdAt: stats.birthtime.toISOString(),
            accessedAt: stats.atime.toISOString()
          }];
          break;
        }

        case 'search': {
          const searchPath = resolvePath(args.path || '.');
          const pattern = args.pattern;
          const recursive = args.recursive !== false;

          const globPattern = recursive
            ? path.join(searchPath, '**', pattern)
            : path.join(searchPath, pattern);

          const files = await glob(globPattern, { nodir: false });

          result = await Promise.all(files.map(async (file: string) => {
            try {
              const stats = await fs.stat(file);
              return {
                path: path.relative(basePath, file),
                name: path.basename(file),
                type: stats.isDirectory() ? 'directory' : 'file',
                size: stats.size,
                modifiedAt: stats.mtime.toISOString()
              };
            } catch {
              return {
                path: path.relative(basePath, file),
                name: path.basename(file)
              };
            }
          }));
          break;
        }

        case 'copy': {
          if (allowWrite === false) {
            throw new Error('Write operations are not allowed');
          }
          const sourcePath = resolvePath(args.sourcePath);
          const destPath = resolvePath(args.destPath);

          // Ensure destination directory exists
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(sourcePath, destPath);

          result = [{
            success: true,
            sourcePath: args.sourcePath,
            destPath: args.destPath,
            message: 'File copied successfully'
          }];
          break;
        }

        default:
          throw new Error(`Unknown LocalFS operation: ${operation}`);
      }

      console.error(`✅ LocalFS operation ${operation} completed successfully`);

      return {
        success: true,
        data: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1
      };

    } catch (error) {
      console.error(`❌ LocalFS error:`, error);
      return {
        success: false,
        error: `LocalFS error: ${error instanceof Error ? error.message : String(error)}`,
        data: [{
          error: error instanceof Error ? error.message : String(error)
        }],
        rowCount: 1
      };
    }
  }

  private async executeEmailCall(queryConfig: any, args: any): Promise<any> {
    const { imapHost, imapPort, smtpHost, smtpPort, username, password, secure, operation } = queryConfig;

    console.error(`📧 Email operation: ${operation}`);

    try {
      let result: any;

      // IMAP operations (reading emails)
      if (['listFolders', 'listEmails', 'readEmail', 'searchEmails', 'moveEmail', 'deleteEmail', 'markRead'].includes(operation)) {
        const { ImapFlow } = await import('imapflow');

        const client = new ImapFlow({
          host: imapHost,
          port: imapPort || 993,
          secure: secure ?? true,
          auth: {
            user: username,
            pass: password
          },
          logger: false
        });

        await client.connect();

        try {
          switch (operation) {
            case 'listFolders': {
              const folders = await client.list();
              result = folders.map((f: any) => ({
                name: f.name,
                path: f.path,
                delimiter: f.delimiter,
                flags: f.flags
              }));
              break;
            }

            case 'listEmails': {
              const folder = args.folder || 'INBOX';
              const limit = args.limit || 20;
              const page = args.page || 1;

              const lock = await client.getMailboxLock(folder);
              try {
                const messages: any[] = [];
                const mailbox = client.mailbox;
                const total = (mailbox && typeof mailbox === 'object' && 'exists' in mailbox) ? mailbox.exists : 0;
                const start = Math.max(1, total - (page * limit) + 1);
                const end = Math.max(1, total - ((page - 1) * limit));

                if (total > 0) {
                  for await (const message of client.fetch(`${start}:${end}`, { envelope: true, flags: true, uid: true })) {
                    messages.push({
                      uid: message.uid,
                      seq: message.seq,
                      from: message.envelope?.from?.[0]?.address,
                      to: message.envelope?.to?.map((t: any) => t.address),
                      subject: message.envelope?.subject,
                      date: message.envelope?.date,
                      flags: Array.from(message.flags || []),
                      seen: message.flags?.has('\\Seen')
                    });
                  }
                }

                result = {
                  folder,
                  total,
                  page,
                  limit,
                  messages: messages.reverse()
                };
              } finally {
                lock.release();
              }
              break;
            }

            case 'readEmail': {
              const folder = args.folder || 'INBOX';
              const uid = args.uid;

              const lock = await client.getMailboxLock(folder);
              try {
                const message = await client.fetchOne(uid.toString(), { source: true, envelope: true, flags: true, uid: true }, { uid: true });

                if (!message) {
                  throw new Error(`Email with UID ${uid} not found`);
                }

                const { simpleParser } = await import('mailparser');
                const parsed = await simpleParser(message.source);

                result = [{
                  uid: message.uid,
                  from: parsed.from?.text,
                  to: parsed.to?.text,
                  cc: parsed.cc?.text,
                  subject: parsed.subject,
                  date: parsed.date?.toISOString(),
                  text: parsed.text,
                  html: parsed.html,
                  attachments: parsed.attachments?.map((a: any) => ({
                    filename: a.filename,
                    contentType: a.contentType,
                    size: a.size
                  }))
                }];
              } finally {
                lock.release();
              }
              break;
            }

            case 'searchEmails': {
              const folder = args.folder || 'INBOX';
              const searchCriteria: any = {};

              if (args.from) searchCriteria.from = args.from;
              if (args.to) searchCriteria.to = args.to;
              if (args.subject) searchCriteria.subject = args.subject;
              if (args.since) searchCriteria.since = new Date(args.since);
              if (args.before) searchCriteria.before = new Date(args.before);
              if (args.unseen) searchCriteria.seen = false;

              const lock = await client.getMailboxLock(folder);
              try {
                const searchResult = await client.search(searchCriteria, { uid: true });
                const uids = Array.isArray(searchResult) ? searchResult : [];

                const messages: any[] = [];
                if (uids.length > 0) {
                  const uidList = uids.slice(0, 50).join(',');
                  for await (const message of client.fetch(uidList, { envelope: true, flags: true, uid: true }, { uid: true })) {
                    messages.push({
                      uid: message.uid,
                      from: message.envelope?.from?.[0]?.address,
                      subject: message.envelope?.subject,
                      date: message.envelope?.date,
                      seen: message.flags?.has('\\Seen')
                    });
                  }
                }

                result = {
                  folder,
                  totalMatches: uids.length,
                  messages
                };
              } finally {
                lock.release();
              }
              break;
            }

            case 'moveEmail': {
              const sourceFolder = args.sourceFolder || 'INBOX';
              const uid = args.uid;
              const destFolder = args.destFolder;

              const lock = await client.getMailboxLock(sourceFolder);
              try {
                await client.messageMove(uid.toString(), destFolder, { uid: true });
                result = [{
                  success: true,
                  message: `Email moved to ${destFolder}`
                }];
              } finally {
                lock.release();
              }
              break;
            }

            case 'deleteEmail': {
              const folder = args.folder || 'INBOX';
              const uid = args.uid;

              const lock = await client.getMailboxLock(folder);
              try {
                await client.messageDelete(uid.toString(), { uid: true });
                result = [{
                  success: true,
                  message: 'Email deleted'
                }];
              } finally {
                lock.release();
              }
              break;
            }

            case 'markRead': {
              const folder = args.folder || 'INBOX';
              const uid = args.uid;
              const read = args.read !== false;

              const lock = await client.getMailboxLock(folder);
              try {
                if (read) {
                  await client.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });
                } else {
                  await client.messageFlagsRemove(uid.toString(), ['\\Seen'], { uid: true });
                }
                result = [{
                  success: true,
                  message: `Email marked as ${read ? 'read' : 'unread'}`
                }];
              } finally {
                lock.release();
              }
              break;
            }
          }
        } finally {
          await client.logout();
        }
      }

      // SMTP operations (sending emails)
      if (['sendEmail', 'replyEmail', 'forwardEmail'].includes(operation)) {
        const nodemailer = await import('nodemailer');

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort || 587,
          secure: (smtpPort || 587) === 465,
          auth: {
            user: username,
            pass: password
          }
        });

        switch (operation) {
          case 'sendEmail': {
            const info = await transporter.sendMail({
              from: username,
              to: args.to,
              cc: args.cc,
              bcc: args.bcc,
              subject: args.subject,
              text: args.body,
              html: args.html
            });

            result = [{
              success: true,
              messageId: info.messageId,
              message: 'Email sent successfully'
            }];
            break;
          }

          case 'replyEmail':
          case 'forwardEmail': {
            // For reply/forward, we first need to fetch the original email
            const { ImapFlow } = await import('imapflow');
            const imapClient = new ImapFlow({
              host: imapHost,
              port: imapPort || 993,
              secure: secure ?? true,
              auth: { user: username, pass: password },
              logger: false
            });

            await imapClient.connect();

            try {
              const folder = args.folder || 'INBOX';
              const lock = await imapClient.getMailboxLock(folder);

              try {
                const originalMsg = await imapClient.fetchOne(args.uid.toString(), { source: true, envelope: true }, { uid: true });
                if (!originalMsg) throw new Error('Original email not found');

                const { simpleParser } = await import('mailparser');
                const parsed = await simpleParser(originalMsg.source);

                let to: string;
                let subject: string;
                let body: string;

                if (operation === 'replyEmail') {
                  to = args.replyAll
                    ? [parsed.from?.text, ...(parsed.to?.value || []).map((t: any) => t.address)].filter(Boolean).join(', ')
                    : parsed.from?.text || '';
                  subject = parsed.subject?.startsWith('Re:') ? parsed.subject : `Re: ${parsed.subject}`;
                  body = `${args.body}\n\n--- Original Message ---\nFrom: ${parsed.from?.text}\nDate: ${parsed.date}\nSubject: ${parsed.subject}\n\n${parsed.text}`;
                } else {
                  to = args.to;
                  subject = parsed.subject?.startsWith('Fwd:') ? parsed.subject : `Fwd: ${parsed.subject}`;
                  body = `${args.body || ''}\n\n--- Forwarded Message ---\nFrom: ${parsed.from?.text}\nDate: ${parsed.date}\nSubject: ${parsed.subject}\n\n${parsed.text}`;
                }

                const info = await transporter.sendMail({
                  from: username,
                  to,
                  subject,
                  text: body,
                  html: args.html
                });

                result = [{
                  success: true,
                  messageId: info.messageId,
                  message: operation === 'replyEmail' ? 'Reply sent successfully' : 'Email forwarded successfully'
                }];
              } finally {
                lock.release();
              }
            } finally {
              await imapClient.logout();
            }
            break;
          }
        }
      }

      console.error(`✅ Email operation ${operation} completed successfully`);

      return {
        success: true,
        data: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1
      };

    } catch (error) {
      console.error(`❌ Email error:`, error);
      return {
        success: false,
        error: `Email error: ${error instanceof Error ? error.message : String(error)}`,
        data: [{
          error: error instanceof Error ? error.message : String(error)
        }],
        rowCount: 1
      };
    }
  }

  private async executeSlackCall(queryConfig: any, args: any): Promise<any> {
    const { botToken, operation } = queryConfig;

    try {
      const baseUrl = 'https://slack.com/api';
      const headers = {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json; charset=utf-8'
      };

      let result: any;

      switch (operation) {
        case 'listChannels': {
          const types = args.types || 'public_channel,private_channel';
          const limit = args.limit || 100;
          const response = await fetch(`${baseUrl}/conversations.list?types=${encodeURIComponent(types)}&limit=${limit}`, { headers });
          const data: any = await response.json();
          if (!data.ok) throw new Error(data.error || 'Failed to list channels');
          result = data.channels?.map((ch: any) => ({
            id: ch.id,
            name: ch.name,
            is_private: ch.is_private,
            is_archived: ch.is_archived,
            num_members: ch.num_members,
            topic: ch.topic?.value,
            purpose: ch.purpose?.value
          })) || [];
          break;
        }

        case 'listUsers': {
          const limit = args.limit || 100;
          const response = await fetch(`${baseUrl}/users.list?limit=${limit}`, { headers });
          const data: any = await response.json();
          if (!data.ok) throw new Error(data.error || 'Failed to list users');
          result = data.members?.filter((u: any) => !u.deleted && !u.is_bot).map((u: any) => ({
            id: u.id,
            name: u.name,
            real_name: u.real_name,
            display_name: u.profile?.display_name,
            email: u.profile?.email,
            is_admin: u.is_admin,
            is_owner: u.is_owner
          })) || [];
          break;
        }

        case 'sendMessage': {
          const response = await fetch(`${baseUrl}/chat.postMessage`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              channel: args.channel,
              text: args.text,
              thread_ts: args.thread_ts
            })
          });
          const data: any = await response.json();
          if (!data.ok) throw new Error(data.error || 'Failed to send message');
          result = [{
            success: true,
            channel: data.channel,
            ts: data.ts,
            message: 'Message sent successfully'
          }];
          break;
        }

        case 'getChannelHistory': {
          const params = new URLSearchParams({
            channel: args.channel,
            limit: String(args.limit || 20)
          });
          if (args.oldest) params.append('oldest', args.oldest);
          if (args.latest) params.append('latest', args.latest);

          const response = await fetch(`${baseUrl}/conversations.history?${params}`, { headers });
          const data: any = await response.json();
          if (!data.ok) throw new Error(data.error || 'Failed to get channel history');
          result = data.messages?.map((m: any) => ({
            ts: m.ts,
            user: m.user,
            text: m.text,
            thread_ts: m.thread_ts,
            reply_count: m.reply_count,
            reactions: m.reactions
          })) || [];
          break;
        }

        case 'getUserInfo': {
          const response = await fetch(`${baseUrl}/users.info?user=${args.user}`, { headers });
          const data: any = await response.json();
          if (!data.ok) throw new Error(data.error || 'Failed to get user info');
          const u = data.user;
          result = [{
            id: u.id,
            name: u.name,
            real_name: u.real_name,
            display_name: u.profile?.display_name,
            email: u.profile?.email,
            title: u.profile?.title,
            phone: u.profile?.phone,
            is_admin: u.is_admin,
            is_owner: u.is_owner,
            tz: u.tz
          }];
          break;
        }

        case 'addReaction': {
          const response = await fetch(`${baseUrl}/reactions.add`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              channel: args.channel,
              timestamp: args.timestamp,
              name: args.name
            })
          });
          const data: any = await response.json();
          if (!data.ok) throw new Error(data.error || 'Failed to add reaction');
          result = [{ success: true, message: 'Reaction added successfully' }];
          break;
        }

        case 'uploadFile': {
          const response = await fetch(`${baseUrl}/files.upload`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              channels: args.channels,
              content: args.content,
              filename: args.filename,
              title: args.title,
              initial_comment: args.initial_comment
            })
          });
          const data: any = await response.json();
          if (!data.ok) throw new Error(data.error || 'Failed to upload file');
          result = [{
            success: true,
            file_id: data.file?.id,
            file_name: data.file?.name,
            message: 'File uploaded successfully'
          }];
          break;
        }

        case 'searchMessages': {
          const params = new URLSearchParams({
            query: args.query,
            count: String(args.count || 20),
            sort: args.sort || 'score'
          });
          const response = await fetch(`${baseUrl}/search.messages?${params}`, { headers });
          const data: any = await response.json();
          if (!data.ok) throw new Error(data.error || 'Failed to search messages');
          result = data.messages?.matches?.map((m: any) => ({
            ts: m.ts,
            channel: m.channel?.name,
            channel_id: m.channel?.id,
            user: m.user,
            username: m.username,
            text: m.text,
            permalink: m.permalink
          })) || [];
          break;
        }

        default:
          throw new Error(`Unknown Slack operation: ${operation}`);
      }

      console.error(`✅ Slack operation ${operation} completed successfully`);

      return {
        success: true,
        data: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1
      };

    } catch (error) {
      console.error(`❌ Slack error:`, error);
      return {
        success: false,
        error: `Slack error: ${error instanceof Error ? error.message : String(error)}`,
        data: [{
          error: error instanceof Error ? error.message : String(error)
        }],
        rowCount: 1
      };
    }
  }

  private async executeDatabaseQuery(serverId: string, serverConfig: any, tool: ToolDefinition, args: any): Promise<any> {
    const dbConnection = await this.getOrCreateConnection(serverId, serverConfig.dbConfig);
    const result = await this.executeQuery(dbConnection, tool.sqlQuery, args, tool.operation);

    console.error(`✅ Executed tool ${serverId}__${tool.name} successfully`);
    return {
      success: true,
      data: result,
      rowCount: Array.isArray(result) ? result.length : (result.rowsAffected || 0)
    };
  }

  async readResource(resourceName: string): Promise<any> {
    try {
      // Parse resource name: "serverId__resourceName"
      const parts = resourceName.split('__');
      if (parts.length !== 2) {
        throw new Error(`Invalid resource name format: ${resourceName}`);
      }

      const [serverId, actualResourceName] = parts;

      // Get resource definition from JSON database
      const resources = this.sqliteManager.getResourcesForServer(serverId);
      const resource = resources.find(r => r.name === actualResourceName);

      if (!resource) {
        throw new Error(`Resource not found: ${resourceName}`);
      }

      // Get server config from JSON database
      const serverConfig = this.sqliteManager.getServer(serverId);
      if (!serverConfig) {
        throw new Error(`Server not found: ${serverId}`);
      }

      // Get or create database connection
      const dbConnection = await this.getOrCreateConnection(serverId, serverConfig.dbConfig);

      // Execute the SQL query
      const result = await this.executeQuery(dbConnection, resource.sqlQuery, {}, 'SELECT');

      console.error(`✅ Read resource ${resourceName} successfully`);
      return {
        contents: [{
          uri: resource.uri_template,
          mimeType: 'application/json',
          text: JSON.stringify(result, null, 2)
        }]
      };

    } catch (error) {
      console.error(`❌ Error reading resource ${resourceName}:`, error);
      throw error;
    }
  }

  private async getOrCreateConnection(serverId: string, dbConfig: any): Promise<ActiveDatabaseConnection> {
    if (this.dbConnections.has(serverId)) {
      return this.dbConnections.get(serverId)!;
    }

    let connection: any;
    let dbConnection: ActiveDatabaseConnection;

    try {
      switch (dbConfig.type) {
        case 'mssql':
          connection = await sql.connect({
            server: dbConfig.host,
            port: dbConfig.port || 1433,
            database: dbConfig.database,
            user: dbConfig.username,
            password: dbConfig.password,
            options: {
              encrypt: dbConfig.encrypt || false,
              trustServerCertificate: dbConfig.trustServerCertificate ?? true
            }
          });

          console.error(`🔗 Connected to MSSQL database for server ${serverId}`);
          break;

        case 'mysql':
          connection = await mysql.createConnection({
            host: dbConfig.host,
            port: dbConfig.port || 3306,
            database: dbConfig.database,
            user: dbConfig.username,
            password: dbConfig.password
          });

          console.error(`🔗 Connected to MySQL database for server ${serverId}`);
          break;

        case 'postgresql':
          connection = new Pool({
            host: dbConfig.host,
            port: dbConfig.port || 5432,
            database: dbConfig.database,
            user: dbConfig.username,
            password: dbConfig.password
          });

          // Test connection
          await connection.query('SELECT 1');
          console.error(`🔗 Connected to PostgreSQL database for server ${serverId}`);
          break;

        default:
          throw new Error(`Unsupported database type: ${dbConfig.type}`);
      }

      dbConnection = {
        connection,
        config: dbConfig
      };

      this.dbConnections.set(serverId, dbConnection);
      return dbConnection;

    } catch (error) {
      console.error(`❌ Failed to connect to database for server ${serverId}:`, error);
      throw error;
    }
  }

  private async executeQuery(dbConnection: ActiveDatabaseConnection, sqlQuery: string, args: any, operation: string): Promise<any> {
    const { connection, config } = dbConnection;
    const type = config.type;

    try {
      switch (type) {
        case 'mssql':
          const request = connection.request();

          // Extract all @param references from the SQL query
          const paramRegex = /@(\w+)/g;
          let match;
          const sqlParams = new Set();
          while ((match = paramRegex.exec(sqlQuery)) !== null) {
            sqlParams.add(match[1]);
          }

          // For SQL Server, handle data type compatibility issues
          // If no filter parameters are provided (all are null), simplify the query
          const hasActiveFilters = Array.from(sqlParams).some((paramName: string) => {
            if (paramName === 'limit' || paramName === 'offset') return false;
            const value = args[paramName];
            return value !== undefined && value !== null;
          });

          let modifiedQuery = sqlQuery;
          if (!hasActiveFilters && operation === 'SELECT') {
            // Remove complex WHERE clause that causes ntext compatibility issues
            modifiedQuery = sqlQuery.replace(/WHERE.*?(?=ORDER BY|GROUP BY|HAVING|$)/gi, '');
          }

          // Always add all SQL parameters, using provided values or defaults
          for (const paramName of sqlParams) {
            const paramNameStr = paramName as string;
            let value = args[paramNameStr];
            
            // Set defaults for limit and offset if not provided
            if (paramNameStr === 'limit' && (value === undefined || value === null)) {
              value = 100;
            } else if (paramNameStr === 'offset' && (value === undefined || value === null)) {
              value = 0;
            }
            
            if (value !== undefined && value !== null) {
              request.input(paramNameStr, value);
            } else {
              request.input(paramNameStr, null);
            }
          }

          const result = await request.query(modifiedQuery);

          if (operation === 'SELECT') {
            return result.recordset;
          } else {
            return { rowsAffected: result.rowsAffected[0] };
          }

        case 'mysql':
          // For SELECT with LIMIT/OFFSET, use query() instead of execute() to avoid prepared statement issues
          if (operation === 'SELECT') {
            const limit = args.limit || 100;
            const offset = args.offset || 0;
            // Replace placeholders with actual values for SELECT
            const selectQuery = sqlQuery.replace('LIMIT ? OFFSET ?', `LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`);
            const [selectRows] = await connection.query(selectQuery);
            return selectRows;
          }

          // For COUNT, MIN, MAX, SUM, AVG - no parameters needed
          if (['COUNT', 'MIN', 'MAX', 'SUM', 'AVG'].some(op => sqlQuery.toUpperCase().includes(`${op}(`))) {
            const [aggRows] = await connection.query(sqlQuery);
            return aggRows;
          }

          // Build parameters array for INSERT/UPDATE/DELETE
          let mysqlParams: any[] = [];
          if (operation === 'INSERT') {
            // Extract column names from INSERT query to ensure correct order
            // Format: INSERT INTO `table` (`col1`, `col2`, ...) VALUES (?, ?, ...)
            const insertMatch = sqlQuery.match(/INSERT INTO\s+`[^`]+`\s+\(([^)]+)\)/i);
            if (insertMatch) {
              const columnNames = insertMatch[1].match(/`([^`]+)`/g)?.map(c => c.replace(/`/g, '')) || [];
              mysqlParams = columnNames.map(col => args[col] === undefined ? null : args[col]);
            } else {
              mysqlParams = Object.entries(args)
                .filter(([key]) => key.toLowerCase() !== 'id')
                .map(([, value]) => value === undefined ? null : value);
            }
          } else if (operation === 'UPDATE') {
            // Extract column names from UPDATE query SET clause
            // Format: UPDATE `table` SET `col1` = ?, `col2` = ? WHERE `id` = ?
            const setMatch = sqlQuery.match(/SET\s+(.+?)\s+WHERE/i);
            if (setMatch) {
              const columnNames = setMatch[1].match(/`([^`]+)`\s*=/g)?.map(c => c.replace(/`|=/g, '').trim()) || [];
              const updateValues = columnNames.map(col => args[col] === undefined ? null : args[col]);
              mysqlParams = [...updateValues, args.id];
            } else {
              const updateValues = Object.entries(args)
                .filter(([key]) => key.toLowerCase() !== 'id')
                .map(([, value]) => value === undefined ? null : value);
              mysqlParams = [...updateValues, args.id];
            }
          } else if (operation === 'DELETE') {
            mysqlParams = [args.id];
          }

          const [rows] = await connection.execute(sqlQuery, mysqlParams);
          return { rowsAffected: (rows as any).affectedRows };

        case 'postgresql':
          // For COUNT, MIN, MAX, SUM, AVG - no parameters needed (check BEFORE SELECT)
          if (['COUNT', 'MIN', 'MAX', 'SUM', 'AVG'].some(op => sqlQuery.toUpperCase().includes(`${op}(`))) {
            const pgAggResult = await connection.query(sqlQuery);
            return pgAggResult.rows;
          }

          // For SELECT with LIMIT/OFFSET
          if (operation === 'SELECT') {
            const limit = args.limit || 100;
            const offset = args.offset || 0;
            const pgSelectResult = await connection.query(sqlQuery, [limit, offset]);
            return pgSelectResult.rows;
          }

          // Build parameters array for INSERT/UPDATE/DELETE
          let pgParams: any[] = [];
          if (operation === 'INSERT') {
            // Extract column names from INSERT query to ensure correct order
            // Format: INSERT INTO "table" ("col1", "col2", ...) VALUES ($1, $2, ...)
            const insertMatch = sqlQuery.match(/INSERT INTO\s+"[^"]+"\s+\(([^)]+)\)/i);
            if (insertMatch) {
              const columnNames = insertMatch[1].match(/"([^"]+)"/g)?.map(c => c.replace(/"/g, '')) || [];
              pgParams = columnNames.map(col => args[col] === undefined ? null : args[col]);
            } else {
              pgParams = Object.entries(args)
                .filter(([key]) => key.toLowerCase() !== 'id')
                .map(([, value]) => value === undefined ? null : value);
            }
          } else if (operation === 'UPDATE') {
            // Extract column names from UPDATE query SET clause
            // Format: UPDATE "table" SET "col1" = $1, "col2" = $2 WHERE "id" = $N
            const setMatch = sqlQuery.match(/SET\s+(.+?)\s+WHERE/i);
            if (setMatch) {
              const columnNames = setMatch[1].match(/"([^"]+)"\s*=/g)?.map(c => c.replace(/"|=/g, '').trim()) || [];
              const updateValues = columnNames.map(col => args[col] === undefined ? null : args[col]);
              pgParams = [...updateValues, args.id];
            } else {
              const updateValues = Object.entries(args)
                .filter(([key]) => key.toLowerCase() !== 'id')
                .map(([, value]) => value === undefined ? null : value);
              pgParams = [...updateValues, args.id];
            }
          } else if (operation === 'DELETE') {
            pgParams = [args.id];
          }

          const pgResult = await connection.query(sqlQuery, pgParams);
          return { rowsAffected: pgResult.rowCount };

        default:
          throw new Error(`Unsupported database type: ${type}`);
      }
    } catch (error) {
      console.error(`❌ Database query failed:`, error);
      throw error;
    }
  }

  getStats(): any {
    return {
      ...this.sqliteManager.getStats(),
      activeConnections: this.dbConnections.size
    };
  }

  async close(): Promise<void> {
    // Close all database connections
    for (const [serverId, dbConnection] of this.dbConnections.entries()) {
      try {
        switch (dbConnection.config.type) {
          case 'mssql':
            await dbConnection.connection.close();
            break;
          case 'mysql':
            await dbConnection.connection.end();
            break;
          case 'postgresql':
            await dbConnection.connection.end();
            break;
        }
        console.error(`🔌 Closed database connection for server ${serverId}`);
      } catch (error) {
        console.error(`❌ Error closing connection for server ${serverId}:`, error);
      }
    }

    this.dbConnections.clear();
    this.sqliteManager.close();
  }
}

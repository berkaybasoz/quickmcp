import { SQLiteManager, ServerConfig, ToolDefinition, ResourceDefinition } from '../database/sqlite-manager';
import { DataSourceType, shouldGenerateResources } from '../types';

interface ParsedColumn {
  name: string;
  type: string;
  nullable: boolean;
}

interface ParsedData {
  [tableName: string]: any[];
}

export class MCPServerGenerator {
  private sqliteManager: SQLiteManager;

  constructor() {
    this.sqliteManager = new SQLiteManager();
  }

  async generateServer(
    serverId: string,
    serverName: string,
    parsedData: any,
    dbConfig: any,
    selectedTables?: any[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      //console.log(`🚀 Generating virtual MCP server: ${serverId}`);

      // Create server config
      //console.log(`📝 Creating server config with serverId: "${serverId}", serverName: "${serverName}"`);
      const serverConfig: ServerConfig = {
        id: serverId,
        name: serverName,
        dbConfig: dbConfig,
        createdAt: new Date().toISOString()
      };
      //console.log('📄 Server config created:', JSON.stringify(serverConfig, null, 2));

      // Save server to SQLite database only
      this.sqliteManager.saveServer(serverConfig);
      //console.log(`✅ Server config saved to SQLite database: ${serverId}`);

      // Generate and save tools
      let tools: ToolDefinition[] = [];
      //console.log('🔍 MCPServerGenerator - dbConfig.type:', dbConfig?.type);
      //console.log('🔍 MCPServerGenerator - DataSourceType.Jira:', DataSourceType.Jira);

      // Treat array parsedData as REST endpoints even if dbConfig.type is missing
      if (Array.isArray(parsedData) || dbConfig?.type === DataSourceType.Rest) {
        const endpoints = Array.isArray(parsedData) ? parsedData : [];
        tools = this.generateToolsForRest(serverId, parsedData, dbConfig, selectedTables);
        //console.log('✅ Generated REST tools:', tools.length);
      } else if (dbConfig?.type === DataSourceType.Webpage) {
        tools = this.generateToolsForWebpage(serverId, dbConfig);
        //console.log('✅ Generated webpage tools:', tools.length);
      } else if (dbConfig?.type === DataSourceType.GraphQL) {
        tools = this.generateToolsForGraphQL(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Soap) {
        tools = this.generateToolsForSoap(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Rss) {
        tools = this.generateToolsForRss(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Curl) {
        tools = this.generateToolsForCurl(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.GitHub) {
        tools = this.generateToolsForGitHub(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.X) {
        tools = this.generateToolsForX(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Prometheus) {
        tools = this.generateToolsForPrometheus(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Grafana) {
        tools = this.generateToolsForGrafana(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.MongoDB) {
        tools = this.generateToolsForMongoDB(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Facebook) {
        tools = this.generateToolsForFacebook(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Instagram) {
        tools = this.generateToolsForInstagram(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.TikTok) {
        tools = this.generateToolsForTikTok(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Notion) {
        tools = this.generateToolsForNotion(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Telegram) {
        tools = this.generateToolsForTelegram(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.LinkedIn) {
        tools = this.generateToolsForLinkedIn(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Reddit) {
        tools = this.generateToolsForReddit(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.YouTube) {
        tools = this.generateToolsForYouTube(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.WhatsAppBusiness) {
        tools = this.generateToolsForWhatsAppBusiness(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Threads) {
        tools = this.generateToolsForThreads(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.OpenAI) {
        tools = this.generateToolsForOpenAI(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Claude) {
        tools = this.generateToolsForClaude(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Gemini) {
        tools = this.generateToolsForGemini(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Grok) {
        tools = this.generateToolsForGrok(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.FalAI) {
        tools = this.generateToolsForFalAI(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.HuggingFace) {
        tools = this.generateToolsForHuggingFace(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Llama) {
        tools = this.generateToolsForLlama(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.DeepSeek) {
        tools = this.generateToolsForDeepSeek(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.AzureOpenAI) {
        tools = this.generateToolsForAzureOpenAI(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Mistral) {
        tools = this.generateToolsForMistral(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Cohere) {
        tools = this.generateToolsForCohere(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Perplexity) {
        tools = this.generateToolsForPerplexity(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Together) {
        tools = this.generateToolsForTogether(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Fireworks) {
        tools = this.generateToolsForFireworks(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Groq) {
        tools = this.generateToolsForGroq(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.OpenRouter) {
        tools = this.generateToolsForOpenRouter(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Dropbox) {
        tools = this.generateToolsForDropbox(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.N8n) {
        tools = this.generateToolsForN8n(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Supabase) {
        tools = this.generateToolsForSupabase(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Npm) {
        tools = this.generateToolsForNpm(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Nuget) {
        tools = this.generateToolsForNuget(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Maven) {
        tools = this.generateToolsForMaven(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Gradle) {
        tools = this.generateToolsForGradle(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Nexus) {
        tools = this.generateToolsForNexus(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Trello) {
        tools = this.generateToolsForTrello(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.GitLab) {
        tools = this.generateToolsForGitLab(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Bitbucket) {
        tools = this.generateToolsForBitbucket(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.GDrive) {
        tools = this.generateToolsForGDrive(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.GoogleCalendar) {
        tools = this.generateToolsForGoogleCalendar(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.GoogleDocs) {
        tools = this.generateToolsForGoogleDocs(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.GoogleSheets) {
        tools = this.generateToolsForGoogleSheets(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Airtable) {
        tools = this.generateToolsForAirtable(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Asana) {
        tools = this.generateToolsForAsana(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Monday) {
        tools = this.generateToolsForMonday(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.ClickUp) {
        tools = this.generateToolsForClickUp(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Linear) {
        tools = this.generateToolsForLinear(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Jenkins) {
        tools = this.generateToolsForJenkins(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.DockerHub) {
        tools = this.generateToolsForDockerHub(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Jira) {
        //console.log('✅ Matched Jira type, generating Jira tools');
        tools = this.generateToolsForJira(serverId, dbConfig);
        //console.log('✅ Generated Jira tools:', tools.length);
      } else if (dbConfig?.type === DataSourceType.Confluence) {
        tools = this.generateToolsForConfluence(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Ftp) {
        tools = this.generateToolsForFtp(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.LocalFS) {
        tools = this.generateToolsForLocalFS(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Email) {
        tools = this.generateToolsForEmail(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Slack) {
        tools = this.generateToolsForSlack(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Discord) {
        tools = this.generateToolsForDiscord(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Docker) {
        tools = this.generateToolsForDocker(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Kubernetes) {
        tools = this.generateToolsForKubernetes(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.Elasticsearch) {
        tools = this.generateToolsForElasticsearch(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.OpenSearch) {
        tools = this.generateToolsForElasticsearch(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.OpenShift) {
        tools = this.generateToolsForOpenShift(serverId, dbConfig);
      } else {
        //console.log('⚠️ Falling back to generateToolsForData, dbConfig.type:', dbConfig?.type);
        tools = this.generateToolsForData(serverId, parsedData as ParsedData, dbConfig, selectedTables);
        //console.log('✅ Generated data tools:', tools.length);
      }
      if (tools.length > 0) {
        this.sqliteManager.saveTools(tools);
        //console.log(`✅ Generated ${tools.length} tools for server ${serverId}`);
      }

      // Generate and save resources when applicable
      let resources: ResourceDefinition[] = [];
      if (shouldGenerateResources(parsedData, dbConfig)) {
        resources = this.generateResourcesForData(serverId, parsedData as ParsedData, dbConfig);
        if (resources.length > 0) {
          this.sqliteManager.saveResources(resources);
          //console.log(`✅ Generated ${resources.length} resources for server ${serverId}`);
        }
      }

      return {
        success: true,
        message: `Virtual MCP server '${serverId}' created successfully with ${tools.length} tools and ${resources.length} resources`
      };
    } catch (error) {
      console.error(`❌ Error generating server ${serverId}:`, error);
      return {
        success: false,
        message: `Failed to generate server: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private generateToolsForRest(serverId: string, endpoints: any[], dbConfig: any, selected?: any[]): ToolDefinition[] {
    const selectedIdx = new Set<number>((selected || []).map((s: any) => s.index));
    const items = endpoints.map((e, i) => ({ ...e, __index: i })).filter(e => selectedIdx.size ? selectedIdx.has(e.__index) : true);
    const mapOp = (method: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' => {
      const m = (method || '').toUpperCase();
      if (m === 'GET') return 'SELECT';
      if (m === 'POST') return 'INSERT';
      if (m === 'PUT' || m === 'PATCH') return 'UPDATE';
      if (m === 'DELETE') return 'DELETE';
      return 'SELECT';
    };
    const sanitize = (s: string) => this.sanitizeName(s);
    return items.map(ep => {
      const name = `${(ep.method || 'GET').toLowerCase()}_${sanitize(ep.path || 'endpoint')}`.slice(0, 128);
      // Build a simple input schema from parameters
      const props: any = {};
      (ep.parameters || []).forEach((p: any) => {
        const t = (p.schema?.type || 'string');
        props[p.name] = { type: t, description: p.description || '' };
      });
      const inputSchema = { type: 'object', properties: props, required: [] as string[] };
      const sqlQuery = JSON.stringify({ type: DataSourceType.Rest, baseUrl: dbConfig?.baseUrl, method: ep.method, path: ep.path });
      return {
        server_id: serverId,
        name,
        description: ep.summary || `${ep.method} ${ep.path}`,
        inputSchema,
        sqlQuery,
        operation: mapOp(ep.method)
      };
    });
  }

  private generateToolsForWebpage(serverId: string, dbConfig: any): ToolDefinition[] {
    const { url, alias } = dbConfig || {};
    if (!url) {
      console.error('❌ No URL provided for webpage server');
      return [];
    }

    const toolName = alias ? `${alias}_web` : 'fetch_webpage';

    // Create a tool to fetch the webpage HTML
    const tool: ToolDefinition = {
      server_id: serverId,
      name: toolName,
      description: `Fetches the HTML content from ${url}`,
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      sqlQuery: JSON.stringify({
        type: DataSourceType.Webpage,
        url: url
      }),
      operation: 'SELECT'
    };

    //console.log(`✅ Generated webpage fetch tool for: ${url}`);
    return [tool];
  }

  private generateToolsForGraphQL(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, headers } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.GraphQL, baseUrl, headers };

    tools.push({
      server_id: serverId,
      name: 'query',
      description: 'Execute a GraphQL query',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'GraphQL query string' },
          variables: { type: 'object', description: 'Variables object (optional)' },
          operationName: { type: 'string', description: 'Operation name (optional)' },
          headers: { type: 'object', description: 'Additional headers (optional)' }
        },
        required: ['query']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'introspect',
      description: 'Run GraphQL schema introspection',
      inputSchema: { type: 'object', properties: {}, required: [] },
      sqlQuery: JSON.stringify({
        ...baseConfig,
        method: 'POST',
        query: `query IntrospectionQuery { __schema { queryType { name } mutationType { name } subscriptionType { name } types { ...FullType } directives { name description locations args { ...InputValue } } } } fragment FullType on __Type { kind name description fields(includeDeprecated: true) { name description args { ...InputValue } type { ...TypeRef } isDeprecated deprecationReason } inputFields { ...InputValue } interfaces { ...TypeRef } enumValues(includeDeprecated: true) { name description isDeprecated deprecationReason } possibleTypes { ...TypeRef } } fragment InputValue on __InputValue { name description type { ...TypeRef } defaultValue } fragment TypeRef on __Type { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } } }`
      }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForSoap(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, wsdlUrl, soapAction, headers } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Soap, baseUrl, wsdlUrl, soapAction, headers };

    tools.push({
      server_id: serverId,
      name: 'call_operation',
      description: 'Call a SOAP operation with raw XML body',
      inputSchema: {
        type: 'object',
        properties: {
          xml_body: { type: 'string', description: 'SOAP XML envelope' },
          soap_action: { type: 'string', description: 'SOAPAction header override (optional)' },
          headers: { type: 'object', description: 'Additional headers (optional)' }
        },
        required: ['xml_body']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, method: 'POST' }),
      operation: 'INSERT'
    });

    return tools;
  }

  private generateToolsForRss(serverId: string, dbConfig: any): ToolDefinition[] {
    const { feedUrl } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Rss, feedUrl };

    tools.push({
      server_id: serverId,
      name: 'get_feed',
      description: 'Fetch RSS/Atom feed and return metadata + items',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max items (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, op: 'get' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_entries',
      description: 'List RSS/Atom feed entries',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max items (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, op: 'list' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForCurl(serverId: string, dbConfig: any): ToolDefinition[] {
    const { url, method = 'GET', alias } = dbConfig || {};
    if (!url) {
      console.error('❌ No URL provided for cURL server');
      return [];
    }

    const mapOp = (method: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' => {
      const m = (method || '').toUpperCase();
      if (m === 'GET') return 'SELECT';
      if (m === 'POST') return 'INSERT';
      if (m === 'PUT' || m === 'PATCH') return 'UPDATE';
      if (m === 'DELETE') return 'DELETE';
      return 'SELECT';
    };

    const toolName = alias ? `${alias}_curl` : 'execute_curl_request';

    const tool: ToolDefinition = {
      server_id: serverId,
      name: toolName,
      description: `Executes a ${method} request to ${url}`,
      inputSchema: {
        type: 'object',
        properties: {
            // Allow overriding parts of the request at runtime
            url: { type: 'string', description: 'Optional URL override' },
            method: { type: 'string', description: 'Optional method override' },
            headers: { type: 'object', description: 'Optional headers override (JSON object)' },
            body: { type: 'object', description: 'Optional body override (JSON object)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify(dbConfig),
      operation: mapOp(method)
    };

    return [tool];
  }

  private generateToolsForGitHub(serverId: string, dbConfig: any): ToolDefinition[] {
    const { token, owner, repo } = dbConfig;
    const tools: ToolDefinition[] = [];

    // Base config stored in sqlQuery
    const baseConfig = {
      type: DataSourceType.GitHub,
      token,
      owner,
      repo
    };

    // List repositories for authenticated user
    tools.push({
      server_id: serverId,
      name: 'list_repos',
      description: 'List repositories for the authenticated user',
      inputSchema: {
        type: 'object',
        properties: {
          per_page: { type: 'number', description: 'Results per page (max 100)', default: 30 },
          page: { type: 'number', description: 'Page number', default: 1 }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/user/repos', method: 'GET' }),
      operation: 'SELECT'
    });

    // Search repositories
    tools.push({
      server_id: serverId,
      name: 'search_repos',
      description: 'Search for repositories on GitHub',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query' },
          per_page: { type: 'number', description: 'Results per page (max 100)', default: 30 },
          page: { type: 'number', description: 'Page number', default: 1 }
        },
        required: ['q']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/search/repositories', method: 'GET' }),
      operation: 'SELECT'
    });

    // Get repository details
    tools.push({
      server_id: serverId,
      name: 'get_repo',
      description: 'Get details of a specific repository',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo: { type: 'string', description: 'Repository name' }
        },
        required: ['owner', 'repo']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repos/{owner}/{repo}', method: 'GET' }),
      operation: 'SELECT'
    });

    // List issues
    tools.push({
      server_id: serverId,
      name: 'list_issues',
      description: 'List issues for a repository',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo: { type: 'string', description: 'Repository name' },
          state: { type: 'string', description: 'Issue state (open, closed, all)', default: 'open' },
          per_page: { type: 'number', description: 'Results per page', default: 30 },
          page: { type: 'number', description: 'Page number', default: 1 }
        },
        required: ['owner', 'repo']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repos/{owner}/{repo}/issues', method: 'GET' }),
      operation: 'SELECT'
    });

    // Create issue
    tools.push({
      server_id: serverId,
      name: 'create_issue',
      description: 'Create a new issue in a repository',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo: { type: 'string', description: 'Repository name' },
          title: { type: 'string', description: 'Issue title' },
          body: { type: 'string', description: 'Issue body' },
          labels: { type: 'array', items: { type: 'string' }, description: 'Labels to add' }
        },
        required: ['owner', 'repo', 'title']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repos/{owner}/{repo}/issues', method: 'POST' }),
      operation: 'INSERT'
    });

    // List pull requests
    tools.push({
      server_id: serverId,
      name: 'list_pull_requests',
      description: 'List pull requests for a repository',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo: { type: 'string', description: 'Repository name' },
          state: { type: 'string', description: 'PR state (open, closed, all)', default: 'open' },
          per_page: { type: 'number', description: 'Results per page', default: 30 },
          page: { type: 'number', description: 'Page number', default: 1 }
        },
        required: ['owner', 'repo']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repos/{owner}/{repo}/pulls', method: 'GET' }),
      operation: 'SELECT'
    });

    // Get file contents
    tools.push({
      server_id: serverId,
      name: 'get_file_contents',
      description: 'Get contents of a file from a repository',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo: { type: 'string', description: 'Repository name' },
          path: { type: 'string', description: 'Path to the file' },
          ref: { type: 'string', description: 'Branch, tag, or commit (default: default branch)' }
        },
        required: ['owner', 'repo', 'path']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repos/{owner}/{repo}/contents/{path}', method: 'GET' }),
      operation: 'SELECT'
    });

    // List commits
    tools.push({
      server_id: serverId,
      name: 'list_commits',
      description: 'List commits for a repository',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo: { type: 'string', description: 'Repository name' },
          sha: { type: 'string', description: 'Branch name or commit SHA' },
          per_page: { type: 'number', description: 'Results per page', default: 30 },
          page: { type: 'number', description: 'Page number', default: 1 }
        },
        required: ['owner', 'repo']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repos/{owner}/{repo}/commits', method: 'GET' }),
      operation: 'SELECT'
    });

    // Get user info
    tools.push({
      server_id: serverId,
      name: 'get_user',
      description: 'Get information about a GitHub user',
      inputSchema: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'GitHub username (leave empty for authenticated user)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/user', method: 'GET' }),
      operation: 'SELECT'
    });

    // Create a comment on an issue
    tools.push({
      server_id: serverId,
      name: 'create_issue_comment',
      description: 'Create a comment on an issue',
      inputSchema: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo: { type: 'string', description: 'Repository name' },
          issue_number: { type: 'number', description: 'Issue number' },
          body: { type: 'string', description: 'Comment body' }
        },
        required: ['owner', 'repo', 'issue_number', 'body']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repos/{owner}/{repo}/issues/{issue_number}/comments', method: 'POST' }),
      operation: 'INSERT'
    });

    return tools;
  }

  private generateToolsForX(serverId: string, dbConfig: any): ToolDefinition[] {
    const { token, username } = dbConfig;
    const tools: ToolDefinition[] = [];

    const baseConfig = {
      type: DataSourceType.X,
      token,
      username
    };

    tools.push({
      server_id: serverId,
      name: 'get_user_by_username',
      description: 'Get X user details by username',
      inputSchema: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'X username (without @)' },
          'user.fields': { type: 'string', description: 'Comma-separated user fields (optional)' }
        },
        required: ['username']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/2/users/by/username/{username}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_user',
      description: 'Get X user details by user ID',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'X user ID' },
          'user.fields': { type: 'string', description: 'Comma-separated user fields (optional)' }
        },
        required: ['user_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/2/users/{user_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_user_tweets',
      description: 'Get recent tweets from a user',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'X user ID' },
          max_results: { type: 'number', description: 'Maximum tweets (10-100)', minimum: 10, maximum: 100, default: 10 },
          'tweet.fields': { type: 'string', description: 'Comma-separated tweet fields (optional)' },
          exclude: { type: 'string', description: 'Comma-separated exclusions (e.g., retweets,replies)' }
        },
        required: ['user_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/2/users/{user_id}/tweets', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'search_recent_tweets',
      description: 'Search recent tweets by query',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (e.g., "from:jack -is:retweet")' },
          max_results: { type: 'number', description: 'Maximum tweets (10-100)', minimum: 10, maximum: 100, default: 10 },
          'tweet.fields': { type: 'string', description: 'Comma-separated tweet fields (optional)' }
        },
        required: ['query']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/2/tweets/search/recent', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_tweet',
      description: 'Get a tweet by ID',
      inputSchema: {
        type: 'object',
        properties: {
          tweet_id: { type: 'string', description: 'Tweet ID' },
          'tweet.fields': { type: 'string', description: 'Comma-separated tweet fields (optional)' }
        },
        required: ['tweet_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/2/tweets/{tweet_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_tweet',
      description: 'Create a new tweet',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Tweet text' },
          reply_in_reply_to_tweet_id: { type: 'string', description: 'Reply to tweet ID (optional)' },
          quote_tweet_id: { type: 'string', description: 'Quote tweet ID (optional)' },
          media_ids: { type: 'array', items: { type: 'string' }, description: 'Media IDs (optional)' }
        },
        required: ['text']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/2/tweets', method: 'POST' }),
      operation: 'INSERT'
    });

    return tools;
  }

  private generateToolsForPrometheus(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Prometheus, baseUrl };

    tools.push({
      server_id: serverId,
      name: 'query',
      description: 'Run an instant PromQL query',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'PromQL query string' },
          time: { type: 'string', description: 'Evaluation timestamp (RFC3339 or Unix, optional)' },
          timeout: { type: 'string', description: 'Query timeout (e.g., 30s, optional)' }
        },
        required: ['query']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/v1/query', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'query_range',
      description: 'Run a range PromQL query',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'PromQL query string' },
          start: { type: 'string', description: 'Start timestamp (RFC3339 or Unix)' },
          end: { type: 'string', description: 'End timestamp (RFC3339 or Unix)' },
          step: { type: 'string', description: 'Query resolution step width (e.g., 15s)' },
          timeout: { type: 'string', description: 'Query timeout (e.g., 30s, optional)' }
        },
        required: ['query', 'start', 'end', 'step']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/v1/query_range', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'labels',
      description: 'List label names',
      inputSchema: {
        type: 'object',
        properties: {
          start: { type: 'string', description: 'Start timestamp (optional)' },
          end: { type: 'string', description: 'End timestamp (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/v1/labels', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'series',
      description: 'Find series by label matchers',
      inputSchema: {
        type: 'object',
        properties: {
          match: { type: 'array', items: { type: 'string' }, description: 'Label matchers (e.g., up{job=\"api\"})' },
          start: { type: 'string', description: 'Start timestamp (optional)' },
          end: { type: 'string', description: 'End timestamp (optional)' }
        },
        required: ['match']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/v1/series', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'targets',
      description: 'List Prometheus targets',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/v1/targets', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForGrafana(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, authType, apiKey, username, password } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Grafana, baseUrl, authType, apiKey, username, password };

    tools.push({
      server_id: serverId,
      name: 'search_dashboards',
      description: 'Search dashboards (by title/tag)',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (optional)' },
          tag: { type: 'string', description: 'Tag filter (optional)' },
          folderIds: { type: 'array', items: { type: 'number' }, description: 'Folder IDs (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/search', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_dashboard',
      description: 'Get dashboard by UID',
      inputSchema: {
        type: 'object',
        properties: {
          uid: { type: 'string', description: 'Dashboard UID' }
        },
        required: ['uid']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/dashboards/uid/{uid}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_datasources',
      description: 'List Grafana datasources',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/datasources', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_datasource',
      description: 'Get datasource by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Datasource ID' }
        },
        required: ['id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/datasources/{id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'query_datasource',
      description: 'Query a datasource',
      inputSchema: {
        type: 'object',
        properties: {
          queries: { type: 'array', items: { type: 'object' }, description: 'Grafana queries array' },
          from: { type: 'string', description: 'From time (e.g., now-1h)' },
          to: { type: 'string', description: 'To time (e.g., now)' },
          datasourceId: { type: 'number', description: 'Datasource ID' }
        },
        required: ['queries', 'from', 'to', 'datasourceId']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/ds/query', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForMongoDB(serverId: string, dbConfig: any): ToolDefinition[] {
    const { host, port, database, username, password, authSource } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.MongoDB, host, port, database, username, password, authSource };

    tools.push({
      server_id: serverId,
      name: 'list_databases',
      description: 'List databases on the MongoDB server',
      inputSchema: { type: 'object', properties: {}, required: [] },
      sqlQuery: JSON.stringify({ ...baseConfig, op: 'list_databases' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_collections',
      description: 'List collections in a database',
      inputSchema: {
        type: 'object',
        properties: {
          database: { type: 'string', description: 'Database name (optional, default from config)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, op: 'list_collections' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'find',
      description: 'Find documents in a collection',
      inputSchema: {
        type: 'object',
        properties: {
          database: { type: 'string', description: 'Database name (optional, default from config)' },
          collection: { type: 'string', description: 'Collection name' },
          filter: { type: 'object', description: 'MongoDB filter object' },
          limit: { type: 'number', description: 'Max documents to return', default: 50 },
          skip: { type: 'number', description: 'Skip documents', default: 0 }
        },
        required: ['collection']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, op: 'find' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'insert_one',
      description: 'Insert a document into a collection',
      inputSchema: {
        type: 'object',
        properties: {
          database: { type: 'string', description: 'Database name (optional, default from config)' },
          collection: { type: 'string', description: 'Collection name' },
          document: { type: 'object', description: 'Document to insert' }
        },
        required: ['collection', 'document']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, op: 'insert_one' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'update_one',
      description: 'Update a single document in a collection',
      inputSchema: {
        type: 'object',
        properties: {
          database: { type: 'string', description: 'Database name (optional, default from config)' },
          collection: { type: 'string', description: 'Collection name' },
          filter: { type: 'object', description: 'Filter to match document' },
          update: { type: 'object', description: 'Update document (e.g., {$set:{...}})' },
          upsert: { type: 'boolean', description: 'Insert if not found', default: false }
        },
        required: ['collection', 'filter', 'update']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, op: 'update_one' }),
      operation: 'UPDATE'
    });

    tools.push({
      server_id: serverId,
      name: 'delete_one',
      description: 'Delete a single document in a collection',
      inputSchema: {
        type: 'object',
        properties: {
          database: { type: 'string', description: 'Database name (optional, default from config)' },
          collection: { type: 'string', description: 'Collection name' },
          filter: { type: 'object', description: 'Filter to match document' }
        },
        required: ['collection', 'filter']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, op: 'delete_one' }),
      operation: 'DELETE'
    });

    tools.push({
      server_id: serverId,
      name: 'aggregate',
      description: 'Run an aggregation pipeline',
      inputSchema: {
        type: 'object',
        properties: {
          database: { type: 'string', description: 'Database name (optional, default from config)' },
          collection: { type: 'string', description: 'Collection name' },
          pipeline: { type: 'array', items: { type: 'object' }, description: 'Aggregation pipeline' },
          allowDiskUse: { type: 'boolean', description: 'Allow disk use', default: false }
        },
        required: ['collection', 'pipeline']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, op: 'aggregate' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForFacebook(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiVersion, accessToken, userId, pageId } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Facebook, baseUrl, apiVersion, accessToken, userId, pageId };

    tools.push({
      server_id: serverId,
      name: 'get_user',
      description: 'Get a Facebook user by ID',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User ID (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{user_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_pages',
      description: 'List pages for a user',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User ID (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{user_id}/accounts', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_page_posts',
      description: 'List posts for a page',
      inputSchema: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'Page ID (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' },
          limit: { type: 'number', description: 'Max posts', default: 25 }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{page_id}/posts', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_post',
      description: 'Get a post by ID',
      inputSchema: {
        type: 'object',
        properties: {
          post_id: { type: 'string', description: 'Post ID' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: ['post_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{post_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'search',
      description: 'Search public content (limited by token permissions)',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query' },
          type: { type: 'string', description: 'Search type (e.g., page, user, place)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' },
          limit: { type: 'number', description: 'Max results', default: 25 }
        },
        required: ['q', 'type']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/search', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_page_insights',
      description: 'Get insights for a page',
      inputSchema: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'Page ID (optional, default from config)' },
          metric: { type: 'string', description: 'Comma-separated metrics (e.g., page_impressions)' },
          period: { type: 'string', description: 'Period (e.g., day, week, days_28)' }
        },
        required: ['metric']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{page_id}/insights', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForInstagram(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, userId } = dbConfig || {};
    const tools: ToolDefinition[] = [];

    const baseConfig = { type: DataSourceType.Instagram, baseUrl, accessToken, userId };

    tools.push({
      server_id: serverId,
      name: 'get_user',
      description: 'Get user profile',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User ID (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{user_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_user_media',
      description: 'List media for a user',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User ID (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' },
          limit: { type: 'number', description: 'Max items (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{user_id}/media', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_media',
      description: 'Get media by ID',
      inputSchema: {
        type: 'object',
        properties: {
          media_id: { type: 'string', description: 'Media ID' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: ['media_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{media_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_media_comments',
      description: 'List comments for a media item',
      inputSchema: {
        type: 'object',
        properties: {
          media_id: { type: 'string', description: 'Media ID' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' },
          limit: { type: 'number', description: 'Max items (optional)' }
        },
        required: ['media_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{media_id}/comments', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForTikTok(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, userId } = dbConfig || {};
    const tools: ToolDefinition[] = [];

    const baseConfig = { type: DataSourceType.TikTok, baseUrl, accessToken, userId };

    tools.push({
      server_id: serverId,
      name: 'get_user_info',
      description: 'Get user profile',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User ID (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/user/info/', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_videos',
      description: 'List videos for a user',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User ID (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' },
          limit: { type: 'number', description: 'Max items (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/video/list/', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_video',
      description: 'Get video by ID',
      inputSchema: {
        type: 'object',
        properties: {
          video_id: { type: 'string', description: 'Video ID' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: ['video_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/video/query/', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'search_videos',
      description: 'Search videos',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number', description: 'Max items (optional)' }
        },
        required: ['query']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/video/search/', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForNotion(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, notionVersion } = dbConfig || {};
    const tools: ToolDefinition[] = [];

    const baseConfig = { type: DataSourceType.Notion, baseUrl, accessToken, notionVersion };

    tools.push({
      server_id: serverId,
      name: 'search',
      description: 'Search pages and databases',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (optional)' },
          filter: { type: 'object', description: 'Filter object (optional)' },
          sort: { type: 'object', description: 'Sort object (optional)' },
          page_size: { type: 'number', description: 'Page size (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/search', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_page',
      description: 'Get a page by ID',
      inputSchema: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'Page ID' }
        },
        required: ['page_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/pages/{page_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_database',
      description: 'Get a database by ID',
      inputSchema: {
        type: 'object',
        properties: {
          database_id: { type: 'string', description: 'Database ID' }
        },
        required: ['database_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/databases/{database_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'query_database',
      description: 'Query a database',
      inputSchema: {
        type: 'object',
        properties: {
          database_id: { type: 'string', description: 'Database ID' },
          filter: { type: 'object', description: 'Filter object (optional)' },
          sorts: { type: 'array', items: { type: 'object' }, description: 'Sorts (optional)' },
          page_size: { type: 'number', description: 'Page size (optional)' },
          start_cursor: { type: 'string', description: 'Pagination cursor (optional)' }
        },
        required: ['database_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/databases/{database_id}/query', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_page',
      description: 'Create a new page',
      inputSchema: {
        type: 'object',
        properties: {
          parent: { type: 'object', description: 'Parent object' },
          properties: { type: 'object', description: 'Properties object' },
          children: { type: 'array', items: { type: 'object' }, description: 'Children blocks (optional)' }
        },
        required: ['parent', 'properties']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/pages', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'update_page',
      description: 'Update a page',
      inputSchema: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'Page ID' },
          properties: { type: 'object', description: 'Properties object (optional)' },
          archived: { type: 'boolean', description: 'Archive page (optional)' }
        },
        required: ['page_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/pages/{page_id}', method: 'PATCH' }),
      operation: 'UPDATE'
    });

    return tools;
  }

  private generateToolsForTelegram(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, botToken, defaultChatId } = dbConfig || {};
    const tools: ToolDefinition[] = [];

    const baseConfig = { type: DataSourceType.Telegram, baseUrl, botToken, defaultChatId };

    tools.push({
      server_id: serverId,
      name: 'get_me',
      description: 'Get bot information',
      inputSchema: { type: 'object', properties: {}, required: [] },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/getMe', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_updates',
      description: 'Get updates',
      inputSchema: {
        type: 'object',
        properties: {
          offset: { type: 'number', description: 'Update offset (optional)' },
          limit: { type: 'number', description: 'Limit (optional)' },
          timeout: { type: 'number', description: 'Timeout in seconds (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/getUpdates', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'send_message',
      description: 'Send a message',
      inputSchema: {
        type: 'object',
        properties: {
          chat_id: { type: 'string', description: 'Chat ID (optional, default from config)' },
          text: { type: 'string', description: 'Message text' },
          parse_mode: { type: 'string', description: 'Parse mode (optional)' },
          disable_notification: { type: 'boolean', description: 'Disable notification (optional)' }
        },
        required: ['text']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/sendMessage', method: 'POST' }),
      operation: 'INSERT'
    });

    return tools;
  }

  private generateToolsForLinkedIn(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, personId, organizationId } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.LinkedIn, baseUrl, accessToken, personId, organizationId };

    tools.push({
      server_id: serverId,
      name: 'get_profile',
      description: 'Get profile by person ID',
      inputSchema: {
        type: 'object',
        properties: {
          person_id: { type: 'string', description: 'Person ID (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/people/(id:{person_id})', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_organization',
      description: 'Get organization by ID',
      inputSchema: {
        type: 'object',
        properties: {
          organization_id: { type: 'string', description: 'Organization ID (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/organizations/{organization_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_connections',
      description: 'List connections (requires permissions)',
      inputSchema: {
        type: 'object',
        properties: {
          start: { type: 'number', description: 'Start offset (optional)' },
          count: { type: 'number', description: 'Count (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/connections', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_posts',
      description: 'List posts for a member or organization',
      inputSchema: {
        type: 'object',
        properties: {
          author: { type: 'string', description: 'Author URN (optional)' },
          q: { type: 'string', description: 'Query type (optional)' },
          start: { type: 'number', description: 'Start offset (optional)' },
          count: { type: 'number', description: 'Count (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/ugcPosts', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_post',
      description: 'Create a post',
      inputSchema: {
        type: 'object',
        properties: {
          author: { type: 'string', description: 'Author URN' },
          text: { type: 'string', description: 'Post text' },
          visibility: { type: 'string', description: 'Visibility (optional)' },
          lifecycleState: { type: 'string', description: 'Lifecycle state (optional)' }
        },
        required: ['author', 'text']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/ugcPosts', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_post',
      description: 'Get a post by ID',
      inputSchema: {
        type: 'object',
        properties: {
          post_id: { type: 'string', description: 'Post ID' }
        },
        required: ['post_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/ugcPosts/{post_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'search_people',
      description: 'Search people',
      inputSchema: {
        type: 'object',
        properties: {
          keywords: { type: 'string', description: 'Search keywords' },
          start: { type: 'number', description: 'Start offset (optional)' },
          count: { type: 'number', description: 'Count (optional)' }
        },
        required: ['keywords']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/people', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'search_companies',
      description: 'Search companies',
      inputSchema: {
        type: 'object',
        properties: {
          keywords: { type: 'string', description: 'Search keywords' },
          start: { type: 'number', description: 'Start offset (optional)' },
          count: { type: 'number', description: 'Count (optional)' }
        },
        required: ['keywords']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/organizations', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForReddit(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, userAgent, subreddit, username } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Reddit, baseUrl, accessToken, userAgent, subreddit, username };

    tools.push({
      server_id: serverId,
      name: 'get_user',
      description: 'Get user profile',
      inputSchema: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'Username (optional, default from config)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/user/{username}/about', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_subreddit',
      description: 'Get subreddit details',
      inputSchema: {
        type: 'object',
        properties: {
          subreddit: { type: 'string', description: 'Subreddit name (optional, default from config)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/r/{subreddit}/about', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_hot',
      description: 'List hot posts in a subreddit',
      inputSchema: {
        type: 'object',
        properties: {
          subreddit: { type: 'string', description: 'Subreddit name (optional, default from config)' },
          limit: { type: 'number', description: 'Max items (optional)' },
          after: { type: 'string', description: 'Pagination after (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/r/{subreddit}/hot', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_new',
      description: 'List new posts in a subreddit',
      inputSchema: {
        type: 'object',
        properties: {
          subreddit: { type: 'string', description: 'Subreddit name (optional, default from config)' },
          limit: { type: 'number', description: 'Max items (optional)' },
          after: { type: 'string', description: 'Pagination after (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/r/{subreddit}/new', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'search_posts',
      description: 'Search posts in a subreddit',
      inputSchema: {
        type: 'object',
        properties: {
          subreddit: { type: 'string', description: 'Subreddit name (optional, default from config)' },
          q: { type: 'string', description: 'Search query' },
          sort: { type: 'string', description: 'Sort order (optional)' },
          limit: { type: 'number', description: 'Max items (optional)' }
        },
        required: ['q']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/r/{subreddit}/search', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_post',
      description: 'Get a post by ID',
      inputSchema: {
        type: 'object',
        properties: {
          post_id: { type: 'string', description: 'Post ID (e.g., t3_xxxxx)' }
        },
        required: ['post_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/comments/{post_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_post',
      description: 'Create a post',
      inputSchema: {
        type: 'object',
        properties: {
          subreddit: { type: 'string', description: 'Subreddit name (optional, default from config)' },
          title: { type: 'string', description: 'Post title' },
          kind: { type: 'string', description: 'Post kind (link or self)', default: 'self' },
          text: { type: 'string', description: 'Post body (optional)' },
          url: { type: 'string', description: 'Post URL (optional)' }
        },
        required: ['title']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/submit', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'add_comment',
      description: 'Add a comment to a post',
      inputSchema: {
        type: 'object',
        properties: {
          parent_id: { type: 'string', description: 'Parent fullname (e.g., t3_xxxxx or t1_xxxxx)' },
          text: { type: 'string', description: 'Comment text' }
        },
        required: ['parent_id', 'text']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/comment', method: 'POST' }),
      operation: 'INSERT'
    });

    return tools;
  }

  private generateToolsForYouTube(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, accessToken, channelId } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.YouTube, baseUrl, apiKey, accessToken, channelId };

    tools.push({
      server_id: serverId,
      name: 'search',
      description: 'Search videos, channels, or playlists',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query' },
          part: { type: 'string', description: 'Comma-separated parts', default: 'snippet' },
          type: { type: 'string', description: 'Result type (video, channel, playlist, optional)' },
          maxResults: { type: 'number', description: 'Max results (optional)' }
        },
        required: ['q']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/search', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_channel',
      description: 'Get channel details',
      inputSchema: {
        type: 'object',
        properties: {
          channel_id: { type: 'string', description: 'Channel ID (optional, default from config)' },
          forUsername: { type: 'string', description: 'Channel username (optional)' },
          part: { type: 'string', description: 'Comma-separated parts', default: 'snippet,contentDetails,statistics' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/channels', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_channel_videos',
      description: 'List recent channel videos',
      inputSchema: {
        type: 'object',
        properties: {
          channel_id: { type: 'string', description: 'Channel ID (optional, default from config)' },
          order: { type: 'string', description: 'Order (date, rating, viewCount, optional)' },
          maxResults: { type: 'number', description: 'Max results (optional)' },
          part: { type: 'string', description: 'Comma-separated parts', default: 'snippet' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/search?type=video', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_playlists',
      description: 'List channel playlists',
      inputSchema: {
        type: 'object',
        properties: {
          channel_id: { type: 'string', description: 'Channel ID (optional, default from config)' },
          part: { type: 'string', description: 'Comma-separated parts', default: 'snippet,contentDetails' },
          maxResults: { type: 'number', description: 'Max results (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/playlists', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_playlist_items',
      description: 'List playlist items',
      inputSchema: {
        type: 'object',
        properties: {
          playlistId: { type: 'string', description: 'Playlist ID' },
          part: { type: 'string', description: 'Comma-separated parts', default: 'snippet,contentDetails' },
          maxResults: { type: 'number', description: 'Max results (optional)' }
        },
        required: ['playlistId']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/playlistItems', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_video',
      description: 'Get video details',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Video ID' },
          part: { type: 'string', description: 'Comma-separated parts', default: 'snippet,contentDetails,statistics' }
        },
        required: ['id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/videos', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_comments',
      description: 'List comments for a video',
      inputSchema: {
        type: 'object',
        properties: {
          videoId: { type: 'string', description: 'Video ID' },
          part: { type: 'string', description: 'Comma-separated parts', default: 'snippet' },
          maxResults: { type: 'number', description: 'Max results (optional)' }
        },
        required: ['videoId']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/commentThreads', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'post_comment',
      description: 'Post a comment on a video',
      inputSchema: {
        type: 'object',
        properties: {
          videoId: { type: 'string', description: 'Video ID' },
          text: { type: 'string', description: 'Comment text' }
        },
        required: ['videoId', 'text']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/commentThreads?part=snippet', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'rate_video',
      description: 'Rate a video',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Video ID' },
          rating: { type: 'string', description: 'Rating (like, dislike, none)' }
        },
        required: ['id', 'rating']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/videos/rate', method: 'POST' }),
      operation: 'INSERT'
    });

    return tools;
  }

  private generateToolsForWhatsAppBusiness(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, phoneNumberId, businessAccountId } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.WhatsAppBusiness, baseUrl, accessToken, phoneNumberId, businessAccountId };

    tools.push({
      server_id: serverId,
      name: 'send_text_message',
      description: 'Send a text message',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient phone number (E.164)' },
          text: { type: 'string', description: 'Message text' },
          preview_url: { type: 'boolean', description: 'Preview URLs (optional)' }
        },
        required: ['to', 'text']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{phone_number_id}/messages', method: 'POST', messageType: 'text' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'send_template_message',
      description: 'Send a template message',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient phone number (E.164)' },
          template_name: { type: 'string', description: 'Template name' },
          language: { type: 'string', description: 'Language code (e.g., en_US)' },
          components: { type: 'array', items: { type: 'object' }, description: 'Template components (optional)' }
        },
        required: ['to', 'template_name', 'language']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{phone_number_id}/messages', method: 'POST', messageType: 'template' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'send_media_message',
      description: 'Send a media message',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient phone number (E.164)' },
          media_type: { type: 'string', description: 'Media type (image, video, audio, document)' },
          link: { type: 'string', description: 'Media URL' },
          caption: { type: 'string', description: 'Caption (optional)' },
          filename: { type: 'string', description: 'Filename (optional)' }
        },
        required: ['to', 'media_type', 'link']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{phone_number_id}/messages', method: 'POST', messageType: 'media' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_message_templates',
      description: 'List message templates',
      inputSchema: {
        type: 'object',
        properties: {
          business_account_id: { type: 'string', description: 'Business Account ID (optional, default from config)' },
          limit: { type: 'number', description: 'Max results (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{business_account_id}/message_templates', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_phone_numbers',
      description: 'List phone numbers',
      inputSchema: {
        type: 'object',
        properties: {
          business_account_id: { type: 'string', description: 'Business Account ID (optional, default from config)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{business_account_id}/phone_numbers', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_business_profile',
      description: 'Get business profile',
      inputSchema: {
        type: 'object',
        properties: {
          phone_number_id: { type: 'string', description: 'Phone Number ID (optional, default from config)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{phone_number_id}/whatsapp_business_profile', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'set_business_profile',
      description: 'Update business profile',
      inputSchema: {
        type: 'object',
        properties: {
          phone_number_id: { type: 'string', description: 'Phone Number ID (optional, default from config)' },
          about: { type: 'string', description: 'About text (optional)' },
          description: { type: 'string', description: 'Description (optional)' },
          email: { type: 'string', description: 'Email (optional)' },
          website: { type: 'array', items: { type: 'string' }, description: 'Website URLs (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{phone_number_id}/whatsapp_business_profile', method: 'POST' }),
      operation: 'UPDATE'
    });

    return tools;
  }

  private generateToolsForThreads(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, userId } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Threads, baseUrl, accessToken, userId };

    tools.push({
      server_id: serverId,
      name: 'get_user',
      description: 'Get Threads user profile',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User ID (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{user_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_threads',
      description: 'List user threads',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User ID (optional, default from config)' },
          limit: { type: 'number', description: 'Max items (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{user_id}/threads', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_thread',
      description: 'Get a thread by ID',
      inputSchema: {
        type: 'object',
        properties: {
          thread_id: { type: 'string', description: 'Thread ID' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: ['thread_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{thread_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_thread',
      description: 'Create a thread',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: { type: 'string', description: 'User ID (optional, default from config)' },
          text: { type: 'string', description: 'Thread text' },
          media_url: { type: 'string', description: 'Media URL (optional)' }
        },
        required: ['text']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{user_id}/threads', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'delete_thread',
      description: 'Delete a thread',
      inputSchema: {
        type: 'object',
        properties: {
          thread_id: { type: 'string', description: 'Thread ID' }
        },
        required: ['thread_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{thread_id}', method: 'DELETE' }),
      operation: 'DELETE'
    });

    tools.push({
      server_id: serverId,
      name: 'get_thread_insights',
      description: 'Get thread insights',
      inputSchema: {
        type: 'object',
        properties: {
          thread_id: { type: 'string', description: 'Thread ID' },
          metric: { type: 'string', description: 'Comma-separated metrics (optional)' }
        },
        required: ['thread_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{thread_id}/insights', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForOpenAI(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.OpenAI, baseUrl, apiKey, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Create chat completions',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Chat messages' },
          temperature: { type: 'number', description: 'Sampling temperature (optional)' },
          max_tokens: { type: 'number', description: 'Max tokens (optional)' }
        },
        required: ['messages']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/chat/completions', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'embeddings',
      description: 'Create embeddings',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          input: { type: 'string', description: 'Input text' }
        },
        required: ['input']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/embeddings', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'moderations',
      description: 'Moderate text',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional)' },
          input: { type: 'string', description: 'Input text' }
        },
        required: ['input']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/moderations', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'images',
      description: 'Generate images',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional)' },
          prompt: { type: 'string', description: 'Image prompt' },
          n: { type: 'number', description: 'Number of images (optional)' },
          size: { type: 'string', description: 'Image size (optional)' }
        },
        required: ['prompt']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/images/generations', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'audio_speech',
      description: 'Text to speech',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional)' },
          input: { type: 'string', description: 'Text to speak' },
          voice: { type: 'string', description: 'Voice name (optional)' },
          format: { type: 'string', description: 'Audio format (optional)' }
        },
        required: ['input']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/audio/speech', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'audio_transcriptions',
      description: 'Transcribe audio',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional)' },
          file_path: { type: 'string', description: 'Path to audio file' },
          language: { type: 'string', description: 'Language (optional)' },
          prompt: { type: 'string', description: 'Prompt (optional)' }
        },
        required: ['file_path']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/audio/transcriptions', method: 'POST', multipart: true }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'audio_translations',
      description: 'Translate audio',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional)' },
          file_path: { type: 'string', description: 'Path to audio file' },
          prompt: { type: 'string', description: 'Prompt (optional)' }
        },
        required: ['file_path']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/audio/translations', method: 'POST', multipart: true }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForClaude(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, apiVersion, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Claude, baseUrl, apiKey, apiVersion, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Create messages',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Messages array' },
          max_tokens: { type: 'number', description: 'Max tokens' },
          temperature: { type: 'number', description: 'Sampling temperature (optional)' }
        },
        required: ['messages', 'max_tokens']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/messages', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForGemini(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Gemini, baseUrl, apiKey, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Generate content',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          contents: { type: 'array', items: { type: 'object' }, description: 'Contents array' },
          generationConfig: { type: 'object', description: 'Generation config (optional)' },
          safetySettings: { type: 'array', items: { type: 'object' }, description: 'Safety settings (optional)' }
        },
        required: ['contents']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/models/{model}:generateContent', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'embeddings',
      description: 'Create embeddings',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          content: { type: 'object', description: 'Content object' }
        },
        required: ['content']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/models/{model}:embedContent', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForGrok(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Grok, baseUrl, apiKey, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Create chat completions',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Chat messages' },
          temperature: { type: 'number', description: 'Sampling temperature (optional)' },
          max_tokens: { type: 'number', description: 'Max tokens (optional)' }
        },
        required: ['messages']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/chat/completions', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'images',
      description: 'Generate images',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional)' },
          prompt: { type: 'string', description: 'Image prompt' },
          n: { type: 'number', description: 'Number of images (optional)' },
          size: { type: 'string', description: 'Image size (optional)' }
        },
        required: ['prompt']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/images/generations', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForFalAI(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.FalAI, baseUrl, apiKey };
    const queueBase = 'https://queue.fal.run';

    tools.push({
      server_id: serverId,
      name: 'run_model',
      description: 'Run a fal.ai model',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model identifier (e.g., fal-ai/fast-sdxl)' },
          input: { type: 'object', description: 'Model input payload' }
        },
        required: ['model', 'input']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{model}', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'run_model_async',
      description: 'Run a fal.ai model via the queue',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model identifier (e.g., fal-ai/fast-sdxl)' },
          subpath: { type: 'string', description: 'Optional subpath (e.g., dev)' },
          input: { type: 'object', description: 'Model input payload' }
        },
        required: ['model', 'input']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, baseUrl: queueBase, endpoint: '/{model}/{subpath}', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_run_status',
      description: 'Get the status of an async run',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model identifier (e.g., fal-ai/fast-sdxl)' },
          request_id: { type: 'string', description: 'Request ID' }
        },
        required: ['model', 'request_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, baseUrl: queueBase, endpoint: '/{model}/requests/{request_id}/status', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_run_result',
      description: 'Get the result of an async run',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model identifier (e.g., fal-ai/fast-sdxl)' },
          request_id: { type: 'string', description: 'Request ID' }
        },
        required: ['model', 'request_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, baseUrl: queueBase, endpoint: '/{model}/requests/{request_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'cancel_run',
      description: 'Cancel an async run',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model identifier (e.g., fal-ai/fast-sdxl)' },
          request_id: { type: 'string', description: 'Request ID' }
        },
        required: ['model', 'request_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, baseUrl: queueBase, endpoint: '/{model}/requests/{request_id}/cancel', method: 'PUT' }),
      operation: 'UPDATE'
    });

    return tools;
  }

  private generateToolsForHuggingFace(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.HuggingFace, baseUrl, apiKey, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat_completion',
      description: 'Create chat completions',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Chat messages' },
          temperature: { type: 'number', description: 'Sampling temperature (optional)' },
          max_tokens: { type: 'number', description: 'Max tokens (optional)' }
        },
        required: ['messages']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/chat/completions', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForLlama(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Llama, baseUrl, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Chat with model',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Chat messages' },
          stream: { type: 'boolean', description: 'Stream response (optional)' }
        },
        required: ['messages']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/chat', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'generate',
      description: 'Generate text',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          prompt: { type: 'string', description: 'Prompt' },
          stream: { type: 'boolean', description: 'Stream response (optional)' }
        },
        required: ['prompt']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/generate', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'embeddings',
      description: 'Create embeddings',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          prompt: { type: 'string', description: 'Input text' }
        },
        required: ['prompt']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/embeddings', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForDeepSeek(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.DeepSeek, baseUrl, apiKey, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Create chat completions',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Chat messages' },
          temperature: { type: 'number', description: 'Sampling temperature (optional)' },
          max_tokens: { type: 'number', description: 'Max tokens (optional)' }
        },
        required: ['messages']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/chat/completions', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'embeddings',
      description: 'Create embeddings',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          input: { type: 'string', description: 'Input text' }
        },
        required: ['input']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/embeddings', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForAzureOpenAI(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, apiVersion, deployment } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.AzureOpenAI, baseUrl, apiKey, apiVersion, deployment };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Create chat completions',
      inputSchema: {
        type: 'object',
        properties: {
          deployment: { type: 'string', description: 'Deployment name (optional, default from config)' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Chat messages' },
          temperature: { type: 'number', description: 'Sampling temperature (optional)' },
          max_tokens: { type: 'number', description: 'Max tokens (optional)' }
        },
        required: ['messages']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/openai/deployments/{deployment}/chat/completions', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'embeddings',
      description: 'Create embeddings',
      inputSchema: {
        type: 'object',
        properties: {
          deployment: { type: 'string', description: 'Deployment name (optional, default from config)' },
          input: { type: 'string', description: 'Input text' }
        },
        required: ['input']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/openai/deployments/{deployment}/embeddings', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForMistral(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Mistral, baseUrl, apiKey, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Create chat completions',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Chat messages' },
          temperature: { type: 'number', description: 'Sampling temperature (optional)' },
          max_tokens: { type: 'number', description: 'Max tokens (optional)' }
        },
        required: ['messages']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/chat/completions', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'embeddings',
      description: 'Create embeddings',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          input: { type: 'string', description: 'Input text' }
        },
        required: ['input']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/embeddings', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForCohere(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Cohere, baseUrl, apiKey, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Chat with Cohere',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          message: { type: 'string', description: 'User message' },
          chat_history: { type: 'array', items: { type: 'object' }, description: 'Chat history (optional)' },
          temperature: { type: 'number', description: 'Sampling temperature (optional)' },
          max_tokens: { type: 'number', description: 'Max tokens (optional)' }
        },
        required: ['message']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/chat', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'embeddings',
      description: 'Create embeddings',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          texts: { type: 'array', items: { type: 'string' }, description: 'Texts array' },
          input_type: { type: 'string', description: 'Input type (optional)' }
        },
        required: ['texts']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/embed', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForPerplexity(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Perplexity, baseUrl, apiKey, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Create chat completions',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Chat messages' },
          temperature: { type: 'number', description: 'Sampling temperature (optional)' },
          max_tokens: { type: 'number', description: 'Max tokens (optional)' }
        },
        required: ['messages']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/chat/completions', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForTogether(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Together, baseUrl, apiKey, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Create chat completions',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Chat messages' },
          temperature: { type: 'number', description: 'Sampling temperature (optional)' },
          max_tokens: { type: 'number', description: 'Max tokens (optional)' }
        },
        required: ['messages']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/chat/completions', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'embeddings',
      description: 'Create embeddings',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          input: { type: 'string', description: 'Input text' }
        },
        required: ['input']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/embeddings', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForFireworks(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Fireworks, baseUrl, apiKey, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Create chat completions',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Chat messages' },
          temperature: { type: 'number', description: 'Sampling temperature (optional)' },
          max_tokens: { type: 'number', description: 'Max tokens (optional)' }
        },
        required: ['messages']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/chat/completions', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'embeddings',
      description: 'Create embeddings',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          input: { type: 'string', description: 'Input text' }
        },
        required: ['input']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/embeddings', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForGroq(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Groq, baseUrl, apiKey, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Create chat completions',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Chat messages' },
          temperature: { type: 'number', description: 'Sampling temperature (optional)' },
          max_tokens: { type: 'number', description: 'Max tokens (optional)' }
        },
        required: ['messages']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/chat/completions', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForOpenRouter(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, defaultModel } = dbConfig || {};
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.OpenRouter, baseUrl, apiKey, defaultModel };

    tools.push({
      server_id: serverId,
      name: 'chat',
      description: 'Create chat completions',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name (optional, default from config)' },
          messages: { type: 'array', items: { type: 'object' }, description: 'Chat messages' },
          temperature: { type: 'number', description: 'Sampling temperature (optional)' },
          max_tokens: { type: 'number', description: 'Max tokens (optional)' }
        },
        required: ['messages']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/chat/completions', method: 'POST' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForDropbox(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, contentBaseUrl, accessToken } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Dropbox, baseUrl, contentBaseUrl, accessToken };

    tools.push({
      server_id: serverId,
      name: 'list_folder',
      description: 'List files/folders at a path',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Folder path (empty for root)', default: '' },
          recursive: { type: 'boolean', description: 'List recursively', default: false },
          include_media_info: { type: 'boolean', description: 'Include media info', default: false },
          include_deleted: { type: 'boolean', description: 'Include deleted entries', default: false },
          include_has_explicit_shared_members: { type: 'boolean', description: 'Include shared members', default: false },
          include_mounted_folders: { type: 'boolean', description: 'Include mounted folders', default: true },
          limit: { type: 'number', description: 'Max entries', default: 2000 }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/files/list_folder', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_metadata',
      description: 'Get metadata for a file or folder',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to file or folder' },
          include_media_info: { type: 'boolean', description: 'Include media info', default: false },
          include_deleted: { type: 'boolean', description: 'Include deleted entries', default: false },
          include_has_explicit_shared_members: { type: 'boolean', description: 'Include shared members', default: false }
        },
        required: ['path']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/files/get_metadata', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'search',
      description: 'Search for files and folders',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          path: { type: 'string', description: 'Folder path (optional)' },
          max_results: { type: 'number', description: 'Max results', default: 100 }
        },
        required: ['query']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/files/search_v2', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'download',
      description: 'Download a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' }
        },
        required: ['path']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/files/download', method: 'POST' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'upload',
      description: 'Upload a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Destination file path' },
          contents: { type: 'string', description: 'File contents (UTF-8 text)' },
          mode: { type: 'string', description: 'Write mode (add, overwrite)', default: 'add' },
          autorename: { type: 'boolean', description: 'Auto-rename on conflict', default: true },
          mute: { type: 'boolean', description: 'Mute notifications', default: false },
          strict_conflict: { type: 'boolean', description: 'Strict conflict handling', default: false }
        },
        required: ['path', 'contents']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/files/upload', method: 'POST' }),
      operation: 'INSERT'
    });

    return tools;
  }

  private generateToolsForN8n(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.N8n, baseUrl, apiKey };

    tools.push({
      server_id: serverId,
      name: 'list_workflows',
      description: 'List workflows',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max results (optional)' },
          offset: { type: 'number', description: 'Offset (optional)' }
        }
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/workflows', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_workflow',
      description: 'Get workflow details',
      inputSchema: {
        type: 'object',
        properties: {
          workflow_id: { type: 'string', description: 'Workflow ID' }
        },
        required: ['workflow_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/workflows/{workflow_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'activate_workflow',
      description: 'Activate a workflow',
      inputSchema: {
        type: 'object',
        properties: {
          workflow_id: { type: 'string', description: 'Workflow ID' }
        },
        required: ['workflow_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/workflows/{workflow_id}/activate', method: 'POST' }),
      operation: 'UPDATE'
    });

    tools.push({
      server_id: serverId,
      name: 'deactivate_workflow',
      description: 'Deactivate a workflow',
      inputSchema: {
        type: 'object',
        properties: {
          workflow_id: { type: 'string', description: 'Workflow ID' }
        },
        required: ['workflow_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/workflows/{workflow_id}/deactivate', method: 'POST' }),
      operation: 'UPDATE'
    });

    tools.push({
      server_id: serverId,
      name: 'list_executions',
      description: 'List executions',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max results (optional)' },
          status: { type: 'string', description: 'Status filter (optional)' }
        }
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/executions', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForSupabase(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Supabase, baseUrl, apiKey };

    tools.push({
      server_id: serverId,
      name: 'select_rows',
      description: 'Select rows from a table',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name' },
          select: { type: 'string', description: 'Select columns (comma-separated, optional)' },
          filters: { type: 'object', description: 'Filters object (optional)' },
          order: { type: 'string', description: 'Order by (optional)' },
          limit: { type: 'number', description: 'Limit (optional)' },
          offset: { type: 'number', description: 'Offset (optional)' }
        },
        required: ['table']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{table}', method: 'GET', op: 'select' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'insert_row',
      description: 'Insert a row into a table',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name' },
          data: { type: 'object', description: 'Row data' }
        },
        required: ['table', 'data']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{table}', method: 'POST', op: 'insert' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'update_rows',
      description: 'Update rows in a table',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name' },
          data: { type: 'object', description: 'Fields to update' },
          filters: { type: 'object', description: 'Filters object (required to avoid full-table updates)' }
        },
        required: ['table', 'data', 'filters']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{table}', method: 'PATCH', op: 'update' }),
      operation: 'UPDATE'
    });

    tools.push({
      server_id: serverId,
      name: 'delete_rows',
      description: 'Delete rows in a table',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name' },
          filters: { type: 'object', description: 'Filters object (required to avoid full-table deletes)' }
        },
        required: ['table', 'filters']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{table}', method: 'DELETE', op: 'delete' }),
      operation: 'DELETE'
    });

    return tools;
  }

  private generateToolsForNpm(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Npm, baseUrl };

    tools.push({
      server_id: serverId,
      name: 'search',
      description: 'Search packages',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Search text' },
          size: { type: 'number', description: 'Page size (optional)' },
          from: { type: 'number', description: 'Offset (optional)' }
        },
        required: ['text']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/-/v1/search', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_package',
      description: 'Get package metadata',
      inputSchema: {
        type: 'object',
        properties: {
          package: { type: 'string', description: 'Package name' }
        },
        required: ['package']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{package}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_version',
      description: 'Get package version metadata',
      inputSchema: {
        type: 'object',
        properties: {
          package: { type: 'string', description: 'Package name' },
          version: { type: 'string', description: 'Version' }
        },
        required: ['package', 'version']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{package}/{version}', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForNuget(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, registrationBaseUrl } = dbConfig;
    const tools: ToolDefinition[] = [];
    const searchConfig = { type: DataSourceType.Nuget, baseUrl, registrationBaseUrl };
    const regBase = registrationBaseUrl || `${String(baseUrl || '').replace(/\/$/, '')}/registration5-semver1`;
    const regConfig = { type: DataSourceType.Nuget, baseUrl: regBase, registrationBaseUrl: regBase };

    tools.push({
      server_id: serverId,
      name: 'search',
      description: 'Search packages',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Query' },
          skip: { type: 'number', description: 'Skip (optional)' },
          take: { type: 'number', description: 'Take (optional)' },
          prerelease: { type: 'boolean', description: 'Include prerelease (optional)' }
        },
        required: ['q']
      },
      sqlQuery: JSON.stringify({ ...searchConfig, endpoint: '/query', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_package',
      description: 'Get package metadata',
      inputSchema: {
        type: 'object',
        properties: {
          package_id: { type: 'string', description: 'Package ID' }
        },
        required: ['package_id']
      },
      sqlQuery: JSON.stringify({ ...regConfig, endpoint: '/{package_id}/index.json', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_versions',
      description: 'Get package versions',
      inputSchema: {
        type: 'object',
        properties: {
          package_id: { type: 'string', description: 'Package ID' }
        },
        required: ['package_id']
      },
      sqlQuery: JSON.stringify({ ...regConfig, endpoint: '/{package_id}/index.json', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForMaven(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Maven, baseUrl };

    tools.push({
      server_id: serverId,
      name: 'search',
      description: 'Search Maven artifacts',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Query (e.g., g:org.slf4j AND a:slf4j-api)' },
          rows: { type: 'number', description: 'Rows (optional)' },
          start: { type: 'number', description: 'Start (optional)' }
        },
        required: ['q']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForGradle(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Gradle, baseUrl };

    tools.push({
      server_id: serverId,
      name: 'search_plugins',
      description: 'Search plugins',
      inputSchema: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query' },
          page: { type: 'number', description: 'Page (optional)' },
          per_page: { type: 'number', description: 'Page size (optional)' }
        },
        required: ['q']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/search/plugins', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_plugin_versions',
      description: 'Get plugin versions',
      inputSchema: {
        type: 'object',
        properties: {
          plugin_id: { type: 'string', description: 'Plugin ID (e.g., com.github.johnrengelman.shadow)' }
        },
        required: ['plugin_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/plugins/{plugin_id}/versions', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForNexus(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, username, password, apiKey } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Nexus, baseUrl, username, password, apiKey };

    tools.push({
      server_id: serverId,
      name: 'list_repositories',
      description: 'List repositories',
      inputSchema: { type: 'object', properties: {} },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repositories', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_components',
      description: 'List components',
      inputSchema: {
        type: 'object',
        properties: {
          repository: { type: 'string', description: 'Repository name (optional)' }
        }
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/components', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'search',
      description: 'Search components',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Component name (optional)' },
          group: { type: 'string', description: 'Group (optional)' },
          version: { type: 'string', description: 'Version (optional)' },
          repository: { type: 'string', description: 'Repository name (optional)' }
        }
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/search', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForTrello(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, apiToken, memberId, boardId, listId } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Trello, baseUrl, apiKey, apiToken, memberId, boardId, listId };

    tools.push({
      server_id: serverId,
      name: 'get_member',
      description: 'Get member details',
      inputSchema: {
        type: 'object',
        properties: {
          member_id: { type: 'string', description: 'Member ID or username (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/members/{member_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_boards',
      description: 'List boards for a member',
      inputSchema: {
        type: 'object',
        properties: {
          member_id: { type: 'string', description: 'Member ID or username (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/members/{member_id}/boards', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_board',
      description: 'Get board by ID',
      inputSchema: {
        type: 'object',
        properties: {
          board_id: { type: 'string', description: 'Board ID (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/boards/{board_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_lists',
      description: 'List lists on a board',
      inputSchema: {
        type: 'object',
        properties: {
          board_id: { type: 'string', description: 'Board ID (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/boards/{board_id}/lists', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_cards',
      description: 'List cards on a list',
      inputSchema: {
        type: 'object',
        properties: {
          list_id: { type: 'string', description: 'List ID (optional, default from config)' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/lists/{list_id}/cards', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_card',
      description: 'Get card by ID',
      inputSchema: {
        type: 'object',
        properties: {
          card_id: { type: 'string', description: 'Card ID' },
          fields: { type: 'string', description: 'Comma-separated fields (optional)' }
        },
        required: ['card_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/cards/{card_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_card',
      description: 'Create a card in a list',
      inputSchema: {
        type: 'object',
        properties: {
          list_id: { type: 'string', description: 'List ID (optional, default from config)' },
          name: { type: 'string', description: 'Card name' },
          desc: { type: 'string', description: 'Card description (optional)' },
          pos: { type: 'string', description: 'Card position (top, bottom, or number)' }
        },
        required: ['name']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/cards', method: 'POST' }),
      operation: 'INSERT'
    });

    return tools;
  }

  private generateToolsForGitLab(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, token, projectId } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.GitLab, baseUrl, token, projectId };

    tools.push({
      server_id: serverId,
      name: 'list_projects',
      description: 'List projects for the authenticated user',
      inputSchema: {
        type: 'object',
        properties: {
          membership: { type: 'boolean', description: 'Only projects where user is a member', default: true },
          owned: { type: 'boolean', description: 'Only owned projects', default: false },
          search: { type: 'string', description: 'Search query (optional)' },
          per_page: { type: 'number', description: 'Results per page', default: 20 },
          page: { type: 'number', description: 'Page number', default: 1 }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/projects', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_project',
      description: 'Get a project by ID or URL-encoded path',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Project ID or path (optional, default from config)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/projects/{project_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_issues',
      description: 'List issues for a project',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Project ID or path (optional, default from config)' },
          state: { type: 'string', description: 'Issue state (opened, closed, all)', default: 'opened' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/projects/{project_id}/issues', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_issue',
      description: 'Create an issue in a project',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Project ID or path (optional, default from config)' },
          title: { type: 'string', description: 'Issue title' },
          description: { type: 'string', description: 'Issue description (optional)' }
        },
        required: ['title']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/projects/{project_id}/issues', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_merge_requests',
      description: 'List merge requests for a project',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Project ID or path (optional, default from config)' },
          state: { type: 'string', description: 'MR state (opened, closed, merged, all)', default: 'opened' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/projects/{project_id}/merge_requests', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_file',
      description: 'Get file contents from repository',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Project ID or path (optional, default from config)' },
          file_path: { type: 'string', description: 'File path' },
          ref: { type: 'string', description: 'Branch/tag/commit (default: main)' }
        },
        required: ['file_path']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/projects/{project_id}/repository/files/{file_path}', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForBitbucket(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, username, appPassword, workspace, repoSlug } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Bitbucket, baseUrl, username, appPassword, workspace, repoSlug };

    tools.push({
      server_id: serverId,
      name: 'list_repos',
      description: 'List repositories in a workspace',
      inputSchema: {
        type: 'object',
        properties: {
          workspace: { type: 'string', description: 'Workspace (optional, default from config)' },
          pagelen: { type: 'number', description: 'Page length', default: 20 },
          page: { type: 'number', description: 'Page number', default: 1 }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repositories/{workspace}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_repo',
      description: 'Get repository details',
      inputSchema: {
        type: 'object',
        properties: {
          workspace: { type: 'string', description: 'Workspace (optional, default from config)' },
          repo_slug: { type: 'string', description: 'Repository slug (optional, default from config)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repositories/{workspace}/{repo_slug}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_issues',
      description: 'List issues for a repository',
      inputSchema: {
        type: 'object',
        properties: {
          workspace: { type: 'string', description: 'Workspace (optional, default from config)' },
          repo_slug: { type: 'string', description: 'Repository slug (optional, default from config)' },
          state: { type: 'string', description: 'Issue state (new, open, resolved, closed)', default: 'open' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repositories/{workspace}/{repo_slug}/issues', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_issue',
      description: 'Create an issue in a repository',
      inputSchema: {
        type: 'object',
        properties: {
          workspace: { type: 'string', description: 'Workspace (optional, default from config)' },
          repo_slug: { type: 'string', description: 'Repository slug (optional, default from config)' },
          title: { type: 'string', description: 'Issue title' },
          content: { type: 'string', description: 'Issue content (optional)' }
        },
        required: ['title']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repositories/{workspace}/{repo_slug}/issues', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_pull_requests',
      description: 'List pull requests for a repository',
      inputSchema: {
        type: 'object',
        properties: {
          workspace: { type: 'string', description: 'Workspace (optional, default from config)' },
          repo_slug: { type: 'string', description: 'Repository slug (optional, default from config)' },
          state: { type: 'string', description: 'PR state (OPEN, MERGED, DECLINED)', default: 'OPEN' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repositories/{workspace}/{repo_slug}/pullrequests', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_file',
      description: 'Get file contents from repository',
      inputSchema: {
        type: 'object',
        properties: {
          workspace: { type: 'string', description: 'Workspace (optional, default from config)' },
          repo_slug: { type: 'string', description: 'Repository slug (optional, default from config)' },
          path: { type: 'string', description: 'File path' },
          ref: { type: 'string', description: 'Branch/commit (default: main)' }
        },
        required: ['path']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repositories/{workspace}/{repo_slug}/src/{ref}/{path}', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForGDrive(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, rootFolderId } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.GDrive, baseUrl, accessToken, rootFolderId };

    tools.push({
      server_id: serverId,
      name: 'list_files',
      description: 'List files in a folder',
      inputSchema: {
        type: 'object',
        properties: {
          folder_id: { type: 'string', description: 'Folder ID (optional, default from config)' },
          q: { type: 'string', description: 'Search query (optional)' },
          pageSize: { type: 'number', description: 'Page size', default: 20 },
          pageToken: { type: 'string', description: 'Page token (optional)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/files', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_file',
      description: 'Get file metadata by ID',
      inputSchema: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'File ID' },
          fields: { type: 'string', description: 'Fields to include (optional)' }
        },
        required: ['file_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/files/{file_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'download_file',
      description: 'Download file content',
      inputSchema: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'File ID' }
        },
        required: ['file_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/files/{file_id}?alt=media', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'upload_file',
      description: 'Upload a file (simple upload)',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'File name' },
          mimeType: { type: 'string', description: 'MIME type (optional)' },
          contents: { type: 'string', description: 'File contents (UTF-8 text)' },
          folder_id: { type: 'string', description: 'Parent folder ID (optional)' }
        },
        required: ['name', 'contents']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/files', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_folder',
      description: 'Create a folder',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Folder name' },
          parent_id: { type: 'string', description: 'Parent folder ID (optional)' }
        },
        required: ['name']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/files', method: 'POST' }),
      operation: 'INSERT'
    });

    return tools;
  }

  private generateToolsForGoogleCalendar(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, calendarId } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.GoogleCalendar, baseUrl, accessToken, calendarId };

    tools.push({
      server_id: serverId,
      name: 'list_calendars',
      description: 'List calendars for the user',
      inputSchema: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Max results (optional)' }
        }
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/users/me/calendarList', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_events',
      description: 'List events in a calendar',
      inputSchema: {
        type: 'object',
        properties: {
          calendar_id: { type: 'string', description: 'Calendar ID (optional, default from config)' },
          timeMin: { type: 'string', description: 'RFC3339 start time (optional)' },
          timeMax: { type: 'string', description: 'RFC3339 end time (optional)' },
          maxResults: { type: 'number', description: 'Max results (optional)' }
        }
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/calendars/{calendar_id}/events', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_event',
      description: 'Get event details',
      inputSchema: {
        type: 'object',
        properties: {
          calendar_id: { type: 'string', description: 'Calendar ID (optional, default from config)' },
          event_id: { type: 'string', description: 'Event ID' }
        },
        required: ['event_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/calendars/{calendar_id}/events/{event_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_event',
      description: 'Create a calendar event',
      inputSchema: {
        type: 'object',
        properties: {
          calendar_id: { type: 'string', description: 'Calendar ID (optional, default from config)' },
          summary: { type: 'string', description: 'Event summary/title' },
          start: { type: 'object', description: 'Start time object' },
          end: { type: 'object', description: 'End time object' },
          description: { type: 'string', description: 'Event description (optional)' },
          location: { type: 'string', description: 'Event location (optional)' }
        },
        required: ['summary', 'start', 'end']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/calendars/{calendar_id}/events', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'update_event',
      description: 'Update a calendar event',
      inputSchema: {
        type: 'object',
        properties: {
          calendar_id: { type: 'string', description: 'Calendar ID (optional, default from config)' },
          event_id: { type: 'string', description: 'Event ID' },
          summary: { type: 'string', description: 'Event summary/title (optional)' },
          start: { type: 'object', description: 'Start time object (optional)' },
          end: { type: 'object', description: 'End time object (optional)' },
          description: { type: 'string', description: 'Event description (optional)' },
          location: { type: 'string', description: 'Event location (optional)' }
        },
        required: ['event_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/calendars/{calendar_id}/events/{event_id}', method: 'PATCH' }),
      operation: 'UPDATE'
    });

    return tools;
  }

  private generateToolsForGoogleDocs(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, documentId } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.GoogleDocs, baseUrl, accessToken, documentId };

    tools.push({
      server_id: serverId,
      name: 'get_document',
      description: 'Get document content',
      inputSchema: {
        type: 'object',
        properties: {
          document_id: { type: 'string', description: 'Document ID (optional, default from config)' }
        }
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/documents/{document_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_document',
      description: 'Create a new document',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Document title' }
        },
        required: ['title']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/documents', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'batch_update',
      description: 'Batch update a document',
      inputSchema: {
        type: 'object',
        properties: {
          document_id: { type: 'string', description: 'Document ID (optional, default from config)' },
          requests: { type: 'array', description: 'Batch update requests' }
        },
        required: ['requests']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/documents/{document_id}:batchUpdate', method: 'POST' }),
      operation: 'UPDATE'
    });

    return tools;
  }

  private generateToolsForGoogleSheets(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, spreadsheetId } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.GoogleSheets, baseUrl, accessToken, spreadsheetId };

    tools.push({
      server_id: serverId,
      name: 'get_spreadsheet',
      description: 'Get spreadsheet metadata',
      inputSchema: {
        type: 'object',
        properties: {
          spreadsheet_id: { type: 'string', description: 'Spreadsheet ID (optional, default from config)' },
          includeGridData: { type: 'boolean', description: 'Include grid data', default: false }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/spreadsheets/{spreadsheet_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_values',
      description: 'Get values from a range',
      inputSchema: {
        type: 'object',
        properties: {
          spreadsheet_id: { type: 'string', description: 'Spreadsheet ID (optional, default from config)' },
          range: { type: 'string', description: 'A1 notation range (e.g., Sheet1!A1:C10)' },
          majorDimension: { type: 'string', description: 'ROWS or COLUMNS (optional)' }
        },
        required: ['range']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/spreadsheets/{spreadsheet_id}/values/{range}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'update_values',
      description: 'Update values in a range',
      inputSchema: {
        type: 'object',
        properties: {
          spreadsheet_id: { type: 'string', description: 'Spreadsheet ID (optional, default from config)' },
          range: { type: 'string', description: 'A1 notation range' },
          values: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: '2D array of values' },
          valueInputOption: { type: 'string', description: 'RAW or USER_ENTERED', default: 'RAW' }
        },
        required: ['range', 'values']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/spreadsheets/{spreadsheet_id}/values/{range}:update', method: 'PUT' }),
      operation: 'UPDATE'
    });

    tools.push({
      server_id: serverId,
      name: 'append_values',
      description: 'Append values to a range',
      inputSchema: {
        type: 'object',
        properties: {
          spreadsheet_id: { type: 'string', description: 'Spreadsheet ID (optional, default from config)' },
          range: { type: 'string', description: 'A1 notation range' },
          values: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: '2D array of values' },
          valueInputOption: { type: 'string', description: 'RAW or USER_ENTERED', default: 'RAW' }
        },
        required: ['range', 'values']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/spreadsheets/{spreadsheet_id}/values/{range}:append', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_spreadsheet',
      description: 'Create a new spreadsheet',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Spreadsheet title' }
        },
        required: ['title']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/spreadsheets', method: 'POST' }),
      operation: 'INSERT'
    });

    return tools;
  }

  private generateToolsForAirtable(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, baseId, tableName } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Airtable, baseUrl, accessToken, baseId, tableName };

    tools.push({
      server_id: serverId,
      name: 'list_records',
      description: 'List records in a table',
      inputSchema: {
        type: 'object',
        properties: {
          base_id: { type: 'string', description: 'Base ID (optional, default from config)' },
          table_name: { type: 'string', description: 'Table name (optional, default from config)' },
          maxRecords: { type: 'number', description: 'Max records (optional)' },
          view: { type: 'string', description: 'View name (optional)' }
        }
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{base_id}/{table_name}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_record',
      description: 'Get a record by ID',
      inputSchema: {
        type: 'object',
        properties: {
          base_id: { type: 'string', description: 'Base ID (optional, default from config)' },
          table_name: { type: 'string', description: 'Table name (optional, default from config)' },
          record_id: { type: 'string', description: 'Record ID' }
        },
        required: ['record_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{base_id}/{table_name}/{record_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_record',
      description: 'Create a record',
      inputSchema: {
        type: 'object',
        properties: {
          base_id: { type: 'string', description: 'Base ID (optional, default from config)' },
          table_name: { type: 'string', description: 'Table name (optional, default from config)' },
          fields: { type: 'object', description: 'Record fields' }
        },
        required: ['fields']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{base_id}/{table_name}', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'update_record',
      description: 'Update a record',
      inputSchema: {
        type: 'object',
        properties: {
          base_id: { type: 'string', description: 'Base ID (optional, default from config)' },
          table_name: { type: 'string', description: 'Table name (optional, default from config)' },
          record_id: { type: 'string', description: 'Record ID' },
          fields: { type: 'object', description: 'Fields to update' }
        },
        required: ['record_id', 'fields']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{base_id}/{table_name}/{record_id}', method: 'PATCH' }),
      operation: 'UPDATE'
    });

    tools.push({
      server_id: serverId,
      name: 'delete_record',
      description: 'Delete a record',
      inputSchema: {
        type: 'object',
        properties: {
          base_id: { type: 'string', description: 'Base ID (optional, default from config)' },
          table_name: { type: 'string', description: 'Table name (optional, default from config)' },
          record_id: { type: 'string', description: 'Record ID' }
        },
        required: ['record_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/{base_id}/{table_name}/{record_id}', method: 'DELETE' }),
      operation: 'DELETE'
    });

    return tools;
  }

  private generateToolsForAsana(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, workspaceId } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Asana, baseUrl, accessToken, workspaceId };

    tools.push({
      server_id: serverId,
      name: 'list_projects',
      description: 'List projects in a workspace',
      inputSchema: {
        type: 'object',
        properties: {
          workspace_id: { type: 'string', description: 'Workspace ID (optional, default from config)' },
          limit: { type: 'number', description: 'Max results (optional)' }
        }
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/projects', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_tasks',
      description: 'List tasks in a project',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Project ID' },
          limit: { type: 'number', description: 'Max results (optional)' }
        },
        required: ['project_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/tasks', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_task',
      description: 'Get a task by ID',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID' }
        },
        required: ['task_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/tasks/{task_id}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_task',
      description: 'Create a task',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Task name' },
          notes: { type: 'string', description: 'Task notes (optional)' },
          workspace_id: { type: 'string', description: 'Workspace ID (optional, default from config)' },
          projects: { type: 'array', items: { type: 'string' }, description: 'Project IDs (optional)' }
        },
        required: ['name']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/tasks', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'update_task',
      description: 'Update a task',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID' },
          name: { type: 'string', description: 'Task name (optional)' },
          notes: { type: 'string', description: 'Task notes (optional)' },
          completed: { type: 'boolean', description: 'Completed flag (optional)' }
        },
        required: ['task_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/tasks/{task_id}', method: 'PUT' }),
      operation: 'UPDATE'
    });

    return tools;
  }

  private generateToolsForMonday(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Monday, baseUrl, apiKey };

    tools.push({
      server_id: serverId,
      name: 'query',
      description: 'Run a GraphQL query',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'GraphQL query string' },
          variables: { type: 'object', description: 'Variables (optional)' }
        },
        required: ['query']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '', method: 'POST', op: 'query' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'mutate',
      description: 'Run a GraphQL mutation',
      inputSchema: {
        type: 'object',
        properties: {
          mutation: { type: 'string', description: 'GraphQL mutation string' },
          variables: { type: 'object', description: 'Variables (optional)' }
        },
        required: ['mutation']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '', method: 'POST', op: 'mutation' }),
      operation: 'UPDATE'
    });

    return tools;
  }

  private generateToolsForClickUp(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, teamId } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.ClickUp, baseUrl, accessToken, teamId };

    tools.push({
      server_id: serverId,
      name: 'list_teams',
      description: 'List teams',
      inputSchema: { type: 'object', properties: {} },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/team', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_spaces',
      description: 'List spaces in a team',
      inputSchema: {
        type: 'object',
        properties: {
          team_id: { type: 'string', description: 'Team ID (optional, default from config)' }
        }
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/team/{team_id}/space', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_tasks',
      description: 'List tasks in a list',
      inputSchema: {
        type: 'object',
        properties: {
          list_id: { type: 'string', description: 'List ID' }
        },
        required: ['list_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/list/{list_id}/task', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_task',
      description: 'Create a task',
      inputSchema: {
        type: 'object',
        properties: {
          list_id: { type: 'string', description: 'List ID' },
          name: { type: 'string', description: 'Task name' },
          description: { type: 'string', description: 'Task description (optional)' }
        },
        required: ['list_id', 'name']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/list/{list_id}/task', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'update_task',
      description: 'Update a task',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID' },
          name: { type: 'string', description: 'Task name (optional)' },
          description: { type: 'string', description: 'Task description (optional)' },
          status: { type: 'string', description: 'Task status (optional)' }
        },
        required: ['task_id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/task/{task_id}', method: 'PUT' }),
      operation: 'UPDATE'
    });

    return tools;
  }

  private generateToolsForLinear(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Linear, baseUrl, accessToken };

    tools.push({
      server_id: serverId,
      name: 'query',
      description: 'Run a GraphQL query',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'GraphQL query string' },
          variables: { type: 'object', description: 'Variables (optional)' }
        },
        required: ['query']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '', method: 'POST', op: 'query' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'mutate',
      description: 'Run a GraphQL mutation',
      inputSchema: {
        type: 'object',
        properties: {
          mutation: { type: 'string', description: 'GraphQL mutation string' },
          variables: { type: 'object', description: 'Variables (optional)' }
        },
        required: ['mutation']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '', method: 'POST', op: 'mutation' }),
      operation: 'UPDATE'
    });

    return tools;
  }

  private generateToolsForJenkins(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, username, apiToken } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.Jenkins, baseUrl, username, apiToken };

    tools.push({
      server_id: serverId,
      name: 'list_jobs',
      description: 'List Jenkins jobs',
      inputSchema: { type: 'object', properties: {}, required: [] },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/api/json', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_job',
      description: 'Get job details',
      inputSchema: {
        type: 'object',
        properties: { job_name: { type: 'string', description: 'Job name' } },
        required: ['job_name']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/job/{job_name}/api/json', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'trigger_build',
      description: 'Trigger a build',
      inputSchema: {
        type: 'object',
        properties: {
          job_name: { type: 'string', description: 'Job name' },
          parameters: { type: 'object', description: 'Build parameters (optional)' }
        },
        required: ['job_name']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/job/{job_name}/build', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_build',
      description: 'Get build details',
      inputSchema: {
        type: 'object',
        properties: {
          job_name: { type: 'string', description: 'Job name' },
          build_number: { type: 'number', description: 'Build number' }
        },
        required: ['job_name', 'build_number']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/job/{job_name}/{build_number}/api/json', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForDockerHub(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, accessToken, namespace } = dbConfig;
    const tools: ToolDefinition[] = [];
    const baseConfig = { type: DataSourceType.DockerHub, baseUrl, accessToken, namespace };

    tools.push({
      server_id: serverId,
      name: 'list_repos',
      description: 'List repositories in a namespace',
      inputSchema: {
        type: 'object',
        properties: {
          namespace: { type: 'string', description: 'Namespace (optional, default from config)' },
          page_size: { type: 'number', description: 'Page size', default: 25 },
          page: { type: 'number', description: 'Page number', default: 1 }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repositories/{namespace}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_repo',
      description: 'Get repository details',
      inputSchema: {
        type: 'object',
        properties: {
          namespace: { type: 'string', description: 'Namespace (optional, default from config)' },
          repo: { type: 'string', description: 'Repository name' }
        },
        required: ['repo']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repositories/{namespace}/{repo}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_tags',
      description: 'List tags for a repository',
      inputSchema: {
        type: 'object',
        properties: {
          namespace: { type: 'string', description: 'Namespace (optional, default from config)' },
          repo: { type: 'string', description: 'Repository name' },
          page_size: { type: 'number', description: 'Page size', default: 25 },
          page: { type: 'number', description: 'Page number', default: 1 }
        },
        required: ['repo']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/repositories/{namespace}/{repo}/tags', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'search_repos',
      description: 'Search public repositories',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          page_size: { type: 'number', description: 'Page size', default: 25 },
          page: { type: 'number', description: 'Page number', default: 1 }
        },
        required: ['query']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/search/repositories', method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForJira(serverId: string, dbConfig: any): ToolDefinition[] {
    const { host, email, apiToken, projectKey, apiVersion } = dbConfig;
    const tools: ToolDefinition[] = [];

    // Determine API version (default to v2 for Jira Server compatibility)
    const version = apiVersion || 'v2';
    const apiPath = `/rest/api/${version === 'v3' ? '3' : '2'}`;

    // For Jira Server (v2), list_projects uses /project, for Cloud (v3) uses /project/search
    const listProjectsEndpoint = version === 'v3' ? `${apiPath}/project/search` : `${apiPath}/project`;

    // Base config stored in sqlQuery
    const baseConfig = {
      type: DataSourceType.Jira,
      host,
      email,
      apiToken,
      projectKey,
      apiVersion: version
    };

    // Search issues using JQL
    tools.push({
      server_id: serverId,
      name: 'search_issues',
      description: 'Search for issues using JQL (Jira Query Language)',
      inputSchema: {
        type: 'object',
        properties: {
          jql: { type: 'string', description: 'JQL query string (e.g., "project = MYPROJ AND status = Open")' },
          maxResults: { type: 'number', description: 'Maximum number of results (default: 50)', default: 50 },
          startAt: { type: 'number', description: 'Index of first result (default: 0)', default: 0 },
          fields: { type: 'array', items: { type: 'string' }, description: 'Fields to return (default: all)' }
        },
        required: ['jql']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: `${apiPath}/search`, method: 'GET' }),
      operation: 'SELECT'
    });

    // Get issue details
    tools.push({
      server_id: serverId,
      name: 'get_issue',
      description: 'Get details of a specific issue',
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: { type: 'string', description: 'Issue key (e.g., PROJ-123)' },
          fields: { type: 'array', items: { type: 'string' }, description: 'Fields to return' },
          expand: { type: 'string', description: 'Fields to expand (e.g., changelog, renderedFields)' }
        },
        required: ['issueKey']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: `${apiPath}/issue/{issueKey}`, method: 'GET' }),
      operation: 'SELECT'
    });

    // Create issue
    tools.push({
      server_id: serverId,
      name: 'create_issue',
      description: 'Create a new issue in Jira',
      inputSchema: {
        type: 'object',
        properties: {
          projectKey: { type: 'string', description: 'Project key (e.g., PROJ)' },
          issueType: { type: 'string', description: 'Issue type (e.g., Bug, Story, Task)' },
          summary: { type: 'string', description: 'Issue summary/title' },
          description: { type: 'string', description: 'Issue description' },
          priority: { type: 'string', description: 'Priority (e.g., High, Medium, Low)' },
          assignee: { type: 'string', description: 'Assignee account ID' },
          labels: { type: 'array', items: { type: 'string' }, description: 'Labels to add' }
        },
        required: ['projectKey', 'issueType', 'summary']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: `${apiPath}/issue`, method: 'POST' }),
      operation: 'INSERT'
    });

    // Update issue
    tools.push({
      server_id: serverId,
      name: 'update_issue',
      description: 'Update an existing issue',
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: { type: 'string', description: 'Issue key (e.g., PROJ-123)' },
          summary: { type: 'string', description: 'New summary' },
          description: { type: 'string', description: 'New description' },
          priority: { type: 'string', description: 'New priority' },
          labels: { type: 'array', items: { type: 'string' }, description: 'New labels' }
        },
        required: ['issueKey']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: `${apiPath}/issue/{issueKey}`, method: 'PUT' }),
      operation: 'UPDATE'
    });

    // Add comment
    tools.push({
      server_id: serverId,
      name: 'add_comment',
      description: 'Add a comment to an issue',
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: { type: 'string', description: 'Issue key (e.g., PROJ-123)' },
          body: { type: 'string', description: 'Comment body text' }
        },
        required: ['issueKey', 'body']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: `${apiPath}/issue/{issueKey}/comment`, method: 'POST' }),
      operation: 'INSERT'
    });

    // Get transitions
    tools.push({
      server_id: serverId,
      name: 'get_transitions',
      description: 'Get available transitions for an issue',
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: { type: 'string', description: 'Issue key (e.g., PROJ-123)' }
        },
        required: ['issueKey']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: `${apiPath}/issue/{issueKey}/transitions`, method: 'GET' }),
      operation: 'SELECT'
    });

    // Transition issue
    tools.push({
      server_id: serverId,
      name: 'transition_issue',
      description: 'Transition an issue to a new status',
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: { type: 'string', description: 'Issue key (e.g., PROJ-123)' },
          transitionId: { type: 'string', description: 'Transition ID (get from get_transitions)' },
          comment: { type: 'string', description: 'Optional comment to add during transition' }
        },
        required: ['issueKey', 'transitionId']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: `${apiPath}/issue/{issueKey}/transitions`, method: 'POST' }),
      operation: 'UPDATE'
    });

    // List projects
    tools.push({
      server_id: serverId,
      name: 'list_projects',
      description: 'List all projects accessible to the user',
      inputSchema: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Maximum number of results', default: 50 },
          startAt: { type: 'number', description: 'Index of first result', default: 0 }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: listProjectsEndpoint, method: 'GET' }),
      operation: 'SELECT'
    });

    // Get project
    tools.push({
      server_id: serverId,
      name: 'get_project',
      description: 'Get details of a specific project',
      inputSchema: {
        type: 'object',
        properties: {
          projectKey: { type: 'string', description: 'Project key (e.g., PROJ)' }
        },
        required: ['projectKey']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: `${apiPath}/project/{projectKey}`, method: 'GET' }),
      operation: 'SELECT'
    });

    // Get user
    tools.push({
      server_id: serverId,
      name: 'get_user',
      description: 'Get information about a Jira user',
      inputSchema: {
        type: 'object',
        properties: {
          accountId: { type: 'string', description: 'User account ID' },
          username: { type: 'string', description: 'Username (for Jira Server)' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: `${apiPath}/user`, method: 'GET' }),
      operation: 'SELECT'
    });

    // Assign issue
    tools.push({
      server_id: serverId,
      name: 'assign_issue',
      description: 'Assign an issue to a user',
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: { type: 'string', description: 'Issue key (e.g., PROJ-123)' },
          accountId: { type: 'string', description: 'Account ID of the user to assign (-1 to unassign)' }
        },
        required: ['issueKey', 'accountId']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: `${apiPath}/issue/{issueKey}/assignee`, method: 'PUT' }),
      operation: 'UPDATE'
    });

    // Get issue comments
    tools.push({
      server_id: serverId,
      name: 'get_issue_comments',
      description: 'Get comments on an issue',
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: { type: 'string', description: 'Issue key (e.g., PROJ-123)' },
          maxResults: { type: 'number', description: 'Maximum number of results', default: 50 },
          startAt: { type: 'number', description: 'Index of first result', default: 0 }
        },
        required: ['issueKey']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: `${apiPath}/issue/{issueKey}/comment`, method: 'GET' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForFtp(serverId: string, dbConfig: any): ToolDefinition[] {
    const { host, port, username, password, secure, basePath } = dbConfig;
    const tools: ToolDefinition[] = [];

    // Base config stored in sqlQuery
    const baseConfig = {
      type: DataSourceType.Ftp,
      host,
      port: port || 21,
      username,
      password,
      secure: secure || false,
      basePath: basePath || '/'
    };

    // List files and directories
    tools.push({
      server_id: serverId,
      name: 'list_files',
      description: 'List files and directories in a path',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to list (default: base path)', default: '/' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'list' }),
      operation: 'SELECT'
    });

    // Download file
    tools.push({
      server_id: serverId,
      name: 'download_file',
      description: 'Download a file from the FTP server (returns base64 encoded content)',
      inputSchema: {
        type: 'object',
        properties: {
          remotePath: { type: 'string', description: 'Remote file path to download' }
        },
        required: ['remotePath']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'download' }),
      operation: 'SELECT'
    });

    // Upload file
    tools.push({
      server_id: serverId,
      name: 'upload_file',
      description: 'Upload a file to the FTP server',
      inputSchema: {
        type: 'object',
        properties: {
          remotePath: { type: 'string', description: 'Remote file path to upload to' },
          content: { type: 'string', description: 'File content (base64 encoded for binary files)' },
          isBase64: { type: 'boolean', description: 'Whether content is base64 encoded', default: false }
        },
        required: ['remotePath', 'content']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'upload' }),
      operation: 'INSERT'
    });

    // Delete file
    tools.push({
      server_id: serverId,
      name: 'delete_file',
      description: 'Delete a file from the FTP server',
      inputSchema: {
        type: 'object',
        properties: {
          remotePath: { type: 'string', description: 'Remote file path to delete' }
        },
        required: ['remotePath']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'deleteFile' }),
      operation: 'DELETE'
    });

    // Create directory
    tools.push({
      server_id: serverId,
      name: 'create_directory',
      description: 'Create a new directory on the FTP server',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path of the directory to create' }
        },
        required: ['path']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'mkdir' }),
      operation: 'INSERT'
    });

    // Delete directory
    tools.push({
      server_id: serverId,
      name: 'delete_directory',
      description: 'Delete a directory from the FTP server',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path of the directory to delete' }
        },
        required: ['path']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'rmdir' }),
      operation: 'DELETE'
    });

    // Rename file or directory
    tools.push({
      server_id: serverId,
      name: 'rename',
      description: 'Rename a file or directory on the FTP server',
      inputSchema: {
        type: 'object',
        properties: {
          oldPath: { type: 'string', description: 'Current path of the file or directory' },
          newPath: { type: 'string', description: 'New path for the file or directory' }
        },
        required: ['oldPath', 'newPath']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'rename' }),
      operation: 'UPDATE'
    });

    // Get file info
    tools.push({
      server_id: serverId,
      name: 'get_file_info',
      description: 'Get information about a file (size, modified date, etc.)',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file' }
        },
        required: ['path']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'stat' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForLocalFS(serverId: string, dbConfig: any): ToolDefinition[] {
    const { basePath, allowWrite, allowDelete } = dbConfig;
    const tools: ToolDefinition[] = [];

    // Base config stored in sqlQuery
    const baseConfig = {
      type: DataSourceType.LocalFS,
      basePath: basePath || '/',
      allowWrite: allowWrite ?? true,
      allowDelete: allowDelete ?? false
    };

    // List files and directories
    tools.push({
      server_id: serverId,
      name: 'list_files',
      description: 'List files and directories in a path',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to list (default: base path)', default: '.' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'list' }),
      operation: 'SELECT'
    });

    // Read file
    tools.push({
      server_id: serverId,
      name: 'read_file',
      description: 'Read contents of a file (returns text or base64 for binary)',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file to read' },
          encoding: { type: 'string', description: 'Encoding (utf8, base64)', default: 'utf8' }
        },
        required: ['path']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'read' }),
      operation: 'SELECT'
    });

    // Write file (only if allowed)
    if (allowWrite !== false) {
      tools.push({
        server_id: serverId,
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file to write' },
            content: { type: 'string', description: 'Content to write' },
            encoding: { type: 'string', description: 'Encoding (utf8, base64)', default: 'utf8' }
          },
          required: ['path', 'content']
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'write' }),
        operation: 'INSERT'
      });
    }

    // Delete file (only if allowed)
    if (allowDelete) {
      tools.push({
        server_id: serverId,
        name: 'delete_file',
        description: 'Delete a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file to delete' }
          },
          required: ['path']
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'deleteFile' }),
        operation: 'DELETE'
      });
    }

    // Create directory (only if write allowed)
    if (allowWrite !== false) {
      tools.push({
        server_id: serverId,
        name: 'create_directory',
        description: 'Create a new directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path of the directory to create' }
          },
          required: ['path']
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'mkdir' }),
        operation: 'INSERT'
      });
    }

    // Delete directory (only if allowed)
    if (allowDelete) {
      tools.push({
        server_id: serverId,
        name: 'delete_directory',
        description: 'Delete a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path of the directory to delete' },
            recursive: { type: 'boolean', description: 'Delete recursively', default: false }
          },
          required: ['path']
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'rmdir' }),
        operation: 'DELETE'
      });
    }

    // Rename file or directory (only if write allowed)
    if (allowWrite !== false) {
      tools.push({
        server_id: serverId,
        name: 'rename',
        description: 'Rename a file or directory',
        inputSchema: {
          type: 'object',
          properties: {
            oldPath: { type: 'string', description: 'Current path' },
            newPath: { type: 'string', description: 'New path' }
          },
          required: ['oldPath', 'newPath']
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'rename' }),
        operation: 'UPDATE'
      });
    }

    // Get file info
    tools.push({
      server_id: serverId,
      name: 'get_file_info',
      description: 'Get information about a file or directory',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file or directory' }
        },
        required: ['path']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'stat' }),
      operation: 'SELECT'
    });

    // Search files
    tools.push({
      server_id: serverId,
      name: 'search_files',
      description: 'Search for files by name pattern',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to search in', default: '.' },
          pattern: { type: 'string', description: 'Search pattern (e.g., *.txt, report*)' },
          recursive: { type: 'boolean', description: 'Search recursively', default: true }
        },
        required: ['pattern']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'search' }),
      operation: 'SELECT'
    });

    // Copy file (only if write allowed)
    if (allowWrite !== false) {
      tools.push({
        server_id: serverId,
        name: 'copy_file',
        description: 'Copy a file to another location',
        inputSchema: {
          type: 'object',
          properties: {
            sourcePath: { type: 'string', description: 'Source file path' },
            destPath: { type: 'string', description: 'Destination file path' }
          },
          required: ['sourcePath', 'destPath']
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'copy' }),
        operation: 'INSERT'
      });
    }

    return tools;
  }

  private generateToolsForConfluence(serverId: string, dbConfig: any): ToolDefinition[] {
    const { host, email, apiToken, spaceKey } = dbConfig;
    const tools: ToolDefinition[] = [];

    const baseConfig = {
      type: DataSourceType.Confluence,
      host,
      email,
      apiToken,
      spaceKey
    };

    tools.push({
      server_id: serverId,
      name: 'list_spaces',
      description: 'List Confluence spaces',
      inputSchema: {
        type: 'object',
        properties: {
          start: { type: 'number', description: 'Start index (default: 0)', default: 0 },
          limit: { type: 'number', description: 'Max results (default: 25)', default: 25 }
        }
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/wiki/rest/api/space', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_space',
      description: 'Get details of a space',
      inputSchema: {
        type: 'object',
        properties: {
          spaceKey: { type: 'string', description: 'Space key (e.g., DOCS)' }
        },
        required: ['spaceKey']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/wiki/rest/api/space/{spaceKey}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_pages',
      description: 'List pages in a space',
      inputSchema: {
        type: 'object',
        properties: {
          spaceKey: { type: 'string', description: 'Space key (optional, defaults to config)' },
          start: { type: 'number', description: 'Start index (default: 0)', default: 0 },
          limit: { type: 'number', description: 'Max results (default: 25)', default: 25 },
          expand: { type: 'string', description: 'Expand fields (e.g., body.storage)' }
        }
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/wiki/rest/api/content', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_page',
      description: 'Get a page by ID',
      inputSchema: {
        type: 'object',
        properties: {
          pageId: { type: 'string', description: 'Page ID' },
          expand: { type: 'string', description: 'Expand fields (default: body.storage,version,space)' }
        },
        required: ['pageId']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/wiki/rest/api/content/{pageId}', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'search_pages',
      description: 'Search pages using CQL',
      inputSchema: {
        type: 'object',
        properties: {
          cql: { type: 'string', description: 'CQL query string' },
          start: { type: 'number', description: 'Start index (default: 0)', default: 0 },
          limit: { type: 'number', description: 'Max results (default: 25)', default: 25 }
        },
        required: ['cql']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/wiki/rest/api/content/search', method: 'GET' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'create_page',
      description: 'Create a new page',
      inputSchema: {
        type: 'object',
        properties: {
          spaceKey: { type: 'string', description: 'Space key (optional, defaults to config)' },
          parentId: { type: 'string', description: 'Parent page ID (optional)' },
          title: { type: 'string', description: 'Page title' },
          body: { type: 'string', description: 'Page body (storage format)' }
        },
        required: ['title', 'body']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/wiki/rest/api/content', method: 'POST' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'update_page',
      description: 'Update an existing page',
      inputSchema: {
        type: 'object',
        properties: {
          pageId: { type: 'string', description: 'Page ID' },
          spaceKey: { type: 'string', description: 'Space key (optional, defaults to config)' },
          parentId: { type: 'string', description: 'Parent page ID (optional)' },
          title: { type: 'string', description: 'Page title' },
          body: { type: 'string', description: 'Page body (storage format)' },
          version: { type: 'number', description: 'Next version number' }
        },
        required: ['pageId', 'title', 'body', 'version']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, endpoint: '/wiki/rest/api/content/{pageId}', method: 'PUT' }),
      operation: 'UPDATE'
    });

    return tools;
  }

  private generateToolsForEmail(serverId: string, dbConfig: any): ToolDefinition[] {
    const { mode, imapHost, imapPort, smtpHost, smtpPort, username, password, secure } = dbConfig;
    const tools: ToolDefinition[] = [];

    const emailMode = mode || 'both';
    const canRead = emailMode === 'read' || emailMode === 'both';
    const canWrite = emailMode === 'write' || emailMode === 'both';

    // Base config stored in sqlQuery
    const baseConfig = {
      type: DataSourceType.Email,
      mode: emailMode,
      imapHost: canRead ? imapHost : undefined,
      imapPort: canRead ? (imapPort || 993) : undefined,
      smtpHost: canWrite ? smtpHost : undefined,
      smtpPort: canWrite ? (smtpPort || 587) : undefined,
      username,
      password,
      secure: secure ?? true
    };

    // === READ TOOLS (IMAP) ===
    if (canRead) {
      // List folders
      tools.push({
        server_id: serverId,
        name: 'list_folders',
        description: 'List all email folders/mailboxes',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listFolders' }),
        operation: 'SELECT'
      });

      // List emails
      tools.push({
        server_id: serverId,
        name: 'list_emails',
        description: 'List emails in a folder',
        inputSchema: {
          type: 'object',
          properties: {
            folder: { type: 'string', description: 'Folder name (default: INBOX)', default: 'INBOX' },
            limit: { type: 'number', description: 'Maximum number of emails to return', default: 20 },
            page: { type: 'number', description: 'Page number for pagination', default: 1 }
          },
          required: []
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listEmails' }),
        operation: 'SELECT'
      });

      // Read email
      tools.push({
        server_id: serverId,
        name: 'read_email',
        description: 'Read a specific email by UID',
        inputSchema: {
          type: 'object',
          properties: {
            folder: { type: 'string', description: 'Folder name', default: 'INBOX' },
            uid: { type: 'number', description: 'Email UID' }
          },
          required: ['uid']
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'readEmail' }),
        operation: 'SELECT'
      });

      // Search emails
      tools.push({
        server_id: serverId,
        name: 'search_emails',
        description: 'Search emails by criteria',
        inputSchema: {
          type: 'object',
          properties: {
            folder: { type: 'string', description: 'Folder name', default: 'INBOX' },
            from: { type: 'string', description: 'From address filter' },
            to: { type: 'string', description: 'To address filter' },
            subject: { type: 'string', description: 'Subject filter' },
            since: { type: 'string', description: 'Emails since date (YYYY-MM-DD)' },
            before: { type: 'string', description: 'Emails before date (YYYY-MM-DD)' },
            unseen: { type: 'boolean', description: 'Only unread emails' }
          },
          required: []
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'searchEmails' }),
        operation: 'SELECT'
      });

      // Move email
      tools.push({
        server_id: serverId,
        name: 'move_email',
        description: 'Move email to another folder',
        inputSchema: {
          type: 'object',
          properties: {
            sourceFolder: { type: 'string', description: 'Source folder', default: 'INBOX' },
            uid: { type: 'number', description: 'Email UID' },
            destFolder: { type: 'string', description: 'Destination folder' }
          },
          required: ['uid', 'destFolder']
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'moveEmail' }),
        operation: 'UPDATE'
      });

      // Delete email
      tools.push({
        server_id: serverId,
        name: 'delete_email',
        description: 'Delete an email (move to Trash)',
        inputSchema: {
          type: 'object',
          properties: {
            folder: { type: 'string', description: 'Folder name', default: 'INBOX' },
            uid: { type: 'number', description: 'Email UID' }
          },
          required: ['uid']
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'deleteEmail' }),
        operation: 'DELETE'
      });

      // Mark read/unread
      tools.push({
        server_id: serverId,
        name: 'mark_read',
        description: 'Mark email as read or unread',
        inputSchema: {
          type: 'object',
          properties: {
            folder: { type: 'string', description: 'Folder name', default: 'INBOX' },
            uid: { type: 'number', description: 'Email UID' },
            read: { type: 'boolean', description: 'Mark as read (true) or unread (false)', default: true }
          },
          required: ['uid']
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'markRead' }),
        operation: 'UPDATE'
      });
    }

    // === WRITE TOOLS (SMTP) ===
    if (canWrite) {
      // Send email
      tools.push({
        server_id: serverId,
        name: 'send_email',
        description: 'Send a new email',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient email address(es), comma-separated' },
            cc: { type: 'string', description: 'CC recipients, comma-separated' },
            bcc: { type: 'string', description: 'BCC recipients, comma-separated' },
            subject: { type: 'string', description: 'Email subject' },
            body: { type: 'string', description: 'Email body (plain text)' },
            html: { type: 'string', description: 'Email body (HTML)' }
          },
          required: ['to', 'subject', 'body']
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'sendEmail' }),
        operation: 'INSERT'
      });

      // Reply email
      tools.push({
        server_id: serverId,
        name: 'reply_email',
        description: 'Reply to an email',
        inputSchema: {
          type: 'object',
          properties: {
            folder: { type: 'string', description: 'Folder name', default: 'INBOX' },
            uid: { type: 'number', description: 'Original email UID' },
            body: { type: 'string', description: 'Reply body (plain text)' },
            html: { type: 'string', description: 'Reply body (HTML)' },
            replyAll: { type: 'boolean', description: 'Reply to all recipients', default: false }
          },
          required: ['uid', 'body']
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'replyEmail' }),
        operation: 'INSERT'
      });

      // Forward email
      tools.push({
        server_id: serverId,
        name: 'forward_email',
        description: 'Forward an email',
        inputSchema: {
          type: 'object',
          properties: {
            folder: { type: 'string', description: 'Folder name', default: 'INBOX' },
            uid: { type: 'number', description: 'Email UID to forward' },
            to: { type: 'string', description: 'Forward to address(es), comma-separated' },
            body: { type: 'string', description: 'Additional message' }
          },
          required: ['uid', 'to']
        },
        sqlQuery: JSON.stringify({ ...baseConfig, operation: 'forwardEmail' }),
        operation: 'INSERT'
      });
    }

    return tools;
  }

  private generateToolsForSlack(serverId: string, dbConfig: any): ToolDefinition[] {
    const { botToken, defaultChannel } = dbConfig;
    const tools: ToolDefinition[] = [];

    // Base config stored in sqlQuery
    const baseConfig = {
      type: DataSourceType.Slack,
      botToken,
      defaultChannel
    };

    // List channels
    tools.push({
      server_id: serverId,
      name: 'list_channels',
      description: 'List all channels in the Slack workspace',
      inputSchema: {
        type: 'object',
        properties: {
          types: { type: 'string', description: 'Channel types: public_channel, private_channel, mpim, im', default: 'public_channel,private_channel' },
          limit: { type: 'number', description: 'Maximum number of channels to return', default: 100 }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listChannels' }),
      operation: 'SELECT'
    });

    // List users
    tools.push({
      server_id: serverId,
      name: 'list_users',
      description: 'List all users in the Slack workspace',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of users to return', default: 100 }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listUsers' }),
      operation: 'SELECT'
    });

    // Send message
    tools.push({
      server_id: serverId,
      name: 'send_message',
      description: 'Send a message to a Slack channel',
      inputSchema: {
        type: 'object',
        properties: {
          channel: { type: 'string', description: 'Channel ID or name (e.g., #general or C1234567890)' },
          text: { type: 'string', description: 'Message text' },
          thread_ts: { type: 'string', description: 'Thread timestamp to reply in thread' }
        },
        required: ['channel', 'text']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'sendMessage' }),
      operation: 'INSERT'
    });

    // Get channel history
    tools.push({
      server_id: serverId,
      name: 'get_channel_history',
      description: 'Get message history from a Slack channel',
      inputSchema: {
        type: 'object',
        properties: {
          channel: { type: 'string', description: 'Channel ID' },
          limit: { type: 'number', description: 'Number of messages to return', default: 20 },
          oldest: { type: 'string', description: 'Only messages after this Unix timestamp' },
          latest: { type: 'string', description: 'Only messages before this Unix timestamp' }
        },
        required: ['channel']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'getChannelHistory' }),
      operation: 'SELECT'
    });

    // Get user info
    tools.push({
      server_id: serverId,
      name: 'get_user_info',
      description: 'Get information about a Slack user',
      inputSchema: {
        type: 'object',
        properties: {
          user: { type: 'string', description: 'User ID' }
        },
        required: ['user']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'getUserInfo' }),
      operation: 'SELECT'
    });

    // Add reaction
    tools.push({
      server_id: serverId,
      name: 'add_reaction',
      description: 'Add an emoji reaction to a message',
      inputSchema: {
        type: 'object',
        properties: {
          channel: { type: 'string', description: 'Channel ID where the message is' },
          timestamp: { type: 'string', description: 'Message timestamp' },
          name: { type: 'string', description: 'Emoji name (without colons, e.g., thumbsup)' }
        },
        required: ['channel', 'timestamp', 'name']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'addReaction' }),
      operation: 'INSERT'
    });

    // Upload file
    tools.push({
      server_id: serverId,
      name: 'upload_file',
      description: 'Upload a file to a Slack channel',
      inputSchema: {
        type: 'object',
        properties: {
          channels: { type: 'string', description: 'Channel IDs (comma-separated)' },
          content: { type: 'string', description: 'File content (for text files)' },
          filename: { type: 'string', description: 'Filename' },
          title: { type: 'string', description: 'Title of the file' },
          initial_comment: { type: 'string', description: 'Initial comment to add' }
        },
        required: ['channels', 'content', 'filename']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'uploadFile' }),
      operation: 'INSERT'
    });

    // Search messages
    tools.push({
      server_id: serverId,
      name: 'search_messages',
      description: 'Search for messages in the Slack workspace',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          count: { type: 'number', description: 'Number of results to return', default: 20 },
          sort: { type: 'string', description: 'Sort order: score or timestamp', default: 'score' }
        },
        required: ['query']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'searchMessages' }),
      operation: 'SELECT'
    });

    return tools;
  }

  private generateToolsForDiscord(serverId: string, dbConfig: any): ToolDefinition[] {
    const { botToken, defaultGuildId, defaultChannelId } = dbConfig;
    const tools: ToolDefinition[] = [];

    const baseConfig = {
      type: DataSourceType.Discord,
      botToken,
      defaultGuildId,
      defaultChannelId,
    };

    // List guilds that the bot is in
    tools.push({
      server_id: serverId,
      name: 'list_guilds',
      description: 'List guilds (servers) the bot has access to',
      inputSchema: { type: 'object', properties: {}, required: [] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listGuilds' }),
      operation: 'SELECT'
    });

    // List channels in a guild
    tools.push({
      server_id: serverId,
      name: 'list_channels',
      description: 'List channels in a Discord guild',
      inputSchema: {
        type: 'object',
        properties: {
          guildId: { type: 'string', description: 'Guild (server) ID; falls back to defaultGuildId' }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listChannels' }),
      operation: 'SELECT'
    });

    // List members in a guild
    tools.push({
      server_id: serverId,
      name: 'list_users',
      description: 'List members in a Discord guild',
      inputSchema: {
        type: 'object',
        properties: {
          guildId: { type: 'string', description: 'Guild (server) ID; falls back to defaultGuildId' },
          limit: { type: 'number', description: 'Max members to return (1-1000)', default: 100 }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listMembers' }),
      operation: 'SELECT'
    });

    // Send a message to a channel
    tools.push({
      server_id: serverId,
      name: 'send_message',
      description: 'Send a message to a Discord channel',
      inputSchema: {
        type: 'object',
        properties: {
          channelId: { type: 'string', description: 'Channel ID; falls back to defaultChannelId' },
          content: { type: 'string', description: 'Message content' },
          replyToMessageId: { type: 'string', description: 'Optional message ID to reply to' }
        },
        required: ['content']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'sendMessage' }),
      operation: 'INSERT'
    });

    // Get recent messages in a channel
    tools.push({
      server_id: serverId,
      name: 'get_channel_history',
      description: 'Get recent messages from a Discord channel',
      inputSchema: {
        type: 'object',
        properties: {
          channelId: { type: 'string', description: 'Channel ID; falls back to defaultChannelId' },
          limit: { type: 'number', description: 'Number of messages to return (1-100)', default: 20 }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'getChannelMessages' }),
      operation: 'SELECT'
    });

    // Get user info (via guild member if guild provided)
    tools.push({
      server_id: serverId,
      name: 'get_user_info',
      description: 'Get information about a Discord user (requires guildId for full member data)',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID' },
          guildId: { type: 'string', description: 'Optional guild ID for member info; falls back to defaultGuildId' }
        },
        required: ['userId']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'getUserInfo' }),
      operation: 'SELECT'
    });

    // Add reaction to a message
    tools.push({
      server_id: serverId,
      name: 'add_reaction',
      description: 'Add an emoji reaction to a message',
      inputSchema: {
        type: 'object',
        properties: {
          channelId: { type: 'string', description: 'Channel ID; falls back to defaultChannelId' },
          messageId: { type: 'string', description: 'Message ID' },
          emoji: { type: 'string', description: 'Emoji (unicode or name:id for custom)' }
        },
        required: ['messageId', 'emoji']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'addReaction' }),
      operation: 'INSERT'
    });

    return tools;
  }

  private generateToolsForDocker(serverId: string, dbConfig: any): ToolDefinition[] {
    const { dockerPath } = dbConfig || {};
    const tools: ToolDefinition[] = [];

    const baseConfig = {
      type: DataSourceType.Docker,
      dockerPath: dockerPath || 'docker'
    };

    tools.push({
      server_id: serverId,
      name: 'list_images',
      description: 'List local Docker images',
      inputSchema: { type: 'object', properties: {}, required: [] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listImages' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_containers',
      description: 'List Docker containers (running and stopped)',
      inputSchema: {
        type: 'object',
        properties: { all: { type: 'boolean', description: 'Include stopped containers', default: true } },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listContainers' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_container',
      description: 'Get detailed information about a container',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Container ID or name' } },
        required: ['id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'inspectContainer' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'start_container',
      description: 'Start a stopped container',
      inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Container ID or name' } }, required: ['id'] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'startContainer' }),
      operation: 'UPDATE'
    });

    tools.push({
      server_id: serverId,
      name: 'stop_container',
      description: 'Stop a running container',
      inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Container ID or name' } }, required: ['id'] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'stopContainer' }),
      operation: 'UPDATE'
    });

    tools.push({
      server_id: serverId,
      name: 'restart_container',
      description: 'Restart a container',
      inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Container ID or name' } }, required: ['id'] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'restartContainer' }),
      operation: 'UPDATE'
    });

    tools.push({
      server_id: serverId,
      name: 'remove_container',
      description: 'Remove a container',
      inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Container ID or name' }, force: { type: 'boolean', default: false } }, required: ['id'] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'removeContainer' }),
      operation: 'DELETE'
    });

    tools.push({
      server_id: serverId,
      name: 'remove_image',
      description: 'Remove a Docker image',
      inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Image ID or name:tag' }, force: { type: 'boolean', default: false } }, required: ['id'] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'removeImage' }),
      operation: 'DELETE'
    });

    tools.push({
      server_id: serverId,
      name: 'pull_image',
      description: 'Pull a Docker image from registry',
      inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Image name, e.g. nginx:latest' } }, required: ['name'] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'pullImage' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_logs',
      description: 'Get recent logs from a container',
      inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Container ID or name' }, tail: { type: 'number', default: 100 } }, required: ['id'] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'getLogs' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'exec_in_container',
      description: 'Execute a command inside a running container',
      inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Container ID or name' }, cmd: { type: 'string', description: 'Command to execute' } }, required: ['id', 'cmd'] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'execInContainer' }),
      operation: 'INSERT'
    });

    return tools;
  }

  private generateToolsForKubernetes(serverId: string, dbConfig: any): ToolDefinition[] {
    const { kubectlPath, kubeconfig, namespace } = dbConfig || {};
    const tools: ToolDefinition[] = [];

    const baseConfig = {
      type: DataSourceType.Kubernetes,
      kubectlPath: kubectlPath || 'kubectl',
      kubeconfig,
      namespace
    };

    tools.push({
      server_id: serverId,
      name: 'list_contexts',
      description: 'List kubeconfig contexts',
      inputSchema: { type: 'object', properties: {}, required: [] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listContexts' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_current_context',
      description: 'Get current kubeconfig context',
      inputSchema: { type: 'object', properties: {}, required: [] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'getCurrentContext' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_namespaces',
      description: 'List namespaces in the cluster',
      inputSchema: { type: 'object', properties: {}, required: [] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listNamespaces' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_pods',
      description: 'List pods in a namespace',
      inputSchema: {
        type: 'object',
        properties: { namespace: { type: 'string', description: 'Namespace override' } },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listPods' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_pod',
      description: 'Get a pod by name',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Pod name' },
          namespace: { type: 'string', description: 'Namespace override' }
        },
        required: ['name']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'getPod' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'describe_pod',
      description: 'Describe a pod (text output)',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Pod name' },
          namespace: { type: 'string', description: 'Namespace override' }
        },
        required: ['name']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'describePod' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_deployments',
      description: 'List deployments in a namespace',
      inputSchema: {
        type: 'object',
        properties: { namespace: { type: 'string', description: 'Namespace override' } },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listDeployments' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'scale_deployment',
      description: 'Scale a deployment to a replica count',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Deployment name' },
          replicas: { type: 'number', description: 'Desired replica count' },
          namespace: { type: 'string', description: 'Namespace override' }
        },
        required: ['name', 'replicas']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'scaleDeployment' }),
      operation: 'UPDATE'
    });

    tools.push({
      server_id: serverId,
      name: 'delete_pod',
      description: 'Delete a pod',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Pod name' },
          namespace: { type: 'string', description: 'Namespace override' }
        },
        required: ['name']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'deletePod' }),
      operation: 'DELETE'
    });

    return tools;
  }

  private generateToolsForElasticsearch(serverId: string, dbConfig: any): ToolDefinition[] {
    const { baseUrl, apiKey, username, password, index } = dbConfig || {};
    const tools: ToolDefinition[] = [];

    const baseConfig = {
      type: dbConfig?.type || DataSourceType.Elasticsearch,
      baseUrl,
      apiKey,
      username,
      password,
      index
    };

    tools.push({
      server_id: serverId,
      name: 'list_indices',
      description: 'List indices in the cluster',
      inputSchema: { type: 'object', properties: {}, required: [] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listIndices' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_cluster_health',
      description: 'Get cluster health',
      inputSchema: { type: 'object', properties: {}, required: [] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'getClusterHealth' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'search',
      description: 'Search documents in an index',
      inputSchema: {
        type: 'object',
        properties: {
          index: { type: 'string', description: 'Index name (overrides default)' },
          query: { type: 'object', description: 'Elasticsearch query DSL' },
          size: { type: 'number', description: 'Number of results', default: 10 }
        },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'search' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_document',
      description: 'Get a document by ID',
      inputSchema: {
        type: 'object',
        properties: {
          index: { type: 'string', description: 'Index name (overrides default)' },
          id: { type: 'string', description: 'Document ID' }
        },
        required: ['id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'getDocument' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'index_document',
      description: 'Index (create/update) a document',
      inputSchema: {
        type: 'object',
        properties: {
          index: { type: 'string', description: 'Index name (overrides default)' },
          id: { type: 'string', description: 'Optional document ID' },
          document: { type: 'object', description: 'Document body' },
          refresh: { type: 'boolean', description: 'Refresh index', default: true }
        },
        required: ['document']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'indexDocument' }),
      operation: 'INSERT'
    });

    tools.push({
      server_id: serverId,
      name: 'delete_document',
      description: 'Delete a document by ID',
      inputSchema: {
        type: 'object',
        properties: {
          index: { type: 'string', description: 'Index name (overrides default)' },
          id: { type: 'string', description: 'Document ID' }
        },
        required: ['id']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'deleteDocument' }),
      operation: 'DELETE'
    });

    return tools;
  }

  private generateToolsForOpenShift(serverId: string, dbConfig: any): ToolDefinition[] {
    const { ocPath, kubeconfig, namespace } = dbConfig || {};
    const tools: ToolDefinition[] = [];

    const baseConfig = {
      type: DataSourceType.OpenShift,
      ocPath: ocPath || 'oc',
      kubeconfig,
      namespace
    };

    tools.push({
      server_id: serverId,
      name: 'list_projects',
      description: 'List OpenShift projects',
      inputSchema: { type: 'object', properties: {}, required: [] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listProjects' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_current_project',
      description: 'Get current OpenShift project',
      inputSchema: { type: 'object', properties: {}, required: [] },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'getCurrentProject' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_pods',
      description: 'List pods in a project/namespace',
      inputSchema: {
        type: 'object',
        properties: { namespace: { type: 'string', description: 'Namespace override' } },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listPods' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'get_pod',
      description: 'Get a pod by name',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Pod name' },
          namespace: { type: 'string', description: 'Namespace override' }
        },
        required: ['name']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'getPod' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'list_deployments',
      description: 'List deployments in a project/namespace',
      inputSchema: {
        type: 'object',
        properties: { namespace: { type: 'string', description: 'Namespace override' } },
        required: []
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'listDeployments' }),
      operation: 'SELECT'
    });

    tools.push({
      server_id: serverId,
      name: 'scale_deployment',
      description: 'Scale a deployment to a replica count',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Deployment name' },
          replicas: { type: 'number', description: 'Desired replica count' },
          namespace: { type: 'string', description: 'Namespace override' }
        },
        required: ['name', 'replicas']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'scaleDeployment' }),
      operation: 'UPDATE'
    });

    tools.push({
      server_id: serverId,
      name: 'delete_pod',
      description: 'Delete a pod',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Pod name' },
          namespace: { type: 'string', description: 'Namespace override' }
        },
        required: ['name']
      },
      sqlQuery: JSON.stringify({ ...baseConfig, operation: 'deletePod' }),
      operation: 'DELETE'
    });

    return tools;
  }

  private generateToolsForData(serverId: string, parsedData: ParsedData, dbConfig: any, selectedTables?: any[]): ToolDefinition[] {
    const tools: ToolDefinition[] = [];

    //console.log('🔍 generateToolsForData called with selectedTables:', selectedTables);

    for (const [tableName, rows] of Object.entries(parsedData)) {
      if (!rows || rows.length === 0) continue;

      // Find table configuration in selectedTables
      const tableIndex = Object.keys(parsedData).indexOf(tableName);
      const tableConfig = selectedTables?.find(config => config.index === tableIndex);
      
      // Skip table if not selected
      if (selectedTables && selectedTables.length > 0 && !tableConfig) {
        //console.log(`🔍 Skipping table ${tableName} - not selected`);
        continue;
      }
      
      //console.log(`🔍 Processing table ${tableName} with config:`, tableConfig?.tools);

      const columns = this.analyzeColumns(rows);
      const cleanTableName = this.sanitizeName(tableName);
      
      // Get tools configuration (default all true if no config)
      const toolsConfig = tableConfig?.tools || {
        get: true, create: true, update: true, delete: true, count: true,
        min: true, max: true, sum: true, avg: true
      };

      // GET tool
      if (toolsConfig.get) {
        tools.push({
          server_id: serverId,
          name: `get_${cleanTableName}`,
          description: `Get records from ${tableName} table`,
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of records to return',
                default: 100,
                minimum: 1,
                maximum: 1000
              },
              offset: {
                type: 'number',
                description: 'Number of records to skip',
                default: 0,
                minimum: 0
              },
              ...this.generateFilterProperties(columns)
            },
            required: []
          },
          sqlQuery: this.generateSelectQuery(tableName, columns, dbConfig.type),
          operation: 'SELECT'
        });
      }

      // CREATE tool
      if (toolsConfig.create && columns.length > 0) {
        tools.push({
        server_id: serverId,
        name: `create_${cleanTableName}`,
        description: `Create a new record in ${tableName} table`,
        inputSchema: {
          type: 'object',
          properties: this.generateInputProperties(columns, true),
          required: columns.filter(col => !col.nullable && col.name.toLowerCase() !== 'id').map(col => col.name)
        },
        sqlQuery: this.generateInsertQuery(tableName, columns, dbConfig.type),
        operation: 'INSERT'
        });
      }

      // UPDATE tool
      if (toolsConfig.update && columns.some(col => col.name.toLowerCase() === 'id')) {
        tools.push({
          server_id: serverId,
          name: `update_${cleanTableName}`,
          description: `Update a record in ${tableName} table`,
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: ['string', 'number'],
                description: 'ID of the record to update'
              },
              ...this.generateInputProperties(columns, false)
            },
            required: ['id']
          },
          sqlQuery: this.generateUpdateQuery(tableName, columns, dbConfig.type),
          operation: 'UPDATE'
        });
      }

      // DELETE tool
      if (toolsConfig.delete && columns.some(col => col.name.toLowerCase() === 'id')) {
        tools.push({
          server_id: serverId,
          name: `delete_${cleanTableName}`,
          description: `Delete a record from ${tableName} table`,
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: ['string', 'number'],
                description: 'ID of the record to delete'
              }
            },
            required: ['id']
          },
          sqlQuery: this.generateDeleteQuery(tableName, dbConfig.type),
          operation: 'DELETE'
        });
      }

      // COUNT tool
      if (toolsConfig.count) {
        tools.push({
          server_id: serverId,
          name: `count_${cleanTableName}`,
          description: `Get total count of records in ${tableName} table`,
          inputSchema: {
            type: 'object',
            properties: this.generateFilterProperties(columns),
            required: []
          },
          sqlQuery: this.generateCountQuery(tableName, columns, dbConfig.type),
          operation: 'SELECT'
        });
      }

      // Get numeric columns for aggregate functions
      //console.log(`🔍 Table ${tableName} columns:`, columns.map(col => ({ name: col.name, type: col.type })));
      
      const numericColumns = columns.filter(col => {
        const type = col.type.toLowerCase();
        return type.includes('int') || type.includes('float') || type.includes('decimal') || 
               type.includes('numeric') || type.includes('real') || type.includes('double') ||
               type === 'number';
      });

      //console.log(`🔍 Numeric columns found in ${tableName}:`, numericColumns.map(col => ({ name: col.name, type: col.type })));

      if (numericColumns.length > 0) {
        // MIN tools for each numeric column
        if (toolsConfig.min) {
          numericColumns.forEach(col => {
            const toolName = `min_${cleanTableName}_${this.sanitizeName(col.name)}`;
            //console.log(`🔍 Creating MIN tool: ${toolName} for column ${col.name}`);
            
            tools.push({
              server_id: serverId,
              name: toolName,
              description: `Get minimum value of ${col.name} in ${tableName} table`,
              inputSchema: {
                type: 'object',
                properties: this.generateFilterProperties(columns),
                required: []
              },
              sqlQuery: this.generateMinQuery(tableName, col.name, columns, dbConfig.type),
              operation: 'SELECT'
            });
          });
        }

        // MAX tools for each numeric column
        if (toolsConfig.max) {
          numericColumns.forEach(col => {
            const toolName = `max_${cleanTableName}_${this.sanitizeName(col.name)}`;
            
            tools.push({
              server_id: serverId,
              name: toolName,
              description: `Get maximum value of ${col.name} in ${tableName} table`,
              inputSchema: {
                type: 'object',
                properties: this.generateFilterProperties(columns),
                required: []
              },
              sqlQuery: this.generateMaxQuery(tableName, col.name, columns, dbConfig.type),
              operation: 'SELECT'
            });
          });
        }

        // SUM tools for each numeric column
        if (toolsConfig.sum) {
          numericColumns.forEach(col => {
            const toolName = `sum_${cleanTableName}_${this.sanitizeName(col.name)}`;
          
          tools.push({
            server_id: serverId,
            name: toolName,
            description: `Get sum of all values of ${col.name} in ${tableName} table`,
            inputSchema: {
              type: 'object',
              properties: this.generateFilterProperties(columns),
              required: []
            },
            sqlQuery: this.generateSumQuery(tableName, col.name, columns, dbConfig.type),
            operation: 'SELECT'
          });
        });
        }

        // AVG tools for each numeric column
        if (toolsConfig.avg) {
          numericColumns.forEach(col => {
            const toolName = `avg_${cleanTableName}_${this.sanitizeName(col.name)}`;
            
            tools.push({
              server_id: serverId,
              name: toolName,
              description: `Get average value of ${col.name} in ${tableName} table`,
              inputSchema: {
                type: 'object',
                properties: this.generateFilterProperties(columns),
                required: []
              },
              sqlQuery: this.generateAvgQuery(tableName, col.name, columns, dbConfig.type),
              operation: 'SELECT'
            });
          });
        }
      }
    }

    //console.log(`🔍 Total tools created: ${tools.length}`);
    //console.log(`🔍 Tool names:`, tools.map(tool => tool.name));

    return tools;
  }

  private generateResourcesForData(serverId: string, parsedData: ParsedData, dbConfig: any): ResourceDefinition[] {
    const resources: ResourceDefinition[] = [];

    for (const [tableName, rows] of Object.entries(parsedData)) {
      if (!rows || rows.length === 0) continue;

      const cleanTableName = this.sanitizeName(tableName);

      resources.push({
        server_id: serverId,
        name: `${cleanTableName}_list`,
        description: `List all records from ${tableName} table`,
        uri_template: `${cleanTableName}://list`,
        sqlQuery: this.generateSelectQuery(tableName, this.analyzeColumns(rows), dbConfig.type, false)
      });
    }

    return resources;
  }

  private analyzeColumns(rows: any[]): ParsedColumn[] {
    if (!rows || rows.length === 0) return [];

    const firstRow = rows[0];
    const columns: ParsedColumn[] = [];

    for (const [key, value] of Object.entries(firstRow)) {
      let type = 'string';

      if (typeof value === 'number') {
        type = Number.isInteger(value) ? 'integer' : 'number';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      } else if (value instanceof Date) {
        type = 'string'; // Dates are handled as strings in JSON
      } else if (value === null || value === undefined) {
        // Check other rows to determine type
        for (let i = 1; i < Math.min(rows.length, 10); i++) {
          const otherValue = rows[i][key];
          if (otherValue !== null && otherValue !== undefined) {
            if (typeof otherValue === 'number') {
              type = Number.isInteger(otherValue) ? 'integer' : 'number';
            } else if (typeof otherValue === 'boolean') {
              type = 'boolean';
            }
            break;
          }
        }
      }

      columns.push({
        name: key,
        type: type,
        nullable: rows.some(row => row[key] === null || row[key] === undefined)
      });
    }

    return columns;
  }

  private generateFilterProperties(columns: ParsedColumn[]): any {
    const properties: any = {};

    for (const column of columns) {
      const baseType = column.type === 'integer' ? 'number' : column.type;
      properties[`filter_${column.name}`] = {
        type: baseType,
        description: `Filter by ${column.name}`
      };
    }

    return properties;
  }

  private generateInputProperties(columns: ParsedColumn[], isCreate: boolean): any {
    const properties: any = {};

    for (const column of columns) {
      // Skip ID field for create operations
      if (isCreate && column.name.toLowerCase() === 'id') continue;

      const baseType = column.type === 'integer' ? 'number' : column.type;
      properties[column.name] = {
        type: baseType,
        description: `${column.name} field`
      };

      // For nullable fields, make them not required instead of using union types
      if (column.nullable && !isCreate) {
        // Optional field - will not be added to required array
      }
    }

    return properties;
  }

  private generateSelectQuery(tableName: string, columns: ParsedColumn[], dbType: string, withParams: boolean = true): string {
    const columnList = columns.map(col => this.quoteIdentifier(col.name, dbType)).join(', ');
    let query = `SELECT ${columnList} FROM ${this.quoteIdentifier(tableName, dbType)}`;

    if (withParams) {
      if (dbType === 'mysql' || dbType === 'postgresql') {
        // MySQL and PostgreSQL: simple query without complex WHERE, parameters handled in executor
        const orderColumn = columns.find(col =>
          col.name.toLowerCase() === 'id' ||
          col.name.toLowerCase().includes('created') ||
          col.name.toLowerCase().includes('timestamp')
        ) || columns[0];

        if (orderColumn) {
          query += ` ORDER BY ${this.quoteIdentifier(orderColumn.name, dbType)}`;
        }

        if (dbType === 'mysql') {
          query += ' LIMIT ? OFFSET ?';
        } else {
          query += ' LIMIT $1 OFFSET $2';
        }
      } else {
        // MSSQL: keep existing logic with @params
        const whereConditions = columns.map(col =>
          `(@filter_${col.name} IS NULL OR ${this.quoteIdentifier(col.name, dbType)} = @filter_${col.name})`
        ).join(' AND ');

        query += ` WHERE ${whereConditions}`;

        const orderColumn = columns.find(col =>
          col.name.toLowerCase() === 'id' ||
          col.name.toLowerCase().includes('created') ||
          col.name.toLowerCase().includes('timestamp')
        ) || columns[0];

        if (orderColumn) {
          query += ` ORDER BY ${this.quoteIdentifier(orderColumn.name, dbType)}`;
        }

        query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      }
    }

    return query;
  }

  private generateInsertQuery(tableName: string, columns: ParsedColumn[], dbType: string): string {
    const insertColumns = columns.filter(col => col.name.toLowerCase() !== 'id');
    const columnNames = insertColumns.map(col => this.quoteIdentifier(col.name, dbType)).join(', ');
    const paramNames = insertColumns.map((col, idx) => this.getParamPlaceholder(col.name, idx + 1, dbType)).join(', ');

    return `INSERT INTO ${this.quoteIdentifier(tableName, dbType)} (${columnNames}) VALUES (${paramNames})`;
  }

  private generateUpdateQuery(tableName: string, columns: ParsedColumn[], dbType: string): string {
    const updateColumns = columns.filter(col => col.name.toLowerCase() !== 'id');

    if (dbType === 'mysql') {
      const setClause = updateColumns.map(col => `${this.quoteIdentifier(col.name, dbType)} = ?`).join(', ');
      return `UPDATE ${this.quoteIdentifier(tableName, dbType)} SET ${setClause} WHERE ${this.quoteIdentifier('id', dbType)} = ?`;
    } else if (dbType === 'postgresql') {
      const setClause = updateColumns.map((col, idx) => `${this.quoteIdentifier(col.name, dbType)} = $${idx + 1}`).join(', ');
      return `UPDATE ${this.quoteIdentifier(tableName, dbType)} SET ${setClause} WHERE ${this.quoteIdentifier('id', dbType)} = $${updateColumns.length + 1}`;
    } else {
      const setClause = updateColumns.map(col => `${this.quoteIdentifier(col.name, dbType)} = @${col.name}`).join(', ');
      return `UPDATE ${this.quoteIdentifier(tableName, dbType)} SET ${setClause} WHERE ${this.quoteIdentifier('Id', dbType)} = @id`;
    }
  }

  private generateDeleteQuery(tableName: string, dbType: string): string {
    if (dbType === 'mysql') {
      return `DELETE FROM ${this.quoteIdentifier(tableName, dbType)} WHERE ${this.quoteIdentifier('id', dbType)} = ?`;
    } else if (dbType === 'postgresql') {
      return `DELETE FROM ${this.quoteIdentifier(tableName, dbType)} WHERE ${this.quoteIdentifier('id', dbType)} = $1`;
    } else {
      return `DELETE FROM ${this.quoteIdentifier(tableName, dbType)} WHERE ${this.quoteIdentifier('Id', dbType)} = @id`;
    }
  }

  private generateCountQuery(tableName: string, columns: ParsedColumn[], dbType: string): string {
    let query = `SELECT COUNT(*) as total_count FROM ${this.quoteIdentifier(tableName, dbType)}`;

    if (dbType === 'mssql') {
      const whereConditions = columns.map(col =>
        `(@filter_${col.name} IS NULL OR ${this.quoteIdentifier(col.name, dbType)} = @filter_${col.name})`
      ).join(' AND ');
      query += ` WHERE ${whereConditions}`;
    }
    // MySQL and PostgreSQL: no WHERE clause for simple count

    return query;
  }

  private generateMinQuery(tableName: string, columnName: string, columns: ParsedColumn[], dbType: string): string {
    let query = `SELECT MIN(${this.quoteIdentifier(columnName, dbType)}) as min_value FROM ${this.quoteIdentifier(tableName, dbType)}`;

    if (dbType === 'mssql') {
      const whereConditions = columns.map(col =>
        `(@filter_${col.name} IS NULL OR ${this.quoteIdentifier(col.name, dbType)} = @filter_${col.name})`
      ).join(' AND ');
      query += ` WHERE ${whereConditions}`;
    }

    return query;
  }

  private generateMaxQuery(tableName: string, columnName: string, columns: ParsedColumn[], dbType: string): string {
    let query = `SELECT MAX(${this.quoteIdentifier(columnName, dbType)}) as max_value FROM ${this.quoteIdentifier(tableName, dbType)}`;

    if (dbType === 'mssql') {
      const whereConditions = columns.map(col =>
        `(@filter_${col.name} IS NULL OR ${this.quoteIdentifier(col.name, dbType)} = @filter_${col.name})`
      ).join(' AND ');
      query += ` WHERE ${whereConditions}`;
    }

    return query;
  }

  private generateSumQuery(tableName: string, columnName: string, columns: ParsedColumn[], dbType: string): string {
    let query = `SELECT SUM(${this.quoteIdentifier(columnName, dbType)}) as sum_value FROM ${this.quoteIdentifier(tableName, dbType)}`;

    if (dbType === 'mssql') {
      const whereConditions = columns.map(col =>
        `(@filter_${col.name} IS NULL OR ${this.quoteIdentifier(col.name, dbType)} = @filter_${col.name})`
      ).join(' AND ');
      query += ` WHERE ${whereConditions}`;
    }

    return query;
  }

  private generateAvgQuery(tableName: string, columnName: string, columns: ParsedColumn[], dbType: string): string {
    let query: string;

    if (dbType === 'mysql') {
      query = `SELECT AVG(${this.quoteIdentifier(columnName, dbType)}) as avg_value FROM ${this.quoteIdentifier(tableName, dbType)}`;
    } else if (dbType === 'postgresql') {
      query = `SELECT AVG(${this.quoteIdentifier(columnName, dbType)}::FLOAT) as avg_value FROM ${this.quoteIdentifier(tableName, dbType)}`;
    } else {
      query = `SELECT AVG(CAST(${this.quoteIdentifier(columnName, dbType)} AS FLOAT)) as avg_value FROM ${this.quoteIdentifier(tableName, dbType)}`;
      const whereConditions = columns.map(col =>
        `(@filter_${col.name} IS NULL OR ${this.quoteIdentifier(col.name, dbType)} = @filter_${col.name})`
      ).join(' AND ');
      query += ` WHERE ${whereConditions}`;
    }

    return query;
  }

  private sanitizeName(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Database-specific SQL formatting helpers
  private quoteIdentifier(name: string, dbType: string): string {
    switch (dbType) {
      case 'mysql':
        return `\`${name}\``;
      case 'postgresql':
        return `"${name}"`;
      case 'mssql':
      default:
        return `[${name}]`;
    }
  }

  private getParamPlaceholder(name: string, index: number, dbType: string): string {
    switch (dbType) {
      case 'mysql':
        return '?';
      case 'postgresql':
        return `$${index}`;
      case 'mssql':
      default:
        return `@${name}`;
    }
  }

  // Public methods for management
  getAllServers(): ServerConfig[] {
    return this.sqliteManager.getAllServers();
  }

  getServer(serverId: string): ServerConfig | null {
    return this.sqliteManager.getServer(serverId);
  }

  deleteServer(serverId: string): void {
    this.sqliteManager.deleteServer(serverId);
    console.log(`🗑️ Deleted server from SQLite database: ${serverId}`);
  }

  getAllTools(): ToolDefinition[] {
    return this.sqliteManager.getAllTools();
  }

  getToolsForServer(serverId: string): ToolDefinition[] {
    return this.sqliteManager.getToolsForServer(serverId);
  }

  getAllResources(): ResourceDefinition[] {
    return this.sqliteManager.getAllResources();
  }

  getResourcesForServer(serverId: string): ResourceDefinition[] {
    return this.sqliteManager.getResourcesForServer(serverId);
  }

  getStats(): { servers: number; tools: number; resources: number } {
    return this.sqliteManager.getStats();
  }

  close(): void {
    this.sqliteManager.close();
  }
}

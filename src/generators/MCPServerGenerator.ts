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
      } else if (dbConfig?.type === DataSourceType.Curl) {
        tools = this.generateToolsForCurl(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.GitHub) {
        tools = this.generateToolsForGitHub(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.X) {
        tools = this.generateToolsForX(serverId, dbConfig);
      } else if (dbConfig?.type === DataSourceType.X) {
        tools = this.generateToolsForX(serverId, dbConfig);
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
      type: DataSourceType.Elasticsearch,
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

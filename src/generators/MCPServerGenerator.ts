import { SQLiteManager, ServerConfig, ToolDefinition, ResourceDefinition } from '../database/sqlite-manager';
import { DataSourceType } from '../types';

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
      } else if (dbConfig?.type === DataSourceType.Jira) {
        //console.log('✅ Matched Jira type, generating Jira tools');
        tools = this.generateToolsForJira(serverId, dbConfig);
        //console.log('✅ Generated Jira tools:', tools.length);
      } else {
        //console.log('⚠️ Falling back to generateToolsForData, dbConfig.type:', dbConfig?.type);
        tools = this.generateToolsForData(serverId, parsedData as ParsedData, dbConfig, selectedTables);
        //console.log('✅ Generated data tools:', tools.length);
      }
      if (tools.length > 0) {
        this.sqliteManager.saveTools(tools);
        //console.log(`✅ Generated ${tools.length} tools for server ${serverId}`);
      }

      // Generate and save resources (skip for REST, webpage, curl, GitHub, and Jira)
      let resources: ResourceDefinition[] = [];
      if (!(Array.isArray(parsedData) || dbConfig?.type === DataSourceType.Rest || dbConfig?.type === DataSourceType.Webpage || dbConfig?.type === DataSourceType.Curl || dbConfig?.type === DataSourceType.GitHub || dbConfig?.type === DataSourceType.Jira)) {
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

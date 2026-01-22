import { SQLiteManager, ServerConfig, ToolDefinition, ResourceDefinition } from './database/sqlite-manager';
import { ActiveDatabaseConnection, DataSourceType } from './types';
import sql from 'mssql';
import mysql from 'mysql2/promise';
import { Pool } from 'pg';

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

      if (queryConfig?.type === DataSourceType.Jira) {
        return await this.executeJiraCall(queryConfig, args);
      }

      return await this.executeDatabaseQuery(serverId, serverConfig, tool, args);

    } catch (error) {
      console.error(`❌ Error executing tool ${toolName}:`, error);
      throw error;
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

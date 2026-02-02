import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import os from 'os';
import { DataSourceParser } from '../parsers';
import { MCPServerGenerator } from '../generators/MCPServerGenerator';
import { MCPTestRunner } from '../client/MCPTestRunner';
import { DynamicMCPExecutor } from '../dynamic-mcp-executor';
import {
  DataSource,
  DataSourceType,
  MCPServerConfig,
  ParsedData,
  CurlDataSource,
  createCurlDataSource,
  CsvDataSource,
  ExcelDataSource,
  createCsvDataSource,
  createExcelDataSource,
  RestDataSource,
  createRestDataSource,
  GeneratorConfig,
  createRestGeneratorConfig,
  createWebpageGeneratorConfig,
  createGraphQLGeneratorConfig,
  createSoapGeneratorConfig,
  createRssGeneratorConfig,
  createCurlGeneratorConfig,
  createFileGeneratorConfig,
  createGitHubGeneratorConfig,
  createXGeneratorConfig,
  createPrometheusGeneratorConfig,
  createGrafanaGeneratorConfig,
  createMongoDBGeneratorConfig,
  createFacebookGeneratorConfig,
  createInstagramGeneratorConfig,
  createTikTokGeneratorConfig,
  createNotionGeneratorConfig,
  createTelegramGeneratorConfig,
  createOpenAIGeneratorConfig,
  createClaudeGeneratorConfig,
  createGeminiGeneratorConfig,
  createGrokGeneratorConfig,
  createSpotifyGeneratorConfig,
  createSonosGeneratorConfig,
  createShazamGeneratorConfig,
  createPhilipsHueGeneratorConfig,
  createEightSleepGeneratorConfig,
  createHomeAssistantGeneratorConfig,
  createAppleNotesGeneratorConfig,
  createAppleRemindersGeneratorConfig,
  createThings3GeneratorConfig,
  createObsidianGeneratorConfig,
  createBearNotesGeneratorConfig,
  createIMessageGeneratorConfig,
  createZoomGeneratorConfig,
  createMicrosoftTeamsGeneratorConfig,
  createSignalGeneratorConfig,
  createFalAIGeneratorConfig,
  createHuggingFaceGeneratorConfig,
  createLlamaGeneratorConfig,
  createDeepSeekGeneratorConfig,
  createAzureOpenAIGeneratorConfig,
  createMistralGeneratorConfig,
  createCohereGeneratorConfig,
  createPerplexityGeneratorConfig,
  createTogetherGeneratorConfig,
  createFireworksGeneratorConfig,
  createGroqGeneratorConfig,
  createOpenRouterGeneratorConfig,
  createDropboxGeneratorConfig,
  createN8nGeneratorConfig,
  createTrelloGeneratorConfig,
  createGitLabGeneratorConfig,
  createBitbucketGeneratorConfig,
  createGDriveGeneratorConfig,
  createGoogleCalendarGeneratorConfig,
  createGoogleDocsGeneratorConfig,
  createGoogleSheetsGeneratorConfig,
  createAirtableGeneratorConfig,
  createAsanaGeneratorConfig,
  createMondayGeneratorConfig,
  createClickUpGeneratorConfig,
  createLinearGeneratorConfig,
  createSupabaseGeneratorConfig,
  createNpmGeneratorConfig,
  createNugetGeneratorConfig,
  createMavenGeneratorConfig,
  createGradleGeneratorConfig,
  createNexusGeneratorConfig,
  createJenkinsGeneratorConfig,
  createDockerHubGeneratorConfig,
  createJiraGeneratorConfig,
  createConfluenceGeneratorConfig,
  createFtpGeneratorConfig,
  createLocalFSGeneratorConfig,
  createEmailGeneratorConfig,
  createSlackGeneratorConfig,
  createDiscordGeneratorConfig,
  createDockerGeneratorConfig,
  createKubernetesGeneratorConfig,
  createElasticsearchGeneratorConfig,
  createOpenSearchGeneratorConfig,
  createOpenShiftGeneratorConfig
} from '../types';
import { fork } from 'child_process';
import { IntegratedMCPServer } from '../integrated-mcp-server-new';
import { SQLiteManager } from '../database/sqlite-manager';
import Database from 'better-sqlite3';

const app = express();

// Resolve a writable uploads directory that works under npx (CWD may be '/')
// Priority: QUICKMCP_UPLOAD_DIR -> os.tmpdir()/quickmcp-uploads
const configuredUploadDir = process.env.QUICKMCP_UPLOAD_DIR;
const defaultUploadDir = path.join(os.tmpdir(), 'quickmcp-uploads');
const uploadDir = configuredUploadDir
  ? (path.isAbsolute(configuredUploadDir)
      ? configuredUploadDir
      : path.join(process.cwd(), configuredUploadDir))
  : defaultUploadDir;

try { fsSync.mkdirSync(uploadDir, { recursive: true }); } catch {}
const upload = multer({ dest: uploadDir });

app.use(cors());
app.use(express.json());

// Prefer the new UI under src/web/public if bundled, otherwise fall back to dist/web/public
const distPublicDir = path.join(__dirname, 'public');
const srcPublicDir = path.join(__dirname, '..', '..', 'src', 'web', 'public');
const publicDir = fsSync.existsSync(srcPublicDir) ? srcPublicDir : distPublicDir;

app.use(express.static(publicDir));

const parser = new DataSourceParser();
// Lazily initialize heavy/native-backed services to avoid startup failure
let generator: MCPServerGenerator | null = null;
let sqliteManager: SQLiteManager | null = null;
const testRunner = new MCPTestRunner();

function ensureGenerator(): MCPServerGenerator {
  if (!generator) {
    generator = new MCPServerGenerator();
  }
  return generator;
}

function ensureSQLite(): SQLiteManager {
  if (!sqliteManager) {
    sqliteManager = new SQLiteManager();
  }
  return sqliteManager;
}

let nextAvailablePort = 3001;

function getNextPort(): number {
  return nextAvailablePort++;
}

function startRuntimeMCPServer(serverId: string, serverPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const serverInfo = generatedServers.get(serverId);
    if (!serverInfo) {
      reject(new Error('Server not found'));
      return;
    }

    // Kill existing process if running
    if (serverInfo.runtimeProcess) {
      serverInfo.runtimeProcess.kill();
    }

    const port = getNextPort();
    const serverDir = path.dirname(serverPath);

    //console.log(`Starting runtime MCP server for ${serverId} on port ${port}`);

    // Fork the MCP server process
    const mcpProcess = fork(serverPath, [], {
      cwd: serverDir,
      env: {
        ...process.env,
        MCP_PORT: port.toString()
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    mcpProcess.on('message', (message) => {
      if (message === 'ready') {
        //console.log(`MCP Server ${serverId} ready on port ${port}`);
        resolve(port);
      }
    });

    mcpProcess.on('error', (error) => {
      console.error(`MCP Server ${serverId} error:`, error);
      reject(error);
    });

    mcpProcess.on('exit', (code) => {
      //console.log(`MCP Server ${serverId} exited with code ${code}`);
      if (serverInfo.runtimeProcess === mcpProcess) {
        serverInfo.runtimeProcess = undefined;
        serverInfo.runtimePort = undefined;
      }
    });

    // Update server info
    serverInfo.runtimeProcess = mcpProcess;
    serverInfo.runtimePort = port;

    // Fallback timeout
    setTimeout(() => {
      if (serverInfo.runtimePort === port) {
        resolve(port);
      }
    }, 3000);
  });
}

// Store generated servers in memory (in production, use a database)
const generatedServers = new Map<string, {
  config: MCPServerConfig;
  serverPath: string;
  parsedData: ParsedData[];
  runtimeProcess?: any;
  runtimePort?: number;
}>();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// List directories endpoint for directory picker
app.get('/api/directories', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    const os = await import('os');

    let requestedPath = req.query.path as string;

    // Default to home directory if no path provided
    if (!requestedPath || requestedPath === '~') {
      requestedPath = os.homedir();
    }

    // Resolve the path
    const resolvedPath = pathModule.resolve(requestedPath);

    // Read directory contents
    const entries = await fs.readdir(resolvedPath, { withFileTypes: true });

    // Filter only directories and sort
    const directories = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => ({
        name: entry.name,
        path: pathModule.join(resolvedPath, entry.name)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Get parent directory
    const parentPath = pathModule.dirname(resolvedPath);
    const hasParent = parentPath !== resolvedPath;

    res.json({
      success: true,
      currentPath: resolvedPath,
      parentPath: hasParent ? parentPath : null,
      directories
    });
  } catch (error) {
    console.error('Directory listing error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list directories'
    });
  }
});

// Parse data source endpoint
app.post('/api/parse', upload.single('file'), async (req, res) => {
  try {
    const { type, connection, swaggerUrl, curlSetting } = req.body as any;
    const file = req.file;

    let dataSource: DataSource | CurlDataSource | CsvDataSource | ExcelDataSource;

    // Accept database parse either when type==='database' OR when a connection payload is present
    if (type === DataSourceType.Database || connection) {
      let connObj: any = connection;
      if (typeof connObj === 'string') {
        try { connObj = JSON.parse(connObj); } catch { connObj = null; }
      }
      if (!connObj || !connObj.type) {
        throw new Error('Missing or invalid database connection');
      }
      dataSource = {
        type: DataSourceType.Database,
        name: `Database (${connObj.type})`,
        connection: connObj
      } as any;
    } else if (type === DataSourceType.Rest) {
      if (!swaggerUrl) throw new Error('Missing swaggerUrl');
      // Fetch OpenAPI spec
      const resp = await fetch(swaggerUrl);
      if (!resp.ok) throw new Error(`Failed to fetch OpenAPI: ${resp.status}`);
      const spec: any = await resp.json();
      // Derive baseUrl
      let baseUrl = '';
      if (spec && Array.isArray(spec.servers) && spec.servers.length && spec.servers[0]?.url) {
        baseUrl = spec.servers[0].url;
      } else if (spec && spec.schemes && spec.host) {
        const scheme = Array.isArray(spec.schemes) && spec.schemes.length ? spec.schemes[0] : 'https';
        const basePath = spec.basePath || '';
        baseUrl = `${scheme}://${spec.host}${basePath}`;
      } else {
        // Fallback: strip filename from swaggerUrl
        try {
          const u = new URL(swaggerUrl);
          baseUrl = swaggerUrl.replace(/\/[^/]*$/, '');
          if (!baseUrl.startsWith(u.origin)) baseUrl = u.origin;
        } catch { baseUrl = swaggerUrl.replace(/\/[^/]*$/, ''); }
      }
      // Parse paths -> endpoints
      const endpoints: any[] = [];
      const paths = (spec && (spec as any).paths) || {};
      const methods = ['get','post','put','patch','delete'];
      for (const p of Object.keys(paths)) {
        const ops = paths[p] || {};
        for (const m of methods) {
          if (ops[m]) {
            const op = ops[m];
            endpoints.push({
              method: m.toUpperCase(),
              path: p,
              summary: op.summary || op.operationId || '',
              parameters: op.parameters || [],
              requestBody: op.requestBody || null
            });
          }
        }
      }
      const restDataSource: RestDataSource = createRestDataSource(`REST API`, swaggerUrl, baseUrl);
      return res.json({
        success: true,
        data: {
          dataSource: restDataSource,
          parsedData: endpoints
        }
      });
    } else if (type === DataSourceType.Curl) {
        let opts;
        if (typeof curlSetting === 'string') {
            try {
                opts = JSON.parse(curlSetting);
            } catch (e) {
                throw new Error('Invalid curlSetting JSON');
            }
        } else {
            opts = curlSetting;
        }

        if (!opts || !opts.url) {
            throw new Error('Missing curlSetting or url');
        }

        dataSource = createCurlDataSource(`cURL to ${opts.url}`, opts);
        
        // For cURL, there's no data to parse beforehand.
        // The "data" is what the cURL command will fetch at runtime.
        // We'll create a single tool to represent this action.
        const parsedData = [{
            tableName: 'curl_request',
            headers: ['url', 'method', 'status', 'response'],
            rows: [],
            metadata: {
                rowCount: 0,
                columnCount: 4,
                dataTypes: {
                    url: 'string',
                    method: 'string',
                    status: 'number',
                    response: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Webpage) {
        const { webUrl, alias } = req.body as any;

        if (!webUrl) {
            throw new Error('Missing webUrl');
        }

        const dataSource = {
            type: DataSourceType.Webpage,
            name: alias || 'webpage',
            url: webUrl,
            alias: alias
        };

        // For Webpage, content is fetched at runtime
        const parsedData = [{
            tableName: 'webpage',
            headers: ['url', 'content'],
            rows: [],
            metadata: {
                rowCount: 0,
                columnCount: 2,
                dataTypes: {
                    url: 'string',
                    content: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.GraphQL) {
        const { graphqlBaseUrl, graphqlHeaders } = req.body as any;
        if (!graphqlBaseUrl) {
            throw new Error('Missing GraphQL base URL');
        }
        let headers = {};
        if (graphqlHeaders) {
            try { headers = typeof graphqlHeaders === 'string' ? JSON.parse(graphqlHeaders) : graphqlHeaders; } catch {
                throw new Error('Invalid GraphQL headers JSON');
            }
        }
        const dataSource = {
            type: DataSourceType.GraphQL,
            name: 'GraphQL',
            baseUrl: graphqlBaseUrl,
            headers
        };
        const parsedData = [{
            tableName: 'graphql_tools',
            headers: ['tool', 'description'],
            rows: [
                ['query', 'Execute a GraphQL query'],
                ['introspect', 'Run GraphQL schema introspection']
            ],
            metadata: {
                rowCount: 2,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];
        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Soap) {
        const { soapBaseUrl, soapWsdlUrl, soapAction, soapHeaders } = req.body as any;
        if (!soapBaseUrl) {
            throw new Error('Missing SOAP base URL');
        }
        let headers = {};
        if (soapHeaders) {
            try { headers = typeof soapHeaders === 'string' ? JSON.parse(soapHeaders) : soapHeaders; } catch {
                throw new Error('Invalid SOAP headers JSON');
            }
        }
        const dataSource = {
            type: DataSourceType.Soap,
            name: 'SOAP',
            baseUrl: soapBaseUrl,
            wsdlUrl: soapWsdlUrl,
            soapAction,
            headers
        };
        const parsedData = [{
            tableName: 'soap_tools',
            headers: ['tool', 'description'],
            rows: [
                ['call_operation', 'Call a SOAP operation with XML body']
            ],
            metadata: {
                rowCount: 1,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];
        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Rss) {
        const { rssFeedUrl } = req.body as any;
        if (!rssFeedUrl) {
            throw new Error('Missing RSS feed URL');
        }
        const dataSource = {
            type: DataSourceType.Rss,
            name: 'RSS/Atom',
            feedUrl: rssFeedUrl
        };
        const parsedData = [{
            tableName: 'rss_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_feed', 'Fetch feed metadata and items'],
                ['list_entries', 'List feed entries']
            ],
            metadata: {
                rowCount: 2,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];
        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.GitHub) {
        const { githubToken, githubOwner, githubRepo } = req.body as any;

        if (!githubToken) {
            throw new Error('Missing GitHub token');
        }

        const dataSource = {
            type: DataSourceType.GitHub,
            name: 'GitHub',
            token: githubToken,
            owner: githubOwner,
            repo: githubRepo
        };

        // For GitHub, tools are predefined - no parsing needed
        const parsedData = [{
            tableName: 'github_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_repos', 'List repositories for the authenticated user'],
                ['search_repos', 'Search for repositories on GitHub'],
                ['get_repo', 'Get details of a specific repository'],
                ['list_issues', 'List issues for a repository'],
                ['create_issue', 'Create a new issue in a repository'],
                ['list_pull_requests', 'List pull requests for a repository'],
                ['get_file_contents', 'Get contents of a file from a repository'],
                ['list_commits', 'List commits for a repository'],
                ['get_user', 'Get information about a GitHub user'],
                ['create_issue_comment', 'Create a comment on an issue']
            ],
            metadata: {
                rowCount: 10,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.X) {
        const { xToken, xUsername } = req.body as any;

        if (!xToken) {
            throw new Error('Missing X API token');
        }

        const dataSource = {
            type: DataSourceType.X,
            name: 'X',
            token: xToken,
            username: xUsername
        };

        const parsedData = [{
            tableName: 'x_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_user_by_username', 'Get X user details by username'],
                ['get_user', 'Get X user details by user ID'],
                ['get_user_tweets', 'Get recent tweets from a user (max_results 10-100)'],
                ['search_recent_tweets', 'Search recent tweets by query (max_results 10-100)'],
                ['get_tweet', 'Get a tweet by ID'],
                ['create_tweet', 'Create a new tweet']
            ],
            metadata: {
                rowCount: 6,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Prometheus) {
        const { prometheusBaseUrl } = req.body as any;
        if (!prometheusBaseUrl) {
            throw new Error('Missing Prometheus base URL');
        }
        const dataSource = {
            type: DataSourceType.Prometheus,
            name: 'Prometheus',
            baseUrl: prometheusBaseUrl
        };
        const parsedData = [{
            tableName: 'prometheus_tools',
            headers: ['tool', 'description'],
            rows: [
                ['query', 'Run an instant PromQL query'],
                ['query_range', 'Run a range PromQL query'],
                ['labels', 'List label names'],
                ['series', 'Find series by label matchers'],
                ['targets', 'List Prometheus targets']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];
        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Grafana) {
        const { grafanaBaseUrl, grafanaAuthType, grafanaApiKey, grafanaUsername, grafanaPassword } = req.body as any;
        if (!grafanaBaseUrl) {
            throw new Error('Missing Grafana base URL');
        }
        if (!grafanaAuthType || (grafanaAuthType !== 'apiKey' && grafanaAuthType !== 'basic')) {
            throw new Error('Missing Grafana auth type');
        }
        if (grafanaAuthType === 'apiKey' && !grafanaApiKey) {
            throw new Error('Missing Grafana API key');
        }
        if (grafanaAuthType === 'basic' && (!grafanaUsername || !grafanaPassword)) {
            throw new Error('Missing Grafana username or password');
        }
        const dataSource = {
            type: DataSourceType.Grafana,
            name: 'Grafana',
            baseUrl: grafanaBaseUrl,
            authType: grafanaAuthType,
            apiKey: grafanaApiKey,
            username: grafanaUsername,
            password: grafanaPassword
        };
        const parsedData = [{
            tableName: 'grafana_tools',
            headers: ['tool', 'description'],
            rows: [
                ['search_dashboards', 'Search dashboards (by title/tag)'],
                ['get_dashboard', 'Get dashboard by UID'],
                ['list_datasources', 'List Grafana datasources'],
                ['get_datasource', 'Get datasource by ID'],
                ['query_datasource', 'Query a datasource']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];
        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.MongoDB) {
        const { mongoHost, mongoPort, mongoDatabase, mongoUsername, mongoPassword, mongoAuthSource } = req.body as any;

        if (!mongoHost || !mongoDatabase) {
            throw new Error('Missing MongoDB host or database');
        }

        const dataSource = {
            type: DataSourceType.MongoDB,
            name: 'MongoDB',
            host: mongoHost,
            port: mongoPort ? parseInt(mongoPort, 10) : undefined,
            database: mongoDatabase,
            username: mongoUsername,
            password: mongoPassword,
            authSource: mongoAuthSource
        };

        const parsedData = [{
            tableName: 'mongodb_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_databases', 'List databases on the MongoDB server'],
                ['list_collections', 'List collections in a database'],
                ['find', 'Find documents in a collection'],
                ['insert_one', 'Insert a document into a collection'],
                ['update_one', 'Update a single document in a collection'],
                ['delete_one', 'Delete a single document in a collection'],
                ['aggregate', 'Run an aggregation pipeline']
            ],
            metadata: {
                rowCount: 7,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Facebook) {
        const { facebookBaseUrl, facebookApiVersion, facebookAccessToken, facebookUserId, facebookPageId } = req.body as any;

        if (!facebookBaseUrl || !facebookApiVersion || !facebookAccessToken) {
            throw new Error('Missing Facebook base URL, API version, or access token');
        }

        const dataSource = {
            type: DataSourceType.Facebook,
            name: 'Facebook',
            baseUrl: facebookBaseUrl,
            apiVersion: facebookApiVersion,
            accessToken: facebookAccessToken,
            userId: facebookUserId,
            pageId: facebookPageId
        };

        const parsedData = [{
            tableName: 'facebook_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_user', 'Get a Facebook user by ID'],
                ['get_pages', 'List pages for a user'],
                ['get_page_posts', 'List posts for a page'],
                ['get_post', 'Get a post by ID'],
                ['search', 'Search public content'],
                ['get_page_insights', 'Get insights for a page']
            ],
            metadata: {
                rowCount: 6,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Instagram) {
        const { instagramBaseUrl, instagramAccessToken, instagramUserId } = req.body as any;

        if (!instagramBaseUrl || !instagramAccessToken) {
            throw new Error('Missing Instagram base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.Instagram,
            name: 'Instagram',
            baseUrl: instagramBaseUrl,
            accessToken: instagramAccessToken,
            userId: instagramUserId
        };

        const parsedData = [{
            tableName: 'instagram_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_user', 'Get user profile'],
                ['get_user_media', 'List media for a user'],
                ['get_media', 'Get media by ID'],
                ['get_media_comments', 'List comments for a media item']
            ],
            metadata: {
                rowCount: 4,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.TikTok) {
        const { tiktokBaseUrl, tiktokAccessToken, tiktokUserId } = req.body as any;

        if (!tiktokBaseUrl || !tiktokAccessToken) {
            throw new Error('Missing TikTok base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.TikTok,
            name: 'TikTok',
            baseUrl: tiktokBaseUrl,
            accessToken: tiktokAccessToken,
            userId: tiktokUserId
        };

        const parsedData = [{
            tableName: 'tiktok_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_user_info', 'Get user profile'],
                ['list_videos', 'List videos for a user'],
                ['get_video', 'Get video by ID'],
                ['search_videos', 'Search videos']
            ],
            metadata: {
                rowCount: 4,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Notion) {
        const { notionBaseUrl, notionAccessToken, notionVersion } = req.body as any;

        if (!notionBaseUrl || !notionAccessToken) {
            throw new Error('Missing Notion base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.Notion,
            name: 'Notion',
            baseUrl: notionBaseUrl,
            accessToken: notionAccessToken,
            notionVersion: notionVersion || '2022-06-28'
        };

        const parsedData = [{
            tableName: 'notion_tools',
            headers: ['tool', 'description'],
            rows: [
                ['search', 'Search pages and databases'],
                ['get_page', 'Get a page by ID'],
                ['get_database', 'Get a database by ID'],
                ['query_database', 'Query a database'],
                ['create_page', 'Create a new page'],
                ['update_page', 'Update a page']
            ],
            metadata: {
                rowCount: 6,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Telegram) {
        const { telegramBaseUrl, telegramBotToken, telegramChatId } = req.body as any;

        if (!telegramBaseUrl || !telegramBotToken) {
            throw new Error('Missing Telegram base URL or bot token');
        }

        const dataSource = {
            type: DataSourceType.Telegram,
            name: 'Telegram',
            baseUrl: telegramBaseUrl,
            botToken: telegramBotToken,
            defaultChatId: telegramChatId || ''
        };

        const parsedData = [{
            tableName: 'telegram_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_me', 'Get bot information'],
                ['get_updates', 'Get updates'],
                ['send_message', 'Send a message']
            ],
            metadata: {
                rowCount: 3,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.LinkedIn) {
        const { linkedinAccessToken, linkedinPersonId, linkedinOrganizationId } = req.body as any;

        if (!linkedinAccessToken) {
            throw new Error('Missing LinkedIn access token');
        }

        const dataSource = {
            type: DataSourceType.LinkedIn,
            name: 'LinkedIn',
            baseUrl: 'https://api.linkedin.com/v2',
            accessToken: linkedinAccessToken,
            personId: linkedinPersonId,
            organizationId: linkedinOrganizationId
        };

        const parsedData = [{
            tableName: 'linkedin_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_profile', 'Get profile by person ID'],
                ['get_organization', 'Get organization by ID'],
                ['list_connections', 'List connections (requires permissions)'],
                ['list_posts', 'List posts for a member or organization'],
                ['create_post', 'Create a post'],
                ['get_post', 'Get a post by ID'],
                ['search_people', 'Search people'],
                ['search_companies', 'Search companies']
            ],
            metadata: {
                rowCount: 8,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Reddit) {
        const { redditAccessToken, redditUserAgent, redditSubreddit, redditUsername } = req.body as any;

        if (!redditAccessToken) {
            throw new Error('Missing Reddit access token');
        }

        const dataSource = {
            type: DataSourceType.Reddit,
            name: 'Reddit',
            baseUrl: 'https://oauth.reddit.com',
            accessToken: redditAccessToken,
            userAgent: redditUserAgent,
            subreddit: redditSubreddit,
            username: redditUsername
        };

        const parsedData = [{
            tableName: 'reddit_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_user', 'Get user profile'],
                ['get_subreddit', 'Get subreddit details'],
                ['list_hot', 'List hot posts in a subreddit'],
                ['list_new', 'List new posts in a subreddit'],
                ['search_posts', 'Search posts in a subreddit'],
                ['get_post', 'Get a post by ID'],
                ['create_post', 'Create a post'],
                ['add_comment', 'Add a comment to a post']
            ],
            metadata: {
                rowCount: 8,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.YouTube) {
        const { youtubeApiKey, youtubeAccessToken, youtubeChannelId } = req.body as any;

        if (!youtubeApiKey) {
            throw new Error('Missing YouTube API key');
        }

        const dataSource = {
            type: DataSourceType.YouTube,
            name: 'YouTube',
            baseUrl: 'https://www.googleapis.com/youtube/v3',
            apiKey: youtubeApiKey,
            accessToken: youtubeAccessToken,
            channelId: youtubeChannelId
        };

        const parsedData = [{
            tableName: 'youtube_tools',
            headers: ['tool', 'description'],
            rows: [
                ['search', 'Search videos, channels, or playlists'],
                ['get_channel', 'Get channel details'],
                ['list_channel_videos', 'List recent channel videos'],
                ['list_playlists', 'List channel playlists'],
                ['list_playlist_items', 'List playlist items'],
                ['get_video', 'Get video details'],
                ['get_comments', 'List comments for a video'],
                ['post_comment', 'Post a comment on a video'],
                ['rate_video', 'Rate a video']
            ],
            metadata: {
                rowCount: 9,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.WhatsAppBusiness) {
        const { whatsappAccessToken, whatsappPhoneNumberId, whatsappBusinessAccountId } = req.body as any;

        if (!whatsappAccessToken || !whatsappPhoneNumberId) {
            throw new Error('Missing WhatsApp access token or phone number ID');
        }

        const dataSource = {
            type: DataSourceType.WhatsAppBusiness,
            name: 'WhatsApp Business',
            baseUrl: 'https://graph.facebook.com/v19.0',
            accessToken: whatsappAccessToken,
            phoneNumberId: whatsappPhoneNumberId,
            businessAccountId: whatsappBusinessAccountId
        };

        const parsedData = [{
            tableName: 'whatsappbusiness_tools',
            headers: ['tool', 'description'],
            rows: [
                ['send_text_message', 'Send a text message'],
                ['send_template_message', 'Send a template message'],
                ['send_media_message', 'Send a media message'],
                ['get_message_templates', 'List message templates'],
                ['get_phone_numbers', 'List phone numbers'],
                ['get_business_profile', 'Get business profile'],
                ['set_business_profile', 'Update business profile']
            ],
            metadata: {
                rowCount: 7,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Threads) {
        const { threadsAccessToken, threadsUserId } = req.body as any;

        if (!threadsAccessToken) {
            throw new Error('Missing Threads access token');
        }

        const dataSource = {
            type: DataSourceType.Threads,
            name: 'Threads',
            baseUrl: 'https://graph.facebook.com/v19.0',
            accessToken: threadsAccessToken,
            userId: threadsUserId
        };

        const parsedData = [{
            tableName: 'threads_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_user', 'Get Threads user profile'],
                ['list_threads', 'List user threads'],
                ['get_thread', 'Get a thread by ID'],
                ['create_thread', 'Create a thread'],
                ['delete_thread', 'Delete a thread'],
                ['get_thread_insights', 'Get thread insights']
            ],
            metadata: {
                rowCount: 6,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Spotify) {
        const { spotifyBaseUrl, spotifyAccessToken } = req.body as any;

        if (!spotifyBaseUrl || !spotifyAccessToken) {
            throw new Error('Missing Spotify base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.Spotify,
            name: 'Spotify',
            baseUrl: spotifyBaseUrl,
            accessToken: spotifyAccessToken
        };

        const parsedData = [{
            tableName: 'spotify_tools',
            headers: ['tool', 'description'],
            rows: [
                ['search', 'Search tracks, artists, albums, playlists'],
                ['get_track', 'Get track details'],
                ['get_artist', 'Get artist details'],
                ['get_album', 'Get album details'],
                ['get_playlist', 'Get playlist details']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Sonos) {
        const { sonosBaseUrl, sonosAccessToken } = req.body as any;

        if (!sonosBaseUrl || !sonosAccessToken) {
            throw new Error('Missing Sonos base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.Sonos,
            name: 'Sonos',
            baseUrl: sonosBaseUrl,
            accessToken: sonosAccessToken
        };

        const parsedData = [{
            tableName: 'sonos_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_households', 'List households'],
                ['list_groups', 'List groups'],
                ['play', 'Start playback'],
                ['pause', 'Pause playback'],
                ['set_volume', 'Set group volume']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Shazam) {
        const { shazamBaseUrl, shazamApiKey, shazamApiHost } = req.body as any;

        if (!shazamBaseUrl || !shazamApiKey) {
            throw new Error('Missing Shazam base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.Shazam,
            name: 'Shazam',
            baseUrl: shazamBaseUrl,
            apiKey: shazamApiKey,
            apiHost: shazamApiHost
        };

        const parsedData = [{
            tableName: 'shazam_tools',
            headers: ['tool', 'description'],
            rows: [
                ['search', 'Search tracks'],
                ['get_track', 'Get track details'],
                ['get_artist', 'Get artist details'],
                ['get_charts', 'Get charts']
            ],
            metadata: {
                rowCount: 4,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.PhilipsHue) {
        const { philipshueBaseUrl, philipshueAccessToken } = req.body as any;

        if (!philipshueBaseUrl || !philipshueAccessToken) {
            throw new Error('Missing Philips Hue base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.PhilipsHue,
            name: 'Philips Hue',
            baseUrl: philipshueBaseUrl,
            accessToken: philipshueAccessToken
        };

        const parsedData = [{
            tableName: 'philipshue_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_lights', 'List lights'],
                ['get_light', 'Get light details'],
                ['set_light_state', 'Set light state'],
                ['list_groups', 'List groups'],
                ['set_group_state', 'Set group state']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.EightSleep) {
        const { eightsleepBaseUrl, eightsleepAccessToken } = req.body as any;

        if (!eightsleepBaseUrl || !eightsleepAccessToken) {
            throw new Error('Missing 8Sleep base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.EightSleep,
            name: '8Sleep',
            baseUrl: eightsleepBaseUrl,
            accessToken: eightsleepAccessToken
        };

        const parsedData = [{
            tableName: 'eightsleep_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_user', 'Get current user'],
                ['get_sessions', 'Get sleep sessions'],
                ['get_trends', 'Get sleep trends'],
                ['set_pod_temperature', 'Set pod temperature']
            ],
            metadata: {
                rowCount: 4,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.HomeAssistant) {
        const { homeassistantBaseUrl, homeassistantAccessToken } = req.body as any;

        if (!homeassistantBaseUrl || !homeassistantAccessToken) {
            throw new Error('Missing Home Assistant base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.HomeAssistant,
            name: 'Home Assistant',
            baseUrl: homeassistantBaseUrl,
            accessToken: homeassistantAccessToken
        };

        const parsedData = [{
            tableName: 'homeassistant_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_states', 'List entity states'],
                ['get_services', 'List available services'],
                ['call_service', 'Call a service'],
                ['get_config', 'Get configuration']
            ],
            metadata: {
                rowCount: 4,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.AppleNotes) {
        const { applenotesBaseUrl, applenotesAccessToken } = req.body as any;

        if (!applenotesBaseUrl || !applenotesAccessToken) {
            throw new Error('Missing Apple Notes base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.AppleNotes,
            name: 'Apple Notes',
            baseUrl: applenotesBaseUrl,
            accessToken: applenotesAccessToken
        };

        const parsedData = [{
            tableName: 'applenotes_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_notes', 'List notes'],
                ['get_note', 'Get a note'],
                ['create_note', 'Create a note'],
                ['update_note', 'Update a note'],
                ['delete_note', 'Delete a note']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.AppleReminders) {
        const { appleremindersBaseUrl, appleremindersAccessToken } = req.body as any;

        if (!appleremindersBaseUrl || !appleremindersAccessToken) {
            throw new Error('Missing Apple Reminders base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.AppleReminders,
            name: 'Apple Reminders',
            baseUrl: appleremindersBaseUrl,
            accessToken: appleremindersAccessToken
        };

        const parsedData = [{
            tableName: 'applereminders_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_lists', 'List reminder lists'],
                ['list_reminders', 'List reminders'],
                ['create_reminder', 'Create a reminder'],
                ['complete_reminder', 'Complete a reminder'],
                ['delete_reminder', 'Delete a reminder']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Things3) {
        const { things3BaseUrl, things3AccessToken } = req.body as any;

        if (!things3BaseUrl || !things3AccessToken) {
            throw new Error('Missing Things 3 base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.Things3,
            name: 'Things 3',
            baseUrl: things3BaseUrl,
            accessToken: things3AccessToken
        };

        const parsedData = [{
            tableName: 'things3_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_projects', 'List projects'],
                ['list_areas', 'List areas'],
                ['list_todos', 'List todos'],
                ['create_todo', 'Create a todo'],
                ['complete_todo', 'Complete a todo']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Obsidian) {
        const { obsidianBaseUrl, obsidianAccessToken } = req.body as any;

        if (!obsidianBaseUrl || !obsidianAccessToken) {
            throw new Error('Missing Obsidian base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.Obsidian,
            name: 'Obsidian',
            baseUrl: obsidianBaseUrl,
            accessToken: obsidianAccessToken
        };

        const parsedData = [{
            tableName: 'obsidian_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_files', 'List files'],
                ['get_file', 'Get a file'],
                ['create_file', 'Create a file'],
                ['update_file', 'Update a file'],
                ['search', 'Search files']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.BearNotes) {
        const { bearnotesBaseUrl, bearnotesAccessToken } = req.body as any;

        if (!bearnotesBaseUrl || !bearnotesAccessToken) {
            throw new Error('Missing Bear Notes base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.BearNotes,
            name: 'Bear Notes',
            baseUrl: bearnotesBaseUrl,
            accessToken: bearnotesAccessToken
        };

        const parsedData = [{
            tableName: 'bearnotes_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_notes', 'List notes'],
                ['get_note', 'Get a note'],
                ['create_note', 'Create a note'],
                ['update_note', 'Update a note'],
                ['archive_note', 'Archive a note']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.IMessage) {
        const { imessageBaseUrl, imessageAccessToken } = req.body as any;

        if (!imessageBaseUrl || !imessageAccessToken) {
            throw new Error('Missing iMessage base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.IMessage,
            name: 'iMessage',
            baseUrl: imessageBaseUrl,
            accessToken: imessageAccessToken
        };

        const parsedData = [{
            tableName: 'imessage_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_chats', 'List chats'],
                ['list_messages', 'List messages in a chat'],
                ['get_message', 'Get a message'],
                ['send_message', 'Send a message']
            ],
            metadata: {
                rowCount: 4,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Zoom) {
        const { zoomBaseUrl, zoomAccessToken } = req.body as any;

        if (!zoomBaseUrl || !zoomAccessToken) {
            throw new Error('Missing Zoom base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.Zoom,
            name: 'Zoom',
            baseUrl: zoomBaseUrl,
            accessToken: zoomAccessToken
        };

        const parsedData = [{
            tableName: 'zoom_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_users', 'List users'],
                ['list_meetings', 'List meetings for a user'],
                ['get_meeting', 'Get meeting details'],
                ['create_meeting', 'Create a meeting'],
                ['delete_meeting', 'Delete a meeting']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.MicrosoftTeams) {
        const { microsoftteamsBaseUrl, microsoftteamsAccessToken } = req.body as any;

        if (!microsoftteamsBaseUrl || !microsoftteamsAccessToken) {
            throw new Error('Missing Microsoft Teams base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.MicrosoftTeams,
            name: 'Microsoft Teams',
            baseUrl: microsoftteamsBaseUrl,
            accessToken: microsoftteamsAccessToken
        };

        const parsedData = [{
            tableName: 'microsoftteams_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_teams', 'List teams'],
                ['list_channels', 'List channels in a team'],
                ['list_messages', 'List channel messages'],
                ['get_message', 'Get a message'],
                ['send_message', 'Send a message']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Signal) {
        const { signalBaseUrl, signalAccessToken } = req.body as any;

        if (!signalBaseUrl || !signalAccessToken) {
            throw new Error('Missing Signal base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.Signal,
            name: 'Signal',
            baseUrl: signalBaseUrl,
            accessToken: signalAccessToken
        };

        const parsedData = [{
            tableName: 'signal_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_groups', 'List groups'],
                ['list_messages', 'List messages'],
                ['get_message', 'Get a message'],
                ['send_message', 'Send a message']
            ],
            metadata: {
                rowCount: 4,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.OpenAI) {
        const { openaiApiKey, openaiModel } = req.body as any;
        if (!openaiApiKey) {
            throw new Error('Missing OpenAI API key');
        }

        const dataSource = {
            type: DataSourceType.OpenAI,
            name: 'OpenAI',
            baseUrl: 'https://api.openai.com/v1',
            apiKey: openaiApiKey,
            defaultModel: openaiModel || ''
        };

        const parsedData = [{
            tableName: 'openai_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Create chat completions'],
                ['embeddings', 'Create embeddings'],
                ['moderations', 'Moderate text'],
                ['images', 'Generate images'],
                ['audio_speech', 'Text to speech'],
                ['audio_transcriptions', 'Transcribe audio'],
                ['audio_translations', 'Translate audio']
            ],
            metadata: {
                rowCount: 7,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Claude) {
        const { claudeApiKey, claudeApiVersion, claudeModel } = req.body as any;
        if (!claudeApiKey) {
            throw new Error('Missing Claude API key');
        }

        const dataSource = {
            type: DataSourceType.Claude,
            name: 'Claude',
            baseUrl: 'https://api.anthropic.com/v1',
            apiKey: claudeApiKey,
            apiVersion: claudeApiVersion || '2023-06-01',
            defaultModel: claudeModel || ''
        };

        const parsedData = [{
            tableName: 'claude_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Create messages']
            ],
            metadata: {
                rowCount: 1,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Gemini) {
        const { geminiApiKey, geminiModel } = req.body as any;
        if (!geminiApiKey) {
            throw new Error('Missing Gemini API key');
        }

        const dataSource = {
            type: DataSourceType.Gemini,
            name: 'Gemini',
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
            apiKey: geminiApiKey,
            defaultModel: geminiModel || ''
        };

        const parsedData = [{
            tableName: 'gemini_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Generate content'],
                ['embeddings', 'Create embeddings']
            ],
            metadata: {
                rowCount: 2,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Grok) {
        const { grokApiKey, grokModel } = req.body as any;
        if (!grokApiKey) {
            throw new Error('Missing Grok API key');
        }

        const dataSource = {
            type: DataSourceType.Grok,
            name: 'Grok',
            baseUrl: 'https://api.x.ai/v1',
            apiKey: grokApiKey,
            defaultModel: grokModel || ''
        };

        const parsedData = [{
            tableName: 'grok_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Create chat completions'],
                ['images', 'Generate images']
            ],
            metadata: {
                rowCount: 2,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.FalAI) {
        const { falaiBaseUrl, falaiApiKey } = req.body as any;
        if (!falaiBaseUrl || !falaiApiKey) {
            throw new Error('Missing fal.ai base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.FalAI,
            name: 'fal.ai',
            baseUrl: falaiBaseUrl,
            apiKey: falaiApiKey
        };

        const parsedData = [{
            tableName: 'falai_tools',
            headers: ['tool', 'description'],
            rows: [
                ['run_model', 'Run a fal.ai model'],
                ['run_model_async', 'Run a fal.ai model (async)'],
                ['get_run_status', 'Get async run status'],
                ['get_run_result', 'Get async run result'],
                ['cancel_run', 'Cancel an async run']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.HuggingFace) {
        const { huggingfaceBaseUrl, huggingfaceApiKey, huggingfaceDefaultModel } = req.body as any;
        if (!huggingfaceBaseUrl || !huggingfaceApiKey) {
            throw new Error('Missing Hugging Face base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.HuggingFace,
            name: 'Hugging Face',
            baseUrl: huggingfaceBaseUrl,
            apiKey: huggingfaceApiKey,
            defaultModel: huggingfaceDefaultModel || ''
        };

        const parsedData = [{
            tableName: 'huggingface_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat_completion', 'Create chat completions']
            ],
            metadata: {
                rowCount: 1,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Llama) {
        const { llamaBaseUrl, llamaModel } = req.body as any;
        if (!llamaBaseUrl) {
            throw new Error('Missing Llama base URL');
        }

        const dataSource = {
            type: DataSourceType.Llama,
            name: 'Llama',
            baseUrl: llamaBaseUrl,
            defaultModel: llamaModel || ''
        };

        const parsedData = [{
            tableName: 'llama_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Chat with model'],
                ['generate', 'Generate text'],
                ['embeddings', 'Create embeddings']
            ],
            metadata: {
                rowCount: 3,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.DeepSeek) {
        const { deepseekBaseUrl, deepseekApiKey, deepseekModel } = req.body as any;
        if (!deepseekBaseUrl || !deepseekApiKey) {
            throw new Error('Missing DeepSeek base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.DeepSeek,
            name: 'DeepSeek',
            baseUrl: deepseekBaseUrl,
            apiKey: deepseekApiKey,
            defaultModel: deepseekModel || ''
        };

        const parsedData = [{
            tableName: 'deepseek_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Create chat completions'],
                ['embeddings', 'Create embeddings']
            ],
            metadata: {
                rowCount: 2,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.AzureOpenAI) {
        const { azureOpenAIBaseUrl, azureOpenAIApiKey, azureOpenAIApiVersion, azureOpenAIDeployment } = req.body as any;
        if (!azureOpenAIBaseUrl || !azureOpenAIApiKey || !azureOpenAIDeployment) {
            throw new Error('Missing Azure OpenAI base URL, API key, or deployment');
        }

        const dataSource = {
            type: DataSourceType.AzureOpenAI,
            name: 'Azure OpenAI',
            baseUrl: azureOpenAIBaseUrl,
            apiKey: azureOpenAIApiKey,
            apiVersion: azureOpenAIApiVersion || '2024-02-15-preview',
            deployment: azureOpenAIDeployment
        };

        const parsedData = [{
            tableName: 'azure_openai_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Create chat completions'],
                ['embeddings', 'Create embeddings']
            ],
            metadata: {
                rowCount: 2,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: { dataSource, parsedData }
        });
    } else if (type === DataSourceType.Mistral) {
        const { mistralBaseUrl, mistralApiKey, mistralModel } = req.body as any;
        if (!mistralBaseUrl || !mistralApiKey) {
            throw new Error('Missing Mistral base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.Mistral,
            name: 'Mistral',
            baseUrl: mistralBaseUrl,
            apiKey: mistralApiKey,
            defaultModel: mistralModel || ''
        };

        const parsedData = [{
            tableName: 'mistral_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Create chat completions'],
                ['embeddings', 'Create embeddings']
            ],
            metadata: {
                rowCount: 2,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: { dataSource, parsedData }
        });
    } else if (type === DataSourceType.Cohere) {
        const { cohereBaseUrl, cohereApiKey, cohereModel } = req.body as any;
        if (!cohereBaseUrl || !cohereApiKey) {
            throw new Error('Missing Cohere base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.Cohere,
            name: 'Cohere',
            baseUrl: cohereBaseUrl,
            apiKey: cohereApiKey,
            defaultModel: cohereModel || ''
        };

        const parsedData = [{
            tableName: 'cohere_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Chat with Cohere'],
                ['embeddings', 'Create embeddings']
            ],
            metadata: {
                rowCount: 2,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: { dataSource, parsedData }
        });
    } else if (type === DataSourceType.Perplexity) {
        const { perplexityBaseUrl, perplexityApiKey, perplexityModel } = req.body as any;
        if (!perplexityBaseUrl || !perplexityApiKey) {
            throw new Error('Missing Perplexity base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.Perplexity,
            name: 'Perplexity',
            baseUrl: perplexityBaseUrl,
            apiKey: perplexityApiKey,
            defaultModel: perplexityModel || ''
        };

        const parsedData = [{
            tableName: 'perplexity_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Create chat completions']
            ],
            metadata: {
                rowCount: 1,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: { dataSource, parsedData }
        });
    } else if (type === DataSourceType.Together) {
        const { togetherBaseUrl, togetherApiKey, togetherModel } = req.body as any;
        if (!togetherBaseUrl || !togetherApiKey) {
            throw new Error('Missing Together base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.Together,
            name: 'Together',
            baseUrl: togetherBaseUrl,
            apiKey: togetherApiKey,
            defaultModel: togetherModel || ''
        };

        const parsedData = [{
            tableName: 'together_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Create chat completions'],
                ['embeddings', 'Create embeddings']
            ],
            metadata: {
                rowCount: 2,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: { dataSource, parsedData }
        });
    } else if (type === DataSourceType.Fireworks) {
        const { fireworksBaseUrl, fireworksApiKey, fireworksModel } = req.body as any;
        if (!fireworksBaseUrl || !fireworksApiKey) {
            throw new Error('Missing Fireworks base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.Fireworks,
            name: 'Fireworks',
            baseUrl: fireworksBaseUrl,
            apiKey: fireworksApiKey,
            defaultModel: fireworksModel || ''
        };

        const parsedData = [{
            tableName: 'fireworks_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Create chat completions'],
                ['embeddings', 'Create embeddings']
            ],
            metadata: {
                rowCount: 2,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: { dataSource, parsedData }
        });
    } else if (type === DataSourceType.Groq) {
        const { groqBaseUrl, groqApiKey, groqModel } = req.body as any;
        if (!groqBaseUrl || !groqApiKey) {
            throw new Error('Missing Groq base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.Groq,
            name: 'Groq',
            baseUrl: groqBaseUrl,
            apiKey: groqApiKey,
            defaultModel: groqModel || ''
        };

        const parsedData = [{
            tableName: 'groq_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Create chat completions']
            ],
            metadata: {
                rowCount: 1,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: { dataSource, parsedData }
        });
    } else if (type === DataSourceType.OpenRouter) {
        const { openrouterBaseUrl, openrouterApiKey, openrouterModel } = req.body as any;
        if (!openrouterBaseUrl || !openrouterApiKey) {
            throw new Error('Missing OpenRouter base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.OpenRouter,
            name: 'OpenRouter',
            baseUrl: openrouterBaseUrl,
            apiKey: openrouterApiKey,
            defaultModel: openrouterModel || ''
        };

        const parsedData = [{
            tableName: 'openrouter_tools',
            headers: ['tool', 'description'],
            rows: [
                ['chat', 'Create chat completions']
            ],
            metadata: {
                rowCount: 1,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: { dataSource, parsedData }
        });
    } else if (type === DataSourceType.Dropbox) {
        const { dropboxBaseUrl, dropboxContentBaseUrl, dropboxAccessToken } = req.body as any;

        if (!dropboxBaseUrl || !dropboxAccessToken) {
            throw new Error('Missing Dropbox base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.Dropbox,
            name: 'Dropbox',
            baseUrl: dropboxBaseUrl,
            contentBaseUrl: dropboxContentBaseUrl,
            accessToken: dropboxAccessToken
        };

        const parsedData = [{
            tableName: 'dropbox_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_folder', 'List files/folders at a path'],
                ['get_metadata', 'Get metadata for a file or folder'],
                ['search', 'Search for files and folders'],
                ['download', 'Download a file'],
                ['upload', 'Upload a file']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.N8n) {
        const { n8nBaseUrl, n8nApiKey } = req.body as any;

        if (!n8nBaseUrl || !n8nApiKey) {
            throw new Error('Missing n8n base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.N8n,
            name: 'n8n',
            baseUrl: n8nBaseUrl,
            apiKey: n8nApiKey
        };

        const parsedData = [{
            tableName: 'n8n_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_workflows', 'List workflows'],
                ['get_workflow', 'Get workflow details'],
                ['activate_workflow', 'Activate a workflow'],
                ['deactivate_workflow', 'Deactivate a workflow'],
                ['list_executions', 'List executions']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Supabase) {
        const { supabaseBaseUrl, supabaseApiKey } = req.body as any;

        if (!supabaseBaseUrl || !supabaseApiKey) {
            throw new Error('Missing Supabase base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.Supabase,
            name: 'Supabase',
            baseUrl: supabaseBaseUrl,
            apiKey: supabaseApiKey
        };

        const parsedData = [{
            tableName: 'supabase_tools',
            headers: ['tool', 'description'],
            rows: [
                ['select_rows', 'Select rows from a table'],
                ['insert_row', 'Insert a row into a table'],
                ['update_rows', 'Update rows in a table'],
                ['delete_rows', 'Delete rows in a table']
            ],
            metadata: {
                rowCount: 4,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Npm) {
        const { npmBaseUrl } = req.body as any;

        if (!npmBaseUrl) {
            throw new Error('Missing npm base URL');
        }

        const dataSource = {
            type: DataSourceType.Npm,
            name: 'npm',
            baseUrl: npmBaseUrl
        };

        const parsedData = [{
            tableName: 'npm_tools',
            headers: ['tool', 'description'],
            rows: [
                ['search', 'Search packages'],
                ['get_package', 'Get package metadata'],
                ['get_version', 'Get package version metadata']
            ],
            metadata: {
                rowCount: 3,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Nuget) {
        const { nugetBaseUrl, nugetRegistrationBaseUrl } = req.body as any;

        if (!nugetBaseUrl || !nugetRegistrationBaseUrl) {
            throw new Error('Missing NuGet base URLs');
        }

        const dataSource = {
            type: DataSourceType.Nuget,
            name: 'NuGet',
            baseUrl: nugetBaseUrl,
            registrationBaseUrl: nugetRegistrationBaseUrl
        };

        const parsedData = [{
            tableName: 'nuget_tools',
            headers: ['tool', 'description'],
            rows: [
                ['search', 'Search packages'],
                ['get_package', 'Get package metadata'],
                ['get_versions', 'Get package versions']
            ],
            metadata: {
                rowCount: 3,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Maven) {
        const { mavenBaseUrl } = req.body as any;

        if (!mavenBaseUrl) {
            throw new Error('Missing Maven base URL');
        }

        const dataSource = {
            type: DataSourceType.Maven,
            name: 'Maven Central',
            baseUrl: mavenBaseUrl
        };

        const parsedData = [{
            tableName: 'maven_tools',
            headers: ['tool', 'description'],
            rows: [
                ['search', 'Search artifacts']
            ],
            metadata: {
                rowCount: 1,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Gradle) {
        const { gradleBaseUrl } = req.body as any;

        if (!gradleBaseUrl) {
            throw new Error('Missing Gradle base URL');
        }

        const dataSource = {
            type: DataSourceType.Gradle,
            name: 'Gradle',
            baseUrl: gradleBaseUrl
        };

        const parsedData = [{
            tableName: 'gradle_tools',
            headers: ['tool', 'description'],
            rows: [
                ['search_plugins', 'Search plugins'],
                ['get_plugin_versions', 'Get plugin versions']
            ],
            metadata: {
                rowCount: 2,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Nexus) {
        const { nexusBaseUrl, nexusApiKey, nexusUsername, nexusPassword } = req.body as any;

        if (!nexusBaseUrl || (!nexusApiKey && !(nexusUsername && nexusPassword))) {
            throw new Error('Missing Nexus base URL or credentials');
        }

        const dataSource = {
            type: DataSourceType.Nexus,
            name: 'Nexus',
            baseUrl: nexusBaseUrl,
            apiKey: nexusApiKey,
            username: nexusUsername,
            password: nexusPassword
        };

        const parsedData = [{
            tableName: 'nexus_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_repositories', 'List repositories'],
                ['list_components', 'List components'],
                ['search', 'Search components']
            ],
            metadata: {
                rowCount: 3,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Trello) {
        const { trelloBaseUrl, trelloApiKey, trelloApiToken, trelloMemberId, trelloBoardId, trelloListId } = req.body as any;

        if (!trelloBaseUrl || !trelloApiKey || !trelloApiToken) {
            throw new Error('Missing Trello base URL, API key, or token');
        }

        const dataSource = {
            type: DataSourceType.Trello,
            name: 'Trello',
            baseUrl: trelloBaseUrl,
            apiKey: trelloApiKey,
            apiToken: trelloApiToken,
            memberId: trelloMemberId,
            boardId: trelloBoardId,
            listId: trelloListId
        };

        const parsedData = [{
            tableName: 'trello_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_member', 'Get member details'],
                ['list_boards', 'List boards for a member'],
                ['get_board', 'Get board by ID'],
                ['list_lists', 'List lists on a board'],
                ['list_cards', 'List cards on a list'],
                ['get_card', 'Get card by ID'],
                ['create_card', 'Create a card in a list']
            ],
            metadata: {
                rowCount: 7,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.GitLab) {
        const { gitlabBaseUrl, gitlabToken, gitlabProjectId } = req.body as any;

        if (!gitlabBaseUrl || !gitlabToken) {
            throw new Error('Missing GitLab base URL or token');
        }

        const dataSource = {
            type: DataSourceType.GitLab,
            name: 'GitLab',
            baseUrl: gitlabBaseUrl,
            token: gitlabToken,
            projectId: gitlabProjectId
        };

        const parsedData = [{
            tableName: 'gitlab_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_projects', 'List projects for the authenticated user'],
                ['get_project', 'Get a project by ID or path'],
                ['list_issues', 'List issues for a project'],
                ['create_issue', 'Create an issue in a project'],
                ['list_merge_requests', 'List merge requests for a project'],
                ['get_file', 'Get file contents from repository']
            ],
            metadata: {
                rowCount: 6,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Bitbucket) {
        const { bitbucketBaseUrl, bitbucketUsername, bitbucketAppPassword, bitbucketWorkspace, bitbucketRepoSlug } = req.body as any;

        if (!bitbucketBaseUrl || !bitbucketUsername || !bitbucketAppPassword) {
            throw new Error('Missing Bitbucket base URL, username, or app password');
        }

        const dataSource = {
            type: DataSourceType.Bitbucket,
            name: 'Bitbucket',
            baseUrl: bitbucketBaseUrl,
            username: bitbucketUsername,
            appPassword: bitbucketAppPassword,
            workspace: bitbucketWorkspace,
            repoSlug: bitbucketRepoSlug
        };

        const parsedData = [{
            tableName: 'bitbucket_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_repos', 'List repositories in a workspace'],
                ['get_repo', 'Get repository details'],
                ['list_issues', 'List issues for a repository'],
                ['create_issue', 'Create an issue in a repository'],
                ['list_pull_requests', 'List pull requests for a repository'],
                ['get_file', 'Get file contents from repository']
            ],
            metadata: {
                rowCount: 6,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.GDrive) {
        const { gdriveBaseUrl, gdriveAccessToken, gdriveRootFolderId } = req.body as any;

        if (!gdriveBaseUrl || !gdriveAccessToken) {
            throw new Error('Missing Google Drive base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.GDrive,
            name: 'Google Drive',
            baseUrl: gdriveBaseUrl,
            accessToken: gdriveAccessToken,
            rootFolderId: gdriveRootFolderId
        };

        const parsedData = [{
            tableName: 'gdrive_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_files', 'List files in a folder'],
                ['get_file', 'Get file metadata by ID'],
                ['download_file', 'Download file content'],
                ['upload_file', 'Upload a file'],
                ['create_folder', 'Create a folder']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.GoogleCalendar) {
        const { gcalBaseUrl, gcalAccessToken, gcalCalendarId } = req.body as any;

        if (!gcalBaseUrl || !gcalAccessToken) {
            throw new Error('Missing Google Calendar base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.GoogleCalendar,
            name: 'Google Calendar',
            baseUrl: gcalBaseUrl,
            accessToken: gcalAccessToken,
            calendarId: gcalCalendarId
        };

        const parsedData = [{
            tableName: 'googlecalendar_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_calendars', 'List calendars for the user'],
                ['list_events', 'List events in a calendar'],
                ['get_event', 'Get event details'],
                ['create_event', 'Create a calendar event'],
                ['update_event', 'Update a calendar event']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.GoogleDocs) {
        const { gdocsBaseUrl, gdocsAccessToken, gdocsDocumentId } = req.body as any;

        if (!gdocsBaseUrl || !gdocsAccessToken) {
            throw new Error('Missing Google Docs base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.GoogleDocs,
            name: 'Google Docs',
            baseUrl: gdocsBaseUrl,
            accessToken: gdocsAccessToken,
            documentId: gdocsDocumentId
        };

        const parsedData = [{
            tableName: 'googledocs_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_document', 'Get document content'],
                ['create_document', 'Create a new document'],
                ['batch_update', 'Batch update a document']
            ],
            metadata: {
                rowCount: 3,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.GoogleSheets) {
        const { sheetsBaseUrl, sheetsAccessToken, sheetsSpreadsheetId } = req.body as any;

        if (!sheetsBaseUrl || !sheetsAccessToken) {
            throw new Error('Missing Google Sheets base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.GoogleSheets,
            name: 'Google Sheets',
            baseUrl: sheetsBaseUrl,
            accessToken: sheetsAccessToken,
            spreadsheetId: sheetsSpreadsheetId
        };

        const parsedData = [{
            tableName: 'googlesheets_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_spreadsheet', 'Get spreadsheet metadata'],
                ['get_values', 'Get values from a range'],
                ['update_values', 'Update values in a range'],
                ['append_values', 'Append values to a range'],
                ['create_spreadsheet', 'Create a new spreadsheet']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Airtable) {
        const { airtableBaseUrl, airtableAccessToken, airtableBaseId, airtableTableName } = req.body as any;

        if (!airtableBaseUrl || !airtableAccessToken) {
            throw new Error('Missing Airtable base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.Airtable,
            name: 'Airtable',
            baseUrl: airtableBaseUrl,
            accessToken: airtableAccessToken,
            baseId: airtableBaseId,
            tableName: airtableTableName
        };

        const parsedData = [{
            tableName: 'airtable_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_records', 'List records in a table'],
                ['get_record', 'Get a record by ID'],
                ['create_record', 'Create a record'],
                ['update_record', 'Update a record'],
                ['delete_record', 'Delete a record']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Asana) {
        const { asanaBaseUrl, asanaAccessToken, asanaWorkspaceId } = req.body as any;

        if (!asanaBaseUrl || !asanaAccessToken) {
            throw new Error('Missing Asana base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.Asana,
            name: 'Asana',
            baseUrl: asanaBaseUrl,
            accessToken: asanaAccessToken,
            workspaceId: asanaWorkspaceId
        };

        const parsedData = [{
            tableName: 'asana_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_projects', 'List projects in a workspace'],
                ['list_tasks', 'List tasks in a project'],
                ['get_task', 'Get a task by ID'],
                ['create_task', 'Create a task'],
                ['update_task', 'Update a task']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Monday) {
        const { mondayBaseUrl, mondayApiKey } = req.body as any;

        if (!mondayBaseUrl || !mondayApiKey) {
            throw new Error('Missing Monday base URL or API key');
        }

        const dataSource = {
            type: DataSourceType.Monday,
            name: 'Monday.com',
            baseUrl: mondayBaseUrl,
            apiKey: mondayApiKey
        };

        const parsedData = [{
            tableName: 'monday_tools',
            headers: ['tool', 'description'],
            rows: [
                ['query', 'Run a GraphQL query'],
                ['mutate', 'Run a GraphQL mutation']
            ],
            metadata: {
                rowCount: 2,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.ClickUp) {
        const { clickupBaseUrl, clickupAccessToken, clickupTeamId } = req.body as any;

        if (!clickupBaseUrl || !clickupAccessToken) {
            throw new Error('Missing ClickUp base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.ClickUp,
            name: 'ClickUp',
            baseUrl: clickupBaseUrl,
            accessToken: clickupAccessToken,
            teamId: clickupTeamId
        };

        const parsedData = [{
            tableName: 'clickup_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_teams', 'List teams'],
                ['list_spaces', 'List spaces in a team'],
                ['list_tasks', 'List tasks in a list'],
                ['create_task', 'Create a task'],
                ['update_task', 'Update a task']
            ],
            metadata: {
                rowCount: 5,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Linear) {
        const { linearBaseUrl, linearAccessToken } = req.body as any;

        if (!linearBaseUrl || !linearAccessToken) {
            throw new Error('Missing Linear base URL or access token');
        }

        const dataSource = {
            type: DataSourceType.Linear,
            name: 'Linear',
            baseUrl: linearBaseUrl,
            accessToken: linearAccessToken
        };

        const parsedData = [{
            tableName: 'linear_tools',
            headers: ['tool', 'description'],
            rows: [
                ['query', 'Run a GraphQL query'],
                ['mutate', 'Run a GraphQL mutation']
            ],
            metadata: {
                rowCount: 2,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Jenkins) {
        const { jenkinsBaseUrl, jenkinsUsername, jenkinsApiToken } = req.body as any;

        if (!jenkinsBaseUrl || !jenkinsUsername || !jenkinsApiToken) {
            throw new Error('Missing Jenkins base URL, username, or API token');
        }

        const dataSource = {
            type: DataSourceType.Jenkins,
            name: 'Jenkins',
            baseUrl: jenkinsBaseUrl,
            username: jenkinsUsername,
            apiToken: jenkinsApiToken
        };

        const parsedData = [{
            tableName: 'jenkins_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_jobs', 'List jobs on Jenkins'],
                ['get_job', 'Get job details'],
                ['trigger_build', 'Trigger a build for a job'],
                ['get_build', 'Get build details']
            ],
            metadata: {
                rowCount: 4,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.DockerHub) {
        const { dockerhubBaseUrl, dockerhubAccessToken, dockerhubNamespace } = req.body as any;

        if (!dockerhubBaseUrl) {
            throw new Error('Missing Docker Hub base URL');
        }

        const dataSource = {
            type: DataSourceType.DockerHub,
            name: 'Docker Hub',
            baseUrl: dockerhubBaseUrl,
            accessToken: dockerhubAccessToken || '',
            namespace: dockerhubNamespace || ''
        };

        const parsedData = [{
            tableName: 'dockerhub_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_repos', 'List repositories for a namespace'],
                ['get_repo', 'Get repository details'],
                ['list_tags', 'List tags for a repository'],
                ['search_repos', 'Search repositories']
            ],
            metadata: {
                rowCount: 4,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Jira) {
        const { jiraHost, jiraEmail, jiraApiToken, jiraProjectKey, jiraApiVersion } = req.body as any;

        if (!jiraHost || !jiraEmail || !jiraApiToken) {
            throw new Error('Missing Jira host, email, or API token');
        }

        const dataSource = {
            type: DataSourceType.Jira,
            name: 'Jira',
            host: jiraHost,
            email: jiraEmail,
            apiVersion: jiraApiVersion || 'v2',
            apiToken: jiraApiToken,
            projectKey: jiraProjectKey
        };

        // For Jira, tools are predefined - no parsing needed
        const parsedData = [{
            tableName: 'jira_tools',
            headers: ['tool', 'description'],
            rows: [
                ['search_issues', 'Search for issues using JQL'],
                ['get_issue', 'Get details of a specific issue'],
                ['create_issue', 'Create a new issue'],
                ['update_issue', 'Update an existing issue'],
                ['add_comment', 'Add a comment to an issue'],
                ['get_transitions', 'Get available transitions for an issue'],
                ['transition_issue', 'Transition an issue to a new status'],
                ['list_projects', 'List all projects'],
                ['get_project', 'Get details of a specific project'],
                ['get_user', 'Get information about a Jira user'],
                ['assign_issue', 'Assign an issue to a user'],
                ['get_issue_comments', 'Get comments on an issue']
            ],
            metadata: {
                rowCount: 12,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Confluence) {
        const { confluenceHost, confluenceEmail, confluenceApiToken, confluenceSpaceKey } = req.body as any;

        if (!confluenceHost || !confluenceEmail || !confluenceApiToken) {
            throw new Error('Missing Confluence host, email, or API token');
        }

        const dataSource = {
            type: DataSourceType.Confluence,
            name: 'Confluence',
            host: confluenceHost,
            email: confluenceEmail,
            apiToken: confluenceApiToken,
            spaceKey: confluenceSpaceKey
        };

        const parsedData = [{
            tableName: 'confluence_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_spaces', 'List Confluence spaces'],
                ['get_space', 'Get details of a space'],
                ['list_pages', 'List pages in a space'],
                ['get_page', 'Get a page by ID'],
                ['search_pages', 'Search pages using CQL'],
                ['create_page', 'Create a new page'],
                ['update_page', 'Update an existing page']
            ],
            metadata: {
                rowCount: 7,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Ftp) {
        const { ftpHost, ftpPort, ftpUsername, ftpPassword, ftpSecure, ftpBasePath } = req.body as any;

        if (!ftpHost || !ftpUsername || !ftpPassword) {
            throw new Error('Missing FTP host, username, or password');
        }

        const dataSource = {
            type: DataSourceType.Ftp,
            name: 'FTP',
            host: ftpHost,
            port: parseInt(ftpPort) || 21,
            username: ftpUsername,
            password: ftpPassword,
            secure: ftpSecure === 'true' || ftpSecure === true,
            basePath: ftpBasePath || '/'
        };

        // For FTP, tools are predefined - no parsing needed
        const parsedData = [{
            tableName: 'ftp_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_files', 'List files and directories in a path'],
                ['download_file', 'Download a file from FTP server'],
                ['upload_file', 'Upload a file to FTP server'],
                ['delete_file', 'Delete a file from FTP server'],
                ['create_directory', 'Create a new directory'],
                ['delete_directory', 'Delete a directory'],
                ['rename', 'Rename a file or directory'],
                ['get_file_info', 'Get information about a file']
            ],
            metadata: {
                rowCount: 8,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.LocalFS) {
        const { localfsBasePath, localfsAllowWrite, localfsAllowDelete } = req.body as any;

        if (!localfsBasePath) {
            throw new Error('Missing base path for Local Filesystem');
        }

        const dataSource = {
            type: DataSourceType.LocalFS,
            name: 'LocalFS',
            basePath: localfsBasePath,
            allowWrite: localfsAllowWrite === 'true' || localfsAllowWrite === true,
            allowDelete: localfsAllowDelete === 'true' || localfsAllowDelete === true
        };

        // For LocalFS, tools are predefined - no parsing needed
        const parsedData = [{
            tableName: 'localfs_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_files', 'List files and directories in a path'],
                ['read_file', 'Read contents of a file'],
                ['write_file', 'Write content to a file'],
                ['delete_file', 'Delete a file'],
                ['create_directory', 'Create a new directory'],
                ['delete_directory', 'Delete a directory'],
                ['rename', 'Rename a file or directory'],
                ['get_file_info', 'Get information about a file'],
                ['search_files', 'Search for files by name pattern'],
                ['copy_file', 'Copy a file to another location']
            ],
            metadata: {
                rowCount: 10,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Email) {
        const { emailImapHost, emailImapPort, emailSmtpHost, emailSmtpPort, emailUsername, emailPassword, emailSecure } = req.body as any;

        if (!emailImapHost || !emailSmtpHost || !emailUsername || !emailPassword) {
            throw new Error('Missing email configuration (IMAP host, SMTP host, username, or password)');
        }

        const dataSource = {
            type: DataSourceType.Email,
            name: 'Email',
            imapHost: emailImapHost,
            imapPort: parseInt(emailImapPort) || 993,
            smtpHost: emailSmtpHost,
            smtpPort: parseInt(emailSmtpPort) || 587,
            username: emailUsername,
            password: emailPassword,
            secure: emailSecure === 'true' || emailSecure === true
        };

        // For Email, tools are predefined
        const parsedData = [{
            tableName: 'email_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_folders', 'List all email folders/mailboxes'],
                ['list_emails', 'List emails in a folder'],
                ['read_email', 'Read a specific email by ID'],
                ['search_emails', 'Search emails by criteria'],
                ['send_email', 'Send a new email'],
                ['reply_email', 'Reply to an email'],
                ['forward_email', 'Forward an email'],
                ['move_email', 'Move email to another folder'],
                ['delete_email', 'Delete an email'],
                ['mark_read', 'Mark email as read/unread']
            ],
            metadata: {
                rowCount: 10,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Slack) {
        const { slackBotToken, slackDefaultChannel } = req.body as any;

        if (!slackBotToken) {
            throw new Error('Missing Slack Bot Token');
        }

        const dataSource = {
            type: DataSourceType.Slack,
            name: 'Slack',
            botToken: slackBotToken,
            defaultChannel: slackDefaultChannel || ''
        };

        // For Slack, tools are predefined
        const parsedData = [{
            tableName: 'slack_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_channels', 'List all channels in the workspace'],
                ['list_users', 'List all users in the workspace'],
                ['send_message', 'Send a message to a channel'],
                ['get_channel_history', 'Get message history from a channel'],
                ['get_user_info', 'Get information about a user'],
                ['add_reaction', 'Add an emoji reaction to a message'],
                ['upload_file', 'Upload a file to a channel'],
                ['search_messages', 'Search for messages in the workspace']
            ],
            metadata: {
                rowCount: 8,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Discord) {
        const { discordBotToken, discordDefaultGuildId, discordDefaultChannelId } = req.body as any;

        if (!discordBotToken) {
            throw new Error('Missing Discord Bot Token');
        }

        const dataSource = {
            type: DataSourceType.Discord,
            name: 'Discord',
            botToken: discordBotToken,
            defaultGuildId: discordDefaultGuildId || '',
            defaultChannelId: discordDefaultChannelId || ''
        };

        const parsedData = [{
            tableName: 'discord_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_guilds', 'List guilds (servers) the bot has access to'],
                ['list_channels', 'List channels in a guild'],
                ['list_users', 'List members in a guild'],
                ['send_message', 'Send a message to a channel'],
                ['get_channel_history', 'Get recent messages in a channel'],
                ['get_user_info', 'Get information about a user'],
                ['add_reaction', 'Add an emoji reaction to a message']
            ],
            metadata: {
                rowCount: 7,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Docker) {
        const { dockerPath } = req.body as any;

        const dataSource = {
            type: DataSourceType.Docker,
            name: 'Docker',
            dockerPath: dockerPath || 'docker'
        };

        const parsedData = [{
            tableName: 'docker_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_images', 'List local Docker images'],
                ['list_containers', 'List Docker containers (running and stopped)'],
                ['get_container', 'Get detailed information about a container'],
                ['start_container', 'Start a stopped container'],
                ['stop_container', 'Stop a running container'],
                ['restart_container', 'Restart a container'],
                ['remove_container', 'Remove a container'],
                ['remove_image', 'Remove a Docker image'],
                ['pull_image', 'Pull a Docker image from registry'],
                ['get_logs', 'Get recent logs from a container'],
                ['exec_in_container', 'Execute a command inside a running container']
            ],
            metadata: {
                rowCount: 11,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Kubernetes) {
        const { kubectlPath, kubeconfig, namespace } = req.body as any;

        const dataSource = {
            type: DataSourceType.Kubernetes,
            name: 'Kubernetes',
            kubectlPath: kubectlPath || 'kubectl',
            kubeconfig: kubeconfig || '',
            namespace: namespace || ''
        };

        const parsedData = [{
            tableName: 'kubernetes_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_contexts', 'List kubeconfig contexts'],
                ['get_current_context', 'Get current kubeconfig context'],
                ['list_namespaces', 'List namespaces in the cluster'],
                ['list_pods', 'List pods in a namespace'],
                ['get_pod', 'Get a pod by name'],
                ['describe_pod', 'Describe a pod (text output)'],
                ['list_deployments', 'List deployments in a namespace'],
                ['scale_deployment', 'Scale a deployment to a replica count'],
                ['delete_pod', 'Delete a pod']
            ],
            metadata: {
                rowCount: 9,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.OpenShift) {
        const { ocPath, kubeconfig, namespace } = req.body as any;

        const dataSource = {
            type: DataSourceType.OpenShift,
            name: 'OpenShift',
            ocPath: ocPath || 'oc',
            kubeconfig: kubeconfig || '',
            namespace: namespace || ''
        };

        const parsedData = [{
            tableName: 'openshift_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_projects', 'List OpenShift projects'],
                ['get_current_project', 'Get current OpenShift project'],
                ['list_pods', 'List pods in a project/namespace'],
                ['get_pod', 'Get a pod by name'],
                ['list_deployments', 'List deployments in a project/namespace'],
                ['scale_deployment', 'Scale a deployment to a replica count'],
                ['delete_pod', 'Delete a pod']
            ],
            metadata: {
                rowCount: 7,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.Elasticsearch) {
        const { baseUrl, apiKey, username, password, index } = req.body as any;

        if (!baseUrl) {
            throw new Error('Missing Elasticsearch baseUrl');
        }

        const dataSource = {
            type: DataSourceType.Elasticsearch,
            name: 'Elasticsearch',
            baseUrl,
            apiKey: apiKey || '',
            username: username || '',
            password: password || '',
            index: index || ''
        };

        const parsedData = [{
            tableName: 'elasticsearch_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_indices', 'List indices in the cluster'],
                ['get_cluster_health', 'Get cluster health'],
                ['search', 'Search documents in an index'],
                ['get_document', 'Get a document by ID'],
                ['index_document', 'Index (create/update) a document'],
                ['delete_document', 'Delete a document by ID']
            ],
            metadata: {
                rowCount: 6,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (type === DataSourceType.OpenSearch) {
        const { baseUrl, apiKey, username, password, index } = req.body as any;

        if (!baseUrl) {
            throw new Error('Missing OpenSearch baseUrl');
        }

        const dataSource = {
            type: DataSourceType.OpenSearch,
            name: 'OpenSearch',
            baseUrl,
            apiKey: apiKey || '',
            username: username || '',
            password: password || '',
            index: index || ''
        };

        const parsedData = [{
            tableName: 'opensearch_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_indices', 'List indices in the cluster'],
                ['get_cluster_health', 'Get cluster health'],
                ['search', 'Search documents in an index'],
                ['get_document', 'Get a document by ID'],
                ['index_document', 'Index (create/update) a document'],
                ['delete_document', 'Delete a document by ID']
            ],
            metadata: {
                rowCount: 6,
                columnCount: 2,
                dataTypes: {
                    tool: 'string',
                    description: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (file) {
      if (type === DataSourceType.CSV) {
        dataSource = createCsvDataSource(file.originalname, file.path);
      } else if (type === DataSourceType.Excel) {
        dataSource = createExcelDataSource(file.originalname, file.path);
      } else {
        throw new Error('Invalid file type');
      }
    } else {
      throw new Error('No file or connection provided');
    }

    const parsedData = await parser.parse(dataSource);

    res.json({
      success: true,
      data: {
        dataSource,
        parsedData: parsedData.map(data => ({
          ...data,
          rows: data.rows.slice(0, 10) // Limit preview rows
        }))
      }
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate MCP server endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { name, description, version, dataSource, selectedTables, parsedData } = req.body;
    
    console.log('🔍 Generate request received:');
    console.log('- Name:', name);
    console.log('- DataSource type:', dataSource?.type);
    console.log('- DataSource:', JSON.stringify(dataSource, null, 2));
    console.log('- Selected tables:', selectedTables?.length || 0);
    console.log('- Parsed data tables:', parsedData?.length || 0);

    // Check if server with this name already exists
    const existingServer = ensureGenerator().getServer(name);
    if (existingServer) {
      return res.status(400).json({
        success: false,
        error: `MCP Server with name "${name}" already exists. Please choose a different name.`
      });
    }

    let parsedForGen: any = null;
    let dbConfForGen: GeneratorConfig | null = null;

    if (dataSource?.type === DataSourceType.Rest) {
      const restSource = dataSource as RestDataSource;
      parsedForGen = parsedData;
      dbConfForGen = createRestGeneratorConfig(restSource.baseUrl || restSource.swaggerUrl);
    } else if (dataSource?.type === DataSourceType.Webpage) {
      parsedForGen = {};
      dbConfForGen = createWebpageGeneratorConfig(dataSource.url || dataSource.name, dataSource.alias);
    } else if (dataSource?.type === DataSourceType.GraphQL) {
      parsedForGen = {};
      dbConfForGen = createGraphQLGeneratorConfig(
        dataSource.baseUrl,
        dataSource.headers || {}
      );
    } else if (dataSource?.type === DataSourceType.Soap) {
      parsedForGen = {};
      dbConfForGen = createSoapGeneratorConfig(
        dataSource.baseUrl,
        dataSource.wsdlUrl,
        dataSource.soapAction,
        dataSource.headers || {}
      );
    } else if (dataSource?.type === DataSourceType.Rss) {
      parsedForGen = {};
      dbConfForGen = createRssGeneratorConfig(
        dataSource.feedUrl
      );
    } else if (dataSource?.type === DataSourceType.Curl) {
      parsedForGen = {};
      dbConfForGen = createCurlGeneratorConfig(
        dataSource.url,
        dataSource.method || 'GET',
        dataSource.headers || {},
        dataSource.body || {},
        dataSource.alias
      );
    } else if (dataSource?.type === DataSourceType.GitHub) {
      parsedForGen = {};
      dbConfForGen = createGitHubGeneratorConfig(
        dataSource.token,
        dataSource.owner,
        dataSource.repo
      );
    } else if (dataSource?.type === DataSourceType.X) {
      parsedForGen = {};
      dbConfForGen = createXGeneratorConfig(
        dataSource.token,
        dataSource.username
      );
    } else if (dataSource?.type === DataSourceType.Prometheus) {
      parsedForGen = {};
      dbConfForGen = createPrometheusGeneratorConfig(
        dataSource.baseUrl
      );
    } else if (dataSource?.type === DataSourceType.Grafana) {
      parsedForGen = {};
      dbConfForGen = createGrafanaGeneratorConfig(
        dataSource.baseUrl,
        dataSource.authType,
        dataSource.apiKey,
        dataSource.username,
        dataSource.password
      );
    } else if (dataSource?.type === DataSourceType.MongoDB) {
      parsedForGen = {};
      dbConfForGen = createMongoDBGeneratorConfig(
        dataSource.host,
        dataSource.database,
        dataSource.port,
        dataSource.username,
        dataSource.password,
        dataSource.authSource
      );
    } else if (dataSource?.type === DataSourceType.Facebook) {
      parsedForGen = {};
      dbConfForGen = createFacebookGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiVersion,
        dataSource.accessToken,
        dataSource.userId,
        dataSource.pageId
      );
    } else if (dataSource?.type === DataSourceType.Instagram) {
      parsedForGen = {};
      dbConfForGen = createInstagramGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken,
        dataSource.userId
      );
    } else if (dataSource?.type === DataSourceType.TikTok) {
      parsedForGen = {};
      dbConfForGen = createTikTokGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken,
        dataSource.userId
      );
    } else if (dataSource?.type === DataSourceType.Notion) {
      parsedForGen = {};
      dbConfForGen = createNotionGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken,
        dataSource.notionVersion
      );
    } else if (dataSource?.type === DataSourceType.Telegram) {
      parsedForGen = {};
      dbConfForGen = createTelegramGeneratorConfig(
        dataSource.baseUrl,
        dataSource.botToken,
        dataSource.defaultChatId
      );
    } else if (dataSource?.type === DataSourceType.Spotify) {
      parsedForGen = {};
      dbConfForGen = createSpotifyGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.Sonos) {
      parsedForGen = {};
      dbConfForGen = createSonosGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.Shazam) {
      parsedForGen = {};
      dbConfForGen = createShazamGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.apiHost
      );
    } else if (dataSource?.type === DataSourceType.PhilipsHue) {
      parsedForGen = {};
      dbConfForGen = createPhilipsHueGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.EightSleep) {
      parsedForGen = {};
      dbConfForGen = createEightSleepGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.HomeAssistant) {
      parsedForGen = {};
      dbConfForGen = createHomeAssistantGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.AppleNotes) {
      parsedForGen = {};
      dbConfForGen = createAppleNotesGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.AppleReminders) {
      parsedForGen = {};
      dbConfForGen = createAppleRemindersGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.Things3) {
      parsedForGen = {};
      dbConfForGen = createThings3GeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.Obsidian) {
      parsedForGen = {};
      dbConfForGen = createObsidianGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.BearNotes) {
      parsedForGen = {};
      dbConfForGen = createBearNotesGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.IMessage) {
      parsedForGen = {};
      dbConfForGen = createIMessageGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.Zoom) {
      parsedForGen = {};
      dbConfForGen = createZoomGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.MicrosoftTeams) {
      parsedForGen = {};
      dbConfForGen = createMicrosoftTeamsGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.Signal) {
      parsedForGen = {};
      dbConfForGen = createSignalGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.OpenAI) {
      parsedForGen = {};
      dbConfForGen = createOpenAIGeneratorConfig(
        'https://api.openai.com/v1',
        dataSource.apiKey,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.Claude) {
      parsedForGen = {};
      dbConfForGen = createClaudeGeneratorConfig(
        'https://api.anthropic.com/v1',
        dataSource.apiKey,
        dataSource.apiVersion,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.Gemini) {
      parsedForGen = {};
      dbConfForGen = createGeminiGeneratorConfig(
        'https://generativelanguage.googleapis.com/v1beta',
        dataSource.apiKey,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.Grok) {
      parsedForGen = {};
      dbConfForGen = createGrokGeneratorConfig(
        'https://api.x.ai/v1',
        dataSource.apiKey,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.FalAI) {
      parsedForGen = {};
      dbConfForGen = createFalAIGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey
      );
    } else if (dataSource?.type === DataSourceType.HuggingFace) {
      parsedForGen = {};
      dbConfForGen = createHuggingFaceGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.Llama) {
      parsedForGen = {};
      dbConfForGen = createLlamaGeneratorConfig(
        dataSource.baseUrl,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.DeepSeek) {
      parsedForGen = {};
      dbConfForGen = createDeepSeekGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.AzureOpenAI) {
      parsedForGen = {};
      dbConfForGen = createAzureOpenAIGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.deployment,
        dataSource.apiVersion
      );
    } else if (dataSource?.type === DataSourceType.Mistral) {
      parsedForGen = {};
      dbConfForGen = createMistralGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.Cohere) {
      parsedForGen = {};
      dbConfForGen = createCohereGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.Perplexity) {
      parsedForGen = {};
      dbConfForGen = createPerplexityGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.Together) {
      parsedForGen = {};
      dbConfForGen = createTogetherGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.Fireworks) {
      parsedForGen = {};
      dbConfForGen = createFireworksGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.Groq) {
      parsedForGen = {};
      dbConfForGen = createGroqGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.OpenRouter) {
      parsedForGen = {};
      dbConfForGen = createOpenRouterGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.defaultModel
      );
    } else if (dataSource?.type === DataSourceType.Dropbox) {
      parsedForGen = {};
      dbConfForGen = createDropboxGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken,
        dataSource.contentBaseUrl
      );
    } else if (dataSource?.type === DataSourceType.N8n) {
      parsedForGen = {};
      dbConfForGen = createN8nGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey
      );
    } else if (dataSource?.type === DataSourceType.Supabase) {
      parsedForGen = {};
      dbConfForGen = createSupabaseGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey
      );
    } else if (dataSource?.type === DataSourceType.Npm) {
      parsedForGen = {};
      dbConfForGen = createNpmGeneratorConfig(
        dataSource.baseUrl
      );
    } else if (dataSource?.type === DataSourceType.Nuget) {
      parsedForGen = {};
      dbConfForGen = createNugetGeneratorConfig(
        dataSource.baseUrl,
        dataSource.registrationBaseUrl
      );
    } else if (dataSource?.type === DataSourceType.Maven) {
      parsedForGen = {};
      dbConfForGen = createMavenGeneratorConfig(
        dataSource.baseUrl
      );
    } else if (dataSource?.type === DataSourceType.Gradle) {
      parsedForGen = {};
      dbConfForGen = createGradleGeneratorConfig(
        dataSource.baseUrl
      );
    } else if (dataSource?.type === DataSourceType.Nexus) {
      parsedForGen = {};
      dbConfForGen = createNexusGeneratorConfig(
        dataSource.baseUrl,
        dataSource.username,
        dataSource.password,
        dataSource.apiKey
      );
    } else if (dataSource?.type === DataSourceType.Trello) {
      parsedForGen = {};
      dbConfForGen = createTrelloGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.apiToken,
        dataSource.memberId,
        dataSource.boardId,
        dataSource.listId
      );
    } else if (dataSource?.type === DataSourceType.GitLab) {
      parsedForGen = {};
      dbConfForGen = createGitLabGeneratorConfig(
        dataSource.baseUrl,
        dataSource.token,
        dataSource.projectId
      );
    } else if (dataSource?.type === DataSourceType.Bitbucket) {
      parsedForGen = {};
      dbConfForGen = createBitbucketGeneratorConfig(
        dataSource.baseUrl,
        dataSource.username,
        dataSource.appPassword,
        dataSource.workspace,
        dataSource.repoSlug
      );
    } else if (dataSource?.type === DataSourceType.GDrive) {
      parsedForGen = {};
      dbConfForGen = createGDriveGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken,
        dataSource.rootFolderId
      );
    } else if (dataSource?.type === DataSourceType.GoogleCalendar) {
      parsedForGen = {};
      dbConfForGen = createGoogleCalendarGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken,
        dataSource.calendarId
      );
    } else if (dataSource?.type === DataSourceType.GoogleDocs) {
      parsedForGen = {};
      dbConfForGen = createGoogleDocsGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.GoogleSheets) {
      parsedForGen = {};
      dbConfForGen = createGoogleSheetsGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken,
        dataSource.spreadsheetId
      );
    } else if (dataSource?.type === DataSourceType.Airtable) {
      parsedForGen = {};
      dbConfForGen = createAirtableGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken,
        dataSource.baseId,
        dataSource.tableName
      );
    } else if (dataSource?.type === DataSourceType.Asana) {
      parsedForGen = {};
      dbConfForGen = createAsanaGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken,
        dataSource.workspaceId
      );
    } else if (dataSource?.type === DataSourceType.Monday) {
      parsedForGen = {};
      dbConfForGen = createMondayGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey
      );
    } else if (dataSource?.type === DataSourceType.ClickUp) {
      parsedForGen = {};
      dbConfForGen = createClickUpGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken,
        dataSource.teamId
      );
    } else if (dataSource?.type === DataSourceType.Linear) {
      parsedForGen = {};
      dbConfForGen = createLinearGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken
      );
    } else if (dataSource?.type === DataSourceType.Jenkins) {
      parsedForGen = {};
      dbConfForGen = createJenkinsGeneratorConfig(
        dataSource.baseUrl,
        dataSource.username,
        dataSource.apiToken
      );
    } else if (dataSource?.type === DataSourceType.DockerHub) {
      parsedForGen = {};
      dbConfForGen = createDockerHubGeneratorConfig(
        dataSource.baseUrl,
        dataSource.accessToken,
        dataSource.namespace
      );
    } else if (dataSource?.type === DataSourceType.Jira) {
      parsedForGen = {};
      dbConfForGen = createJiraGeneratorConfig(
        dataSource.host,
        dataSource.email,
        dataSource.apiToken,
        dataSource.projectKey,
        dataSource.apiVersion
      );
    } else if (dataSource?.type === DataSourceType.Confluence) {
      parsedForGen = {};
      dbConfForGen = createConfluenceGeneratorConfig(
        dataSource.host,
        dataSource.email,
        dataSource.apiToken,
        dataSource.spaceKey
      );
    } else if (dataSource?.type === DataSourceType.Ftp) {
      parsedForGen = {};
      dbConfForGen = createFtpGeneratorConfig(
        dataSource.host,
        dataSource.port,
        dataSource.username,
        dataSource.password,
        dataSource.secure,
        dataSource.basePath
      );
    } else if (dataSource?.type === DataSourceType.LocalFS) {
      parsedForGen = {};
      dbConfForGen = createLocalFSGeneratorConfig(
        dataSource.basePath,
        dataSource.allowWrite,
        dataSource.allowDelete
      );
    } else if (dataSource?.type === DataSourceType.Email) {
      parsedForGen = {};
      dbConfForGen = createEmailGeneratorConfig(
        dataSource.mode || 'both',
        dataSource.imapHost,
        dataSource.imapPort,
        dataSource.smtpHost,
        dataSource.smtpPort,
        dataSource.username,
        dataSource.password,
        dataSource.secure
      );
    } else if (dataSource?.type === DataSourceType.Slack) {
      parsedForGen = {};
      dbConfForGen = createSlackGeneratorConfig(
        dataSource.botToken,
        dataSource.defaultChannel
      );
    } else if (dataSource?.type === DataSourceType.Discord) {
      parsedForGen = {};
      dbConfForGen = createDiscordGeneratorConfig(
        dataSource.botToken,
        dataSource.defaultGuildId,
        dataSource.defaultChannelId
      );
    } else if (dataSource?.type === DataSourceType.Docker) {
      parsedForGen = {};
      dbConfForGen = createDockerGeneratorConfig(
        dataSource.dockerPath
      );
    } else if (dataSource?.type === DataSourceType.Kubernetes) {
      parsedForGen = {};
      dbConfForGen = createKubernetesGeneratorConfig(
        dataSource.kubectlPath,
        dataSource.kubeconfig,
        dataSource.namespace
      );
    } else if (dataSource?.type === DataSourceType.Elasticsearch) {
      parsedForGen = {};
      dbConfForGen = createElasticsearchGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.username,
        dataSource.password,
        dataSource.index
      );
    } else if (dataSource?.type === DataSourceType.OpenSearch) {
      parsedForGen = {};
      dbConfForGen = createOpenSearchGeneratorConfig(
        dataSource.baseUrl,
        dataSource.apiKey,
        dataSource.username,
        dataSource.password,
        dataSource.index
      );
    } else if (dataSource?.type === DataSourceType.OpenShift) {
      parsedForGen = {};
      dbConfForGen = createOpenShiftGeneratorConfig(
        dataSource.ocPath,
        dataSource.kubeconfig,
        dataSource.namespace
      );
    } else {
      // Use provided parsed data or re-parse if not available
      const fullParsedData = parsedData || await parser.parse(dataSource);

      // Convert to the format expected by new generator
      const parsedDataObject: { [tableName: string]: any[] } = {};
      fullParsedData.forEach((data: ParsedData, index: number) => {
        const tableName = data.tableName || `table_${index}`;
        parsedDataObject[tableName] = data.rows.map((row: any[]) => {
          const obj: { [key: string]: any } = {};
          data.headers.forEach((header: string, i: number) => {
            obj[header] = row[i];
          });
          return obj;
        });
      });
      parsedForGen = parsedDataObject;
      dbConfForGen = dataSource.connection || createFileGeneratorConfig(name);
    }

    // Generate virtual server (saves to SQLite database)
    console.log(`🎯 API calling generateServer with name: "${name}"`);
    const result = await ensureGenerator().generateServer(
      name,
      name,
      parsedForGen,
      dbConfForGen,
      selectedTables
    );

    if (result.success) {
      // Get counts for display
      const tools = ensureGenerator().getToolsForServer(name);
      const resources = ensureGenerator().getResourcesForServer(name);

      res.json({
        success: true,
        data: {
          serverId: name,
          message: result.message,
          toolsCount: tools.length,
          resourcesCount: resources.length,
          promptsCount: 0 // We don't generate prompts yet
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Generation error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List generated servers endpoint
app.get('/api/servers', (req, res) => {
  const gen = ensureGenerator();
  const allServers = gen.getAllServers();
  const servers = allServers.map(server => {
    // Prefer persisted db_config from SQLite to avoid stale/partial objects
    const persisted = ensureSQLite().getServer(server.id);
    const rawType = (persisted?.dbConfig as any)?.type || (server as any)?.dbConfig?.type || 'unknown';
    const type = typeof rawType === 'string' ? rawType : 'unknown';
    const tools = gen.getToolsForServer(server.id);
    const resources = gen.getResourcesForServer(server.id);
    const finalType = type;
    return {
      id: server.id,
      name: server.name,
      type: finalType,
      description: `${server.name} - Virtual MCP Server (${finalType})`,
      version: "1.0.0",
      toolsCount: tools.length,
      resourcesCount: resources.length,
      promptsCount: 0,
    };
  });

  res.json({ success: true, data: servers });
});

// Check if server name is available endpoint
app.get('/api/servers/check-name/:name', (req, res) => {
  const serverName = req.params.name;
  const existingServer = ensureGenerator().getServer(serverName);
  const isAvailable = !existingServer;

  res.json({
    success: true,
    available: isAvailable,
    message: isAvailable ?
      `Server name "${serverName}" is available` :
      `Server name "${serverName}" already exists`
  });
});

// Check if a tool name is available across all servers
app.get('/api/check-tool-name/:toolName', async (req, res) => {
    const { toolName } = req.params;
    try {
        const allServers = ensureSQLite().getAllServers();
        const isTaken = allServers.some(server => {
            const tools = ensureSQLite().getToolsForServer(server.id);
            return tools.some(tool => tool.name === toolName);
        });
        res.json({ success: true, available: !isTaken });
    } catch (error) {
        console.error(`Error checking tool name '${toolName}':`, error);
        res.status(500).json({ success: false, error: 'Failed to check tool name availability' });
    }
});

// Get server details endpoint
app.get('/api/servers/:id', (req, res) => {
  const server = ensureGenerator().getServer(req.params.id);

  if (!server) {
    return res.status(404).json({
      success: false,
      error: 'Server not found'
    });
  }

  const tools = generator.getToolsForServer(server.id);
  const resources = generator.getResourcesForServer(server.id);
  const rawType = (server.dbConfig as any)?.type || 'unknown';
  const finalType = typeof rawType === 'string' ? rawType : 'unknown';

  res.json({
    success: true,
    data: {
      config: {
        name: server.name,
        description: `${server.name} - Virtual MCP Server (${finalType})`,
        version: "1.0.0",
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          operation: tool.operation
        })),
        resources: resources.map(resource => ({
          name: resource.name,
          description: resource.description,
          uri_template: resource.uri_template
        })),
        prompts: []
      },
      parsedData: []
    }
  });
});

// inferTypeFromTools removed by request

// Get server data endpoint - provides sample data from database
app.get('/api/servers/:id/data', async (req, res) => {
  try {
    const serverId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const server = ensureGenerator().getServer(serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    // Use the DynamicMCPExecutor to get data from first available SELECT tool
    const executor = new DynamicMCPExecutor();

    const tools = ensureGenerator().getToolsForServer(serverId);
    const selectTool = tools.find(tool => tool.operation === 'SELECT');

    if (!selectTool) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Execute the first SELECT tool to get sample data
    const result = await executor.executeTool(
      `${serverId}__${selectTool.name}`,
      { limit: limit }
    );

    if (result.success && result.data) {
      // Transform the data to match expected format
      const sampleData = Array.isArray(result.data) ? result.data : [];

      res.json({
        success: true,
        data: sampleData.slice(0, limit)
      });
    } else {
      res.json({
        success: true,
        data: []
      });
    }

  } catch (error) {
    console.error('Error getting server data:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test server endpoint
app.post('/api/servers/:id/test', async (req, res) => {
  try {
    // Get server from SQLite database
    const server = ensureSQLite().getServer(req.params.id);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    // Get tools for this server
    const tools = ensureSQLite().getToolsForServer(req.params.id);
    
    // Check if this is a custom test or auto test
    const { runAll, testType, toolName, parameters } = req.body;
    
    // For custom tool test
    if (testType === 'tools/call' && toolName) {
      try {
        const executor = new DynamicMCPExecutor();
        
        // Find the specific tool
        const tool = tools.find(t => t.name === toolName);
        if (!tool) {
          return res.status(404).json({
            success: false,
            error: `Tool "${toolName}" not found`
          });
        }
        
        const result = await executor.executeTool(
          `${req.params.id}__${toolName}`,
          parameters || {}
        );
        
        res.json({
          success: true,
          data: {
            tool: toolName,
            status: 'success',
            description: tool.description,
            parameters: parameters || {},
            result: result.success ? 'Tool executed successfully' : result,
            rowCount: result.rowCount || 0
          }
        });
        return;
        
      } catch (error) {
        res.json({
          success: true,
          data: {
            tool: toolName,
            status: 'error',
            description: tools.find(t => t.name === toolName)?.description || '',
            parameters: parameters || {},
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        return;
      }
    }
    
    // For auto test, run a sample of available tools
    const testResults = [];
    
    // Test either all tools or just a quick sample
    const toolsToTest = runAll ? tools : tools.slice(0, 3);
    
    for (const tool of toolsToTest) {
      try {
        // Use DynamicMCPExecutor to test the tool
        const executor = new DynamicMCPExecutor();
        
        // Prepare test parameters based on tool schema
        const testParams: any = {};
        if (tool.inputSchema && typeof tool.inputSchema === 'object' && tool.inputSchema.properties) {
          for (const [paramName, paramDef] of Object.entries(tool.inputSchema.properties as any)) {
            if (paramName === 'limit') testParams[paramName] = 5;
            else if (paramName === 'offset') testParams[paramName] = 0;
            // Add other default test values as needed
          }
        }
        
        const result = await executor.executeTool(
          `${req.params.id}__${tool.name}`,
          testParams
        );
        
        testResults.push({
          tool: tool.name,
          status: 'success',
          description: tool.description,
          parameters: testParams,
          result: result.success ? 'Tool executed successfully' : result,
          rowCount: result.rowCount || 0
        });
        
      } catch (error) {
        testResults.push({
          tool: tool.name,
          status: 'error',
          description: tool.description,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        serverName: server.name,
        toolsCount: tools.length,
        testsRun: testResults.length,
        results: testResults
      }
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Rename server endpoint
app.patch('/api/servers/:id/rename', async (req, res) => {
  try {
    const serverId = req.params.id;
    const { newName } = req.body;

    console.log(`🔄 Rename request for server ID: ${serverId}, new name: ${newName}`);

    if (!newName || typeof newName !== 'string' || !newName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'New name is required and must be a non-empty string'
      });
    }

    const trimmedName = newName.trim();

    // Check if server exists
    const sqlite = ensureSQLite();
    const existingServer = sqlite.getServer(serverId);
    if (!existingServer) {
      console.log(`❌ Server with ID "${serverId}" not found`);
      return res.status(404).json({
        success: false,
        error: `Server with ID "${serverId}" not found`
      });
    }

    // Check if new name is already taken by another server
    const allServers = sqlite.getAllServers();
    const serverWithSameName = allServers.find(s => s.name === trimmedName && s.id !== serverId);
    if (serverWithSameName) {
      console.log(`❌ Server name "${trimmedName}" is already taken by ID: ${serverWithSameName.id}`);
      return res.status(400).json({
        success: false,
        error: `Server name "${trimmedName}" is already taken`
      });
    }

    // Update server name in SQLite database
    existingServer.name = trimmedName;
    sqlite.saveServer(existingServer);

    console.log(`✅ Successfully renamed server ${serverId} to "${trimmedName}"`);

    res.json({
      success: true,
      data: {
        id: serverId,
        name: trimmedName
      }
    });
  } catch (error) {
    console.error('Rename error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete server endpoint
app.delete('/api/servers/:id', async (req, res) => {
  try {
    const serverId = req.params.id;
    console.log(`Attempting to delete server with ID: ${serverId}`);

    // Check if server exists in JSON database
    const existingServer = ensureGenerator().getServer(serverId);
    if (!existingServer) {
      console.log(`Server with ID "${serverId}" not found in database`);
      return res.status(404).json({
        success: false,
        error: `Server with ID "${serverId}" not found`
      });
    }

    // Delete from JSON database (primary storage)
    ensureGenerator().deleteServer(serverId);
    console.log(`Deleted server "${serverId}" from JSON database`);

    // Also check and remove from in-memory store if exists
    const serverInfo = generatedServers.get(serverId);
    if (serverInfo) {
      // Remove server files
      const serverDir = path.dirname(serverInfo.serverPath);
      await fs.rm(serverDir, { recursive: true, force: true });
      console.log(`Removed server files from ${serverDir}`);
    }

    // Remove from memory
    generatedServers.delete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start runtime server endpoint
app.post('/api/servers/:id/start-runtime', async (req, res) => {
  try {
    const serverInfo = generatedServers.get(req.params.id);

    if (!serverInfo) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    const port = await startRuntimeMCPServer(req.params.id, serverInfo.serverPath);

    res.json({
      success: true,
      data: {
        serverId: req.params.id,
        port,
        endpoint: `http://localhost:${port}`,
        claudeConfig: {
          [serverInfo.config.name]: {
            command: "curl",
            args: ["-X", "POST", `http://localhost:${port}/sse/message`],
            env: {
              MCP_TRANSPORT: "sse"
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Runtime start error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stop runtime server endpoint
app.post('/api/servers/:id/stop-runtime', (req, res) => {
  const serverInfo = generatedServers.get(req.params.id);

  if (!serverInfo) {
    return res.status(404).json({
      success: false,
      error: 'Server not found'
    });
  }

  if (serverInfo.runtimeProcess) {
    serverInfo.runtimeProcess.kill();
    serverInfo.runtimeProcess = undefined;
    serverInfo.runtimePort = undefined;
  }

  res.json({ success: true });
});

// Export server endpoint
app.get('/api/servers/:id/export', (req, res) => {
  const serverInfo = generatedServers.get(req.params.id);

  if (!serverInfo) {
    return res.status(404).json({
      success: false,
      error: 'Server not found'
    });
  }

  const serverDir = path.dirname(serverInfo.serverPath);
  const archiveName = `${serverInfo.config.name}-mcp-server.zip`;

  // In a real implementation, you'd create a zip file here
  res.json({
    success: true,
    data: {
      downloadUrl: `/api/servers/${req.params.id}/download`,
      filename: archiveName
    }
  });
});

// Serve the main HTML page
// Serve specific HTML files for different routes
app.get('/manage-servers', (req, res) => {
  res.sendFile(path.join(publicDir, 'manage-servers.html'));
});

app.get('/test-servers', (req, res) => {
  res.sendFile(path.join(publicDir, 'test-servers.html'));
});

app.get('/database-tables', (req, res) => {
  res.sendFile(path.join(publicDir, 'database-tables.html'));
});

app.get('/how-to-use', (req, res) => {
  res.sendFile(path.join(publicDir, 'how-to-use.html'));
});

// Database tables API endpoints
app.get('/api/database/tables', (req, res) => {
  try {
    // Get database path
    const dbPath = path.join(process.cwd(), 'data', 'quickmcp.sqlite');

    // Open database connection
    const db = new Database(dbPath);

    // Get all table names
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as any[];

    const tablesInfo = tables.map(table => {
      const tableName = table.name;

      // Get column information
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];

      // Get row count
      const rowCountResult = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
      const rowCount = rowCountResult?.count || 0;

      // Get sample data (first 5 rows)
      const sampleData = db.prepare(`SELECT * FROM ${tableName} LIMIT 5`).all() as any[];

      return {
        name: tableName,
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          notnull: col.notnull === 1,
          pk: col.pk === 1
        })),
        rowCount,
        sampleData
      };
    });

    db.close();

    res.json({
      success: true,
      data: {
        dbPath,
        tables: tablesInfo
      }
    });
  } catch (error) {
    console.error('Database tables error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific table details
app.get('/api/database/tables/:tableName', (req, res) => {
  try {
    const tableName = req.params.tableName;
    const dbPath = path.join(process.cwd(), 'data', 'quickmcp.sqlite');

    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table name'
      });
    }

    const db = new Database(dbPath);

    // Check if table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
    if (!tableExists) {
      db.close();
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    // Get column information
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];

    // Get row count
    const rowCountResult = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
    const rowCount = rowCountResult?.count || 0;

    // Get sample data (first 10 rows)
    const sampleData = db.prepare(`SELECT * FROM ${tableName} LIMIT 10`).all() as any[];

    db.close();

    res.json({
      success: true,
      data: {
        name: tableName,
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          notnull: col.notnull === 1,
          pk: col.pk === 1
        })),
        rowCount,
        sampleData
      }
    });
  } catch (error) {
    console.error('Table details error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// STDIO bridge endpoint for MCP
app.post('/api/mcp-stdio', (req, res) => {
  console.log('MCP STDIO bridge connection established');

  // Set headers for keeping connection alive
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');

  let buffer = '';

  req.on('data', (chunk) => {
    buffer += chunk.toString();
    console.log('Received chunk:', chunk.toString());

    // Process complete JSON-RPC messages
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        let message: any = null;
        try {
          message = JSON.parse(line);
          console.log('Processing MCP message:', JSON.stringify(message, null, 2));

          let response = null;

          // Handle MCP initialize request
          if (message.method === 'initialize') {
            response = {
              jsonrpc: '2.0',
              id: message.id,
              result: {
                protocolVersion: '2024-11-05',
                serverInfo: {
                  name: 'quickmcp-integrated',
                  version: '1.0.0'
                },
                capabilities: {
                  tools: {},
                  resources: {},
                  prompts: {}
                }
              }
            };
          }

          // Handle tools/list request
          else if (message.method === 'tools/list') {
            const tools = [];

            // Add tools from all generated servers
            for (const [serverId, serverInfo] of generatedServers) {
              for (const tool of serverInfo.config.tools) {
                tools.push({
                  name: `${serverId}__${tool.name}`,
                  description: `[${serverInfo.config.name}] ${tool.description}`,
                  inputSchema: tool.inputSchema
                });
              }
            }

            // Add management tools
            tools.push({
              name: 'quickmcp__list_servers',
              description: 'List all generated MCP servers',
              inputSchema: {
                type: 'object',
                properties: {},
                required: []
              }
            });

            response = {
              jsonrpc: '2.0',
              id: message.id,
              result: { tools }
            };
          }

          // Handle initialized notification (no response needed)
          else if (message.method === 'notifications/initialized') {
            //console.log('MCP client initialized');
            // No response for notifications
          }

          // Handle other requests with placeholder responses
          else if (message.id) {
            response = {
              jsonrpc: '2.0',
              id: message.id,
              result: {}
            };
          }

          // Send response if we have one
          if (response) {
            const responseStr = JSON.stringify(response) + '\n';
            console.log('Sending response:', responseStr.trim());
            res.write(responseStr);
          }
        } catch (error) {
          console.error('Error processing MCP message:', error);
          if (message && message.id) {
            const errorResponse = {
              jsonrpc: '2.0',
              id: message.id,
              error: {
                code: -32603,
                message: 'Internal error'
              }
            };
            res.write(JSON.stringify(errorResponse) + '\n');
          }
        }
      }
    }
  });

  req.on('end', () => {
    console.error('MCP stdio connection ended');
    res.end();
  });

  req.on('error', (error) => {
    console.error('MCP stdio connection error:', error);
    res.end();
  });

  req.on('close', () => {
    console.error('MCP stdio connection closed');
  });
});

// Serve index.html for root and any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || 3000;
const MCP_PORT = 3001;

// Initialize integrated MCP server (optional in environments without native deps)
let integratedMCPServer: IntegratedMCPServer | null = null;
try {
  integratedMCPServer = new IntegratedMCPServer();
} catch (error) {
  console.error('⚠️ Skipping IntegratedMCPServer initialization:', error instanceof Error ? error.message : error);
}

app.listen(PORT, async () => {
  //console.error(`🌐 MCP Server Generator running on http://localhost:${PORT}`);

  // Start integrated MCP server
  if (integratedMCPServer) {
    try {
      await integratedMCPServer.start(MCP_PORT);
      // Configuration info is now available in the How to Use page
    } catch (error) {
      console.error('❌ Failed to start integrated MCP server:', error);
    }
  }
});

export default app;

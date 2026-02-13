import express from 'express';
import { DataSourceParser } from '../../parsers';
import { MCPServerGenerator } from '../../generators/MCPServerGenerator';
import {
  DataSourceType,
  GeneratorConfig,
  ParsedData,
  RestDataSource,
  createAirtableGeneratorConfig,
  createAppleNotesGeneratorConfig,
  createAppleRemindersGeneratorConfig,
  createAsanaGeneratorConfig,
  createAzureOpenAIGeneratorConfig,
  createBearNotesGeneratorConfig,
  createBitbucketGeneratorConfig,
  createClaudeGeneratorConfig,
  createClickUpGeneratorConfig,
  createCohereGeneratorConfig,
  createConfluenceGeneratorConfig,
  createCurlGeneratorConfig,
  createDeepSeekGeneratorConfig,
  createDiscordGeneratorConfig,
  createDockerGeneratorConfig,
  createDockerHubGeneratorConfig,
  createDropboxGeneratorConfig,
  createEightSleepGeneratorConfig,
  createElasticsearchGeneratorConfig,
  createEmailGeneratorConfig,
  createFacebookGeneratorConfig,
  createFalAIGeneratorConfig,
  createFileGeneratorConfig,
  createFireworksGeneratorConfig,
  createFtpGeneratorConfig,
  createGDriveGeneratorConfig,
  createGeminiGeneratorConfig,
  createGraphQLGeneratorConfig,
  createGitHubGeneratorConfig,
  createGitLabGeneratorConfig,
  createGoogleCalendarGeneratorConfig,
  createGoogleDocsGeneratorConfig,
  createGoogleSheetsGeneratorConfig,
  createGrafanaGeneratorConfig,
  createGradleGeneratorConfig,
  createGrokGeneratorConfig,
  createGroqGeneratorConfig,
  createHomeAssistantGeneratorConfig,
  createHuggingFaceGeneratorConfig,
  createIMessageGeneratorConfig,
  createInstagramGeneratorConfig,
  createJenkinsGeneratorConfig,
  createJiraGeneratorConfig,
  createKubernetesGeneratorConfig,
  createLinearGeneratorConfig,
  createLlamaGeneratorConfig,
  createLocalFSGeneratorConfig,
  createMavenGeneratorConfig,
  createMicrosoftTeamsGeneratorConfig,
  createMistralGeneratorConfig,
  createMondayGeneratorConfig,
  createMongoDBGeneratorConfig,
  createN8nGeneratorConfig,
  createNexusGeneratorConfig,
  createNotionGeneratorConfig,
  createNpmGeneratorConfig,
  createNugetGeneratorConfig,
  createObsidianGeneratorConfig,
  createOpenAIGeneratorConfig,
  createOpenRouterGeneratorConfig,
  createOpenSearchGeneratorConfig,
  createOpenShiftGeneratorConfig,
  createPerplexityGeneratorConfig,
  createPhilipsHueGeneratorConfig,
  createPrometheusGeneratorConfig,
  createRestGeneratorConfig,
  createRssGeneratorConfig,
  createShazamGeneratorConfig,
  createSignalGeneratorConfig,
  createSlackGeneratorConfig,
  createSonosGeneratorConfig,
  createSoapGeneratorConfig,
  createSpotifyGeneratorConfig,
  createSupabaseGeneratorConfig,
  createTelegramGeneratorConfig,
  createThings3GeneratorConfig,
  createTikTokGeneratorConfig,
  createTogetherGeneratorConfig,
  createTrelloGeneratorConfig,
  createWebpageGeneratorConfig,
  createXGeneratorConfig,
  createZoomGeneratorConfig
} from '../../types';
import { IDataStore } from '../../database/datastore';

type AuthenticatedRequest = express.Request & { authUser?: string; authWorkspace?: string; authRole?: 'admin' | 'user' };

interface GenerateApiDeps {
  parser: DataSourceParser;
  ensureGenerator: () => MCPServerGenerator;
  ensureDataStore: () => IDataStore;
  getEffectiveUsername: (req: AuthenticatedRequest) => string;
  buildServerId: (ownerUsername: string, serverName: string) => string;
}

export class GenerateApi {
  constructor(private readonly deps: GenerateApiDeps) {}

  registerRoutes(app: express.Express): void {
    app.post('/api/generate', this.generate);
  }

  private generate = async (req: AuthenticatedRequest, res: express.Response): Promise<express.Response | void> => {
    const { parser, ensureGenerator, ensureDataStore, getEffectiveUsername, buildServerId } = this.deps;
      try {
        const { name, description, version, dataSource, selectedTables, parsedData } = req.body;
        const ownerUsername = getEffectiveUsername(req);
        
        console.log('🔍 Generate request received:');
        console.log('- Name:', name);
        console.log('- DataSource type:', dataSource?.type);
        console.log('- DataSource:', JSON.stringify(dataSource, null, 2));
        console.log('- Selected tables:', selectedTables?.length || 0);
        console.log('- Parsed data tables:', parsedData?.length || 0);
    
        // Check if server with this name already exists
        const serverName = String(name || '').trim();
        if (!serverName) {
          return res.status(400).json({
            success: false,
            error: 'Server name is required'
          });
        }
    
        const existsForOwner = ensureDataStore().serverNameExistsForOwner(serverName, ownerUsername);
        if (existsForOwner) {
          return res.status(400).json({
            success: false,
            error: `MCP Server with name "${serverName}" already exists for user "${ownerUsername}".`
          });
        }
    
        const serverId = buildServerId(ownerUsername, serverName);
        const serverVersion = typeof version === 'string' && version.trim() ? version.trim() : '1.0.0';
    
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
          dbConfForGen = dataSource.connection || createFileGeneratorConfig(serverName);
        }
    
        // Generate virtual server (saves to SQLite database)
        console.log(`🎯 API calling generateServer with name: "${serverName}"`);
        const result = await ensureGenerator().generateServer(
          serverId,
          serverName,
          ownerUsername,
          parsedForGen,
          dbConfForGen,
          selectedTables,
          serverVersion
        );
    
        if (result.success) {
          // Get counts for display
          const tools = ensureGenerator().getToolsForServer(serverId);
          const resources = ensureGenerator().getResourcesForServer(serverId);
    
          res.json({
            success: true,
            data: {
              serverId,
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
  };
}

export interface CurlSetting {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: { [key: string]: string };
  body?: string;
}

export enum DataSourceType {
  Database = 'database',
  CSV = 'csv',
  Excel = 'excel',
  JSON = 'json',
  Curl = 'curl',
  Webpage = 'webpage',
  Rest = 'rest',
  GitHub = 'github',
  Jira = 'jira',
  Confluence = 'confluence',
  Ftp = 'ftp',
  LocalFS = 'localfs',
  Email = 'email',
  Slack = 'slack',
  Discord = 'discord',
  Docker = 'docker',
  Kubernetes = 'kubernetes',
  Elasticsearch = 'elasticsearch',
  OpenSearch = 'opensearch',
  OpenShift = 'openshift',
  X = 'x',
  Prometheus = 'prometheus',
  Grafana = 'grafana',
  MongoDB = 'mongodb',
  Facebook = 'facebook',
  Dropbox = 'dropbox',
  Trello = 'trello',
  Instagram = 'instagram',
  TikTok = 'tiktok',
  Notion = 'notion',
  Telegram = 'telegram',
  LinkedIn = 'linkedin',
  Reddit = 'reddit',
  YouTube = 'youtube',
  WhatsAppBusiness = 'whatsappbusiness',
  Threads = 'threads',
  OpenAI = 'openai',
  Claude = 'claude',
  Gemini = 'gemini',
  Grok = 'grok',
  Llama = 'llama',
  DeepSeek = 'deepseek',
  AzureOpenAI = 'azure_openai',
  Mistral = 'mistral',
  Cohere = 'cohere',
  Perplexity = 'perplexity',
  Together = 'together',
  Fireworks = 'fireworks',
  Groq = 'groq',
  OpenRouter = 'openrouter',
  GitLab = 'gitlab',
  Bitbucket = 'bitbucket',
  GDrive = 'gdrive',
  GoogleSheets = 'googlesheets',
  Jenkins = 'jenkins',
  DockerHub = 'dockerhub',
}

// Utility: determine when resources should be skipped for a data source
export function shouldGenerateResources(parsedData: any, dbConfig: any): boolean {
  const type = dbConfig?.type as DataSourceType | string | undefined;
  const nonResourceTypes = new Set<string>([
    DataSourceType.Rest,
    DataSourceType.Webpage,
    DataSourceType.Curl,
    DataSourceType.GitHub,
    DataSourceType.Jira,
    DataSourceType.Confluence,
    DataSourceType.Ftp,
    DataSourceType.LocalFS,
    DataSourceType.Email,
    DataSourceType.Slack,
    DataSourceType.Discord,
    DataSourceType.Docker,
    DataSourceType.Kubernetes,
    DataSourceType.Elasticsearch,
    DataSourceType.OpenSearch,
    DataSourceType.OpenShift,
    DataSourceType.X,
    DataSourceType.Prometheus,
    DataSourceType.Grafana,
    DataSourceType.MongoDB,
    DataSourceType.Facebook,
    DataSourceType.Dropbox,
    DataSourceType.Trello,
    DataSourceType.Instagram,
    DataSourceType.TikTok,
    DataSourceType.Notion,
    DataSourceType.Telegram,
    DataSourceType.LinkedIn,
    DataSourceType.Reddit,
    DataSourceType.YouTube,
    DataSourceType.WhatsAppBusiness,
    DataSourceType.Threads,
    DataSourceType.OpenAI,
    DataSourceType.Claude,
    DataSourceType.Gemini,
    DataSourceType.Grok,
    DataSourceType.Llama,
    DataSourceType.DeepSeek,
    DataSourceType.AzureOpenAI,
    DataSourceType.Mistral,
    DataSourceType.Cohere,
    DataSourceType.Perplexity,
    DataSourceType.Together,
    DataSourceType.Fireworks,
    DataSourceType.Groq,
    DataSourceType.OpenRouter,
    DataSourceType.GitLab,
    DataSourceType.Bitbucket,
    DataSourceType.GDrive,
    DataSourceType.GoogleSheets,
    DataSourceType.Jenkins,
    DataSourceType.DockerHub,
  ]);

  return !(Array.isArray(parsedData) || (type && nonResourceTypes.has(type)));
}

export interface DataSource {
  type: DataSourceType;
  name: string;
  connection?: DatabaseConnection;
}

export interface FileDataSource extends DataSource {
  filePath: string;
}

export interface CsvDataSource extends FileDataSource {
  type: DataSourceType.CSV;
}

export interface ExcelDataSource extends FileDataSource {
  type: DataSourceType.Excel;
}

export interface JsonDataSource extends DataSource {
  type: DataSourceType.JSON;
  data: any[];
}

export interface CurlDataSource extends DataSource {
  type: DataSourceType.Curl;
  curlSetting: CurlSetting;
  //alias?: string;
}

export interface WebpageDataSource extends DataSource {
  type: DataSourceType.Webpage;
}

export interface RestDataSource extends DataSource {
  type: DataSourceType.Rest;
  swaggerUrl: string;
  baseUrl?: string;
}

export function createCsvDataSource(name: string, filePath: string): CsvDataSource {
  return {
    type: DataSourceType.CSV,
    name,
    filePath
  };
}

export function createExcelDataSource(name: string, filePath: string): ExcelDataSource {
  return {
    type: DataSourceType.Excel,
    name,
    filePath
  };
}


export function createJsonDataSource(name: string, data: any[]): JsonDataSource {
  return {
    type: DataSourceType.JSON,
    name,
    data
  };
}

export function createCurlDataSource(name: string, curlSetting: CurlSetting): CurlDataSource {
  return {
    type: DataSourceType.Curl,
    name,
    curlSetting
  };
}

export function createRestDataSource(name: string, swaggerUrl: string, baseUrl?: string): RestDataSource {
  return {
    type: DataSourceType.Rest,
    name,
    swaggerUrl,
    baseUrl
  };
}

export interface DatabaseConnection {
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  type: 'mysql' | 'postgresql' | 'sqlite' | 'mssql';
}

export interface GitHubConnection {
  token: string;
  owner?: string;
  repo?: string;
  type: 'github';
}

export interface XConnection {
  token: string;
  username?: string;
  type: 'x';
}

export interface PrometheusConnection {
  baseUrl: string;
  type: 'prometheus';
}

export interface GrafanaConnection {
  baseUrl: string;
  authType: 'apiKey' | 'basic';
  apiKey?: string;
  username?: string;
  password?: string;
  type: 'grafana';
}

export interface MongoDBConnection {
  host: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  authSource?: string;
  type: 'mongodb';
}

export interface FacebookConnection {
  baseUrl: string;
  apiVersion: string;
  accessToken: string;
  userId?: string;
  pageId?: string;
  type: 'facebook';
}

export interface InstagramConnection {
  baseUrl: string;
  accessToken: string;
  userId?: string;
  type: 'instagram';
}

export interface TikTokConnection {
  baseUrl: string;
  accessToken: string;
  userId?: string;
  type: 'tiktok';
}

export interface NotionConnection {
  baseUrl: string;
  accessToken: string;
  notionVersion?: string;
  type: 'notion';
}

export interface TelegramConnection {
  baseUrl: string;
  botToken: string;
  defaultChatId?: string;
  type: 'telegram';
}

export interface LinkedInConnection {
  baseUrl: string;
  accessToken: string;
  personId?: string;
  organizationId?: string;
  type: 'linkedin';
}

export interface RedditConnection {
  baseUrl: string;
  accessToken: string;
  userAgent?: string;
  subreddit?: string;
  username?: string;
  type: 'reddit';
}

export interface YouTubeConnection {
  baseUrl: string;
  apiKey: string;
  accessToken?: string;
  channelId?: string;
  type: 'youtube';
}

export interface WhatsAppBusinessConnection {
  baseUrl: string;
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  type: 'whatsappbusiness';
}

export interface ThreadsConnection {
  baseUrl: string;
  accessToken: string;
  userId?: string;
  type: 'threads';
}

export interface OpenAIConnection {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  type: 'openai';
}

export interface ClaudeConnection {
  baseUrl: string;
  apiKey: string;
  apiVersion?: string;
  defaultModel?: string;
  type: 'claude';
}

export interface GeminiConnection {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  type: 'gemini';
}

export interface GrokConnection {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  type: 'grok';
}

export interface LlamaConnection {
  baseUrl: string;
  defaultModel?: string;
  type: 'llama';
}

export interface DeepSeekConnection {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  type: 'deepseek';
}

export interface AzureOpenAIConnection {
  baseUrl: string;
  apiKey: string;
  apiVersion?: string;
  deployment: string;
  type: 'azure_openai';
}

export interface MistralConnection {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  type: 'mistral';
}

export interface CohereConnection {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  type: 'cohere';
}

export interface PerplexityConnection {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  type: 'perplexity';
}

export interface TogetherConnection {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  type: 'together';
}

export interface FireworksConnection {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  type: 'fireworks';
}

export interface GroqConnection {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  type: 'groq';
}

export interface OpenRouterConnection {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
  type: 'openrouter';
}

export interface DropboxConnection {
  baseUrl: string;
  contentBaseUrl?: string;
  accessToken: string;
  type: 'dropbox';
}

export interface TrelloConnection {
  baseUrl: string;
  apiKey: string;
  apiToken: string;
  memberId?: string;
  boardId?: string;
  listId?: string;
  type: 'trello';
}

export interface GitLabConnection {
  baseUrl: string;
  token: string;
  projectId?: string;
  type: 'gitlab';
}

export interface BitbucketConnection {
  baseUrl: string;
  username: string;
  appPassword: string;
  workspace?: string;
  repoSlug?: string;
  type: 'bitbucket';
}

export interface GDriveConnection {
  baseUrl: string;
  accessToken: string;
  rootFolderId?: string;
  type: 'gdrive';
}

export interface GoogleSheetsConnection {
  baseUrl: string;
  accessToken: string;
  spreadsheetId?: string;
  type: 'googlesheets';
}

export interface JenkinsConnection {
  baseUrl: string;
  username: string;
  apiToken: string;
  type: 'jenkins';
}

export interface DockerHubConnection {
  baseUrl: string;
  accessToken?: string;
  namespace?: string;
  type: 'dockerhub';
}

export interface MCPServerConfig {
  name: string;
  description: string;
  version: string;
  dataSource: DataSource;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments: any[];
  template: string;
}

export interface ParsedData {
  tableName?: string;
  headers: string[];
  rows: any[][];
  metadata: {
    rowCount: number;
    columnCount: number;
    dataTypes: Record<string, string>;
  };
}

export interface MCPTestRequest {
  serverId: string;
  method: 'tool' | 'resource' | 'prompt';
  name: string;
  params?: any;
}

export interface MCPTestResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ActiveDatabaseConnection {
  connection: any;
  config: any;
}

// Generator Config interfaces - used by MCPServerGenerator
export interface BaseGeneratorConfig {
  type: DataSourceType | string;
}

export interface RestGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Rest;
  baseUrl: string;
}

export interface WebpageGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Webpage;
  url: string;
  alias?: string;
}

export interface CurlGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Curl;
  url: string;
  alias?: string;
  method: string;
  headers: { [key: string]: string };
  body: { [key: string]: any };
}

export interface FileGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.CSV | DataSourceType.Excel;
  server: string;
  database: string;
}

export interface GitHubGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.GitHub;
  token: string;
  owner?: string;
  repo?: string;
}

export interface XGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.X;
  token: string;
  username?: string;
}

export interface PrometheusGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Prometheus;
  baseUrl: string;
}

export interface GrafanaGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Grafana;
  baseUrl: string;
  authType: 'apiKey' | 'basic';
  apiKey?: string;
  username?: string;
  password?: string;
}

export interface MongoDBGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.MongoDB;
  host: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  authSource?: string;
}

export interface FacebookGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Facebook;
  baseUrl: string;
  apiVersion: string;
  accessToken: string;
  userId?: string;
  pageId?: string;
}

export interface InstagramGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Instagram;
  baseUrl: string;
  accessToken: string;
  userId?: string;
}

export interface TikTokGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.TikTok;
  baseUrl: string;
  accessToken: string;
  userId?: string;
}

export interface NotionGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Notion;
  baseUrl: string;
  accessToken: string;
  notionVersion?: string;
}

export interface TelegramGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Telegram;
  baseUrl: string;
  botToken: string;
  defaultChatId?: string;
}

export interface LinkedInGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.LinkedIn;
  baseUrl: string;
  accessToken: string;
  personId?: string;
  organizationId?: string;
}

export interface RedditGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Reddit;
  baseUrl: string;
  accessToken: string;
  userAgent?: string;
  subreddit?: string;
  username?: string;
}

export interface YouTubeGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.YouTube;
  baseUrl: string;
  apiKey: string;
  accessToken?: string;
  channelId?: string;
}

export interface WhatsAppBusinessGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.WhatsAppBusiness;
  baseUrl: string;
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
}

export interface ThreadsGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Threads;
  baseUrl: string;
  accessToken: string;
  userId?: string;
}

export interface OpenAIGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.OpenAI;
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
}

export interface ClaudeGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Claude;
  baseUrl: string;
  apiKey: string;
  apiVersion?: string;
  defaultModel?: string;
}

export interface GeminiGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Gemini;
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
}

export interface GrokGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Grok;
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
}

export interface LlamaGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Llama;
  baseUrl: string;
  defaultModel?: string;
}

export interface DeepSeekGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.DeepSeek;
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
}

export interface AzureOpenAIGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.AzureOpenAI;
  baseUrl: string;
  apiKey: string;
  apiVersion?: string;
  deployment: string;
}

export interface MistralGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Mistral;
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
}

export interface CohereGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Cohere;
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
}

export interface PerplexityGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Perplexity;
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
}

export interface TogetherGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Together;
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
}

export interface FireworksGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Fireworks;
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
}

export interface GroqGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Groq;
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
}

export interface OpenRouterGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.OpenRouter;
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
}

export interface DropboxGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Dropbox;
  baseUrl: string;
  contentBaseUrl?: string;
  accessToken: string;
}

export interface TrelloGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Trello;
  baseUrl: string;
  apiKey: string;
  apiToken: string;
  memberId?: string;
  boardId?: string;
  listId?: string;
}

export interface GitLabGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.GitLab;
  baseUrl: string;
  token: string;
  projectId?: string;
}

export interface BitbucketGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Bitbucket;
  baseUrl: string;
  username: string;
  appPassword: string;
  workspace?: string;
  repoSlug?: string;
}

export interface GDriveGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.GDrive;
  baseUrl: string;
  accessToken: string;
  rootFolderId?: string;
}

export interface GoogleSheetsGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.GoogleSheets;
  baseUrl: string;
  accessToken: string;
  spreadsheetId?: string;
}

export interface JenkinsGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Jenkins;
  baseUrl: string;
  username: string;
  apiToken: string;
}

export interface DockerHubGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.DockerHub;
  baseUrl: string;
  accessToken?: string;
  namespace?: string;
}

export interface JiraGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Jira;
  host: string;
  email: string;
  apiToken: string;
  projectKey?: string;
  apiVersion?: 'v2' | 'v3'; // v2 for Jira Server, v3 for Jira Cloud
}

export interface ConfluenceGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Confluence;
  host: string;
  email: string;
  apiToken: string;
  spaceKey?: string;
}

export interface FtpGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Ftp;
  host: string;
  port: number;
  username: string;
  password: string;
  secure?: boolean; // FTPS
  basePath?: string;
}

export interface LocalFSGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.LocalFS;
  basePath: string;
  allowWrite?: boolean;
  allowDelete?: boolean;
}

export interface EmailGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Email;
  mode: 'read' | 'write' | 'both';
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  username: string;
  password: string;
  secure?: boolean;
}

export interface SlackGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Slack;
  botToken: string;
  defaultChannel?: string;
}

export interface DiscordGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Discord;
  botToken: string;
  defaultGuildId?: string;
  defaultChannelId?: string;
}

export interface DockerGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Docker;
  dockerPath?: string; // default: 'docker'
}

export interface KubernetesGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Kubernetes;
  kubectlPath?: string; // default: 'kubectl'
  kubeconfig?: string;
  namespace?: string;
}

export interface ElasticsearchGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.Elasticsearch;
  baseUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  index?: string;
}

export interface OpenSearchGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.OpenSearch;
  baseUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  index?: string;
}

export interface OpenShiftGeneratorConfig extends BaseGeneratorConfig {
  type: DataSourceType.OpenShift;
  ocPath?: string; // default: 'oc'
  kubeconfig?: string;
  namespace?: string;
}

export type GeneratorConfig =
  | RestGeneratorConfig
  | WebpageGeneratorConfig
  | CurlGeneratorConfig
  | FileGeneratorConfig
  | GitHubGeneratorConfig
  | XGeneratorConfig
  | PrometheusGeneratorConfig
  | GrafanaGeneratorConfig
  | MongoDBGeneratorConfig
  | FacebookGeneratorConfig
  | InstagramGeneratorConfig
  | TikTokGeneratorConfig
  | NotionGeneratorConfig
  | TelegramGeneratorConfig
  | LinkedInGeneratorConfig
  | RedditGeneratorConfig
  | YouTubeGeneratorConfig
  | WhatsAppBusinessGeneratorConfig
  | ThreadsGeneratorConfig
  | OpenAIGeneratorConfig
  | ClaudeGeneratorConfig
  | GeminiGeneratorConfig
  | GrokGeneratorConfig
  | LlamaGeneratorConfig
  | DeepSeekGeneratorConfig
  | AzureOpenAIGeneratorConfig
  | MistralGeneratorConfig
  | CohereGeneratorConfig
  | PerplexityGeneratorConfig
  | TogetherGeneratorConfig
  | FireworksGeneratorConfig
  | GroqGeneratorConfig
  | OpenRouterGeneratorConfig
  | DropboxGeneratorConfig
  | TrelloGeneratorConfig
  | GitLabGeneratorConfig
  | BitbucketGeneratorConfig
  | GDriveGeneratorConfig
  | GoogleSheetsGeneratorConfig
  | JenkinsGeneratorConfig
  | DockerHubGeneratorConfig
  | JiraGeneratorConfig
  | ConfluenceGeneratorConfig
  | FtpGeneratorConfig
  | LocalFSGeneratorConfig
  | EmailGeneratorConfig
  | SlackGeneratorConfig
  | DiscordGeneratorConfig
  | DockerGeneratorConfig
  | KubernetesGeneratorConfig
  | ElasticsearchGeneratorConfig
  | OpenSearchGeneratorConfig
  | OpenShiftGeneratorConfig
  | DatabaseConnection
  | GitHubConnection
  | XConnection
  | PrometheusConnection
  | GrafanaConnection
  | MongoDBConnection
  | FacebookConnection
  | InstagramConnection
  | TikTokConnection
  | NotionConnection
  | TelegramConnection
  | LinkedInConnection
  | RedditConnection
  | YouTubeConnection
  | WhatsAppBusinessConnection
  | ThreadsConnection
  | OpenAIConnection
  | ClaudeConnection
  | GeminiConnection
  | GrokConnection
  | LlamaConnection
  | DeepSeekConnection
  | AzureOpenAIConnection
  | MistralConnection
  | CohereConnection
  | PerplexityConnection
  | TogetherConnection
  | FireworksConnection
  | GroqConnection
  | OpenRouterConnection
  | DropboxConnection
  | TrelloConnection
  | GitLabConnection
  | BitbucketConnection
  | GDriveConnection
  | GoogleSheetsConnection
  | JenkinsConnection
  | DockerHubConnection;

// Generator Config factory functions
export function createRestGeneratorConfig(baseUrl: string): RestGeneratorConfig {
  return {
    type: DataSourceType.Rest,
    baseUrl
  };
}

export function createWebpageGeneratorConfig(url: string, alias?: string): WebpageGeneratorConfig {
  return {
    type: DataSourceType.Webpage,
    url,
    alias
  };
}

export function createCurlGeneratorConfig(
  url: string,
  method: string = 'GET',
  headers: { [key: string]: string } = {},
  body: { [key: string]: any } = {},
  alias?: string
): CurlGeneratorConfig {
  return {
    type: DataSourceType.Curl,
    url,
    method,
    headers,
    body,
    alias
  };
}

export function createFileGeneratorConfig(database: string, type: DataSourceType.CSV | DataSourceType.Excel = DataSourceType.CSV): FileGeneratorConfig {
  return {
    type,
    server: 'local',
    database
  };
}

export function createGitHubGeneratorConfig(token: string, owner?: string, repo?: string): GitHubGeneratorConfig {
  return {
    type: DataSourceType.GitHub,
    token,
    owner,
    repo
  };
}

export function createXGeneratorConfig(token: string, username?: string): XGeneratorConfig {
  return {
    type: DataSourceType.X,
    token,
    username
  };
}

export function createPrometheusGeneratorConfig(baseUrl: string): PrometheusGeneratorConfig {
  return {
    type: DataSourceType.Prometheus,
    baseUrl
  };
}

export function createGrafanaGeneratorConfig(
  baseUrl: string,
  authType: 'apiKey' | 'basic',
  apiKey?: string,
  username?: string,
  password?: string
): GrafanaGeneratorConfig {
  return {
    type: DataSourceType.Grafana,
    baseUrl,
    authType,
    apiKey,
    username,
    password
  };
}

export function createMongoDBGeneratorConfig(
  host: string,
  database: string,
  port?: number,
  username?: string,
  password?: string,
  authSource?: string
): MongoDBGeneratorConfig {
  return {
    type: DataSourceType.MongoDB,
    host,
    port,
    database,
    username,
    password,
    authSource
  };
}

export function createFacebookGeneratorConfig(
  baseUrl: string,
  apiVersion: string,
  accessToken: string,
  userId?: string,
  pageId?: string
): FacebookGeneratorConfig {
  return {
    type: DataSourceType.Facebook,
    baseUrl,
    apiVersion,
    accessToken,
    userId,
    pageId
  };
}

export function createInstagramGeneratorConfig(
  baseUrl: string,
  accessToken: string,
  userId?: string
): InstagramGeneratorConfig {
  return {
    type: DataSourceType.Instagram,
    baseUrl,
    accessToken,
    userId
  };
}

export function createTikTokGeneratorConfig(
  baseUrl: string,
  accessToken: string,
  userId?: string
): TikTokGeneratorConfig {
  return {
    type: DataSourceType.TikTok,
    baseUrl,
    accessToken,
    userId
  };
}

export function createNotionGeneratorConfig(
  baseUrl: string,
  accessToken: string,
  notionVersion?: string
): NotionGeneratorConfig {
  return {
    type: DataSourceType.Notion,
    baseUrl,
    accessToken,
    notionVersion
  };
}

export function createTelegramGeneratorConfig(
  baseUrl: string,
  botToken: string,
  defaultChatId?: string
): TelegramGeneratorConfig {
  return {
    type: DataSourceType.Telegram,
    baseUrl,
    botToken,
    defaultChatId
  };
}

export function createLinkedInGeneratorConfig(
  baseUrl: string,
  accessToken: string,
  personId?: string,
  organizationId?: string
): LinkedInGeneratorConfig {
  return {
    type: DataSourceType.LinkedIn,
    baseUrl,
    accessToken,
    personId,
    organizationId
  };
}

export function createRedditGeneratorConfig(
  baseUrl: string,
  accessToken: string,
  userAgent?: string,
  subreddit?: string,
  username?: string
): RedditGeneratorConfig {
  return {
    type: DataSourceType.Reddit,
    baseUrl,
    accessToken,
    userAgent,
    subreddit,
    username
  };
}

export function createYouTubeGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  channelId?: string,
  accessToken?: string
): YouTubeGeneratorConfig {
  return {
    type: DataSourceType.YouTube,
    baseUrl,
    apiKey,
    accessToken,
    channelId
  };
}

export function createWhatsAppBusinessGeneratorConfig(
  baseUrl: string,
  accessToken: string,
  phoneNumberId: string,
  businessAccountId?: string
): WhatsAppBusinessGeneratorConfig {
  return {
    type: DataSourceType.WhatsAppBusiness,
    baseUrl,
    accessToken,
    phoneNumberId,
    businessAccountId
  };
}

export function createThreadsGeneratorConfig(
  baseUrl: string,
  accessToken: string,
  userId?: string
): ThreadsGeneratorConfig {
  return {
    type: DataSourceType.Threads,
    baseUrl,
    accessToken,
    userId
  };
}

export function createOpenAIGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  defaultModel?: string
): OpenAIGeneratorConfig {
  return {
    type: DataSourceType.OpenAI,
    baseUrl,
    apiKey,
    defaultModel
  };
}

export function createClaudeGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  apiVersion?: string,
  defaultModel?: string
): ClaudeGeneratorConfig {
  return {
    type: DataSourceType.Claude,
    baseUrl,
    apiKey,
    apiVersion,
    defaultModel
  };
}

export function createGeminiGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  defaultModel?: string
): GeminiGeneratorConfig {
  return {
    type: DataSourceType.Gemini,
    baseUrl,
    apiKey,
    defaultModel
  };
}

export function createGrokGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  defaultModel?: string
): GrokGeneratorConfig {
  return {
    type: DataSourceType.Grok,
    baseUrl,
    apiKey,
    defaultModel
  };
}

export function createLlamaGeneratorConfig(
  baseUrl: string,
  defaultModel?: string
): LlamaGeneratorConfig {
  return {
    type: DataSourceType.Llama,
    baseUrl,
    defaultModel
  };
}

export function createDeepSeekGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  defaultModel?: string
): DeepSeekGeneratorConfig {
  return {
    type: DataSourceType.DeepSeek,
    baseUrl,
    apiKey,
    defaultModel
  };
}

export function createAzureOpenAIGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  deployment: string,
  apiVersion?: string
): AzureOpenAIGeneratorConfig {
  return {
    type: DataSourceType.AzureOpenAI,
    baseUrl,
    apiKey,
    apiVersion,
    deployment
  };
}

export function createMistralGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  defaultModel?: string
): MistralGeneratorConfig {
  return {
    type: DataSourceType.Mistral,
    baseUrl,
    apiKey,
    defaultModel
  };
}

export function createCohereGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  defaultModel?: string
): CohereGeneratorConfig {
  return {
    type: DataSourceType.Cohere,
    baseUrl,
    apiKey,
    defaultModel
  };
}

export function createPerplexityGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  defaultModel?: string
): PerplexityGeneratorConfig {
  return {
    type: DataSourceType.Perplexity,
    baseUrl,
    apiKey,
    defaultModel
  };
}

export function createTogetherGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  defaultModel?: string
): TogetherGeneratorConfig {
  return {
    type: DataSourceType.Together,
    baseUrl,
    apiKey,
    defaultModel
  };
}

export function createFireworksGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  defaultModel?: string
): FireworksGeneratorConfig {
  return {
    type: DataSourceType.Fireworks,
    baseUrl,
    apiKey,
    defaultModel
  };
}

export function createGroqGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  defaultModel?: string
): GroqGeneratorConfig {
  return {
    type: DataSourceType.Groq,
    baseUrl,
    apiKey,
    defaultModel
  };
}

export function createOpenRouterGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  defaultModel?: string
): OpenRouterGeneratorConfig {
  return {
    type: DataSourceType.OpenRouter,
    baseUrl,
    apiKey,
    defaultModel
  };
}
export function createDropboxGeneratorConfig(
  baseUrl: string,
  accessToken: string,
  contentBaseUrl?: string
): DropboxGeneratorConfig {
  return {
    type: DataSourceType.Dropbox,
    baseUrl,
    contentBaseUrl,
    accessToken
  };
}

export function createTrelloGeneratorConfig(
  baseUrl: string,
  apiKey: string,
  apiToken: string,
  memberId?: string,
  boardId?: string,
  listId?: string
): TrelloGeneratorConfig {
  return {
    type: DataSourceType.Trello,
    baseUrl,
    apiKey,
    apiToken,
    memberId,
    boardId,
    listId
  };
}

export function createGitLabGeneratorConfig(
  baseUrl: string,
  token: string,
  projectId?: string
): GitLabGeneratorConfig {
  return {
    type: DataSourceType.GitLab,
    baseUrl,
    token,
    projectId
  };
}

export function createBitbucketGeneratorConfig(
  baseUrl: string,
  username: string,
  appPassword: string,
  workspace?: string,
  repoSlug?: string
): BitbucketGeneratorConfig {
  return {
    type: DataSourceType.Bitbucket,
    baseUrl,
    username,
    appPassword,
    workspace,
    repoSlug
  };
}

export function createGDriveGeneratorConfig(
  baseUrl: string,
  accessToken: string,
  rootFolderId?: string
): GDriveGeneratorConfig {
  return {
    type: DataSourceType.GDrive,
    baseUrl,
    accessToken,
    rootFolderId
  };
}

export function createGoogleSheetsGeneratorConfig(
  baseUrl: string,
  accessToken: string,
  spreadsheetId?: string
): GoogleSheetsGeneratorConfig {
  return {
    type: DataSourceType.GoogleSheets,
    baseUrl,
    accessToken,
    spreadsheetId
  };
}

export function createJenkinsGeneratorConfig(
  baseUrl: string,
  username: string,
  apiToken: string
): JenkinsGeneratorConfig {
  return {
    type: DataSourceType.Jenkins,
    baseUrl,
    username,
    apiToken
  };
}

export function createDockerHubGeneratorConfig(
  baseUrl: string,
  accessToken?: string,
  namespace?: string
): DockerHubGeneratorConfig {
  return {
    type: DataSourceType.DockerHub,
    baseUrl,
    accessToken,
    namespace
  };
}

export function createJiraGeneratorConfig(host: string, email: string, apiToken: string, projectKey?: string, apiVersion?: 'v2' | 'v3'): JiraGeneratorConfig {
  return {
    type: DataSourceType.Jira,
    host,
    email,
    apiToken,
    projectKey,
    apiVersion: apiVersion || 'v2' // Default to v2 for Jira Server compatibility
  };
}

export function createConfluenceGeneratorConfig(host: string, email: string, apiToken: string, spaceKey?: string): ConfluenceGeneratorConfig {
  return {
    type: DataSourceType.Confluence,
    host,
    email,
    apiToken,
    spaceKey
  };
}

export function createFtpGeneratorConfig(host: string, port: number, username: string, password: string, secure?: boolean, basePath?: string): FtpGeneratorConfig {
  return {
    type: DataSourceType.Ftp,
    host,
    port: port || 21,
    username,
    password,
    secure: secure || false,
    basePath: basePath || '/'
  };
}

export function createLocalFSGeneratorConfig(basePath: string, allowWrite?: boolean, allowDelete?: boolean): LocalFSGeneratorConfig {
  return {
    type: DataSourceType.LocalFS,
    basePath: basePath || '/',
    allowWrite: allowWrite ?? true,
    allowDelete: allowDelete ?? false
  };
}

export function createEmailGeneratorConfig(
  mode: 'read' | 'write' | 'both',
  imapHost: string | undefined,
  imapPort: number | undefined,
  smtpHost: string | undefined,
  smtpPort: number | undefined,
  username: string,
  password: string,
  secure?: boolean
): EmailGeneratorConfig {
  return {
    type: DataSourceType.Email,
    mode,
    imapHost: mode !== 'write' ? imapHost : undefined,
    imapPort: mode !== 'write' ? (imapPort || 993) : undefined,
    smtpHost: mode !== 'read' ? smtpHost : undefined,
    smtpPort: mode !== 'read' ? (smtpPort || 587) : undefined,
    username,
    password,
    secure: secure ?? true
  };
}

export function createSlackGeneratorConfig(
  botToken: string,
  defaultChannel?: string
): SlackGeneratorConfig {
  return {
    type: DataSourceType.Slack,
    botToken,
    defaultChannel
  };
}

export function createDiscordGeneratorConfig(
  botToken: string,
  defaultGuildId?: string,
  defaultChannelId?: string
): DiscordGeneratorConfig {
  return {
    type: DataSourceType.Discord,
    botToken,
    defaultGuildId,
    defaultChannelId,
  };
}

export function createDockerGeneratorConfig(
  dockerPath?: string
): DockerGeneratorConfig {
  return {
    type: DataSourceType.Docker,
    dockerPath: dockerPath || 'docker'
  };
}

export function createKubernetesGeneratorConfig(
  kubectlPath?: string,
  kubeconfig?: string,
  namespace?: string
): KubernetesGeneratorConfig {
  return {
    type: DataSourceType.Kubernetes,
    kubectlPath: kubectlPath || 'kubectl',
    kubeconfig,
    namespace
  };
}

export function createElasticsearchGeneratorConfig(
  baseUrl: string,
  apiKey?: string,
  username?: string,
  password?: string,
  index?: string
): ElasticsearchGeneratorConfig {
  return {
    type: DataSourceType.Elasticsearch,
    baseUrl,
    apiKey,
    username,
    password,
    index
  };
}

export function createOpenSearchGeneratorConfig(
  baseUrl: string,
  apiKey?: string,
  username?: string,
  password?: string,
  index?: string
): OpenSearchGeneratorConfig {
  return {
    type: DataSourceType.OpenSearch,
    baseUrl,
    apiKey,
    username,
    password,
    index
  };
}

export function createOpenShiftGeneratorConfig(
  ocPath?: string,
  kubeconfig?: string,
  namespace?: string
): OpenShiftGeneratorConfig {
  return {
    type: DataSourceType.OpenShift,
    ocPath: ocPath || 'oc',
    kubeconfig,
    namespace
  };
}

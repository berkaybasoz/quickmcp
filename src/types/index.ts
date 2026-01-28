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

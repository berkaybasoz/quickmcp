// ─── Data Source Types ────────────────────────────────────────────────────────

export const DataSourceType = {
  CSV:               'csv',
  Excel:             'excel',
  Rest:              'rest',
  Webpage:           'web',
  Curl:              'curl',
  GraphQL:           'graphql',
  Soap:              'soap',
  Rss:               'rss',
  GitHub:            'github',
  X:                 'x',
  Prometheus:        'prometheus',
  Grafana:           'grafana',
  MongoDB:           'mongodb',
  Facebook:          'facebook',
  Instagram:         'instagram',
  TikTok:            'tiktok',
  Notion:            'notion',
  Telegram:          'telegram',
  LinkedIn:          'linkedin',
  Reddit:            'reddit',
  YouTube:           'youtube',
  WhatsAppBusiness:  'whatsappbusiness',
  Threads:           'x-threads',
  Spotify:           'spotify',
  Sonos:             'sonos',
  Shazam:            'shazam',
  PhilipsHue:        'philipshue',
  EightSleep:        'eightsleep',
  HomeAssistant:     'homeassistant',
  AppleNotes:        'applenotes',
  AppleReminders:    'applereminders',
  Things3:           'things3',
  Obsidian:          'obsidian',
  BearNotes:         'bearnotes',
  IMessage:          'imessage',
  Zoom:              'zoom',
  MicrosoftTeams:    'microsoftteams',
  Signal:            'signal',
  OpenAI:            'openai',
  Claude:            'claude',
  Gemini:            'gemini',
  Grok:              'grok',
  FalAI:             'falai',
  HuggingFace:       'huggingface',
  Llama:             'llama',
  DeepSeek:          'deepseek',
  AzureOpenAI:       'azure-openai',
  Mistral:           'mistral',
  Cohere:            'cohere',
  Perplexity:        'perplexity',
  Together:          'together',
  Fireworks:         'fireworks',
  Groq:              'groq',
  OpenRouter:        'openrouter',
  Dropbox:           'dropbox',
  N8n:               'n8n',
  Supabase:          'supabase',
  Npm:               'npm',
  Nuget:             'nuget',
  Maven:             'maven',
  Gradle:            'gradle',
  Nexus:             'nexus',
  Trello:            'trello',
  GitLab:            'gitlab',
  Bitbucket:         'bitbucket',
  GDrive:            'gdrive',
  GoogleCalendar:    'googlecalendar',
  GoogleDocs:        'googledocs',
  GoogleSheets:      'googlesheets',
  Airtable:          'airtable',
  Asana:             'asana',
  Monday:            'monday',
  ClickUp:           'clickup',
  Linear:            'linear',
  Jenkins:           'jenkins',
  DockerHub:         'dockerhub',
  Jira:              'jira',
  Confluence:        'confluence',
  Ftp:               'ftp',
  LocalFS:           'localfs',
  Email:             'email',
  Gmail:             'gmail',
  Slack:             'slack',
  Discord:           'discord',
  Docker:            'docker',
  Kubernetes:        'kubernetes',
  OpenShift:         'openshift',
  Elasticsearch:     'elasticsearch',
  OpenSearch:        'opensearch',
  Redis:             'redis',
  Hazelcast:         'hazelcast',
  Kafka:             'kafka',
  MySQL:             'mysql',
  PostgreSQL:        'postgresql',
  MSSQL:             'mssql',
  SQLite:            'sqlite',
  Oracle:            'oracle',
  MariaDB:           'mariadb',
  DB2:               'db2',
} as const;

export type DataSourceTypeValue = typeof DataSourceType[keyof typeof DataSourceType];

// ─── Helper interfaces ────────────────────────────────────────────────────────

export interface DataSourceConfig {
  type: DataSourceTypeValue;
}

export type ParsedData = any[];

export type WizardStep = 1 | 2 | 3 | 4;

// ─── Full wizard form state ───────────────────────────────────────────────────

export interface GenerateFormState {
  // Step 1
  selectedType: DataSourceTypeValue | null;

  // Database fields
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;

  // MongoDB
  mongoHost: string;
  mongoPort: string;
  mongoDatabase: string;
  mongoAuthSource: string;
  mongoUsername: string;
  mongoPassword: string;

  // REST
  swaggerUrl: string;

  // Web / Curl
  webUrl: string;
  curlCommand: string;
  curlUrl: string;
  curlMethod: string;
  curlHeaders: string;
  curlBody: string;
  curlMode: 'paste' | 'manual';

  // GraphQL
  graphqlBaseUrl: string;
  graphqlHeaders: string;

  // SOAP
  soapBaseUrl: string;
  soapWsdlUrl: string;
  soapAction: string;
  soapHeaders: string;

  // RSS
  rssFeedUrl: string;

  // GitHub
  githubToken: string;
  githubOwner: string;
  githubRepo: string;

  // X / Twitter
  xToken: string;
  xUsername: string;

  // Prometheus
  prometheusBaseUrl: string;

  // Grafana
  grafanaBaseUrl: string;
  grafanaAuthType: 'apiKey' | 'basic';
  grafanaApiKey: string;
  grafanaUsername: string;
  grafanaPassword: string;

  // Facebook
  facebookBaseUrl: string;
  facebookApiVersion: string;
  facebookAccessToken: string;
  facebookUserId: string;
  facebookPageId: string;

  // Instagram
  instagramBaseUrl: string;
  instagramAccessToken: string;
  instagramUserId: string;

  // TikTok
  tiktokBaseUrl: string;
  tiktokAccessToken: string;
  tiktokUserId: string;

  // Notion
  notionBaseUrl: string;
  notionVersion: string;
  notionAccessToken: string;

  // Telegram
  telegramBaseUrl: string;
  telegramBotToken: string;
  telegramChatId: string;

  // LinkedIn
  linkedinAccessToken: string;
  linkedinPersonId: string;
  linkedinOrganizationId: string;

  // Reddit
  redditAccessToken: string;
  redditUserAgent: string;
  redditSubreddit: string;
  redditUsername: string;

  // YouTube
  youtubeApiKey: string;
  youtubeAccessToken: string;
  youtubeChannelId: string;

  // WhatsApp Business
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;

  // Threads
  threadsAccessToken: string;
  threadsUserId: string;

  // Spotify
  spotifyBaseUrl: string;
  spotifyAccessToken: string;

  // Sonos
  sonosBaseUrl: string;
  sonosAccessToken: string;

  // Shazam
  shazamBaseUrl: string;
  shazamApiKey: string;
  shazamApiHost: string;

  // Philips Hue
  philipshueBaseUrl: string;
  philipshueAccessToken: string;

  // 8Sleep
  eightsleepBaseUrl: string;
  eightsleepAccessToken: string;

  // Home Assistant
  homeassistantBaseUrl: string;
  homeassistantAccessToken: string;

  // Apple Notes / Reminders / Things3 / Obsidian / Bear
  applenotesBaseUrl: string;
  applenotesAccessToken: string;
  appleremindersBaseUrl: string;
  appleremindersAccessToken: string;
  things3BaseUrl: string;
  things3AccessToken: string;
  obsidianBaseUrl: string;
  obsidianAccessToken: string;
  bearnotesBaseUrl: string;
  bearnotesAccessToken: string;

  // iMessage / Zoom / Teams / Signal
  imessageBaseUrl: string;
  imessageAccessToken: string;
  zoomBaseUrl: string;
  zoomAccessToken: string;
  microsoftteamsBaseUrl: string;
  microsoftteamsAccessToken: string;
  signalBaseUrl: string;
  signalAccessToken: string;

  // AI – OpenAI / Claude / Gemini / Grok
  openaiApiKey: string;
  openaiModel: string;
  claudeApiKey: string;
  claudeModel: string;
  claudeApiVersion: string;
  geminiApiKey: string;
  geminiModel: string;
  grokApiKey: string;
  grokModel: string;

  // AI – extended providers
  falaiBaseUrl: string;
  falaiApiKey: string;
  huggingfaceBaseUrl: string;
  huggingfaceApiKey: string;
  huggingfaceDefaultModel: string;
  llamaBaseUrl: string;
  llamaModel: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
  deepseekApiKey: string;
  azureOpenAIBaseUrl: string;
  azureOpenAIApiVersion: string;
  azureOpenAIDeployment: string;
  azureOpenAIApiKey: string;
  mistralBaseUrl: string;
  mistralModel: string;
  mistralApiKey: string;
  cohereBaseUrl: string;
  cohereModel: string;
  cohereApiKey: string;
  perplexityBaseUrl: string;
  perplexityModel: string;
  perplexityApiKey: string;
  togetherBaseUrl: string;
  togetherModel: string;
  togetherApiKey: string;
  fireworksBaseUrl: string;
  fireworksModel: string;
  fireworksApiKey: string;
  groqBaseUrl: string;
  groqModel: string;
  groqApiKey: string;
  openrouterBaseUrl: string;
  openrouterModel: string;
  openrouterApiKey: string;

  // Dropbox
  dropboxBaseUrl: string;
  dropboxContentBaseUrl: string;
  dropboxAccessToken: string;

  // n8n
  n8nBaseUrl: string;
  n8nApiKey: string;
  n8nApiPath: string;
  n8nSelectedTools: string[];

  // Supabase
  supabaseBaseUrl: string;
  supabaseApiKey: string;

  // Package registries
  npmBaseUrl: string;
  nugetBaseUrl: string;
  nugetRegistrationBaseUrl: string;
  mavenBaseUrl: string;
  gradleBaseUrl: string;
  nexusBaseUrl: string;
  nexusApiKey: string;
  nexusUsername: string;
  nexusPassword: string;

  // Trello
  trelloBaseUrl: string;
  trelloApiKey: string;
  trelloApiToken: string;
  trelloMemberId: string;
  trelloBoardId: string;
  trelloListId: string;

  // GitLab
  gitlabBaseUrl: string;
  gitlabToken: string;
  gitlabProjectId: string;

  // Bitbucket
  bitbucketBaseUrl: string;
  bitbucketUsername: string;
  bitbucketAppPassword: string;
  bitbucketWorkspace: string;
  bitbucketRepoSlug: string;

  // Google services
  gdriveBaseUrl: string;
  gdriveAccessToken: string;
  gdriveRootFolderId: string;
  gcalBaseUrl: string;
  gcalAccessToken: string;
  gcalCalendarId: string;
  gdocsBaseUrl: string;
  gdocsAccessToken: string;
  sheetsBaseUrl: string;
  sheetsAccessToken: string;

  // Airtable
  airtableBaseUrl: string;
  airtableAccessToken: string;
  airtableBaseId: string;
  airtableTableName: string;

  // Asana / Monday / ClickUp / Linear
  asanaBaseUrl: string;
  asanaAccessToken: string;
  mondayBaseUrl: string;
  mondayApiKey: string;
  clickupBaseUrl: string;
  clickupAccessToken: string;
  linearBaseUrl: string;
  linearAccessToken: string;

  // Jenkins / DockerHub
  jenkinsBaseUrl: string;
  jenkinsUsername: string;
  jenkinsApiToken: string;
  dockerhubBaseUrl: string;

  // Jira / Confluence
  jiraHost: string;
  jiraEmail: string;
  jiraApiToken: string;
  jiraApiVersion: 'v2' | 'v3';
  jiraProjectKey: string;
  confluenceHost: string;
  confluenceEmail: string;
  confluenceApiToken: string;

  // FTP
  ftpHost: string;
  ftpPort: string;
  ftpUsername: string;
  ftpPassword: string;
  ftpBasePath: string;
  ftpSecure: boolean;

  // LocalFS
  localfsBasePath: string;
  localfsAllowRead: boolean;
  localfsAllowWrite: boolean;
  localfsAllowDelete: boolean;

  // Email
  emailMode: 'read' | 'write' | 'both';
  emailUsername: string;
  emailPassword: string;
  emailImapHost: string;
  emailImapPort: string;
  emailSmtpHost: string;
  emailSmtpPort: string;
  emailSecure: boolean;

  // Gmail
  gmailMode: 'read' | 'write' | 'both';
  gmailUsername: string;
  gmailPassword: string;
  gmailSecure: boolean;

  // Slack
  slackBotToken: string;
  slackDefaultChannel: string;

  // Discord
  discordBotToken: string;
  discordDefaultGuildId: string;
  discordDefaultChannelId: string;

  // Docker / Kubernetes / OpenShift
  dockerPath: string;
  kubectlPath: string;
  kubeconfigPath: string;
  kubernetesNamespace: string;

  // Elasticsearch / OpenSearch
  esBaseUrl: string;
  opensearchBaseUrl: string;

  // CSV / Excel file
  csvExcelFilePath: string;
  csvExcelFile: File | null;

  // Step 3 – parsed data
  currentDataSource: any | null;
  currentParsedData: any[] | null;
  previewHtml: string;

  // Step 4 – server config
  serverName: string;
  serverDescription: string;
  serverVersion: string;

  // UI state
  currentStep: WizardStep;
  generateLoading: boolean;
  generateError: string;
  generateSuccess: string;
  nameValidation: { available: boolean | null; message: string };

  // SaaS
  isSaasDeployMode: boolean;
  onPremOnlyTypes: Set<string>;

  // Success modal
  successModal: {
    visible: boolean;
    serverName: string;
    message: string;
  };

  // Directory picker
  directoryPicker: {
    visible: boolean;
    currentPath: string;
    mode: 'directory' | 'file';
    targetInputId: string;
    extensions: string[];
    entries: Array<{ name: string; isDirectory: boolean; path: string }>;
    loading: boolean;
  };
}

// ─── Initial state ────────────────────────────────────────────────────────────

export const INITIAL_FORM_STATE: GenerateFormState = {
  selectedType: null,

  dbHost: '',
  dbPort: '',
  dbName: '',
  dbUser: '',
  dbPassword: '',

  mongoHost: '',
  mongoPort: '27017',
  mongoDatabase: '',
  mongoAuthSource: '',
  mongoUsername: '',
  mongoPassword: '',

  swaggerUrl: '',

  webUrl: '',
  curlCommand: '',
  curlUrl: '',
  curlMethod: 'GET',
  curlHeaders: '',
  curlBody: '',
  curlMode: 'paste',

  graphqlBaseUrl: '',
  graphqlHeaders: '',

  soapBaseUrl: '',
  soapWsdlUrl: '',
  soapAction: '',
  soapHeaders: '',

  rssFeedUrl: '',

  githubToken: '',
  githubOwner: '',
  githubRepo: '',

  xToken: '',
  xUsername: '',

  prometheusBaseUrl: '',

  grafanaBaseUrl: '',
  grafanaAuthType: 'apiKey',
  grafanaApiKey: '',
  grafanaUsername: '',
  grafanaPassword: '',

  facebookBaseUrl: 'https://graph.facebook.com',
  facebookApiVersion: 'v18.0',
  facebookAccessToken: '',
  facebookUserId: '',
  facebookPageId: '',

  instagramBaseUrl: 'https://graph.instagram.com',
  instagramAccessToken: '',
  instagramUserId: '',

  tiktokBaseUrl: 'https://open.tiktokapis.com',
  tiktokAccessToken: '',
  tiktokUserId: '',

  notionBaseUrl: 'https://api.notion.com',
  notionVersion: '2022-06-28',
  notionAccessToken: '',

  telegramBaseUrl: 'https://api.telegram.org',
  telegramBotToken: '',
  telegramChatId: '',

  linkedinAccessToken: '',
  linkedinPersonId: '',
  linkedinOrganizationId: '',

  redditAccessToken: '',
  redditUserAgent: '',
  redditSubreddit: '',
  redditUsername: '',

  youtubeApiKey: '',
  youtubeAccessToken: '',
  youtubeChannelId: '',

  whatsappAccessToken: '',
  whatsappPhoneNumberId: '',
  whatsappBusinessAccountId: '',

  threadsAccessToken: '',
  threadsUserId: '',

  spotifyBaseUrl: 'https://api.spotify.com',
  spotifyAccessToken: '',

  sonosBaseUrl: '',
  sonosAccessToken: '',

  shazamBaseUrl: 'https://shazam.p.rapidapi.com',
  shazamApiKey: '',
  shazamApiHost: 'shazam.p.rapidapi.com',

  philipshueBaseUrl: '',
  philipshueAccessToken: '',

  eightsleepBaseUrl: 'https://client-api.8slp.net',
  eightsleepAccessToken: '',

  homeassistantBaseUrl: '',
  homeassistantAccessToken: '',

  applenotesBaseUrl: '',
  applenotesAccessToken: '',
  appleremindersBaseUrl: '',
  appleremindersAccessToken: '',
  things3BaseUrl: '',
  things3AccessToken: '',
  obsidianBaseUrl: '',
  obsidianAccessToken: '',
  bearnotesBaseUrl: '',
  bearnotesAccessToken: '',

  imessageBaseUrl: '',
  imessageAccessToken: '',
  zoomBaseUrl: 'https://api.zoom.us',
  zoomAccessToken: '',
  microsoftteamsBaseUrl: 'https://graph.microsoft.com',
  microsoftteamsAccessToken: '',
  signalBaseUrl: '',
  signalAccessToken: '',

  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  claudeApiKey: '',
  claudeModel: 'claude-opus-4-5',
  claudeApiVersion: '2023-06-01',
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-pro',
  grokApiKey: '',
  grokModel: 'grok-beta',

  falaiBaseUrl: 'https://fal.run',
  falaiApiKey: '',
  huggingfaceBaseUrl: 'https://api-inference.huggingface.co',
  huggingfaceApiKey: '',
  huggingfaceDefaultModel: '',
  llamaBaseUrl: 'http://localhost:11434',
  llamaModel: 'llama3',
  deepseekBaseUrl: 'https://api.deepseek.com',
  deepseekModel: 'deepseek-chat',
  deepseekApiKey: '',
  azureOpenAIBaseUrl: '',
  azureOpenAIApiVersion: '2024-02-01',
  azureOpenAIDeployment: '',
  azureOpenAIApiKey: '',
  mistralBaseUrl: 'https://api.mistral.ai',
  mistralModel: 'mistral-large-latest',
  mistralApiKey: '',
  cohereBaseUrl: 'https://api.cohere.ai',
  cohereModel: 'command-r-plus',
  cohereApiKey: '',
  perplexityBaseUrl: 'https://api.perplexity.ai',
  perplexityModel: 'llama-3.1-sonar-large-128k-online',
  perplexityApiKey: '',
  togetherBaseUrl: 'https://api.together.xyz',
  togetherModel: '',
  togetherApiKey: '',
  fireworksBaseUrl: 'https://api.fireworks.ai',
  fireworksModel: '',
  fireworksApiKey: '',
  groqBaseUrl: 'https://api.groq.com',
  groqModel: 'llama3-8b-8192',
  groqApiKey: '',
  openrouterBaseUrl: 'https://openrouter.ai/api',
  openrouterModel: '',
  openrouterApiKey: '',

  dropboxBaseUrl: 'https://api.dropboxapi.com',
  dropboxContentBaseUrl: 'https://content.dropboxapi.com',
  dropboxAccessToken: '',

  n8nBaseUrl: '',
  n8nApiKey: '',
  n8nApiPath: '/api/v1',
  n8nSelectedTools: ['list_executions','get_execution','get_execution_tags','list_workflows','get_workflow','get_workflow_version','get_workflow_tags','list_tags','get_tag','list_variables','list_data_tables','get_data_table','list_data_table_rows','list_projects','list_project_users'],

  supabaseBaseUrl: '',
  supabaseApiKey: '',

  npmBaseUrl: 'https://registry.npmjs.org',
  nugetBaseUrl: 'https://api.nuget.org/v3',
  nugetRegistrationBaseUrl: 'https://api.nuget.org/v3/registration5-gz-semver2',
  mavenBaseUrl: 'https://search.maven.org/solrsearch',
  gradleBaseUrl: 'https://plugins.gradle.org/m2',
  nexusBaseUrl: '',
  nexusApiKey: '',
  nexusUsername: '',
  nexusPassword: '',

  trelloBaseUrl: 'https://api.trello.com',
  trelloApiKey: '',
  trelloApiToken: '',
  trelloMemberId: '',
  trelloBoardId: '',
  trelloListId: '',

  gitlabBaseUrl: 'https://gitlab.com',
  gitlabToken: '',
  gitlabProjectId: '',

  bitbucketBaseUrl: 'https://api.bitbucket.org',
  bitbucketUsername: '',
  bitbucketAppPassword: '',
  bitbucketWorkspace: '',
  bitbucketRepoSlug: '',

  gdriveBaseUrl: 'https://www.googleapis.com/drive/v3',
  gdriveAccessToken: '',
  gdriveRootFolderId: '',
  gcalBaseUrl: 'https://www.googleapis.com/calendar/v3',
  gcalAccessToken: '',
  gcalCalendarId: 'primary',
  gdocsBaseUrl: 'https://docs.googleapis.com/v1',
  gdocsAccessToken: '',
  sheetsBaseUrl: 'https://sheets.googleapis.com/v4',
  sheetsAccessToken: '',

  airtableBaseUrl: 'https://api.airtable.com/v0',
  airtableAccessToken: '',
  airtableBaseId: '',
  airtableTableName: '',

  asanaBaseUrl: 'https://app.asana.com/api/1.0',
  asanaAccessToken: '',
  mondayBaseUrl: 'https://api.monday.com/v2',
  mondayApiKey: '',
  clickupBaseUrl: 'https://api.clickup.com/api/v2',
  clickupAccessToken: '',
  linearBaseUrl: 'https://api.linear.app',
  linearAccessToken: '',

  jenkinsBaseUrl: '',
  jenkinsUsername: '',
  jenkinsApiToken: '',
  dockerhubBaseUrl: 'https://hub.docker.com/v2',

  jiraHost: '',
  jiraEmail: '',
  jiraApiToken: '',
  jiraApiVersion: 'v2',
  jiraProjectKey: '',
  confluenceHost: '',
  confluenceEmail: '',
  confluenceApiToken: '',

  ftpHost: '',
  ftpPort: '21',
  ftpUsername: '',
  ftpPassword: '',
  ftpBasePath: '/',
  ftpSecure: false,

  localfsBasePath: '',
  localfsAllowRead: true,
  localfsAllowWrite: false,
  localfsAllowDelete: false,

  emailMode: 'both',
  emailUsername: '',
  emailPassword: '',
  emailImapHost: '',
  emailImapPort: '993',
  emailSmtpHost: '',
  emailSmtpPort: '587',
  emailSecure: true,

  gmailMode: 'both',
  gmailUsername: '',
  gmailPassword: '',
  gmailSecure: true,

  slackBotToken: '',
  slackDefaultChannel: '',

  discordBotToken: '',
  discordDefaultGuildId: '',
  discordDefaultChannelId: '',

  dockerPath: 'docker',
  kubectlPath: 'kubectl',
  kubeconfigPath: '',
  kubernetesNamespace: 'default',

  esBaseUrl: 'http://localhost:9200',
  opensearchBaseUrl: 'http://localhost:9200',

  csvExcelFilePath: '',
  csvExcelFile: null,

  currentDataSource: null,
  currentParsedData: null,
  previewHtml: '',

  serverName: '',
  serverDescription: '',
  serverVersion: '1.0.0',

  currentStep: 1,
  generateLoading: false,
  generateError: '',
  generateSuccess: '',
  nameValidation: { available: null, message: '' },

  isSaasDeployMode: false,
  onPremOnlyTypes: new Set(),

  successModal: {
    visible: false,
    serverName: '',
    message: '',
  },

  directoryPicker: {
    visible: false,
    currentPath: '~',
    mode: 'directory',
    targetInputId: '',
    extensions: [],
    entries: [],
    loading: false,
  },
};

// ─── Helper functions ─────────────────────────────────────────────────────────

const DATABASE_TYPES = new Set<DataSourceTypeValue>([
  DataSourceType.PostgreSQL,
  DataSourceType.MySQL,
  DataSourceType.MSSQL,
  DataSourceType.SQLite,
  DataSourceType.Oracle,
  DataSourceType.MariaDB,
  DataSourceType.DB2,
]);

const CONNECTION_TEMPLATE_TYPES = new Set<DataSourceTypeValue>([
  DataSourceType.Redis,
  DataSourceType.Hazelcast,
  DataSourceType.Kafka,
]);

const TABLE_DATA_TYPES = new Set<DataSourceTypeValue>([
  ...DATABASE_TYPES,
  DataSourceType.Rest,
  DataSourceType.CSV,
  DataSourceType.Excel,
]);

export function isDatabase(type: DataSourceTypeValue | null | undefined): boolean {
  if (!type) return false;
  return DATABASE_TYPES.has(type);
}

export function isConnectionTemplateSource(type: DataSourceTypeValue | null | undefined): boolean {
  if (!type) return false;
  return CONNECTION_TEMPLATE_TYPES.has(type);
}

export function isNoTableDataSource(type: DataSourceTypeValue | null | undefined): boolean {
  if (!type) return false;
  return !TABLE_DATA_TYPES.has(type);
}

export function usesDatabaseConnectionForm(type: DataSourceTypeValue | null | undefined): boolean {
  return isDatabase(type) || isConnectionTemplateSource(type);
}

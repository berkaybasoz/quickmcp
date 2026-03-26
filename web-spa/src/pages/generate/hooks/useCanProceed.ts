import { useMemo } from 'react';
import { DataSourceType, GenerateFormState } from '../types';

type RelevantState = Pick<
  GenerateFormState,
  // Step 1
  | 'selectedType'
  // SaaS guard
  | 'isSaasDeployMode'
  | 'onPremOnlyTypes'
  // Database
  | 'dbHost' | 'dbName' | 'dbUser' | 'dbPassword'
  // MongoDB
  | 'mongoHost' | 'mongoDatabase'
  // REST
  | 'swaggerUrl'
  // Web
  | 'webUrl'
  // Curl
  | 'curlMode' | 'curlCommand' | 'curlUrl'
  // GraphQL
  | 'graphqlBaseUrl'
  // SOAP
  | 'soapBaseUrl'
  // RSS
  | 'rssFeedUrl'
  // GitHub
  | 'githubToken'
  // X
  | 'xToken'
  // Prometheus
  | 'prometheusBaseUrl'
  // Grafana
  | 'grafanaBaseUrl' | 'grafanaAuthType' | 'grafanaApiKey' | 'grafanaUsername' | 'grafanaPassword'
  // Facebook
  | 'facebookBaseUrl' | 'facebookApiVersion' | 'facebookAccessToken'
  // Instagram
  | 'instagramBaseUrl' | 'instagramAccessToken'
  // TikTok
  | 'tiktokBaseUrl' | 'tiktokAccessToken'
  // Notion
  | 'notionBaseUrl' | 'notionAccessToken'
  // Telegram
  | 'telegramBaseUrl' | 'telegramBotToken'
  // LinkedIn
  | 'linkedinAccessToken'
  // Reddit
  | 'redditAccessToken'
  // YouTube
  | 'youtubeApiKey'
  // WhatsApp
  | 'whatsappAccessToken' | 'whatsappPhoneNumberId'
  // Threads
  | 'threadsAccessToken'
  // Spotify
  | 'spotifyBaseUrl' | 'spotifyAccessToken'
  // Sonos
  | 'sonosBaseUrl' | 'sonosAccessToken'
  // Shazam
  | 'shazamBaseUrl' | 'shazamApiKey'
  // PhilipsHue
  | 'philipshueBaseUrl' | 'philipshueAccessToken'
  // 8Sleep
  | 'eightsleepBaseUrl' | 'eightsleepAccessToken'
  // Home Assistant
  | 'homeassistantBaseUrl' | 'homeassistantAccessToken'
  // Apple Notes
  | 'applenotesBaseUrl' | 'applenotesAccessToken'
  // Apple Reminders
  | 'appleremindersBaseUrl' | 'appleremindersAccessToken'
  // Things3
  | 'things3BaseUrl' | 'things3AccessToken'
  // Obsidian
  | 'obsidianBaseUrl' | 'obsidianAccessToken'
  // Bear Notes
  | 'bearnotesBaseUrl' | 'bearnotesAccessToken'
  // iMessage
  | 'imessageBaseUrl' | 'imessageAccessToken'
  // Zoom
  | 'zoomBaseUrl' | 'zoomAccessToken'
  // Microsoft Teams
  | 'microsoftteamsBaseUrl' | 'microsoftteamsAccessToken'
  // Signal
  | 'signalBaseUrl' | 'signalAccessToken'
  // OpenAI
  | 'openaiApiKey'
  // Claude
  | 'claudeApiKey'
  // Gemini
  | 'geminiApiKey'
  // Grok
  | 'grokApiKey'
  // FalAI
  | 'falaiBaseUrl' | 'falaiApiKey'
  // HuggingFace
  | 'huggingfaceBaseUrl' | 'huggingfaceApiKey'
  // Llama
  | 'llamaBaseUrl'
  // DeepSeek
  | 'deepseekBaseUrl' | 'deepseekApiKey'
  // Azure OpenAI
  | 'azureOpenAIBaseUrl' | 'azureOpenAIApiKey' | 'azureOpenAIDeployment'
  // Mistral
  | 'mistralBaseUrl' | 'mistralApiKey'
  // Cohere
  | 'cohereBaseUrl' | 'cohereApiKey'
  // Perplexity
  | 'perplexityBaseUrl' | 'perplexityApiKey'
  // Together
  | 'togetherBaseUrl' | 'togetherApiKey'
  // Fireworks
  | 'fireworksBaseUrl' | 'fireworksApiKey'
  // Groq
  | 'groqBaseUrl' | 'groqApiKey'
  // OpenRouter
  | 'openrouterBaseUrl' | 'openrouterApiKey'
  // Dropbox
  | 'dropboxBaseUrl' | 'dropboxAccessToken'
  // n8n
  | 'n8nBaseUrl' | 'n8nApiKey' | 'n8nSelectedTools'
  // Supabase
  | 'supabaseBaseUrl' | 'supabaseApiKey'
  // Package registries
  | 'npmBaseUrl'
  | 'nugetBaseUrl' | 'nugetRegistrationBaseUrl'
  | 'mavenBaseUrl'
  | 'gradleBaseUrl'
  | 'nexusBaseUrl' | 'nexusApiKey' | 'nexusUsername' | 'nexusPassword'
  // Trello
  | 'trelloBaseUrl' | 'trelloApiKey' | 'trelloApiToken'
  // GitLab
  | 'gitlabBaseUrl' | 'gitlabToken'
  // Bitbucket
  | 'bitbucketBaseUrl' | 'bitbucketUsername' | 'bitbucketAppPassword'
  // Google services
  | 'gdriveBaseUrl' | 'gdriveAccessToken'
  | 'gcalBaseUrl' | 'gcalAccessToken'
  | 'gdocsBaseUrl' | 'gdocsAccessToken'
  | 'sheetsBaseUrl' | 'sheetsAccessToken'
  // Airtable
  | 'airtableBaseUrl' | 'airtableAccessToken'
  // Asana / Monday / ClickUp / Linear
  | 'asanaBaseUrl' | 'asanaAccessToken'
  | 'mondayBaseUrl' | 'mondayApiKey'
  | 'clickupBaseUrl' | 'clickupAccessToken'
  | 'linearBaseUrl' | 'linearAccessToken'
  // Jenkins / DockerHub
  | 'jenkinsBaseUrl' | 'jenkinsUsername' | 'jenkinsApiToken'
  | 'dockerhubBaseUrl'
  // Jira / Confluence
  | 'jiraHost' | 'jiraEmail' | 'jiraApiToken'
  | 'confluenceHost' | 'confluenceEmail' | 'confluenceApiToken'
  // FTP
  | 'ftpHost' | 'ftpUsername' | 'ftpPassword'
  // LocalFS
  | 'localfsBasePath'
  // Email
  | 'emailMode' | 'emailUsername' | 'emailPassword' | 'emailImapHost' | 'emailSmtpHost'
  // Gmail
  | 'gmailUsername' | 'gmailPassword'
  // Slack
  | 'slackBotToken'
  // Discord
  | 'discordBotToken'
  // Elasticsearch / OpenSearch
  | 'esBaseUrl'
  | 'opensearchBaseUrl'
  // CSV / Excel
  | 'csvExcelFile' | 'csvExcelFilePath'
>;

export function useCanProceed(state: RelevantState): boolean {
  return useMemo(() => {
    const { selectedType, isSaasDeployMode, onPremOnlyTypes } = state;

    if (!selectedType) return false;

    // SaaS guard: on-prem-only types cannot proceed in SaaS mode
    if (isSaasDeployMode && onPremOnlyTypes.has(selectedType)) return false;

    switch (selectedType) {
      // ── Files ──────────────────────────────────────────────────────────────
      case DataSourceType.CSV:
      case DataSourceType.Excel:
        return !!state.csvExcelFile || !!state.csvExcelFilePath;

      // ── Relational databases ───────────────────────────────────────────────
      case DataSourceType.PostgreSQL:
      case DataSourceType.MySQL:
      case DataSourceType.MSSQL:
      case DataSourceType.SQLite:
      case DataSourceType.Oracle:
      case DataSourceType.MariaDB:
      case DataSourceType.DB2:
        return (
          !!state.dbHost &&
          !!state.dbName &&
          !!state.dbUser &&
          !!state.dbPassword
        );

      // ── Connection-template sources (host only) ────────────────────────────
      case DataSourceType.Redis:
      case DataSourceType.Hazelcast:
      case DataSourceType.Kafka:
        return !!state.dbHost;

      // ── REST ───────────────────────────────────────────────────────────────
      case DataSourceType.Rest:
        return !!state.swaggerUrl;

      // ── Webpage ────────────────────────────────────────────────────────────
      case DataSourceType.Webpage:
        return !!state.webUrl;

      // ── Curl ───────────────────────────────────────────────────────────────
      case DataSourceType.Curl:
        return state.curlMode === 'paste' ? !!state.curlCommand : !!state.curlUrl;

      // ── GraphQL ────────────────────────────────────────────────────────────
      case DataSourceType.GraphQL:
        return !!state.graphqlBaseUrl;

      // ── SOAP ───────────────────────────────────────────────────────────────
      case DataSourceType.Soap:
        return !!state.soapBaseUrl;

      // ── RSS ────────────────────────────────────────────────────────────────
      case DataSourceType.Rss:
        return !!state.rssFeedUrl;

      // ── GitHub ─────────────────────────────────────────────────────────────
      case DataSourceType.GitHub:
        return !!state.githubToken;

      // ── X / Twitter ────────────────────────────────────────────────────────
      case DataSourceType.X:
        return !!state.xToken;

      // ── Prometheus ─────────────────────────────────────────────────────────
      case DataSourceType.Prometheus:
        return !!state.prometheusBaseUrl;

      // ── Grafana ────────────────────────────────────────────────────────────
      case DataSourceType.Grafana:
        return (
          !!state.grafanaBaseUrl &&
          (state.grafanaAuthType === 'apiKey'
            ? !!state.grafanaApiKey
            : !!state.grafanaUsername && !!state.grafanaPassword)
        );

      // ── MongoDB ────────────────────────────────────────────────────────────
      case DataSourceType.MongoDB:
        return !!state.mongoHost && !!state.mongoDatabase;

      // ── Facebook ───────────────────────────────────────────────────────────
      case DataSourceType.Facebook:
        return (
          !!state.facebookBaseUrl &&
          !!state.facebookApiVersion &&
          !!state.facebookAccessToken
        );

      // ── Instagram ──────────────────────────────────────────────────────────
      case DataSourceType.Instagram:
        return !!state.instagramBaseUrl && !!state.instagramAccessToken;

      // ── TikTok ─────────────────────────────────────────────────────────────
      case DataSourceType.TikTok:
        return !!state.tiktokBaseUrl && !!state.tiktokAccessToken;

      // ── Notion ─────────────────────────────────────────────────────────────
      case DataSourceType.Notion:
        return !!state.notionBaseUrl && !!state.notionAccessToken;

      // ── Telegram ───────────────────────────────────────────────────────────
      case DataSourceType.Telegram:
        return !!state.telegramBaseUrl && !!state.telegramBotToken;

      // ── LinkedIn ───────────────────────────────────────────────────────────
      case DataSourceType.LinkedIn:
        return !!state.linkedinAccessToken;

      // ── Reddit ─────────────────────────────────────────────────────────────
      case DataSourceType.Reddit:
        return !!state.redditAccessToken;

      // ── YouTube ────────────────────────────────────────────────────────────
      case DataSourceType.YouTube:
        return !!state.youtubeApiKey;

      // ── WhatsApp Business ──────────────────────────────────────────────────
      case DataSourceType.WhatsAppBusiness:
        return !!state.whatsappAccessToken && !!state.whatsappPhoneNumberId;

      // ── Threads ────────────────────────────────────────────────────────────
      case DataSourceType.Threads:
        return !!state.threadsAccessToken;

      // ── Spotify ────────────────────────────────────────────────────────────
      case DataSourceType.Spotify:
        return !!state.spotifyBaseUrl && !!state.spotifyAccessToken;

      // ── Sonos ──────────────────────────────────────────────────────────────
      case DataSourceType.Sonos:
        return !!state.sonosBaseUrl && !!state.sonosAccessToken;

      // ── Shazam ─────────────────────────────────────────────────────────────
      case DataSourceType.Shazam:
        return !!state.shazamBaseUrl && !!state.shazamApiKey;

      // ── Philips Hue ────────────────────────────────────────────────────────
      case DataSourceType.PhilipsHue:
        return !!state.philipshueBaseUrl && !!state.philipshueAccessToken;

      // ── 8Sleep ─────────────────────────────────────────────────────────────
      case DataSourceType.EightSleep:
        return !!state.eightsleepBaseUrl && !!state.eightsleepAccessToken;

      // ── Home Assistant ─────────────────────────────────────────────────────
      case DataSourceType.HomeAssistant:
        return !!state.homeassistantBaseUrl && !!state.homeassistantAccessToken;

      // ── Apple Notes ────────────────────────────────────────────────────────
      case DataSourceType.AppleNotes:
        return !!state.applenotesBaseUrl && !!state.applenotesAccessToken;

      // ── Apple Reminders ────────────────────────────────────────────────────
      case DataSourceType.AppleReminders:
        return !!state.appleremindersBaseUrl && !!state.appleremindersAccessToken;

      // ── Things3 ────────────────────────────────────────────────────────────
      case DataSourceType.Things3:
        return !!state.things3BaseUrl && !!state.things3AccessToken;

      // ── Obsidian ───────────────────────────────────────────────────────────
      case DataSourceType.Obsidian:
        return !!state.obsidianBaseUrl && !!state.obsidianAccessToken;

      // ── Bear Notes ─────────────────────────────────────────────────────────
      case DataSourceType.BearNotes:
        return !!state.bearnotesBaseUrl && !!state.bearnotesAccessToken;

      // ── iMessage ───────────────────────────────────────────────────────────
      case DataSourceType.IMessage:
        return !!state.imessageBaseUrl && !!state.imessageAccessToken;

      // ── Zoom ───────────────────────────────────────────────────────────────
      case DataSourceType.Zoom:
        return !!state.zoomBaseUrl && !!state.zoomAccessToken;

      // ── Microsoft Teams ────────────────────────────────────────────────────
      case DataSourceType.MicrosoftTeams:
        return !!state.microsoftteamsBaseUrl && !!state.microsoftteamsAccessToken;

      // ── Signal ─────────────────────────────────────────────────────────────
      case DataSourceType.Signal:
        return !!state.signalBaseUrl && !!state.signalAccessToken;

      // ── OpenAI ─────────────────────────────────────────────────────────────
      case DataSourceType.OpenAI:
        return !!state.openaiApiKey;

      // ── Claude ─────────────────────────────────────────────────────────────
      case DataSourceType.Claude:
        return !!state.claudeApiKey;

      // ── Gemini ─────────────────────────────────────────────────────────────
      case DataSourceType.Gemini:
        return !!state.geminiApiKey;

      // ── Grok ───────────────────────────────────────────────────────────────
      case DataSourceType.Grok:
        return !!state.grokApiKey;

      // ── FalAI ──────────────────────────────────────────────────────────────
      case DataSourceType.FalAI:
        return !!state.falaiBaseUrl && !!state.falaiApiKey;

      // ── HuggingFace ────────────────────────────────────────────────────────
      case DataSourceType.HuggingFace:
        return !!state.huggingfaceBaseUrl && !!state.huggingfaceApiKey;

      // ── Llama ──────────────────────────────────────────────────────────────
      case DataSourceType.Llama:
        return !!state.llamaBaseUrl;

      // ── DeepSeek ───────────────────────────────────────────────────────────
      case DataSourceType.DeepSeek:
        return !!state.deepseekBaseUrl && !!state.deepseekApiKey;

      // ── Azure OpenAI ───────────────────────────────────────────────────────
      case DataSourceType.AzureOpenAI:
        return (
          !!state.azureOpenAIBaseUrl &&
          !!state.azureOpenAIApiKey &&
          !!state.azureOpenAIDeployment
        );

      // ── Mistral ────────────────────────────────────────────────────────────
      case DataSourceType.Mistral:
        return !!state.mistralBaseUrl && !!state.mistralApiKey;

      // ── Cohere ─────────────────────────────────────────────────────────────
      case DataSourceType.Cohere:
        return !!state.cohereBaseUrl && !!state.cohereApiKey;

      // ── Perplexity ─────────────────────────────────────────────────────────
      case DataSourceType.Perplexity:
        return !!state.perplexityBaseUrl && !!state.perplexityApiKey;

      // ── Together ───────────────────────────────────────────────────────────
      case DataSourceType.Together:
        return !!state.togetherBaseUrl && !!state.togetherApiKey;

      // ── Fireworks ──────────────────────────────────────────────────────────
      case DataSourceType.Fireworks:
        return !!state.fireworksBaseUrl && !!state.fireworksApiKey;

      // ── Groq ───────────────────────────────────────────────────────────────
      case DataSourceType.Groq:
        return !!state.groqBaseUrl && !!state.groqApiKey;

      // ── OpenRouter ─────────────────────────────────────────────────────────
      case DataSourceType.OpenRouter:
        return !!state.openrouterBaseUrl && !!state.openrouterApiKey;

      // ── Dropbox ────────────────────────────────────────────────────────────
      case DataSourceType.Dropbox:
        return !!state.dropboxBaseUrl && !!state.dropboxAccessToken;

      // ── n8n ────────────────────────────────────────────────────────────────
      case DataSourceType.N8n:
        return (
          !!state.n8nBaseUrl &&
          !!state.n8nApiKey &&
          state.n8nSelectedTools.length > 0
        );

      // ── Supabase ───────────────────────────────────────────────────────────
      case DataSourceType.Supabase:
        return !!state.supabaseBaseUrl && !!state.supabaseApiKey;

      // ── npm ────────────────────────────────────────────────────────────────
      case DataSourceType.Npm:
        return !!state.npmBaseUrl;

      // ── NuGet ──────────────────────────────────────────────────────────────
      case DataSourceType.Nuget:
        return !!state.nugetBaseUrl && !!state.nugetRegistrationBaseUrl;

      // ── Maven ──────────────────────────────────────────────────────────────
      case DataSourceType.Maven:
        return !!state.mavenBaseUrl;

      // ── Gradle ─────────────────────────────────────────────────────────────
      case DataSourceType.Gradle:
        return !!state.gradleBaseUrl;

      // ── Nexus ──────────────────────────────────────────────────────────────
      case DataSourceType.Nexus:
        return (
          !!state.nexusBaseUrl &&
          (!!state.nexusApiKey ||
            (!!state.nexusUsername && !!state.nexusPassword))
        );

      // ── Trello ─────────────────────────────────────────────────────────────
      case DataSourceType.Trello:
        return (
          !!state.trelloBaseUrl &&
          !!state.trelloApiKey &&
          !!state.trelloApiToken
        );

      // ── GitLab ─────────────────────────────────────────────────────────────
      case DataSourceType.GitLab:
        return !!state.gitlabBaseUrl && !!state.gitlabToken;

      // ── Bitbucket ──────────────────────────────────────────────────────────
      case DataSourceType.Bitbucket:
        return (
          !!state.bitbucketBaseUrl &&
          !!state.bitbucketUsername &&
          !!state.bitbucketAppPassword
        );

      // ── Google Drive ───────────────────────────────────────────────────────
      case DataSourceType.GDrive:
        return !!state.gdriveBaseUrl && !!state.gdriveAccessToken;

      // ── Google Calendar ────────────────────────────────────────────────────
      case DataSourceType.GoogleCalendar:
        return !!state.gcalBaseUrl && !!state.gcalAccessToken;

      // ── Google Docs ────────────────────────────────────────────────────────
      case DataSourceType.GoogleDocs:
        return !!state.gdocsBaseUrl && !!state.gdocsAccessToken;

      // ── Google Sheets ──────────────────────────────────────────────────────
      case DataSourceType.GoogleSheets:
        return !!state.sheetsBaseUrl && !!state.sheetsAccessToken;

      // ── Airtable ───────────────────────────────────────────────────────────
      case DataSourceType.Airtable:
        return !!state.airtableBaseUrl && !!state.airtableAccessToken;

      // ── Asana ──────────────────────────────────────────────────────────────
      case DataSourceType.Asana:
        return !!state.asanaBaseUrl && !!state.asanaAccessToken;

      // ── Monday ─────────────────────────────────────────────────────────────
      case DataSourceType.Monday:
        return !!state.mondayBaseUrl && !!state.mondayApiKey;

      // ── ClickUp ────────────────────────────────────────────────────────────
      case DataSourceType.ClickUp:
        return !!state.clickupBaseUrl && !!state.clickupAccessToken;

      // ── Linear ─────────────────────────────────────────────────────────────
      case DataSourceType.Linear:
        return !!state.linearBaseUrl && !!state.linearAccessToken;

      // ── Jenkins ────────────────────────────────────────────────────────────
      case DataSourceType.Jenkins:
        return (
          !!state.jenkinsBaseUrl &&
          !!state.jenkinsUsername &&
          !!state.jenkinsApiToken
        );

      // ── DockerHub ──────────────────────────────────────────────────────────
      case DataSourceType.DockerHub:
        return !!state.dockerhubBaseUrl;

      // ── Jira ───────────────────────────────────────────────────────────────
      case DataSourceType.Jira:
        return (
          !!state.jiraHost &&
          !!state.jiraEmail &&
          !!state.jiraApiToken
        );

      // ── Confluence ─────────────────────────────────────────────────────────
      case DataSourceType.Confluence:
        return (
          !!state.confluenceHost &&
          !!state.confluenceEmail &&
          !!state.confluenceApiToken
        );

      // ── FTP ────────────────────────────────────────────────────────────────
      case DataSourceType.Ftp:
        return (
          !!state.ftpHost &&
          !!state.ftpUsername &&
          !!state.ftpPassword
        );

      // ── LocalFS ────────────────────────────────────────────────────────────
      case DataSourceType.LocalFS:
        return !!state.localfsBasePath;

      // ── Email ──────────────────────────────────────────────────────────────
      case DataSourceType.Email: {
        const hasCredentials = !!state.emailUsername && !!state.emailPassword;
        if (!hasCredentials) return false;
        if (state.emailMode === 'read') return !!state.emailImapHost;
        if (state.emailMode === 'write') return !!state.emailSmtpHost;
        // 'both'
        return !!state.emailImapHost && !!state.emailSmtpHost;
      }

      // ── Gmail ──────────────────────────────────────────────────────────────
      case DataSourceType.Gmail:
        return !!state.gmailUsername && !!state.gmailPassword;

      // ── Slack ──────────────────────────────────────────────────────────────
      case DataSourceType.Slack:
        return !!state.slackBotToken;

      // ── Discord ────────────────────────────────────────────────────────────
      case DataSourceType.Discord:
        return !!state.discordBotToken;

      // ── Docker / Kubernetes / OpenShift – no required fields ──────────────
      case DataSourceType.Docker:
      case DataSourceType.Kubernetes:
      case DataSourceType.OpenShift:
        return true;

      // ── Elasticsearch ──────────────────────────────────────────────────────
      case DataSourceType.Elasticsearch:
        return !!state.esBaseUrl;

      // ── OpenSearch ─────────────────────────────────────────────────────────
      case DataSourceType.OpenSearch:
        return !!state.opensearchBaseUrl;

      default:
        return false;
    }
  }, [state]);
}

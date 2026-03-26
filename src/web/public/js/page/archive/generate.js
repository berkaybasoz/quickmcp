let currentDataSource = null;
let currentParsedData = null;
let currentWizardStep = 1;
let isSaasDeployMode = false;
let authConfigCache = null;
let authConfigPromise = null;
const ON_PREM_ONLY_SOURCE_TYPES = new Set();

function updateWizardNavigation() {
    const nextToStep2 = document.getElementById('next-to-step-2');
    const nextToStep3 = document.getElementById('next-to-step-3');
    const nextToStep4 = document.getElementById('next-to-step-4');

    const hasDataSource = document.querySelector('input[name="dataSourceType"]:checked');
    const selectedType = hasDataSource?.value;
    const isRestrictedSourceInSaas = isSaasDeployMode && isOnPremOnlySource(selectedType);

    if (nextToStep2) {
        nextToStep2.disabled = !hasDataSource || isRestrictedSourceInSaas;
    }

    let canProceed = false;
    if (isRestrictedSourceInSaas) {
        canProceed = false;
    } else if (selectedType === DataSourceType.CSV || selectedType === DataSourceType.Excel) {
        const fileInput = document.getElementById('fileInput');
        const csvExcelFilePathInput = document.getElementById('csvExcelFilePath');
        canProceed = !!fileInput?.files?.length || !!csvExcelFilePathInput?.value?.trim();
    } else if (isDatabase(selectedType)) {
        const dbType = selectedType;
        const dbHost = document.getElementById('dbHost')?.value;
        const dbName = document.getElementById('dbName')?.value;
        const dbUser = document.getElementById('dbUser')?.value;
        const dbPassword = document.getElementById('dbPassword')?.value;
        canProceed = dbType && dbHost && dbName && dbUser && dbPassword;
    } else if (isConnectionTemplateSource(selectedType)) {
        const dbHost = document.getElementById('dbHost')?.value?.trim();
        canProceed = !!dbHost;
    } else if (selectedType === DataSourceType.Rest) {
        const swaggerUrl = document.getElementById('swaggerUrl')?.value?.trim();
        canProceed = !!swaggerUrl;
    } else if (selectedType === DataSourceType.Webpage) {
        const aliasInput = document.getElementById('webToolAlias');
        const alias = aliasInput?.value.trim();
        const validationDiv = document.getElementById('web-alias-validation');
        const isAliasValid = alias && validationDiv && validationDiv.textContent.includes('is available');
        const webUrl = document.getElementById('webUrl')?.value?.trim();
        canProceed = isAliasValid && !!webUrl;
    } else if (selectedType === DataSourceType.GraphQL) {
        const baseUrl = document.getElementById('graphqlBaseUrl')?.value?.trim();
        canProceed = !!baseUrl;
    } else if (selectedType === DataSourceType.Soap) {
        const baseUrl = document.getElementById('soapBaseUrl')?.value?.trim();
        canProceed = !!baseUrl;
    } else if (selectedType === DataSourceType.Rss) {
        const feedUrl = document.getElementById('rssFeedUrl')?.value?.trim();
        canProceed = !!feedUrl;
    } else if (selectedType === DataSourceType.Curl) {
        const aliasInput = document.getElementById('curlToolAlias');
        const alias = aliasInput?.value.trim();
        const validationDiv = document.getElementById('curl-alias-validation');
        const isAliasValid = alias && validationDiv && validationDiv.textContent.includes('is available');

        const curlPasteMode = document.getElementById('curlPasteMode');
        const isPasteMode = !curlPasteMode?.classList.contains('hidden');
        let hasCurlInfo = false;
        if (isPasteMode) {
            const curlCommand = document.getElementById('curlCommand')?.value?.trim();
            hasCurlInfo = !!curlCommand;
        } else {
            const curlUrl = document.getElementById('curlUrl')?.value?.trim();
            hasCurlInfo = !!curlUrl;
        }

        canProceed = isAliasValid && hasCurlInfo;
    } else if (selectedType === DataSourceType.GitHub) {
        const githubToken = document.getElementById('githubToken')?.value?.trim();
        canProceed = !!githubToken;
    } else if (selectedType === DataSourceType.X) {
        const xToken = document.getElementById('xToken')?.value?.trim();
        canProceed = !!xToken;
    } else if (selectedType === DataSourceType.Prometheus) {
        const baseUrl = document.getElementById('prometheusBaseUrl')?.value?.trim();
        canProceed = !!baseUrl;
    } else if (selectedType === DataSourceType.Grafana) {
        const baseUrl = document.getElementById('grafanaBaseUrl')?.value?.trim();
        const authType = document.getElementById('grafanaAuthType')?.value || 'apiKey';
        const apiKey = document.getElementById('grafanaApiKey')?.value?.trim();
        const username = document.getElementById('grafanaUsername')?.value?.trim();
        const password = document.getElementById('grafanaPassword')?.value?.trim();
        if (!baseUrl) {
            canProceed = false;
        } else if (authType === 'apiKey') {
            canProceed = !!apiKey;
        } else {
            canProceed = !!username && !!password;
        }
    } else if (selectedType === DataSourceType.MongoDB) {
        const host = document.getElementById('mongoHost')?.value?.trim();
        const database = document.getElementById('mongoDatabase')?.value?.trim();
        canProceed = !!host && !!database;
    } else if (selectedType === DataSourceType.Facebook) {
        const baseUrl = document.getElementById('facebookBaseUrl')?.value?.trim();
        const apiVersion = document.getElementById('facebookApiVersion')?.value?.trim();
        const accessToken = document.getElementById('facebookAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!apiVersion && !!accessToken;
    } else if (selectedType === DataSourceType.Instagram) {
        const baseUrl = document.getElementById('instagramBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('instagramAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.TikTok) {
        const baseUrl = document.getElementById('tiktokBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('tiktokAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.Notion) {
        const baseUrl = document.getElementById('notionBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('notionAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.Telegram) {
        const baseUrl = document.getElementById('telegramBaseUrl')?.value?.trim();
        const botToken = document.getElementById('telegramBotToken')?.value?.trim();
        canProceed = !!baseUrl && !!botToken;
    } else if (selectedType === DataSourceType.LinkedIn) {
        const accessToken = document.getElementById('linkedinAccessToken')?.value?.trim();
        canProceed = !!accessToken;
    } else if (selectedType === DataSourceType.Reddit) {
        const accessToken = document.getElementById('redditAccessToken')?.value?.trim();
        canProceed = !!accessToken;
    } else if (selectedType === DataSourceType.YouTube) {
        const apiKey = document.getElementById('youtubeApiKey')?.value?.trim();
        canProceed = !!apiKey;
    } else if (selectedType === DataSourceType.WhatsAppBusiness) {
        const accessToken = document.getElementById('whatsappAccessToken')?.value?.trim();
        const phoneNumberId = document.getElementById('whatsappPhoneNumberId')?.value?.trim();
        canProceed = !!accessToken && !!phoneNumberId;
    } else if (selectedType === DataSourceType.Threads) {
        const accessToken = document.getElementById('threadsAccessToken')?.value?.trim();
        canProceed = !!accessToken;
    } else if (selectedType === DataSourceType.Spotify) {
        const baseUrl = document.getElementById('spotifyBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('spotifyAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.Sonos) {
        const baseUrl = document.getElementById('sonosBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('sonosAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.Shazam) {
        const baseUrl = document.getElementById('shazamBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('shazamApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey;
    } else if (selectedType === DataSourceType.PhilipsHue) {
        const baseUrl = document.getElementById('philipshueBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('philipshueAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.EightSleep) {
        const baseUrl = document.getElementById('eightsleepBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('eightsleepAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.HomeAssistant) {
        const baseUrl = document.getElementById('homeassistantBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('homeassistantAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.AppleNotes) {
        const baseUrl = document.getElementById('applenotesBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('applenotesAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.AppleReminders) {
        const baseUrl = document.getElementById('appleremindersBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('appleremindersAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.Things3) {
        const baseUrl = document.getElementById('things3BaseUrl')?.value?.trim();
        const accessToken = document.getElementById('things3AccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.Obsidian) {
        const baseUrl = document.getElementById('obsidianBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('obsidianAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.BearNotes) {
        const baseUrl = document.getElementById('bearnotesBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('bearnotesAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.IMessage) {
        const baseUrl = document.getElementById('imessageBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('imessageAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.Zoom) {
        const baseUrl = document.getElementById('zoomBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('zoomAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.MicrosoftTeams) {
        const baseUrl = document.getElementById('microsoftteamsBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('microsoftteamsAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.Signal) {
        const baseUrl = document.getElementById('signalBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('signalAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.OpenAI) {
        const apiKey = document.getElementById('openaiApiKey')?.value?.trim();
        canProceed = !!apiKey;
    } else if (selectedType === DataSourceType.Claude) {
        const apiKey = document.getElementById('claudeApiKey')?.value?.trim();
        canProceed = !!apiKey;
    } else if (selectedType === DataSourceType.Gemini) {
        const apiKey = document.getElementById('geminiApiKey')?.value?.trim();
        canProceed = !!apiKey;
    } else if (selectedType === DataSourceType.Grok) {
        const apiKey = document.getElementById('grokApiKey')?.value?.trim();
        canProceed = !!apiKey;
    } else if (selectedType === DataSourceType.FalAI) {
        const baseUrl = document.getElementById('falaiBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('falaiApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey;
    } else if (selectedType === DataSourceType.HuggingFace) {
        const baseUrl = document.getElementById('huggingfaceBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('huggingfaceApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey;
    } else if (selectedType === DataSourceType.Llama) {
        const baseUrl = document.getElementById('llamaBaseUrl')?.value?.trim();
        canProceed = !!baseUrl;
    } else if (selectedType === DataSourceType.DeepSeek) {
        const baseUrl = document.getElementById('deepseekBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('deepseekApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey;
    } else if (selectedType === DataSourceType.AzureOpenAI) {
        const baseUrl = document.getElementById('azureOpenAIBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('azureOpenAIApiKey')?.value?.trim();
        const deployment = document.getElementById('azureOpenAIDeployment')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey && !!deployment;
    } else if (selectedType === DataSourceType.Mistral) {
        const baseUrl = document.getElementById('mistralBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('mistralApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey;
    } else if (selectedType === DataSourceType.Cohere) {
        const baseUrl = document.getElementById('cohereBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('cohereApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey;
    } else if (selectedType === DataSourceType.Perplexity) {
        const baseUrl = document.getElementById('perplexityBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('perplexityApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey;
    } else if (selectedType === DataSourceType.Together) {
        const baseUrl = document.getElementById('togetherBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('togetherApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey;
    } else if (selectedType === DataSourceType.Fireworks) {
        const baseUrl = document.getElementById('fireworksBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('fireworksApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey;
    } else if (selectedType === DataSourceType.Groq) {
        const baseUrl = document.getElementById('groqBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('groqApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey;
    } else if (selectedType === DataSourceType.OpenRouter) {
        const baseUrl = document.getElementById('openrouterBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('openrouterApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey;
    } else if (selectedType === DataSourceType.Dropbox) {
        const baseUrl = document.getElementById('dropboxBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('dropboxAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.N8n) {
        const baseUrl = document.getElementById('n8nBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('n8nApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey && getSelectedN8nToolNames().length > 0;
    } else if (selectedType === DataSourceType.Supabase) {
        const baseUrl = document.getElementById('supabaseBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('supabaseApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey;
    } else if (selectedType === DataSourceType.Npm) {
        const baseUrl = document.getElementById('npmBaseUrl')?.value?.trim();
        canProceed = !!baseUrl;
    } else if (selectedType === DataSourceType.Nuget) {
        const baseUrl = document.getElementById('nugetBaseUrl')?.value?.trim();
        const regBaseUrl = document.getElementById('nugetRegistrationBaseUrl')?.value?.trim();
        canProceed = !!baseUrl && !!regBaseUrl;
    } else if (selectedType === DataSourceType.Maven) {
        const baseUrl = document.getElementById('mavenBaseUrl')?.value?.trim();
        canProceed = !!baseUrl;
    } else if (selectedType === DataSourceType.Gradle) {
        const baseUrl = document.getElementById('gradleBaseUrl')?.value?.trim();
        canProceed = !!baseUrl;
    } else if (selectedType === DataSourceType.Nexus) {
        const baseUrl = document.getElementById('nexusBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('nexusApiKey')?.value?.trim();
        const username = document.getElementById('nexusUsername')?.value?.trim();
        const password = document.getElementById('nexusPassword')?.value?.trim();
        canProceed = !!baseUrl && (!!apiKey || (!!username && !!password));
    } else if (selectedType === DataSourceType.Trello) {
        const baseUrl = document.getElementById('trelloBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('trelloApiKey')?.value?.trim();
        const apiToken = document.getElementById('trelloApiToken')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey && !!apiToken;
    } else if (selectedType === DataSourceType.GitLab) {
        const baseUrl = document.getElementById('gitlabBaseUrl')?.value?.trim();
        const token = document.getElementById('gitlabToken')?.value?.trim();
        canProceed = !!baseUrl && !!token;
    } else if (selectedType === DataSourceType.Bitbucket) {
        const baseUrl = document.getElementById('bitbucketBaseUrl')?.value?.trim();
        const username = document.getElementById('bitbucketUsername')?.value?.trim();
        const appPassword = document.getElementById('bitbucketAppPassword')?.value?.trim();
        canProceed = !!baseUrl && !!username && !!appPassword;
    } else if (selectedType === DataSourceType.GDrive) {
        const baseUrl = document.getElementById('gdriveBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('gdriveAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.GoogleCalendar) {
        const baseUrl = document.getElementById('gcalBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('gcalAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.GoogleDocs) {
        const baseUrl = document.getElementById('gdocsBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('gdocsAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.GoogleSheets) {
        const baseUrl = document.getElementById('sheetsBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('sheetsAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.Airtable) {
        const baseUrl = document.getElementById('airtableBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('airtableAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.Asana) {
        const baseUrl = document.getElementById('asanaBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('asanaAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.Monday) {
        const baseUrl = document.getElementById('mondayBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('mondayApiKey')?.value?.trim();
        canProceed = !!baseUrl && !!apiKey;
    } else if (selectedType === DataSourceType.ClickUp) {
        const baseUrl = document.getElementById('clickupBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('clickupAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.Linear) {
        const baseUrl = document.getElementById('linearBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('linearAccessToken')?.value?.trim();
        canProceed = !!baseUrl && !!accessToken;
    } else if (selectedType === DataSourceType.Jenkins) {
        const baseUrl = document.getElementById('jenkinsBaseUrl')?.value?.trim();
        const username = document.getElementById('jenkinsUsername')?.value?.trim();
        const apiToken = document.getElementById('jenkinsApiToken')?.value?.trim();
        canProceed = !!baseUrl && !!username && !!apiToken;
    } else if (selectedType === DataSourceType.DockerHub) {
        const baseUrl = document.getElementById('dockerhubBaseUrl')?.value?.trim();
        canProceed = !!baseUrl;
    } else if (selectedType === DataSourceType.Jira) {
        const jiraHost = document.getElementById('jiraHost')?.value?.trim();
        const jiraEmail = document.getElementById('jiraEmail')?.value?.trim();
        const jiraApiToken = document.getElementById('jiraApiToken')?.value?.trim();
        canProceed = !!jiraHost && !!jiraEmail && !!jiraApiToken;
    } else if (selectedType === DataSourceType.Confluence) {
        const confluenceHost = document.getElementById('confluenceHost')?.value?.trim();
        const confluenceEmail = document.getElementById('confluenceEmail')?.value?.trim();
        const confluenceApiToken = document.getElementById('confluenceApiToken')?.value?.trim();
        canProceed = !!confluenceHost && !!confluenceEmail && !!confluenceApiToken;
    } else if (selectedType === DataSourceType.Ftp) {
        const ftpHost = document.getElementById('ftpHost')?.value?.trim();
        const ftpUsername = document.getElementById('ftpUsername')?.value?.trim();
        const ftpPassword = document.getElementById('ftpPassword')?.value?.trim();
        canProceed = !!ftpHost && !!ftpUsername && !!ftpPassword;
    } else if (selectedType === DataSourceType.LocalFS) {
        const localfsBasePath = document.getElementById('localfsBasePath')?.value?.trim();
        canProceed = !!localfsBasePath;
    } else if (selectedType === DataSourceType.Email) {
        const emailMode = document.querySelector('input[name="emailMode"]:checked')?.value || 'both';
        const emailImapHost = document.getElementById('emailImapHost')?.value?.trim();
        const emailSmtpHost = document.getElementById('emailSmtpHost')?.value?.trim();
        const emailUsername = document.getElementById('emailUsername')?.value?.trim();
        const emailPassword = document.getElementById('emailPassword')?.value?.trim();

        const hasCredentials = !!emailUsername && !!emailPassword;

        if (emailMode === 'read') {
            canProceed = hasCredentials && !!emailImapHost;
        } else if (emailMode === 'write') {
            canProceed = hasCredentials && !!emailSmtpHost;
        } else {
            canProceed = hasCredentials && !!emailImapHost && !!emailSmtpHost;
        }
    } else if (selectedType === DataSourceType.Gmail) {
        const gmailMode = document.querySelector('input[name="gmailMode"]:checked')?.value || 'both';
        const gmailUsername = document.getElementById('gmailUsername')?.value?.trim();
        const gmailPassword = document.getElementById('gmailPassword')?.value?.trim();
        const hasCredentials = !!gmailUsername && !!gmailPassword;

        if (gmailMode === 'read') {
            canProceed = hasCredentials;
        } else if (gmailMode === 'write') {
            canProceed = hasCredentials;
        } else {
            canProceed = hasCredentials;
        }
    } else if (selectedType === DataSourceType.Slack) {
        const slackBotToken = document.getElementById('slackBotToken')?.value?.trim();
        canProceed = !!slackBotToken;
    } else if (selectedType === DataSourceType.Discord) {
        const discordBotToken = document.getElementById('discordBotToken')?.value?.trim();
        canProceed = !!discordBotToken;
    } else if (selectedType === DataSourceType.Docker) {
        canProceed = true;
    } else if (selectedType === DataSourceType.Kubernetes) {
        canProceed = true;
    } else if (selectedType === DataSourceType.OpenShift) {
        canProceed = true;
    } else if (selectedType === DataSourceType.Elasticsearch) {
        const baseUrl = document.getElementById('esBaseUrl')?.value?.trim();
        canProceed = !!baseUrl;
    } else if (selectedType === DataSourceType.OpenSearch) {
        const baseUrl = document.getElementById('opensearchBaseUrl')?.value?.trim();
        canProceed = !!baseUrl;
    }

    if (nextToStep3) {
        nextToStep3.disabled = !hasDataSource || !canProceed;
    }

    if (nextToStep4) {
        nextToStep4.disabled = currentParsedData === null;
    }
}


// Toggle data source fields (updated to enable navigation)
function toggleDataSourceFields() {
    const selectedType = document.querySelector('input[name="dataSourceType"]:checked')?.value;
    const fileSection = document.getElementById('file-upload-section');
    const dbSection = document.getElementById('database-section');
    const restSection = document.getElementById('rest-section');
    const webSection = document.getElementById('web-section');
    const curlSection = document.getElementById('curl-section');
    const graphqlSection = document.getElementById('graphql-section');
    const soapSection = document.getElementById('soap-section');
    const rssSection = document.getElementById('rss-section');
    const githubSection = document.getElementById('github-section');
    const xSection = document.getElementById('x-section');
    const prometheusSection = document.getElementById('prometheus-section');
    const grafanaSection = document.getElementById('grafana-section');
    const mongodbSection = document.getElementById('mongodb-section');
    const facebookSection = document.getElementById('facebook-section');
    const instagramSection = document.getElementById('instagram-section');
    const tiktokSection = document.getElementById('tiktok-section');
    const notionSection = document.getElementById('notion-section');
    const telegramSection = document.getElementById('telegram-section');
    const linkedinSection = document.getElementById('linkedin-section');
    const redditSection = document.getElementById('reddit-section');
    const youtubeSection = document.getElementById('youtube-section');
    const whatsappBusinessSection = document.getElementById('whatsappbusiness-section');
    const threadsSection = document.getElementById('threads-section');
    const spotifySection = document.getElementById('spotify-section');
    const sonosSection = document.getElementById('sonos-section');
    const shazamSection = document.getElementById('shazam-section');
    const philipshueSection = document.getElementById('philipshue-section');
    const eightsleepSection = document.getElementById('eightsleep-section');
    const homeassistantSection = document.getElementById('homeassistant-section');
    const applenotesSection = document.getElementById('applenotes-section');
    const appleremindersSection = document.getElementById('applereminders-section');
    const things3Section = document.getElementById('things3-section');
    const obsidianSection = document.getElementById('obsidian-section');
    const bearnotesSection = document.getElementById('bearnotes-section');
    const imessageSection = document.getElementById('imessage-section');
    const zoomSection = document.getElementById('zoom-section');
    const microsoftteamsSection = document.getElementById('microsoftteams-section');
    const signalSection = document.getElementById('signal-section');
    const openaiSection = document.getElementById('openai-section');
    const claudeSection = document.getElementById('claude-section');
    const geminiSection = document.getElementById('gemini-section');
    const grokSection = document.getElementById('grok-section');
    const falaiSection = document.getElementById('falai-section');
    const huggingfaceSection = document.getElementById('huggingface-section');
    const llamaSection = document.getElementById('llama-section');
    const deepseekSection = document.getElementById('deepseek-section');
    const azureOpenAISection = document.getElementById('azure-openai-section');
    const mistralSection = document.getElementById('mistral-section');
    const cohereSection = document.getElementById('cohere-section');
    const perplexitySection = document.getElementById('perplexity-section');
    const togetherSection = document.getElementById('together-section');
    const fireworksSection = document.getElementById('fireworks-section');
    const groqSection = document.getElementById('groq-section');
    const openrouterSection = document.getElementById('openrouter-section');
    const dropboxSection = document.getElementById('dropbox-section');
    const n8nSection = document.getElementById('n8n-section');
    const supabaseSection = document.getElementById('supabase-section');
    const npmSection = document.getElementById('npm-section');
    const nugetSection = document.getElementById('nuget-section');
    const mavenSection = document.getElementById('maven-section');
    const gradleSection = document.getElementById('gradle-section');
    const nexusSection = document.getElementById('nexus-section');
    const trelloSection = document.getElementById('trello-section');
    const gitlabSection = document.getElementById('gitlab-section');
    const bitbucketSection = document.getElementById('bitbucket-section');
    const gdriveSection = document.getElementById('gdrive-section');
    const googlecalendarSection = document.getElementById('googlecalendar-section');
    const googledocsSection = document.getElementById('googledocs-section');
    const sheetsSection = document.getElementById('googlesheets-section');
    const airtableSection = document.getElementById('airtable-section');
    const asanaSection = document.getElementById('asana-section');
    const mondaySection = document.getElementById('monday-section');
    const clickupSection = document.getElementById('clickup-section');
    const linearSection = document.getElementById('linear-section');
    const jenkinsSection = document.getElementById('jenkins-section');
    const dockerhubSection = document.getElementById('dockerhub-section');
    const jiraSection = document.getElementById('jira-section');
    const confluenceSection = document.getElementById('confluence-section');
    const ftpSection = document.getElementById('ftp-section');
    const localfsSection = document.getElementById('localfs-section');
    const emailSection = document.getElementById('email-section');
    const gmailSection = document.getElementById('gmail-section');
    const slackSection = document.getElementById('slack-section');
    const discordSection = document.getElementById('discord-section');
    const dockerSection = document.getElementById('docker-section');
    const kubernetesSection = document.getElementById('kubernetes-section');
    const openshiftSection = document.getElementById('openshift-section');
    const elasticsearchSection = document.getElementById('elasticsearch-section');
    const opensearchSection = document.getElementById('opensearch-section');

    // Hide all sections first
    fileSection?.classList.add('hidden');
    dbSection?.classList.add('hidden');
    restSection?.classList.add('hidden');
    webSection?.classList.add('hidden');
    curlSection?.classList.add('hidden');
    graphqlSection?.classList.add('hidden');
    soapSection?.classList.add('hidden');
    rssSection?.classList.add('hidden');
    githubSection?.classList.add('hidden');
    xSection?.classList.add('hidden');
    prometheusSection?.classList.add('hidden');
    grafanaSection?.classList.add('hidden');
    mongodbSection?.classList.add('hidden');
    facebookSection?.classList.add('hidden');
    instagramSection?.classList.add('hidden');
    tiktokSection?.classList.add('hidden');
    notionSection?.classList.add('hidden');
    telegramSection?.classList.add('hidden');
    linkedinSection?.classList.add('hidden');
    redditSection?.classList.add('hidden');
    youtubeSection?.classList.add('hidden');
    whatsappBusinessSection?.classList.add('hidden');
    threadsSection?.classList.add('hidden');
    spotifySection?.classList.add('hidden');
    sonosSection?.classList.add('hidden');
    shazamSection?.classList.add('hidden');
    philipshueSection?.classList.add('hidden');
    eightsleepSection?.classList.add('hidden');
    homeassistantSection?.classList.add('hidden');
    applenotesSection?.classList.add('hidden');
    appleremindersSection?.classList.add('hidden');
    things3Section?.classList.add('hidden');
    obsidianSection?.classList.add('hidden');
    bearnotesSection?.classList.add('hidden');
    imessageSection?.classList.add('hidden');
    zoomSection?.classList.add('hidden');
    microsoftteamsSection?.classList.add('hidden');
    signalSection?.classList.add('hidden');
    openaiSection?.classList.add('hidden');
    claudeSection?.classList.add('hidden');
    geminiSection?.classList.add('hidden');
    grokSection?.classList.add('hidden');
    falaiSection?.classList.add('hidden');
    huggingfaceSection?.classList.add('hidden');
    llamaSection?.classList.add('hidden');
    deepseekSection?.classList.add('hidden');
    azureOpenAISection?.classList.add('hidden');
    mistralSection?.classList.add('hidden');
    cohereSection?.classList.add('hidden');
    perplexitySection?.classList.add('hidden');
    togetherSection?.classList.add('hidden');
    fireworksSection?.classList.add('hidden');
    groqSection?.classList.add('hidden');
    openrouterSection?.classList.add('hidden');
    dropboxSection?.classList.add('hidden');
    n8nSection?.classList.add('hidden');
    supabaseSection?.classList.add('hidden');
    npmSection?.classList.add('hidden');
    nugetSection?.classList.add('hidden');
    mavenSection?.classList.add('hidden');
    gradleSection?.classList.add('hidden');
    nexusSection?.classList.add('hidden');
    trelloSection?.classList.add('hidden');
    gitlabSection?.classList.add('hidden');
    bitbucketSection?.classList.add('hidden');
    gdriveSection?.classList.add('hidden');
    googlecalendarSection?.classList.add('hidden');
    googledocsSection?.classList.add('hidden');
    sheetsSection?.classList.add('hidden');
    airtableSection?.classList.add('hidden');
    asanaSection?.classList.add('hidden');
    mondaySection?.classList.add('hidden');
    clickupSection?.classList.add('hidden');
    linearSection?.classList.add('hidden');
    jenkinsSection?.classList.add('hidden');
    dockerhubSection?.classList.add('hidden');
    jiraSection?.classList.add('hidden');
    confluenceSection?.classList.add('hidden');
    ftpSection?.classList.add('hidden');
    localfsSection?.classList.add('hidden');
    emailSection?.classList.add('hidden');
    gmailSection?.classList.add('hidden');
    slackSection?.classList.add('hidden');
    discordSection?.classList.add('hidden');
    dockerSection?.classList.add('hidden');
    kubernetesSection?.classList.add('hidden');
    openshiftSection?.classList.add('hidden');
    elasticsearchSection?.classList.add('hidden');
    opensearchSection?.classList.add('hidden');

    if (selectedType === DataSourceType.CSV || selectedType === DataSourceType.Excel) {
        fileSection?.classList.remove('hidden');
    } else if (usesDatabaseConnectionForm(selectedType)) {
        dbSection?.classList.remove('hidden');
        configureDatabaseConnectionForm(selectedType);
        updateDefaultPort();
    } else if (selectedType === DataSourceType.Rest) {
        restSection?.classList.remove('hidden');
    } else if (selectedType === DataSourceType.Webpage) {
        webSection?.classList.remove('hidden');
    } else if (selectedType === DataSourceType.GraphQL) {
        graphqlSection?.classList.remove('hidden');
        const graphqlBaseUrlInput = document.getElementById('graphqlBaseUrl');
        if (graphqlBaseUrlInput && !graphqlBaseUrlInput.dataset.listenerAttached) {
            graphqlBaseUrlInput.addEventListener('input', updateWizardNavigation);
            graphqlBaseUrlInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Soap) {
        soapSection?.classList.remove('hidden');
        const soapBaseUrlInput = document.getElementById('soapBaseUrl');
        if (soapBaseUrlInput && !soapBaseUrlInput.dataset.listenerAttached) {
            soapBaseUrlInput.addEventListener('input', updateWizardNavigation);
            soapBaseUrlInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Rss) {
        rssSection?.classList.remove('hidden');
        const rssFeedUrlInput = document.getElementById('rssFeedUrl');
        if (rssFeedUrlInput && !rssFeedUrlInput.dataset.listenerAttached) {
            rssFeedUrlInput.addEventListener('input', updateWizardNavigation);
            rssFeedUrlInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Curl) {
        curlSection?.classList.remove('hidden');
        // Add listener here to be robust
        const curlUrlInput = document.getElementById('curlUrl');
        if (curlUrlInput && !curlUrlInput.dataset.listenerAttached) {
            curlUrlInput.addEventListener('input', updateWizardNavigation);
            curlUrlInput.dataset.listenerAttached = 'true';
        }

        const curlCommandInput = document.getElementById('curlCommand');
        if (curlCommandInput && !curlCommandInput.dataset.listenerAttached) {
            curlCommandInput.addEventListener('input', updateWizardNavigation);
            curlCommandInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.GitHub) {
        githubSection?.classList.remove('hidden');
        // Add listener for GitHub token input
        const githubTokenInput = document.getElementById('githubToken');
        if (githubTokenInput && !githubTokenInput.dataset.listenerAttached) {
            githubTokenInput.addEventListener('input', updateWizardNavigation);
            githubTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.X) {
        xSection?.classList.remove('hidden');
        const xTokenInput = document.getElementById('xToken');
        if (xTokenInput && !xTokenInput.dataset.listenerAttached) {
            xTokenInput.addEventListener('input', updateWizardNavigation);
            xTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Prometheus) {
        prometheusSection?.classList.remove('hidden');
        const prometheusBaseUrlInput = document.getElementById('prometheusBaseUrl');
        if (prometheusBaseUrlInput && !prometheusBaseUrlInput.dataset.listenerAttached) {
            prometheusBaseUrlInput.addEventListener('input', updateWizardNavigation);
            prometheusBaseUrlInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Grafana) {
        grafanaSection?.classList.remove('hidden');
        const grafanaBaseUrlInput = document.getElementById('grafanaBaseUrl');
        const grafanaAuthTypeInput = document.getElementById('grafanaAuthType');
        const grafanaApiKeyInput = document.getElementById('grafanaApiKey');
        const grafanaUsernameInput = document.getElementById('grafanaUsername');
        const grafanaPasswordInput = document.getElementById('grafanaPassword');
        if (grafanaBaseUrlInput && !grafanaBaseUrlInput.dataset.listenerAttached) {
            grafanaBaseUrlInput.addEventListener('input', updateWizardNavigation);
            grafanaBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (grafanaAuthTypeInput && !grafanaAuthTypeInput.dataset.listenerAttached) {
            grafanaAuthTypeInput.addEventListener('change', handleGrafanaAuthChange);
            grafanaAuthTypeInput.dataset.listenerAttached = 'true';
        }
        if (grafanaApiKeyInput && !grafanaApiKeyInput.dataset.listenerAttached) {
            grafanaApiKeyInput.addEventListener('input', updateWizardNavigation);
            grafanaApiKeyInput.dataset.listenerAttached = 'true';
        }
        if (grafanaUsernameInput && !grafanaUsernameInput.dataset.listenerAttached) {
            grafanaUsernameInput.addEventListener('input', updateWizardNavigation);
            grafanaUsernameInput.dataset.listenerAttached = 'true';
        }
        if (grafanaPasswordInput && !grafanaPasswordInput.dataset.listenerAttached) {
            grafanaPasswordInput.addEventListener('input', updateWizardNavigation);
            grafanaPasswordInput.dataset.listenerAttached = 'true';
        }
        handleGrafanaAuthChange();
    } else if (selectedType === DataSourceType.MongoDB) {
        mongodbSection?.classList.remove('hidden');
        const mongoHostInput = document.getElementById('mongoHost');
        const mongoDatabaseInput = document.getElementById('mongoDatabase');
        if (mongoHostInput && !mongoHostInput.dataset.listenerAttached) {
            mongoHostInput.addEventListener('input', updateWizardNavigation);
            mongoHostInput.dataset.listenerAttached = 'true';
        }
        if (mongoDatabaseInput && !mongoDatabaseInput.dataset.listenerAttached) {
            mongoDatabaseInput.addEventListener('input', updateWizardNavigation);
            mongoDatabaseInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Facebook) {
        facebookSection?.classList.remove('hidden');
        const facebookBaseUrlInput = document.getElementById('facebookBaseUrl');
        const facebookApiVersionInput = document.getElementById('facebookApiVersion');
        const facebookAccessTokenInput = document.getElementById('facebookAccessToken');
        if (facebookBaseUrlInput && !facebookBaseUrlInput.dataset.listenerAttached) {
            facebookBaseUrlInput.addEventListener('input', updateWizardNavigation);
            facebookBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (facebookApiVersionInput && !facebookApiVersionInput.dataset.listenerAttached) {
            facebookApiVersionInput.addEventListener('input', updateWizardNavigation);
            facebookApiVersionInput.dataset.listenerAttached = 'true';
        }
        if (facebookAccessTokenInput && !facebookAccessTokenInput.dataset.listenerAttached) {
            facebookAccessTokenInput.addEventListener('input', updateWizardNavigation);
            facebookAccessTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Instagram) {
        instagramSection?.classList.remove('hidden');
        const instagramBaseUrlInput = document.getElementById('instagramBaseUrl');
        const instagramAccessTokenInput = document.getElementById('instagramAccessToken');
        if (instagramBaseUrlInput && !instagramBaseUrlInput.dataset.listenerAttached) {
            instagramBaseUrlInput.addEventListener('input', updateWizardNavigation);
            instagramBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (instagramAccessTokenInput && !instagramAccessTokenInput.dataset.listenerAttached) {
            instagramAccessTokenInput.addEventListener('input', updateWizardNavigation);
            instagramAccessTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.TikTok) {
        tiktokSection?.classList.remove('hidden');
        const tiktokBaseUrlInput = document.getElementById('tiktokBaseUrl');
        const tiktokAccessTokenInput = document.getElementById('tiktokAccessToken');
        if (tiktokBaseUrlInput && !tiktokBaseUrlInput.dataset.listenerAttached) {
            tiktokBaseUrlInput.addEventListener('input', updateWizardNavigation);
            tiktokBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (tiktokAccessTokenInput && !tiktokAccessTokenInput.dataset.listenerAttached) {
            tiktokAccessTokenInput.addEventListener('input', updateWizardNavigation);
            tiktokAccessTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Notion) {
        notionSection?.classList.remove('hidden');
        const notionBaseUrlInput = document.getElementById('notionBaseUrl');
        const notionAccessTokenInput = document.getElementById('notionAccessToken');
        if (notionBaseUrlInput && !notionBaseUrlInput.dataset.listenerAttached) {
            notionBaseUrlInput.addEventListener('input', updateWizardNavigation);
            notionBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (notionAccessTokenInput && !notionAccessTokenInput.dataset.listenerAttached) {
            notionAccessTokenInput.addEventListener('input', updateWizardNavigation);
            notionAccessTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Telegram) {
        telegramSection?.classList.remove('hidden');
        const telegramBaseUrlInput = document.getElementById('telegramBaseUrl');
        const telegramBotTokenInput = document.getElementById('telegramBotToken');
        if (telegramBaseUrlInput && !telegramBaseUrlInput.dataset.listenerAttached) {
            telegramBaseUrlInput.addEventListener('input', updateWizardNavigation);
            telegramBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (telegramBotTokenInput && !telegramBotTokenInput.dataset.listenerAttached) {
            telegramBotTokenInput.addEventListener('input', updateWizardNavigation);
            telegramBotTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.LinkedIn) {
        linkedinSection?.classList.remove('hidden');
        const linkedinTokenInput = document.getElementById('linkedinAccessToken');
        if (linkedinTokenInput && !linkedinTokenInput.dataset.listenerAttached) {
            linkedinTokenInput.addEventListener('input', updateWizardNavigation);
            linkedinTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Reddit) {
        redditSection?.classList.remove('hidden');
        const redditTokenInput = document.getElementById('redditAccessToken');
        if (redditTokenInput && !redditTokenInput.dataset.listenerAttached) {
            redditTokenInput.addEventListener('input', updateWizardNavigation);
            redditTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.YouTube) {
        youtubeSection?.classList.remove('hidden');
        const youtubeApiKeyInput = document.getElementById('youtubeApiKey');
        if (youtubeApiKeyInput && !youtubeApiKeyInput.dataset.listenerAttached) {
            youtubeApiKeyInput.addEventListener('input', updateWizardNavigation);
            youtubeApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.WhatsAppBusiness) {
        whatsappBusinessSection?.classList.remove('hidden');
        const whatsappTokenInput = document.getElementById('whatsappAccessToken');
        const whatsappPhoneInput = document.getElementById('whatsappPhoneNumberId');
        if (whatsappTokenInput && !whatsappTokenInput.dataset.listenerAttached) {
            whatsappTokenInput.addEventListener('input', updateWizardNavigation);
            whatsappTokenInput.dataset.listenerAttached = 'true';
        }
        if (whatsappPhoneInput && !whatsappPhoneInput.dataset.listenerAttached) {
            whatsappPhoneInput.addEventListener('input', updateWizardNavigation);
            whatsappPhoneInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Threads) {
        threadsSection?.classList.remove('hidden');
        const threadsTokenInput = document.getElementById('threadsAccessToken');
        if (threadsTokenInput && !threadsTokenInput.dataset.listenerAttached) {
            threadsTokenInput.addEventListener('input', updateWizardNavigation);
            threadsTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Spotify) {
        spotifySection?.classList.remove('hidden');
        const spotifyBaseUrlInput = document.getElementById('spotifyBaseUrl');
        const spotifyTokenInput = document.getElementById('spotifyAccessToken');
        if (spotifyBaseUrlInput && !spotifyBaseUrlInput.dataset.listenerAttached) {
            spotifyBaseUrlInput.addEventListener('input', updateWizardNavigation);
            spotifyBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (spotifyTokenInput && !spotifyTokenInput.dataset.listenerAttached) {
            spotifyTokenInput.addEventListener('input', updateWizardNavigation);
            spotifyTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Sonos) {
        sonosSection?.classList.remove('hidden');
        const sonosBaseUrlInput = document.getElementById('sonosBaseUrl');
        const sonosTokenInput = document.getElementById('sonosAccessToken');
        if (sonosBaseUrlInput && !sonosBaseUrlInput.dataset.listenerAttached) {
            sonosBaseUrlInput.addEventListener('input', updateWizardNavigation);
            sonosBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (sonosTokenInput && !sonosTokenInput.dataset.listenerAttached) {
            sonosTokenInput.addEventListener('input', updateWizardNavigation);
            sonosTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Shazam) {
        shazamSection?.classList.remove('hidden');
        const shazamBaseUrlInput = document.getElementById('shazamBaseUrl');
        const shazamApiKeyInput = document.getElementById('shazamApiKey');
        if (shazamBaseUrlInput && !shazamBaseUrlInput.dataset.listenerAttached) {
            shazamBaseUrlInput.addEventListener('input', updateWizardNavigation);
            shazamBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (shazamApiKeyInput && !shazamApiKeyInput.dataset.listenerAttached) {
            shazamApiKeyInput.addEventListener('input', updateWizardNavigation);
            shazamApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.PhilipsHue) {
        philipshueSection?.classList.remove('hidden');
        const philipshueBaseUrlInput = document.getElementById('philipshueBaseUrl');
        const philipshueTokenInput = document.getElementById('philipshueAccessToken');
        if (philipshueBaseUrlInput && !philipshueBaseUrlInput.dataset.listenerAttached) {
            philipshueBaseUrlInput.addEventListener('input', updateWizardNavigation);
            philipshueBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (philipshueTokenInput && !philipshueTokenInput.dataset.listenerAttached) {
            philipshueTokenInput.addEventListener('input', updateWizardNavigation);
            philipshueTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.EightSleep) {
        eightsleepSection?.classList.remove('hidden');
        const eightsleepBaseUrlInput = document.getElementById('eightsleepBaseUrl');
        const eightsleepTokenInput = document.getElementById('eightsleepAccessToken');
        if (eightsleepBaseUrlInput && !eightsleepBaseUrlInput.dataset.listenerAttached) {
            eightsleepBaseUrlInput.addEventListener('input', updateWizardNavigation);
            eightsleepBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (eightsleepTokenInput && !eightsleepTokenInput.dataset.listenerAttached) {
            eightsleepTokenInput.addEventListener('input', updateWizardNavigation);
            eightsleepTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.HomeAssistant) {
        homeassistantSection?.classList.remove('hidden');
        const homeassistantBaseUrlInput = document.getElementById('homeassistantBaseUrl');
        const homeassistantTokenInput = document.getElementById('homeassistantAccessToken');
        if (homeassistantBaseUrlInput && !homeassistantBaseUrlInput.dataset.listenerAttached) {
            homeassistantBaseUrlInput.addEventListener('input', updateWizardNavigation);
            homeassistantBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (homeassistantTokenInput && !homeassistantTokenInput.dataset.listenerAttached) {
            homeassistantTokenInput.addEventListener('input', updateWizardNavigation);
            homeassistantTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.AppleNotes) {
        applenotesSection?.classList.remove('hidden');
        const applenotesBaseUrlInput = document.getElementById('applenotesBaseUrl');
        const applenotesTokenInput = document.getElementById('applenotesAccessToken');
        if (applenotesBaseUrlInput && !applenotesBaseUrlInput.dataset.listenerAttached) {
            applenotesBaseUrlInput.addEventListener('input', updateWizardNavigation);
            applenotesBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (applenotesTokenInput && !applenotesTokenInput.dataset.listenerAttached) {
            applenotesTokenInput.addEventListener('input', updateWizardNavigation);
            applenotesTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.AppleReminders) {
        appleremindersSection?.classList.remove('hidden');
        const appleremindersBaseUrlInput = document.getElementById('appleremindersBaseUrl');
        const appleremindersTokenInput = document.getElementById('appleremindersAccessToken');
        if (appleremindersBaseUrlInput && !appleremindersBaseUrlInput.dataset.listenerAttached) {
            appleremindersBaseUrlInput.addEventListener('input', updateWizardNavigation);
            appleremindersBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (appleremindersTokenInput && !appleremindersTokenInput.dataset.listenerAttached) {
            appleremindersTokenInput.addEventListener('input', updateWizardNavigation);
            appleremindersTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Things3) {
        things3Section?.classList.remove('hidden');
        const things3BaseUrlInput = document.getElementById('things3BaseUrl');
        const things3TokenInput = document.getElementById('things3AccessToken');
        if (things3BaseUrlInput && !things3BaseUrlInput.dataset.listenerAttached) {
            things3BaseUrlInput.addEventListener('input', updateWizardNavigation);
            things3BaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (things3TokenInput && !things3TokenInput.dataset.listenerAttached) {
            things3TokenInput.addEventListener('input', updateWizardNavigation);
            things3TokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Obsidian) {
        obsidianSection?.classList.remove('hidden');
        const obsidianBaseUrlInput = document.getElementById('obsidianBaseUrl');
        const obsidianTokenInput = document.getElementById('obsidianAccessToken');
        if (obsidianBaseUrlInput && !obsidianBaseUrlInput.dataset.listenerAttached) {
            obsidianBaseUrlInput.addEventListener('input', updateWizardNavigation);
            obsidianBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (obsidianTokenInput && !obsidianTokenInput.dataset.listenerAttached) {
            obsidianTokenInput.addEventListener('input', updateWizardNavigation);
            obsidianTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.BearNotes) {
        bearnotesSection?.classList.remove('hidden');
        const bearnotesBaseUrlInput = document.getElementById('bearnotesBaseUrl');
        const bearnotesTokenInput = document.getElementById('bearnotesAccessToken');
        if (bearnotesBaseUrlInput && !bearnotesBaseUrlInput.dataset.listenerAttached) {
            bearnotesBaseUrlInput.addEventListener('input', updateWizardNavigation);
            bearnotesBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (bearnotesTokenInput && !bearnotesTokenInput.dataset.listenerAttached) {
            bearnotesTokenInput.addEventListener('input', updateWizardNavigation);
            bearnotesTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.IMessage) {
        imessageSection?.classList.remove('hidden');
        const imessageBaseUrlInput = document.getElementById('imessageBaseUrl');
        const imessageTokenInput = document.getElementById('imessageAccessToken');
        if (imessageBaseUrlInput && !imessageBaseUrlInput.dataset.listenerAttached) {
            imessageBaseUrlInput.addEventListener('input', updateWizardNavigation);
            imessageBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (imessageTokenInput && !imessageTokenInput.dataset.listenerAttached) {
            imessageTokenInput.addEventListener('input', updateWizardNavigation);
            imessageTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Zoom) {
        zoomSection?.classList.remove('hidden');
        const zoomBaseUrlInput = document.getElementById('zoomBaseUrl');
        const zoomTokenInput = document.getElementById('zoomAccessToken');
        if (zoomBaseUrlInput && !zoomBaseUrlInput.dataset.listenerAttached) {
            zoomBaseUrlInput.addEventListener('input', updateWizardNavigation);
            zoomBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (zoomTokenInput && !zoomTokenInput.dataset.listenerAttached) {
            zoomTokenInput.addEventListener('input', updateWizardNavigation);
            zoomTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.MicrosoftTeams) {
        microsoftteamsSection?.classList.remove('hidden');
        const microsoftteamsBaseUrlInput = document.getElementById('microsoftteamsBaseUrl');
        const microsoftteamsTokenInput = document.getElementById('microsoftteamsAccessToken');
        if (microsoftteamsBaseUrlInput && !microsoftteamsBaseUrlInput.dataset.listenerAttached) {
            microsoftteamsBaseUrlInput.addEventListener('input', updateWizardNavigation);
            microsoftteamsBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (microsoftteamsTokenInput && !microsoftteamsTokenInput.dataset.listenerAttached) {
            microsoftteamsTokenInput.addEventListener('input', updateWizardNavigation);
            microsoftteamsTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Signal) {
        signalSection?.classList.remove('hidden');
        const signalBaseUrlInput = document.getElementById('signalBaseUrl');
        const signalTokenInput = document.getElementById('signalAccessToken');
        if (signalBaseUrlInput && !signalBaseUrlInput.dataset.listenerAttached) {
            signalBaseUrlInput.addEventListener('input', updateWizardNavigation);
            signalBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (signalTokenInput && !signalTokenInput.dataset.listenerAttached) {
            signalTokenInput.addEventListener('input', updateWizardNavigation);
            signalTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.OpenAI) {
        openaiSection?.classList.remove('hidden');
        const openaiApiKeyInput = document.getElementById('openaiApiKey');
        if (openaiApiKeyInput && !openaiApiKeyInput.dataset.listenerAttached) {
            openaiApiKeyInput.addEventListener('input', updateWizardNavigation);
            openaiApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Claude) {
        claudeSection?.classList.remove('hidden');
        const claudeApiKeyInput = document.getElementById('claudeApiKey');
        if (claudeApiKeyInput && !claudeApiKeyInput.dataset.listenerAttached) {
            claudeApiKeyInput.addEventListener('input', updateWizardNavigation);
            claudeApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Gemini) {
        geminiSection?.classList.remove('hidden');
        const geminiApiKeyInput = document.getElementById('geminiApiKey');
        if (geminiApiKeyInput && !geminiApiKeyInput.dataset.listenerAttached) {
            geminiApiKeyInput.addEventListener('input', updateWizardNavigation);
            geminiApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Grok) {
        grokSection?.classList.remove('hidden');
        const grokApiKeyInput = document.getElementById('grokApiKey');
        if (grokApiKeyInput && !grokApiKeyInput.dataset.listenerAttached) {
            grokApiKeyInput.addEventListener('input', updateWizardNavigation);
            grokApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.FalAI) {
        falaiSection?.classList.remove('hidden');
        const falaiBaseUrlInput = document.getElementById('falaiBaseUrl');
        const falaiApiKeyInput = document.getElementById('falaiApiKey');
        if (falaiBaseUrlInput && !falaiBaseUrlInput.dataset.listenerAttached) {
            falaiBaseUrlInput.addEventListener('input', updateWizardNavigation);
            falaiBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (falaiApiKeyInput && !falaiApiKeyInput.dataset.listenerAttached) {
            falaiApiKeyInput.addEventListener('input', updateWizardNavigation);
            falaiApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.HuggingFace) {
        huggingfaceSection?.classList.remove('hidden');
        const huggingfaceBaseUrlInput = document.getElementById('huggingfaceBaseUrl');
        const huggingfaceApiKeyInput = document.getElementById('huggingfaceApiKey');
        if (huggingfaceBaseUrlInput && !huggingfaceBaseUrlInput.dataset.listenerAttached) {
            huggingfaceBaseUrlInput.addEventListener('input', updateWizardNavigation);
            huggingfaceBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (huggingfaceApiKeyInput && !huggingfaceApiKeyInput.dataset.listenerAttached) {
            huggingfaceApiKeyInput.addEventListener('input', updateWizardNavigation);
            huggingfaceApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Llama) {
        llamaSection?.classList.remove('hidden');
        const llamaBaseUrlInput = document.getElementById('llamaBaseUrl');
        if (llamaBaseUrlInput && !llamaBaseUrlInput.dataset.listenerAttached) {
            llamaBaseUrlInput.addEventListener('input', updateWizardNavigation);
            llamaBaseUrlInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.DeepSeek) {
        deepseekSection?.classList.remove('hidden');
        const deepseekBaseUrlInput = document.getElementById('deepseekBaseUrl');
        const deepseekApiKeyInput = document.getElementById('deepseekApiKey');
        if (deepseekBaseUrlInput && !deepseekBaseUrlInput.dataset.listenerAttached) {
            deepseekBaseUrlInput.addEventListener('input', updateWizardNavigation);
            deepseekBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (deepseekApiKeyInput && !deepseekApiKeyInput.dataset.listenerAttached) {
            deepseekApiKeyInput.addEventListener('input', updateWizardNavigation);
            deepseekApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.AzureOpenAI) {
        azureOpenAISection?.classList.remove('hidden');
        const azureBaseUrlInput = document.getElementById('azureOpenAIBaseUrl');
        const azureApiKeyInput = document.getElementById('azureOpenAIApiKey');
        const azureDeploymentInput = document.getElementById('azureOpenAIDeployment');
        if (azureBaseUrlInput && !azureBaseUrlInput.dataset.listenerAttached) {
            azureBaseUrlInput.addEventListener('input', updateWizardNavigation);
            azureBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (azureApiKeyInput && !azureApiKeyInput.dataset.listenerAttached) {
            azureApiKeyInput.addEventListener('input', updateWizardNavigation);
            azureApiKeyInput.dataset.listenerAttached = 'true';
        }
        if (azureDeploymentInput && !azureDeploymentInput.dataset.listenerAttached) {
            azureDeploymentInput.addEventListener('input', updateWizardNavigation);
            azureDeploymentInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Mistral) {
        mistralSection?.classList.remove('hidden');
        const mistralBaseUrlInput = document.getElementById('mistralBaseUrl');
        const mistralApiKeyInput = document.getElementById('mistralApiKey');
        if (mistralBaseUrlInput && !mistralBaseUrlInput.dataset.listenerAttached) {
            mistralBaseUrlInput.addEventListener('input', updateWizardNavigation);
            mistralBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (mistralApiKeyInput && !mistralApiKeyInput.dataset.listenerAttached) {
            mistralApiKeyInput.addEventListener('input', updateWizardNavigation);
            mistralApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Cohere) {
        cohereSection?.classList.remove('hidden');
        const cohereBaseUrlInput = document.getElementById('cohereBaseUrl');
        const cohereApiKeyInput = document.getElementById('cohereApiKey');
        if (cohereBaseUrlInput && !cohereBaseUrlInput.dataset.listenerAttached) {
            cohereBaseUrlInput.addEventListener('input', updateWizardNavigation);
            cohereBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (cohereApiKeyInput && !cohereApiKeyInput.dataset.listenerAttached) {
            cohereApiKeyInput.addEventListener('input', updateWizardNavigation);
            cohereApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Perplexity) {
        perplexitySection?.classList.remove('hidden');
        const perplexityBaseUrlInput = document.getElementById('perplexityBaseUrl');
        const perplexityApiKeyInput = document.getElementById('perplexityApiKey');
        if (perplexityBaseUrlInput && !perplexityBaseUrlInput.dataset.listenerAttached) {
            perplexityBaseUrlInput.addEventListener('input', updateWizardNavigation);
            perplexityBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (perplexityApiKeyInput && !perplexityApiKeyInput.dataset.listenerAttached) {
            perplexityApiKeyInput.addEventListener('input', updateWizardNavigation);
            perplexityApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Together) {
        togetherSection?.classList.remove('hidden');
        const togetherBaseUrlInput = document.getElementById('togetherBaseUrl');
        const togetherApiKeyInput = document.getElementById('togetherApiKey');
        if (togetherBaseUrlInput && !togetherBaseUrlInput.dataset.listenerAttached) {
            togetherBaseUrlInput.addEventListener('input', updateWizardNavigation);
            togetherBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (togetherApiKeyInput && !togetherApiKeyInput.dataset.listenerAttached) {
            togetherApiKeyInput.addEventListener('input', updateWizardNavigation);
            togetherApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Fireworks) {
        fireworksSection?.classList.remove('hidden');
        const fireworksBaseUrlInput = document.getElementById('fireworksBaseUrl');
        const fireworksApiKeyInput = document.getElementById('fireworksApiKey');
        if (fireworksBaseUrlInput && !fireworksBaseUrlInput.dataset.listenerAttached) {
            fireworksBaseUrlInput.addEventListener('input', updateWizardNavigation);
            fireworksBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (fireworksApiKeyInput && !fireworksApiKeyInput.dataset.listenerAttached) {
            fireworksApiKeyInput.addEventListener('input', updateWizardNavigation);
            fireworksApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Groq) {
        groqSection?.classList.remove('hidden');
        const groqBaseUrlInput = document.getElementById('groqBaseUrl');
        const groqApiKeyInput = document.getElementById('groqApiKey');
        if (groqBaseUrlInput && !groqBaseUrlInput.dataset.listenerAttached) {
            groqBaseUrlInput.addEventListener('input', updateWizardNavigation);
            groqBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (groqApiKeyInput && !groqApiKeyInput.dataset.listenerAttached) {
            groqApiKeyInput.addEventListener('input', updateWizardNavigation);
            groqApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.OpenRouter) {
        openrouterSection?.classList.remove('hidden');
        const openrouterBaseUrlInput = document.getElementById('openrouterBaseUrl');
        const openrouterApiKeyInput = document.getElementById('openrouterApiKey');
        if (openrouterBaseUrlInput && !openrouterBaseUrlInput.dataset.listenerAttached) {
            openrouterBaseUrlInput.addEventListener('input', updateWizardNavigation);
            openrouterBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (openrouterApiKeyInput && !openrouterApiKeyInput.dataset.listenerAttached) {
            openrouterApiKeyInput.addEventListener('input', updateWizardNavigation);
            openrouterApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Dropbox) {
        dropboxSection?.classList.remove('hidden');
        const dropboxBaseUrlInput = document.getElementById('dropboxBaseUrl');
        const dropboxAccessTokenInput = document.getElementById('dropboxAccessToken');
        if (dropboxBaseUrlInput && !dropboxBaseUrlInput.dataset.listenerAttached) {
            dropboxBaseUrlInput.addEventListener('input', updateWizardNavigation);
            dropboxBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (dropboxAccessTokenInput && !dropboxAccessTokenInput.dataset.listenerAttached) {
            dropboxAccessTokenInput.addEventListener('input', updateWizardNavigation);
            dropboxAccessTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.N8n) {
        n8nSection?.classList.remove('hidden');
        initializeN8nToolSelector(false);
        const n8nBaseUrlInput = document.getElementById('n8nBaseUrl');
        const n8nApiKeyInput = document.getElementById('n8nApiKey');
        const n8nApiPathInput = document.getElementById('n8nApiPath');
        if (n8nBaseUrlInput && !n8nBaseUrlInput.dataset.listenerAttached) {
            n8nBaseUrlInput.addEventListener('input', updateWizardNavigation);
            n8nBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (n8nApiKeyInput && !n8nApiKeyInput.dataset.listenerAttached) {
            n8nApiKeyInput.addEventListener('input', updateWizardNavigation);
            n8nApiKeyInput.dataset.listenerAttached = 'true';
        }
        if (n8nApiPathInput && !n8nApiPathInput.dataset.listenerAttached) {
            n8nApiPathInput.addEventListener('input', updateWizardNavigation);
            n8nApiPathInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Supabase) {
        supabaseSection?.classList.remove('hidden');
        const supabaseBaseUrlInput = document.getElementById('supabaseBaseUrl');
        const supabaseApiKeyInput = document.getElementById('supabaseApiKey');
        if (supabaseBaseUrlInput && !supabaseBaseUrlInput.dataset.listenerAttached) {
            supabaseBaseUrlInput.addEventListener('input', updateWizardNavigation);
            supabaseBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (supabaseApiKeyInput && !supabaseApiKeyInput.dataset.listenerAttached) {
            supabaseApiKeyInput.addEventListener('input', updateWizardNavigation);
            supabaseApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Npm) {
        npmSection?.classList.remove('hidden');
        const npmBaseUrlInput = document.getElementById('npmBaseUrl');
        if (npmBaseUrlInput && !npmBaseUrlInput.dataset.listenerAttached) {
            npmBaseUrlInput.addEventListener('input', updateWizardNavigation);
            npmBaseUrlInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Nuget) {
        nugetSection?.classList.remove('hidden');
        const nugetBaseUrlInput = document.getElementById('nugetBaseUrl');
        const nugetRegBaseUrlInput = document.getElementById('nugetRegistrationBaseUrl');
        if (nugetBaseUrlInput && !nugetBaseUrlInput.dataset.listenerAttached) {
            nugetBaseUrlInput.addEventListener('input', updateWizardNavigation);
            nugetBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (nugetRegBaseUrlInput && !nugetRegBaseUrlInput.dataset.listenerAttached) {
            nugetRegBaseUrlInput.addEventListener('input', updateWizardNavigation);
            nugetRegBaseUrlInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Maven) {
        mavenSection?.classList.remove('hidden');
        const mavenBaseUrlInput = document.getElementById('mavenBaseUrl');
        if (mavenBaseUrlInput && !mavenBaseUrlInput.dataset.listenerAttached) {
            mavenBaseUrlInput.addEventListener('input', updateWizardNavigation);
            mavenBaseUrlInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Gradle) {
        gradleSection?.classList.remove('hidden');
        const gradleBaseUrlInput = document.getElementById('gradleBaseUrl');
        if (gradleBaseUrlInput && !gradleBaseUrlInput.dataset.listenerAttached) {
            gradleBaseUrlInput.addEventListener('input', updateWizardNavigation);
            gradleBaseUrlInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Nexus) {
        nexusSection?.classList.remove('hidden');
        const nexusBaseUrlInput = document.getElementById('nexusBaseUrl');
        const nexusApiKeyInput = document.getElementById('nexusApiKey');
        const nexusUsernameInput = document.getElementById('nexusUsername');
        const nexusPasswordInput = document.getElementById('nexusPassword');
        if (nexusBaseUrlInput && !nexusBaseUrlInput.dataset.listenerAttached) {
            nexusBaseUrlInput.addEventListener('input', updateWizardNavigation);
            nexusBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (nexusApiKeyInput && !nexusApiKeyInput.dataset.listenerAttached) {
            nexusApiKeyInput.addEventListener('input', updateWizardNavigation);
            nexusApiKeyInput.dataset.listenerAttached = 'true';
        }
        if (nexusUsernameInput && !nexusUsernameInput.dataset.listenerAttached) {
            nexusUsernameInput.addEventListener('input', updateWizardNavigation);
            nexusUsernameInput.dataset.listenerAttached = 'true';
        }
        if (nexusPasswordInput && !nexusPasswordInput.dataset.listenerAttached) {
            nexusPasswordInput.addEventListener('input', updateWizardNavigation);
            nexusPasswordInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Trello) {
        trelloSection?.classList.remove('hidden');
        const trelloBaseUrlInput = document.getElementById('trelloBaseUrl');
        const trelloApiKeyInput = document.getElementById('trelloApiKey');
        const trelloApiTokenInput = document.getElementById('trelloApiToken');
        if (trelloBaseUrlInput && !trelloBaseUrlInput.dataset.listenerAttached) {
            trelloBaseUrlInput.addEventListener('input', updateWizardNavigation);
            trelloBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (trelloApiKeyInput && !trelloApiKeyInput.dataset.listenerAttached) {
            trelloApiKeyInput.addEventListener('input', updateWizardNavigation);
            trelloApiKeyInput.dataset.listenerAttached = 'true';
        }
        if (trelloApiTokenInput && !trelloApiTokenInput.dataset.listenerAttached) {
            trelloApiTokenInput.addEventListener('input', updateWizardNavigation);
            trelloApiTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.GitLab) {
        gitlabSection?.classList.remove('hidden');
        const gitlabBaseUrlInput = document.getElementById('gitlabBaseUrl');
        const gitlabTokenInput = document.getElementById('gitlabToken');
        if (gitlabBaseUrlInput && !gitlabBaseUrlInput.dataset.listenerAttached) {
            gitlabBaseUrlInput.addEventListener('input', updateWizardNavigation);
            gitlabBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (gitlabTokenInput && !gitlabTokenInput.dataset.listenerAttached) {
            gitlabTokenInput.addEventListener('input', updateWizardNavigation);
            gitlabTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Bitbucket) {
        bitbucketSection?.classList.remove('hidden');
        const bitbucketBaseUrlInput = document.getElementById('bitbucketBaseUrl');
        const bitbucketUsernameInput = document.getElementById('bitbucketUsername');
        const bitbucketAppPasswordInput = document.getElementById('bitbucketAppPassword');
        if (bitbucketBaseUrlInput && !bitbucketBaseUrlInput.dataset.listenerAttached) {
            bitbucketBaseUrlInput.addEventListener('input', updateWizardNavigation);
            bitbucketBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (bitbucketUsernameInput && !bitbucketUsernameInput.dataset.listenerAttached) {
            bitbucketUsernameInput.addEventListener('input', updateWizardNavigation);
            bitbucketUsernameInput.dataset.listenerAttached = 'true';
        }
        if (bitbucketAppPasswordInput && !bitbucketAppPasswordInput.dataset.listenerAttached) {
            bitbucketAppPasswordInput.addEventListener('input', updateWizardNavigation);
            bitbucketAppPasswordInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.GDrive) {
        gdriveSection?.classList.remove('hidden');
        const gdriveBaseUrlInput = document.getElementById('gdriveBaseUrl');
        const gdriveAccessTokenInput = document.getElementById('gdriveAccessToken');
        if (gdriveBaseUrlInput && !gdriveBaseUrlInput.dataset.listenerAttached) {
            gdriveBaseUrlInput.addEventListener('input', updateWizardNavigation);
            gdriveBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (gdriveAccessTokenInput && !gdriveAccessTokenInput.dataset.listenerAttached) {
            gdriveAccessTokenInput.addEventListener('input', updateWizardNavigation);
            gdriveAccessTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.GoogleCalendar) {
        googlecalendarSection?.classList.remove('hidden');
        const gcalBaseUrlInput = document.getElementById('gcalBaseUrl');
        const gcalAccessTokenInput = document.getElementById('gcalAccessToken');
        if (gcalBaseUrlInput && !gcalBaseUrlInput.dataset.listenerAttached) {
            gcalBaseUrlInput.addEventListener('input', updateWizardNavigation);
            gcalBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (gcalAccessTokenInput && !gcalAccessTokenInput.dataset.listenerAttached) {
            gcalAccessTokenInput.addEventListener('input', updateWizardNavigation);
            gcalAccessTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.GoogleDocs) {
        googledocsSection?.classList.remove('hidden');
        const gdocsBaseUrlInput = document.getElementById('gdocsBaseUrl');
        const gdocsAccessTokenInput = document.getElementById('gdocsAccessToken');
        if (gdocsBaseUrlInput && !gdocsBaseUrlInput.dataset.listenerAttached) {
            gdocsBaseUrlInput.addEventListener('input', updateWizardNavigation);
            gdocsBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (gdocsAccessTokenInput && !gdocsAccessTokenInput.dataset.listenerAttached) {
            gdocsAccessTokenInput.addEventListener('input', updateWizardNavigation);
            gdocsAccessTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.GoogleSheets) {
        sheetsSection?.classList.remove('hidden');
        const sheetsBaseUrlInput = document.getElementById('sheetsBaseUrl');
        const sheetsAccessTokenInput = document.getElementById('sheetsAccessToken');
        if (sheetsBaseUrlInput && !sheetsBaseUrlInput.dataset.listenerAttached) {
            sheetsBaseUrlInput.addEventListener('input', updateWizardNavigation);
            sheetsBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (sheetsAccessTokenInput && !sheetsAccessTokenInput.dataset.listenerAttached) {
            sheetsAccessTokenInput.addEventListener('input', updateWizardNavigation);
            sheetsAccessTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Airtable) {
        airtableSection?.classList.remove('hidden');
        const airtableBaseUrlInput = document.getElementById('airtableBaseUrl');
        const airtableAccessTokenInput = document.getElementById('airtableAccessToken');
        if (airtableBaseUrlInput && !airtableBaseUrlInput.dataset.listenerAttached) {
            airtableBaseUrlInput.addEventListener('input', updateWizardNavigation);
            airtableBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (airtableAccessTokenInput && !airtableAccessTokenInput.dataset.listenerAttached) {
            airtableAccessTokenInput.addEventListener('input', updateWizardNavigation);
            airtableAccessTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Asana) {
        asanaSection?.classList.remove('hidden');
        const asanaBaseUrlInput = document.getElementById('asanaBaseUrl');
        const asanaAccessTokenInput = document.getElementById('asanaAccessToken');
        if (asanaBaseUrlInput && !asanaBaseUrlInput.dataset.listenerAttached) {
            asanaBaseUrlInput.addEventListener('input', updateWizardNavigation);
            asanaBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (asanaAccessTokenInput && !asanaAccessTokenInput.dataset.listenerAttached) {
            asanaAccessTokenInput.addEventListener('input', updateWizardNavigation);
            asanaAccessTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Monday) {
        mondaySection?.classList.remove('hidden');
        const mondayBaseUrlInput = document.getElementById('mondayBaseUrl');
        const mondayApiKeyInput = document.getElementById('mondayApiKey');
        if (mondayBaseUrlInput && !mondayBaseUrlInput.dataset.listenerAttached) {
            mondayBaseUrlInput.addEventListener('input', updateWizardNavigation);
            mondayBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (mondayApiKeyInput && !mondayApiKeyInput.dataset.listenerAttached) {
            mondayApiKeyInput.addEventListener('input', updateWizardNavigation);
            mondayApiKeyInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.ClickUp) {
        clickupSection?.classList.remove('hidden');
        const clickupBaseUrlInput = document.getElementById('clickupBaseUrl');
        const clickupAccessTokenInput = document.getElementById('clickupAccessToken');
        if (clickupBaseUrlInput && !clickupBaseUrlInput.dataset.listenerAttached) {
            clickupBaseUrlInput.addEventListener('input', updateWizardNavigation);
            clickupBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (clickupAccessTokenInput && !clickupAccessTokenInput.dataset.listenerAttached) {
            clickupAccessTokenInput.addEventListener('input', updateWizardNavigation);
            clickupAccessTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Linear) {
        linearSection?.classList.remove('hidden');
        const linearBaseUrlInput = document.getElementById('linearBaseUrl');
        const linearAccessTokenInput = document.getElementById('linearAccessToken');
        if (linearBaseUrlInput && !linearBaseUrlInput.dataset.listenerAttached) {
            linearBaseUrlInput.addEventListener('input', updateWizardNavigation);
            linearBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (linearAccessTokenInput && !linearAccessTokenInput.dataset.listenerAttached) {
            linearAccessTokenInput.addEventListener('input', updateWizardNavigation);
            linearAccessTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Jenkins) {
        jenkinsSection?.classList.remove('hidden');
        const jenkinsBaseUrlInput = document.getElementById('jenkinsBaseUrl');
        const jenkinsUsernameInput = document.getElementById('jenkinsUsername');
        const jenkinsApiTokenInput = document.getElementById('jenkinsApiToken');
        if (jenkinsBaseUrlInput && !jenkinsBaseUrlInput.dataset.listenerAttached) {
            jenkinsBaseUrlInput.addEventListener('input', updateWizardNavigation);
            jenkinsBaseUrlInput.dataset.listenerAttached = 'true';
        }
        if (jenkinsUsernameInput && !jenkinsUsernameInput.dataset.listenerAttached) {
            jenkinsUsernameInput.addEventListener('input', updateWizardNavigation);
            jenkinsUsernameInput.dataset.listenerAttached = 'true';
        }
        if (jenkinsApiTokenInput && !jenkinsApiTokenInput.dataset.listenerAttached) {
            jenkinsApiTokenInput.addEventListener('input', updateWizardNavigation);
            jenkinsApiTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.DockerHub) {
        dockerhubSection?.classList.remove('hidden');
        const dockerhubBaseUrlInput = document.getElementById('dockerhubBaseUrl');
        if (dockerhubBaseUrlInput && !dockerhubBaseUrlInput.dataset.listenerAttached) {
            dockerhubBaseUrlInput.addEventListener('input', updateWizardNavigation);
            dockerhubBaseUrlInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Jira) {
        jiraSection?.classList.remove('hidden');
        // Add listeners for Jira inputs
        const jiraHostInput = document.getElementById('jiraHost');
        const jiraEmailInput = document.getElementById('jiraEmail');
        const jiraApiTokenInput = document.getElementById('jiraApiToken');
        if (jiraHostInput && !jiraHostInput.dataset.listenerAttached) {
            jiraHostInput.addEventListener('input', updateWizardNavigation);
            jiraHostInput.dataset.listenerAttached = 'true';
        }
        if (jiraEmailInput && !jiraEmailInput.dataset.listenerAttached) {
            jiraEmailInput.addEventListener('input', updateWizardNavigation);
            jiraEmailInput.dataset.listenerAttached = 'true';
        }
        if (jiraApiTokenInput && !jiraApiTokenInput.dataset.listenerAttached) {
            jiraApiTokenInput.addEventListener('input', updateWizardNavigation);
            jiraApiTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Confluence) {
        confluenceSection?.classList.remove('hidden');
        const confluenceHostInput = document.getElementById('confluenceHost');
        const confluenceEmailInput = document.getElementById('confluenceEmail');
        const confluenceApiTokenInput = document.getElementById('confluenceApiToken');
        if (confluenceHostInput && !confluenceHostInput.dataset.listenerAttached) {
            confluenceHostInput.addEventListener('input', updateWizardNavigation);
            confluenceHostInput.dataset.listenerAttached = 'true';
        }
        if (confluenceEmailInput && !confluenceEmailInput.dataset.listenerAttached) {
            confluenceEmailInput.addEventListener('input', updateWizardNavigation);
            confluenceEmailInput.dataset.listenerAttached = 'true';
        }
        if (confluenceApiTokenInput && !confluenceApiTokenInput.dataset.listenerAttached) {
            confluenceApiTokenInput.addEventListener('input', updateWizardNavigation);
            confluenceApiTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Ftp) {
        ftpSection?.classList.remove('hidden');
        // Add listeners for FTP inputs
        const ftpHostInput = document.getElementById('ftpHost');
        const ftpUsernameInput = document.getElementById('ftpUsername');
        const ftpPasswordInput = document.getElementById('ftpPassword');
        if (ftpHostInput && !ftpHostInput.dataset.listenerAttached) {
            ftpHostInput.addEventListener('input', updateWizardNavigation);
            ftpHostInput.dataset.listenerAttached = 'true';
        }
        if (ftpUsernameInput && !ftpUsernameInput.dataset.listenerAttached) {
            ftpUsernameInput.addEventListener('input', updateWizardNavigation);
            ftpUsernameInput.dataset.listenerAttached = 'true';
        }
        if (ftpPasswordInput && !ftpPasswordInput.dataset.listenerAttached) {
            ftpPasswordInput.addEventListener('input', updateWizardNavigation);
            ftpPasswordInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.LocalFS) {
        localfsSection?.classList.remove('hidden');
        // Add listener for LocalFS base path input
        const localfsBasePathInput = document.getElementById('localfsBasePath');
        if (localfsBasePathInput && !localfsBasePathInput.dataset.listenerAttached) {
            localfsBasePathInput.addEventListener('input', updateWizardNavigation);
            localfsBasePathInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Email) {
        emailSection?.classList.remove('hidden');
        // Add listeners for Email mode radios
        document.querySelectorAll('input[name="emailMode"]').forEach(radio => {
            if (!radio.dataset.listenerAttached) {
                radio.addEventListener('change', handleEmailModeChange);
                radio.dataset.listenerAttached = 'true';
            }
        });
        // Add listeners for Email inputs
        const emailImapHostInput = document.getElementById('emailImapHost');
        const emailSmtpHostInput = document.getElementById('emailSmtpHost');
        const emailUsernameInput = document.getElementById('emailUsername');
        const emailPasswordInput = document.getElementById('emailPassword');
        if (emailImapHostInput && !emailImapHostInput.dataset.listenerAttached) {
            emailImapHostInput.addEventListener('input', updateWizardNavigation);
            emailImapHostInput.dataset.listenerAttached = 'true';
        }
        if (emailSmtpHostInput && !emailSmtpHostInput.dataset.listenerAttached) {
            emailSmtpHostInput.addEventListener('input', updateWizardNavigation);
            emailSmtpHostInput.dataset.listenerAttached = 'true';
        }
        if (emailUsernameInput && !emailUsernameInput.dataset.listenerAttached) {
            emailUsernameInput.addEventListener('input', updateWizardNavigation);
            emailUsernameInput.dataset.listenerAttached = 'true';
        }
        if (emailPasswordInput && !emailPasswordInput.dataset.listenerAttached) {
            emailPasswordInput.addEventListener('input', updateWizardNavigation);
            emailPasswordInput.dataset.listenerAttached = 'true';
        }
        // Initialize email mode UI
        handleEmailModeChange();
    } else if (selectedType === DataSourceType.Gmail) {
        gmailSection?.classList.remove('hidden');
        document.querySelectorAll('input[name="gmailMode"]').forEach(radio => {
            if (!radio.dataset.listenerAttached) {
                radio.addEventListener('change', handleGmailModeChange);
                radio.dataset.listenerAttached = 'true';
            }
        });
        const gmailUsernameInput = document.getElementById('gmailUsername');
        const gmailPasswordInput = document.getElementById('gmailPassword');
        if (gmailUsernameInput && !gmailUsernameInput.dataset.listenerAttached) {
            gmailUsernameInput.addEventListener('input', updateWizardNavigation);
            gmailUsernameInput.dataset.listenerAttached = 'true';
        }
        if (gmailPasswordInput && !gmailPasswordInput.dataset.listenerAttached) {
            gmailPasswordInput.addEventListener('input', updateWizardNavigation);
            gmailPasswordInput.dataset.listenerAttached = 'true';
        }
        handleGmailModeChange();
    } else if (selectedType === DataSourceType.Slack) {
        slackSection?.classList.remove('hidden');
        // Add listener for Slack bot token input
        const slackBotTokenInput = document.getElementById('slackBotToken');
        if (slackBotTokenInput && !slackBotTokenInput.dataset.listenerAttached) {
            slackBotTokenInput.addEventListener('input', updateWizardNavigation);
            slackBotTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Discord) {
        discordSection?.classList.remove('hidden');
        const discordTokenInput = document.getElementById('discordBotToken');
        if (discordTokenInput && !discordTokenInput.dataset.listenerAttached) {
            discordTokenInput.addEventListener('input', updateWizardNavigation);
            discordTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Docker) {
        dockerSection?.classList.remove('hidden');
    } else if (selectedType === DataSourceType.Kubernetes) {
        kubernetesSection?.classList.remove('hidden');
    } else if (selectedType === DataSourceType.OpenShift) {
        openshiftSection?.classList.remove('hidden');
    } else if (selectedType === DataSourceType.Elasticsearch) {
        elasticsearchSection?.classList.remove('hidden');
        const esBaseUrlInput = document.getElementById('esBaseUrl');
        if (esBaseUrlInput && !esBaseUrlInput.dataset.listenerAttached) {
            esBaseUrlInput.addEventListener('input', updateWizardNavigation);
            esBaseUrlInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.OpenSearch) {
        opensearchSection?.classList.remove('hidden');
        const opensearchBaseUrlInput = document.getElementById('opensearchBaseUrl');
        if (opensearchBaseUrlInput && !opensearchBaseUrlInput.dataset.listenerAttached) {
            opensearchBaseUrlInput.addEventListener('input', updateWizardNavigation);
            opensearchBaseUrlInput.dataset.listenerAttached = 'true';
        }
    }

    // Update wizard navigation state
    updateWizardNavigation();
}


document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    try { setupTemplateFilters(); } catch {}
    setupFileUpload();
    applySaasDataSourceRestrictions();
    setupRouting();
    handleInitialRoute();
    if (!window.renderSidebar) {
        try { applySidebarCollapsedState(); } catch {}
    }
    if (document.getElementById('server-list')) {
        initializeManageServersPage();
    }
});

window.addEventListener('load', () => {
    if (!window.renderSidebar) {
        try { initSidebarResizer(); } catch {}
        try { applySidebarCollapsedState(); } catch {}
    }
});


async function handleNextToStep3() {
    const selectedType = document.querySelector('input[name="dataSourceType"]:checked')?.value;

    if (!selectedType) {
        showError('parse-error', 'Please select a data source type');
        return;
    }

    // For web page, show info in preview and go to step 3
    if (selectedType === DataSourceType.Webpage) {
        const alias = document.getElementById('webToolAlias')?.value?.trim();
        const webUrl = document.getElementById('webUrl')?.value?.trim();
        if (!webUrl || !alias) {
            showError('web-parse-error', 'Please enter a Web Page URL and a valid Alias');
            return;
        }

        // Store the URL without parsing - parsing will happen at runtime
        currentDataSource = {
            type: DataSourceType.Webpage,
            alias: alias,
            name: webUrl,
            url: webUrl
        };
        currentParsedData = []; // Empty, will be parsed when tool is called

        console.log('📋 Web page URL saved, showing preview info:', webUrl);

        // Display info message in preview
        displayWebpagePreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For curl, show info in preview and go to step 3
    if (selectedType === DataSourceType.Curl) {
        const alias = document.getElementById('curlToolAlias')?.value?.trim();
        const curlPasteMode = document.getElementById('curlPasteMode');
        const isPasteMode = !curlPasteMode?.classList.contains('hidden');

        console.log('🔍 cURL mode - isPasteMode:', isPasteMode);

        let curlUrl, curlMethod, headers, body;

        if (isPasteMode) {
            // Parse from pasted curl command
            const curlCommand = document.getElementById('curlCommand')?.value?.trim();
            if (!curlCommand) {
                showError('parse-error', 'Please paste a cURL command');
                return;
            }

            try {
                const parsed = parseCurlCommand(curlCommand);
                curlUrl = parsed.url;
                curlMethod = parsed.method;
                headers = parsed.headers;
                body = parsed.body;

                if (!curlUrl) {
                    showError('parse-error', 'Could not extract URL from cURL command');
                    return;
                }
            } catch (e) {
                showError('parse-error', e.message || 'Failed to parse cURL command');
                return;
            }
        } else {
            // Manual mode
            const curlUrlInput = document.getElementById('curlUrl');
            curlUrl = curlUrlInput?.value?.trim();
            curlMethod = document.getElementById('curlMethod')?.value || 'GET';
            const curlHeaders = document.getElementById('curlHeaders')?.value?.trim();
            const curlBody = document.getElementById('curlBody')?.value?.trim();

            console.log('🔍 Manual mode - curlUrl input element:', curlUrlInput);
            console.log('🔍 Manual mode - curlUrl value:', curlUrl);
            console.log('🔍 Manual mode - curlMethod:', curlMethod);

            if (!curlUrl) {
                showError('parse-error', 'Please enter a request URL');
                return;
            }

            // Parse headers JSON if provided
            headers = {};
            if (curlHeaders) {
                try {
                    headers = JSON.parse(curlHeaders);
                } catch (e) {
                    showError('parse-error', 'Invalid JSON in Headers field');
                    return;
                }
            }

            // Parse body JSON if provided
            body = {};
            if (curlBody) {
                try {
                    body = JSON.parse(curlBody);
                } catch (e) {
                    showError('parse-error', 'Invalid JSON in Body field');
                    return;
                }
            }
        }

        // Store curl config without executing - execution will happen at runtime
        currentDataSource = {
            type: DataSourceType.Curl,
            alias: alias,
            name: curlUrl,
            url: curlUrl,
            method: curlMethod,
            headers: headers,
            body: body
        };
        currentParsedData = []; // Empty, will be executed when tool is called

        console.log('📋 cURL request saved, showing preview info:', currentDataSource);

        // Display info message in preview
        displayCurlPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For GraphQL, show info in preview and go to step 3
    if (selectedType === DataSourceType.GraphQL) {
        const baseUrl = document.getElementById('graphqlBaseUrl')?.value?.trim();
        const headersRaw = document.getElementById('graphqlHeaders')?.value?.trim();

        if (!baseUrl) {
            showError('graphql-parse-error', 'Please enter GraphQL endpoint URL');
            return;
        }

        let headers = {};
        if (headersRaw) {
            try {
                headers = JSON.parse(headersRaw);
            } catch (e) {
                showError('graphql-parse-error', 'Invalid JSON in Headers field');
                return;
            }
        }

        currentDataSource = {
            type: DataSourceType.GraphQL,
            name: 'GraphQL',
            baseUrl,
            headers
        };
        currentParsedData = [{
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

        displayGraphQLPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For SOAP, show info in preview and go to step 3
    if (selectedType === DataSourceType.Soap) {
        const baseUrl = document.getElementById('soapBaseUrl')?.value?.trim();
        const wsdlUrl = document.getElementById('soapWsdlUrl')?.value?.trim();
        const soapAction = document.getElementById('soapAction')?.value?.trim();
        const headersRaw = document.getElementById('soapHeaders')?.value?.trim();

        if (!baseUrl) {
            showError('soap-parse-error', 'Please enter SOAP endpoint URL');
            return;
        }

        let headers = {};
        if (headersRaw) {
            try {
                headers = JSON.parse(headersRaw);
            } catch (e) {
                showError('soap-parse-error', 'Invalid JSON in Headers field');
                return;
            }
        }

        currentDataSource = {
            type: DataSourceType.Soap,
            name: 'SOAP',
            baseUrl,
            wsdlUrl,
            soapAction,
            headers
        };
        currentParsedData = [{
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

        displaySoapPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For RSS/Atom, show info in preview and go to step 3
    if (selectedType === DataSourceType.Rss) {
        const feedUrl = document.getElementById('rssFeedUrl')?.value?.trim();
        if (!feedUrl) {
            showError('rss-parse-error', 'Please enter feed URL');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Rss,
            name: 'RSS/Atom',
            feedUrl
        };
        currentParsedData = [{
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

        displayRssPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For GitHub, show info in preview and go to step 3
    if (selectedType === DataSourceType.GitHub) {
        const githubToken = document.getElementById('githubToken')?.value?.trim();
        const githubOwner = document.getElementById('githubOwner')?.value?.trim();
        const githubRepo = document.getElementById('githubRepo')?.value?.trim();

        if (!githubToken) {
            showError('github-parse-error', 'Please enter a GitHub Token');
            return;
        }

        // Store GitHub config
        currentDataSource = {
            type: DataSourceType.GitHub,
            name: 'GitHub',
            token: githubToken,
            owner: githubOwner,
            repo: githubRepo
        };
        currentParsedData = [{
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
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📋 GitHub config saved, showing preview info');

        // Display GitHub preview
        displayGitHubPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For X, show info in preview and go to step 3
    if (selectedType === DataSourceType.X) {
        const xToken = document.getElementById('xToken')?.value?.trim();
        const xUsername = document.getElementById('xUsername')?.value?.trim();

        if (!xToken) {
            showError('x-parse-error', 'Please enter an X API token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.X,
            name: 'X',
            token: xToken,
            username: xUsername
        };
        currentParsedData = [{
            tableName: 'x_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_user_by_username', 'Get X user details by username'],
                ['get_user', 'Get X user details by user ID'],
                ['get_user_tweets', 'Get recent tweets from a user'],
                ['search_recent_tweets', 'Search recent tweets by query'],
                ['get_tweet', 'Get a tweet by ID'],
                ['create_tweet', 'Create a new tweet']
            ],
            metadata: {
                rowCount: 6,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        displayXPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Prometheus, show info in preview and go to step 3
    if (selectedType === DataSourceType.Prometheus) {
        const baseUrl = document.getElementById('prometheusBaseUrl')?.value?.trim();
        if (!baseUrl) {
            showError('prometheus-parse-error', 'Please enter Prometheus base URL');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Prometheus,
            name: 'Prometheus',
            baseUrl
        };
        currentParsedData = [{
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

        displayPrometheusPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Grafana, show info in preview and go to step 3
    if (selectedType === DataSourceType.Grafana) {
        const baseUrl = document.getElementById('grafanaBaseUrl')?.value?.trim();
        const authType = document.getElementById('grafanaAuthType')?.value || 'apiKey';
        const apiKey = document.getElementById('grafanaApiKey')?.value?.trim();
        const username = document.getElementById('grafanaUsername')?.value?.trim();
        const password = document.getElementById('grafanaPassword')?.value?.trim();

        if (!baseUrl) {
            showError('grafana-parse-error', 'Please enter Grafana base URL');
            return;
        }
        if (authType === 'apiKey' && !apiKey) {
            showError('grafana-parse-error', 'Please enter Grafana API key');
            return;
        }
        if (authType === 'basic' && (!username || !password)) {
            showError('grafana-parse-error', 'Please enter Grafana username and password');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Grafana,
            name: 'Grafana',
            baseUrl,
            authType,
            apiKey: authType === 'apiKey' ? apiKey : '',
            username: authType === 'basic' ? username : '',
            password: authType === 'basic' ? password : ''
        };
        currentParsedData = [{
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

        displayGrafanaPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For MongoDB, show info in preview and go to step 3
    if (selectedType === DataSourceType.MongoDB) {
        const host = document.getElementById('mongoHost')?.value?.trim();
        const port = document.getElementById('mongoPort')?.value?.trim();
        const database = document.getElementById('mongoDatabase')?.value?.trim();
        const username = document.getElementById('mongoUsername')?.value?.trim();
        const password = document.getElementById('mongoPassword')?.value?.trim();
        const authSource = document.getElementById('mongoAuthSource')?.value?.trim();

        if (!host || !database) {
            showError('mongodb-parse-error', 'Please enter MongoDB host and database');
            return;
        }

        currentDataSource = {
            type: DataSourceType.MongoDB,
            name: 'MongoDB',
            host,
            port: port ? parseInt(port, 10) : 27017,
            database,
            username,
            password,
            authSource
        };
        currentParsedData = [{
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

        displayMongoDBPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Facebook, show info in preview and go to step 3
    if (selectedType === DataSourceType.Facebook) {
        const baseUrl = document.getElementById('facebookBaseUrl')?.value?.trim();
        const apiVersion = document.getElementById('facebookApiVersion')?.value?.trim();
        const accessToken = document.getElementById('facebookAccessToken')?.value?.trim();
        const userId = document.getElementById('facebookUserId')?.value?.trim();
        const pageId = document.getElementById('facebookPageId')?.value?.trim();

        if (!baseUrl || !apiVersion || !accessToken) {
            showError('facebook-parse-error', 'Please enter base URL, API version, and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Facebook,
            name: 'Facebook',
            baseUrl,
            apiVersion,
            accessToken,
            userId,
            pageId
        };
        currentParsedData = [{
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

        displayFacebookPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Instagram, show info in preview and go to step 3
    if (selectedType === DataSourceType.Instagram) {
        const baseUrl = document.getElementById('instagramBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('instagramAccessToken')?.value?.trim();
        const userId = document.getElementById('instagramUserId')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('instagram-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Instagram,
            name: 'Instagram',
            baseUrl,
            accessToken,
            userId
        };
        currentParsedData = [{
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

        displayInstagramPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For TikTok, show info in preview and go to step 3
    if (selectedType === DataSourceType.TikTok) {
        const baseUrl = document.getElementById('tiktokBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('tiktokAccessToken')?.value?.trim();
        const userId = document.getElementById('tiktokUserId')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('tiktok-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.TikTok,
            name: 'TikTok',
            baseUrl,
            accessToken,
            userId
        };
        currentParsedData = [{
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

        displayTikTokPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Notion, show info in preview and go to step 3
    if (selectedType === DataSourceType.Notion) {
        const baseUrl = document.getElementById('notionBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('notionAccessToken')?.value?.trim();
        const notionVersion = document.getElementById('notionVersion')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('notion-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Notion,
            name: 'Notion',
            baseUrl,
            accessToken,
            notionVersion: notionVersion || '2022-06-28'
        };
        currentParsedData = [{
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

        displayNotionPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Telegram, show info in preview and go to step 3
    if (selectedType === DataSourceType.Telegram) {
        const baseUrl = document.getElementById('telegramBaseUrl')?.value?.trim();
        const botToken = document.getElementById('telegramBotToken')?.value?.trim();
        const chatId = document.getElementById('telegramChatId')?.value?.trim();

        if (!baseUrl || !botToken) {
            showError('telegram-parse-error', 'Please enter base URL and bot token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Telegram,
            name: 'Telegram',
            baseUrl,
            botToken,
            defaultChatId: chatId
        };
        currentParsedData = [{
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

        displayTelegramPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For LinkedIn, show info in preview and go to step 3
    if (selectedType === DataSourceType.LinkedIn) {
        const accessToken = document.getElementById('linkedinAccessToken')?.value?.trim();
        const personId = document.getElementById('linkedinPersonId')?.value?.trim();
        const organizationId = document.getElementById('linkedinOrganizationId')?.value?.trim();

        if (!accessToken) {
            showError('linkedin-parse-error', 'Please enter LinkedIn access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.LinkedIn,
            name: 'LinkedIn',
            baseUrl: 'https://api.linkedin.com/v2',
            accessToken,
            personId,
            organizationId
        };
        currentParsedData = [{
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

        displayLinkedInPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Reddit, show info in preview and go to step 3
    if (selectedType === DataSourceType.Reddit) {
        const accessToken = document.getElementById('redditAccessToken')?.value?.trim();
        const userAgent = document.getElementById('redditUserAgent')?.value?.trim();
        const subreddit = document.getElementById('redditSubreddit')?.value?.trim();
        const username = document.getElementById('redditUsername')?.value?.trim();

        if (!accessToken) {
            showError('reddit-parse-error', 'Please enter Reddit access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Reddit,
            name: 'Reddit',
            baseUrl: 'https://oauth.reddit.com',
            accessToken,
            userAgent,
            subreddit,
            username
        };
        currentParsedData = [{
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

        displayRedditPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For YouTube, show info in preview and go to step 3
    if (selectedType === DataSourceType.YouTube) {
        const apiKey = document.getElementById('youtubeApiKey')?.value?.trim();
        const accessToken = document.getElementById('youtubeAccessToken')?.value?.trim();
        const channelId = document.getElementById('youtubeChannelId')?.value?.trim();

        if (!apiKey) {
            showError('youtube-parse-error', 'Please enter YouTube API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.YouTube,
            name: 'YouTube',
            baseUrl: 'https://www.googleapis.com/youtube/v3',
            apiKey,
            accessToken,
            channelId
        };
        currentParsedData = [{
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

        displayYouTubePreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For WhatsApp Business, show info in preview and go to step 3
    if (selectedType === DataSourceType.WhatsAppBusiness) {
        const accessToken = document.getElementById('whatsappAccessToken')?.value?.trim();
        const phoneNumberId = document.getElementById('whatsappPhoneNumberId')?.value?.trim();
        const businessAccountId = document.getElementById('whatsappBusinessAccountId')?.value?.trim();

        if (!accessToken || !phoneNumberId) {
            showError('whatsappbusiness-parse-error', 'Please enter access token and phone number ID');
            return;
        }

        currentDataSource = {
            type: DataSourceType.WhatsAppBusiness,
            name: 'WhatsApp Business',
            baseUrl: 'https://graph.facebook.com/v19.0',
            accessToken,
            phoneNumberId,
            businessAccountId
        };
        currentParsedData = [{
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

        displayWhatsAppBusinessPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Threads, show info in preview and go to step 3
    if (selectedType === DataSourceType.Threads) {
        const accessToken = document.getElementById('threadsAccessToken')?.value?.trim();
        const userId = document.getElementById('threadsUserId')?.value?.trim();

        if (!accessToken) {
            showError('threads-parse-error', 'Please enter Threads access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Threads,
            name: 'Threads',
            baseUrl: 'https://graph.facebook.com/v19.0',
            accessToken,
            userId
        };
        currentParsedData = [{
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

        displayThreadsPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Spotify, show info in preview and go to step 3
    if (selectedType === DataSourceType.Spotify) {
        const baseUrl = document.getElementById('spotifyBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('spotifyAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('spotify-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Spotify,
            name: 'Spotify',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displaySpotifyPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Sonos, show info in preview and go to step 3
    if (selectedType === DataSourceType.Sonos) {
        const baseUrl = document.getElementById('sonosBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('sonosAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('sonos-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Sonos,
            name: 'Sonos',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displaySonosPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Shazam, show info in preview and go to step 3
    if (selectedType === DataSourceType.Shazam) {
        const baseUrl = document.getElementById('shazamBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('shazamApiKey')?.value?.trim();
        const apiHost = document.getElementById('shazamApiHost')?.value?.trim();

        if (!baseUrl || !apiKey) {
            showError('shazam-parse-error', 'Please enter base URL and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Shazam,
            name: 'Shazam',
            baseUrl,
            apiKey,
            apiHost
        };
        currentParsedData = [{
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

        displayShazamPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Philips Hue, show info in preview and go to step 3
    if (selectedType === DataSourceType.PhilipsHue) {
        const baseUrl = document.getElementById('philipshueBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('philipshueAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('philipshue-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.PhilipsHue,
            name: 'Philips Hue',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displayPhilipsHuePreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For 8Sleep, show info in preview and go to step 3
    if (selectedType === DataSourceType.EightSleep) {
        const baseUrl = document.getElementById('eightsleepBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('eightsleepAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('eightsleep-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.EightSleep,
            name: '8Sleep',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displayEightSleepPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Home Assistant, show info in preview and go to step 3
    if (selectedType === DataSourceType.HomeAssistant) {
        const baseUrl = document.getElementById('homeassistantBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('homeassistantAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('homeassistant-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.HomeAssistant,
            name: 'Home Assistant',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displayHomeAssistantPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Apple Notes, show info in preview and go to step 3
    if (selectedType === DataSourceType.AppleNotes) {
        const baseUrl = document.getElementById('applenotesBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('applenotesAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('applenotes-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.AppleNotes,
            name: 'Apple Notes',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displayAppleNotesPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Apple Reminders, show info in preview and go to step 3
    if (selectedType === DataSourceType.AppleReminders) {
        const baseUrl = document.getElementById('appleremindersBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('appleremindersAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('applereminders-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.AppleReminders,
            name: 'Apple Reminders',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displayAppleRemindersPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Things 3, show info in preview and go to step 3
    if (selectedType === DataSourceType.Things3) {
        const baseUrl = document.getElementById('things3BaseUrl')?.value?.trim();
        const accessToken = document.getElementById('things3AccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('things3-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Things3,
            name: 'Things 3',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displayThings3Preview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Obsidian, show info in preview and go to step 3
    if (selectedType === DataSourceType.Obsidian) {
        const baseUrl = document.getElementById('obsidianBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('obsidianAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('obsidian-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Obsidian,
            name: 'Obsidian',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displayObsidianPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Bear Notes, show info in preview and go to step 3
    if (selectedType === DataSourceType.BearNotes) {
        const baseUrl = document.getElementById('bearnotesBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('bearnotesAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('bearnotes-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.BearNotes,
            name: 'Bear Notes',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displayBearNotesPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For iMessage, show info in preview and go to step 3
    if (selectedType === DataSourceType.IMessage) {
        const baseUrl = document.getElementById('imessageBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('imessageAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('imessage-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.IMessage,
            name: 'iMessage',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displayIMessagePreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Zoom, show info in preview and go to step 3
    if (selectedType === DataSourceType.Zoom) {
        const baseUrl = document.getElementById('zoomBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('zoomAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('zoom-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Zoom,
            name: 'Zoom',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displayZoomPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Microsoft Teams, show info in preview and go to step 3
    if (selectedType === DataSourceType.MicrosoftTeams) {
        const baseUrl = document.getElementById('microsoftteamsBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('microsoftteamsAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('microsoftteams-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.MicrosoftTeams,
            name: 'Microsoft Teams',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displayMicrosoftTeamsPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Signal, show info in preview and go to step 3
    if (selectedType === DataSourceType.Signal) {
        const baseUrl = document.getElementById('signalBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('signalAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('signal-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Signal,
            name: 'Signal',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displaySignalPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For OpenAI, show info in preview and go to step 3
    if (selectedType === DataSourceType.OpenAI) {
        const apiKey = document.getElementById('openaiApiKey')?.value?.trim();
        const model = document.getElementById('openaiModel')?.value?.trim();

        if (!apiKey) {
            showError('openai-parse-error', 'Please enter API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.OpenAI,
            name: 'OpenAI',
            baseUrl: 'https://api.openai.com/v1',
            apiKey,
            defaultModel: model
        };
        currentParsedData = [{
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

        displayOpenAIPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Claude, show info in preview and go to step 3
    if (selectedType === DataSourceType.Claude) {
        const apiKey = document.getElementById('claudeApiKey')?.value?.trim();
        const apiVersion = document.getElementById('claudeApiVersion')?.value?.trim();
        const model = document.getElementById('claudeModel')?.value?.trim();

        if (!apiKey) {
            showError('claude-parse-error', 'Please enter API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Claude,
            name: 'Claude',
            baseUrl: 'https://api.anthropic.com/v1',
            apiKey,
            apiVersion: apiVersion || '2023-06-01',
            defaultModel: model
        };
        currentParsedData = [{
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

        displayClaudePreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Gemini, show info in preview and go to step 3
    if (selectedType === DataSourceType.Gemini) {
        const apiKey = document.getElementById('geminiApiKey')?.value?.trim();
        const model = document.getElementById('geminiModel')?.value?.trim();

        if (!apiKey) {
            showError('gemini-parse-error', 'Please enter API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Gemini,
            name: 'Gemini',
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
            apiKey,
            defaultModel: model
        };
        currentParsedData = [{
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

        displayGeminiPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Grok, show info in preview and go to step 3
    if (selectedType === DataSourceType.Grok) {
        const apiKey = document.getElementById('grokApiKey')?.value?.trim();
        const model = document.getElementById('grokModel')?.value?.trim();

        if (!apiKey) {
            showError('grok-parse-error', 'Please enter API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Grok,
            name: 'Grok',
            baseUrl: 'https://api.x.ai/v1',
            apiKey,
            defaultModel: model
        };
        currentParsedData = [{
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

        displayGrokPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For fal.ai, show info in preview and go to step 3
    if (selectedType === DataSourceType.FalAI) {
        const baseUrl = document.getElementById('falaiBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('falaiApiKey')?.value?.trim();

        if (!baseUrl || !apiKey) {
            showError('falai-parse-error', 'Please enter base URL and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.FalAI,
            name: 'fal.ai',
            baseUrl,
            apiKey
        };
        currentParsedData = [{
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

        displayFalAIPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Hugging Face, show info in preview and go to step 3
    if (selectedType === DataSourceType.HuggingFace) {
        const baseUrl = document.getElementById('huggingfaceBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('huggingfaceApiKey')?.value?.trim();
        const defaultModel = document.getElementById('huggingfaceDefaultModel')?.value?.trim();

        if (!baseUrl || !apiKey) {
            showError('huggingface-parse-error', 'Please enter base URL and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.HuggingFace,
            name: 'Hugging Face',
            baseUrl,
            apiKey,
            defaultModel
        };
        currentParsedData = [{
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

        displayHuggingFacePreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Llama, show info in preview and go to step 3
    if (selectedType === DataSourceType.Llama) {
        const baseUrl = document.getElementById('llamaBaseUrl')?.value?.trim();
        const model = document.getElementById('llamaModel')?.value?.trim();

        if (!baseUrl) {
            showError('llama-parse-error', 'Please enter base URL');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Llama,
            name: 'Llama',
            baseUrl,
            defaultModel: model
        };
        currentParsedData = [{
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

        displayLlamaPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For DeepSeek, show info in preview and go to step 3
    if (selectedType === DataSourceType.DeepSeek) {
        const baseUrl = document.getElementById('deepseekBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('deepseekApiKey')?.value?.trim();
        const model = document.getElementById('deepseekModel')?.value?.trim();

        if (!baseUrl || !apiKey) {
            showError('deepseek-parse-error', 'Please enter base URL and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.DeepSeek,
            name: 'DeepSeek',
            baseUrl,
            apiKey,
            defaultModel: model
        };
        currentParsedData = [{
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

        displayDeepSeekPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Azure OpenAI, show info in preview and go to step 3
    if (selectedType === DataSourceType.AzureOpenAI) {
        const baseUrl = document.getElementById('azureOpenAIBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('azureOpenAIApiKey')?.value?.trim();
        const apiVersion = document.getElementById('azureOpenAIApiVersion')?.value?.trim();
        const deployment = document.getElementById('azureOpenAIDeployment')?.value?.trim();

        if (!baseUrl || !apiKey || !deployment) {
            showError('azure-openai-parse-error', 'Please enter base URL, deployment, and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.AzureOpenAI,
            name: 'Azure OpenAI',
            baseUrl,
            apiKey,
            apiVersion: apiVersion || '2024-02-15-preview',
            deployment
        };
        currentParsedData = [{
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

        displayAzureOpenAIPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Mistral, show info in preview and go to step 3
    if (selectedType === DataSourceType.Mistral) {
        const baseUrl = document.getElementById('mistralBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('mistralApiKey')?.value?.trim();
        const model = document.getElementById('mistralModel')?.value?.trim();

        if (!baseUrl || !apiKey) {
            showError('mistral-parse-error', 'Please enter base URL and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Mistral,
            name: 'Mistral',
            baseUrl,
            apiKey,
            defaultModel: model
        };
        currentParsedData = [{
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

        displayMistralPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Cohere, show info in preview and go to step 3
    if (selectedType === DataSourceType.Cohere) {
        const baseUrl = document.getElementById('cohereBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('cohereApiKey')?.value?.trim();
        const model = document.getElementById('cohereModel')?.value?.trim();

        if (!baseUrl || !apiKey) {
            showError('cohere-parse-error', 'Please enter base URL and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Cohere,
            name: 'Cohere',
            baseUrl,
            apiKey,
            defaultModel: model
        };
        currentParsedData = [{
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

        displayCoherePreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Perplexity, show info in preview and go to step 3
    if (selectedType === DataSourceType.Perplexity) {
        const baseUrl = document.getElementById('perplexityBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('perplexityApiKey')?.value?.trim();
        const model = document.getElementById('perplexityModel')?.value?.trim();

        if (!baseUrl || !apiKey) {
            showError('perplexity-parse-error', 'Please enter base URL and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Perplexity,
            name: 'Perplexity',
            baseUrl,
            apiKey,
            defaultModel: model
        };
        currentParsedData = [{
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

        displayPerplexityPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Together, show info in preview and go to step 3
    if (selectedType === DataSourceType.Together) {
        const baseUrl = document.getElementById('togetherBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('togetherApiKey')?.value?.trim();
        const model = document.getElementById('togetherModel')?.value?.trim();

        if (!baseUrl || !apiKey) {
            showError('together-parse-error', 'Please enter base URL and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Together,
            name: 'Together',
            baseUrl,
            apiKey,
            defaultModel: model
        };
        currentParsedData = [{
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

        displayTogetherPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Fireworks, show info in preview and go to step 3
    if (selectedType === DataSourceType.Fireworks) {
        const baseUrl = document.getElementById('fireworksBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('fireworksApiKey')?.value?.trim();
        const model = document.getElementById('fireworksModel')?.value?.trim();

        if (!baseUrl || !apiKey) {
            showError('fireworks-parse-error', 'Please enter base URL and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Fireworks,
            name: 'Fireworks',
            baseUrl,
            apiKey,
            defaultModel: model
        };
        currentParsedData = [{
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

        displayFireworksPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Groq, show info in preview and go to step 3
    if (selectedType === DataSourceType.Groq) {
        const baseUrl = document.getElementById('groqBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('groqApiKey')?.value?.trim();
        const model = document.getElementById('groqModel')?.value?.trim();

        if (!baseUrl || !apiKey) {
            showError('groq-parse-error', 'Please enter base URL and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Groq,
            name: 'Groq',
            baseUrl,
            apiKey,
            defaultModel: model
        };
        currentParsedData = [{
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

        displayGroqPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For OpenRouter, show info in preview and go to step 3
    if (selectedType === DataSourceType.OpenRouter) {
        const baseUrl = document.getElementById('openrouterBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('openrouterApiKey')?.value?.trim();
        const model = document.getElementById('openrouterModel')?.value?.trim();

        if (!baseUrl || !apiKey) {
            showError('openrouter-parse-error', 'Please enter base URL and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.OpenRouter,
            name: 'OpenRouter',
            baseUrl,
            apiKey,
            defaultModel: model
        };
        currentParsedData = [{
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

        displayOpenRouterPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Dropbox, show info in preview and go to step 3
    if (selectedType === DataSourceType.Dropbox) {
        const baseUrl = document.getElementById('dropboxBaseUrl')?.value?.trim();
        const contentBaseUrl = document.getElementById('dropboxContentBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('dropboxAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('dropbox-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Dropbox,
            name: 'Dropbox',
            baseUrl,
            contentBaseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displayDropboxPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For n8n, show info in preview and go to step 3
    if (selectedType === DataSourceType.N8n) {
        const baseUrl = document.getElementById('n8nBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('n8nApiKey')?.value?.trim();
        const apiPath = document.getElementById('n8nApiPath')?.value?.trim() || '/api/v1';
        const enabledTools = getSelectedN8nToolNames();

        if (!baseUrl || !apiKey) {
            showError('n8n-parse-error', 'Please enter base URL and API key');
            return;
        }
        if (enabledTools.length === 0) {
            showError('n8n-parse-error', 'Please select at least one n8n tool');
            return;
        }

        currentDataSource = {
            type: DataSourceType.N8n,
            name: 'n8n',
            baseUrl,
            apiKey,
            apiPath,
            enabledTools
        };
        const selectedToolRows = getSelectedN8nTools().map((tool) => [tool.name, tool.description]);
        currentParsedData = [{
            tableName: 'n8n_tools',
            headers: ['tool', 'description'],
            rows: selectedToolRows,
            metadata: {
                rowCount: selectedToolRows.length,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        displayN8nPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Supabase, show info in preview and go to step 3
    if (selectedType === DataSourceType.Supabase) {
        const baseUrl = document.getElementById('supabaseBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('supabaseApiKey')?.value?.trim();

        if (!baseUrl || !apiKey) {
            showError('supabase-parse-error', 'Please enter base URL and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Supabase,
            name: 'Supabase',
            baseUrl,
            apiKey
        };
        currentParsedData = [{
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

        displaySupabasePreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For npm, show info in preview and go to step 3
    if (selectedType === DataSourceType.Npm) {
        const baseUrl = document.getElementById('npmBaseUrl')?.value?.trim();

        if (!baseUrl) {
            showError('npm-parse-error', 'Please enter base URL');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Npm,
            name: 'npm',
            baseUrl
        };
        currentParsedData = [{
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

        displayNpmPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For NuGet, show info in preview and go to step 3
    if (selectedType === DataSourceType.Nuget) {
        const baseUrl = document.getElementById('nugetBaseUrl')?.value?.trim();
        const registrationBaseUrl = document.getElementById('nugetRegistrationBaseUrl')?.value?.trim();

        if (!baseUrl || !registrationBaseUrl) {
            showError('nuget-parse-error', 'Please enter base URLs');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Nuget,
            name: 'NuGet',
            baseUrl,
            registrationBaseUrl
        };
        currentParsedData = [{
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

        displayNugetPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Maven, show info in preview and go to step 3
    if (selectedType === DataSourceType.Maven) {
        const baseUrl = document.getElementById('mavenBaseUrl')?.value?.trim();

        if (!baseUrl) {
            showError('maven-parse-error', 'Please enter base URL');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Maven,
            name: 'Maven Central',
            baseUrl
        };
        currentParsedData = [{
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

        displayMavenPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Gradle, show info in preview and go to step 3
    if (selectedType === DataSourceType.Gradle) {
        const baseUrl = document.getElementById('gradleBaseUrl')?.value?.trim();

        if (!baseUrl) {
            showError('gradle-parse-error', 'Please enter base URL');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Gradle,
            name: 'Gradle',
            baseUrl
        };
        currentParsedData = [{
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

        displayGradlePreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Nexus, show info in preview and go to step 3
    if (selectedType === DataSourceType.Nexus) {
        const baseUrl = document.getElementById('nexusBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('nexusApiKey')?.value?.trim();
        const username = document.getElementById('nexusUsername')?.value?.trim();
        const password = document.getElementById('nexusPassword')?.value?.trim();

        if (!baseUrl || (!apiKey && !(username && password))) {
            showError('nexus-parse-error', 'Please enter base URL and API key or username/password');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Nexus,
            name: 'Nexus',
            baseUrl,
            apiKey,
            username,
            password
        };
        currentParsedData = [{
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

        displayNexusPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Trello, show info in preview and go to step 3
    if (selectedType === DataSourceType.Trello) {
        const baseUrl = document.getElementById('trelloBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('trelloApiKey')?.value?.trim();
        const apiToken = document.getElementById('trelloApiToken')?.value?.trim();
        const memberId = document.getElementById('trelloMemberId')?.value?.trim();
        const boardId = document.getElementById('trelloBoardId')?.value?.trim();
        const listId = document.getElementById('trelloListId')?.value?.trim();

        if (!baseUrl || !apiKey || !apiToken) {
            showError('trello-parse-error', 'Please enter base URL, API key, and token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Trello,
            name: 'Trello',
            baseUrl,
            apiKey,
            apiToken,
            memberId,
            boardId,
            listId
        };
        currentParsedData = [{
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

        displayTrelloPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For GitLab, show info in preview and go to step 3
    if (selectedType === DataSourceType.GitLab) {
        const baseUrl = document.getElementById('gitlabBaseUrl')?.value?.trim();
        const token = document.getElementById('gitlabToken')?.value?.trim();
        const projectId = document.getElementById('gitlabProjectId')?.value?.trim();

        if (!baseUrl || !token) {
            showError('gitlab-parse-error', 'Please enter base URL and token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.GitLab,
            name: 'GitLab',
            baseUrl,
            token,
            projectId
        };
        currentParsedData = [{
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

        displayGitLabPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Bitbucket, show info in preview and go to step 3
    if (selectedType === DataSourceType.Bitbucket) {
        const baseUrl = document.getElementById('bitbucketBaseUrl')?.value?.trim();
        const username = document.getElementById('bitbucketUsername')?.value?.trim();
        const appPassword = document.getElementById('bitbucketAppPassword')?.value?.trim();
        const workspace = document.getElementById('bitbucketWorkspace')?.value?.trim();
        const repoSlug = document.getElementById('bitbucketRepoSlug')?.value?.trim();

        if (!baseUrl || !username || !appPassword) {
            showError('bitbucket-parse-error', 'Please enter base URL, username, and app password');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Bitbucket,
            name: 'Bitbucket',
            baseUrl,
            username,
            appPassword,
            workspace,
            repoSlug
        };
        currentParsedData = [{
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

        displayBitbucketPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Google Drive, show info in preview and go to step 3
    if (selectedType === DataSourceType.GDrive) {
        const baseUrl = document.getElementById('gdriveBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('gdriveAccessToken')?.value?.trim();
        const rootFolderId = document.getElementById('gdriveRootFolderId')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('gdrive-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.GDrive,
            name: 'Google Drive',
            baseUrl,
            accessToken,
            rootFolderId
        };
        currentParsedData = [{
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

        displayGDrivePreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Google Calendar, show info in preview and go to step 3
    if (selectedType === DataSourceType.GoogleCalendar) {
        const baseUrl = document.getElementById('gcalBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('gcalAccessToken')?.value?.trim();
        const calendarId = document.getElementById('gcalCalendarId')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('gcal-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.GoogleCalendar,
            name: 'Google Calendar',
            baseUrl,
            accessToken,
            calendarId
        };
        currentParsedData = [{
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

        displayGoogleCalendarPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Google Docs, show info in preview and go to step 3
    if (selectedType === DataSourceType.GoogleDocs) {
        const baseUrl = document.getElementById('gdocsBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('gdocsAccessToken')?.value?.trim();
        const documentId = document.getElementById('gdocsDocumentId')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('gdocs-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.GoogleDocs,
            name: 'Google Docs',
            baseUrl,
            accessToken,
            documentId
        };
        currentParsedData = [{
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

        displayGoogleDocsPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Google Sheets, show info in preview and go to step 3
    if (selectedType === DataSourceType.GoogleSheets) {
        const baseUrl = document.getElementById('sheetsBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('sheetsAccessToken')?.value?.trim();
        const spreadsheetId = document.getElementById('sheetsSpreadsheetId')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('sheets-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.GoogleSheets,
            name: 'Google Sheets',
            baseUrl,
            accessToken,
            spreadsheetId
        };
        currentParsedData = [{
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

        displayGoogleSheetsPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Airtable, show info in preview and go to step 3
    if (selectedType === DataSourceType.Airtable) {
        const baseUrl = document.getElementById('airtableBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('airtableAccessToken')?.value?.trim();
        const baseId = document.getElementById('airtableBaseId')?.value?.trim();
        const tableName = document.getElementById('airtableTableName')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('airtable-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Airtable,
            name: 'Airtable',
            baseUrl,
            accessToken,
            baseId,
            tableName
        };
        currentParsedData = [{
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

        displayAirtablePreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Asana, show info in preview and go to step 3
    if (selectedType === DataSourceType.Asana) {
        const baseUrl = document.getElementById('asanaBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('asanaAccessToken')?.value?.trim();
        const workspaceId = document.getElementById('asanaWorkspaceId')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('asana-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Asana,
            name: 'Asana',
            baseUrl,
            accessToken,
            workspaceId
        };
        currentParsedData = [{
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

        displayAsanaPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Monday, show info in preview and go to step 3
    if (selectedType === DataSourceType.Monday) {
        const baseUrl = document.getElementById('mondayBaseUrl')?.value?.trim();
        const apiKey = document.getElementById('mondayApiKey')?.value?.trim();

        if (!baseUrl || !apiKey) {
            showError('monday-parse-error', 'Please enter base URL and API key');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Monday,
            name: 'Monday.com',
            baseUrl,
            apiKey
        };
        currentParsedData = [{
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

        displayMondayPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For ClickUp, show info in preview and go to step 3
    if (selectedType === DataSourceType.ClickUp) {
        const baseUrl = document.getElementById('clickupBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('clickupAccessToken')?.value?.trim();
        const teamId = document.getElementById('clickupTeamId')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('clickup-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.ClickUp,
            name: 'ClickUp',
            baseUrl,
            accessToken,
            teamId
        };
        currentParsedData = [{
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

        displayClickUpPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Linear, show info in preview and go to step 3
    if (selectedType === DataSourceType.Linear) {
        const baseUrl = document.getElementById('linearBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('linearAccessToken')?.value?.trim();

        if (!baseUrl || !accessToken) {
            showError('linear-parse-error', 'Please enter base URL and access token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Linear,
            name: 'Linear',
            baseUrl,
            accessToken
        };
        currentParsedData = [{
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

        displayLinearPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Jenkins, show info in preview and go to step 3
    if (selectedType === DataSourceType.Jenkins) {
        const baseUrl = document.getElementById('jenkinsBaseUrl')?.value?.trim();
        const username = document.getElementById('jenkinsUsername')?.value?.trim();
        const apiToken = document.getElementById('jenkinsApiToken')?.value?.trim();

        if (!baseUrl || !username || !apiToken) {
            showError('jenkins-parse-error', 'Please enter base URL, username, and API token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Jenkins,
            name: 'Jenkins',
            baseUrl,
            username,
            apiToken
        };
        currentParsedData = [{
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

        displayJenkinsPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Docker Hub, show info in preview and go to step 3
    if (selectedType === DataSourceType.DockerHub) {
        const baseUrl = document.getElementById('dockerhubBaseUrl')?.value?.trim();
        const accessToken = document.getElementById('dockerhubAccessToken')?.value?.trim();
        const namespace = document.getElementById('dockerhubNamespace')?.value?.trim();

        if (!baseUrl) {
            showError('dockerhub-parse-error', 'Please enter base URL');
            return;
        }

        currentDataSource = {
            type: DataSourceType.DockerHub,
            name: 'Docker Hub',
            baseUrl,
            accessToken,
            namespace
        };
        currentParsedData = [{
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

        displayDockerHubPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Jira, show info in preview and go to step 3
    if (selectedType === DataSourceType.Jira) {
        const jiraHost = document.getElementById('jiraHost')?.value?.trim();
        const jiraEmail = document.getElementById('jiraEmail')?.value?.trim();
        const jiraApiToken = document.getElementById('jiraApiToken')?.value?.trim();
        const jiraProjectKey = document.getElementById('jiraProjectKey')?.value?.trim();
        const jiraApiVersion = document.getElementById('jiraApiVersion')?.value || 'v2';

        if (!jiraHost || !jiraEmail || !jiraApiToken) {
            showError('jira-parse-error', 'Please enter Jira host, email, and API token');
            return;
        }

        // Store Jira config
        currentDataSource = {
            type: DataSourceType.Jira,
            name: 'Jira',
            apiVersion: jiraApiVersion,
            host: jiraHost,
            email: jiraEmail,
            apiToken: jiraApiToken,
            projectKey: jiraProjectKey
        };
        currentParsedData = [{
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
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📋 Jira config saved, showing preview info');

        // Display Jira preview
        displayJiraPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For Confluence, show info in preview and go to step 3
    if (selectedType === DataSourceType.Confluence) {
        const confluenceHost = document.getElementById('confluenceHost')?.value?.trim();
        const confluenceEmail = document.getElementById('confluenceEmail')?.value?.trim();
        const confluenceApiToken = document.getElementById('confluenceApiToken')?.value?.trim();
        const confluenceSpaceKey = document.getElementById('confluenceSpaceKey')?.value?.trim();

        if (!confluenceHost || !confluenceEmail || !confluenceApiToken) {
            showError('confluence-parse-error', 'Please enter Confluence host, email, and API token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Confluence,
            name: 'Confluence',
            host: confluenceHost,
            email: confluenceEmail,
            apiToken: confluenceApiToken,
            spaceKey: confluenceSpaceKey
        };
        currentParsedData = [{
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
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📚 Confluence config saved, showing preview info');

        displayConfluencePreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For FTP, show info in preview and go to step 3
    if (selectedType === DataSourceType.Ftp) {
        const ftpHost = document.getElementById('ftpHost')?.value?.trim();
        const ftpPort = document.getElementById('ftpPort')?.value?.trim() || '21';
        const ftpUsername = document.getElementById('ftpUsername')?.value?.trim();
        const ftpPassword = document.getElementById('ftpPassword')?.value?.trim();
        const ftpBasePath = document.getElementById('ftpBasePath')?.value?.trim() || '/';
        const ftpSecure = document.getElementById('ftpSecure')?.value === 'true';

        if (!ftpHost || !ftpUsername || !ftpPassword) {
            showError('ftp-parse-error', 'Please enter FTP host, username, and password');
            return;
        }

        // Store FTP config
        currentDataSource = {
            type: DataSourceType.Ftp,
            name: 'FTP',
            host: ftpHost,
            port: parseInt(ftpPort),
            username: ftpUsername,
            password: ftpPassword,
            basePath: ftpBasePath,
            secure: ftpSecure
        };
        currentParsedData = [{
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
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📁 FTP config saved, showing preview info');

        // Display FTP preview
        displayFtpPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For LocalFS, show info in preview and go to step 3
    if (selectedType === DataSourceType.LocalFS) {
        const localfsBasePath = document.getElementById('localfsBasePath')?.value?.trim();
        const localfsAllowWrite = document.getElementById('localfsAllowWrite')?.value === 'true';
        const localfsAllowDelete = document.getElementById('localfsAllowDelete')?.value === 'true';

        if (!localfsBasePath) {
            showError('localfs-parse-error', 'Please enter a base path');
            return;
        }

        // Store LocalFS config
        currentDataSource = {
            type: DataSourceType.LocalFS,
            name: 'LocalFS',
            basePath: localfsBasePath,
            allowWrite: localfsAllowWrite,
            allowDelete: localfsAllowDelete
        };

        // Calculate tool count based on permissions
        let toolCount = 4; // list_files, read_file, get_file_info, search_files (always available)
        if (localfsAllowWrite) toolCount += 4; // write_file, create_directory, rename, copy_file
        if (localfsAllowDelete) toolCount += 2; // delete_file, delete_directory

        currentParsedData = [{
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
                rowCount: toolCount,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📂 LocalFS config saved, showing preview info');

        // Display LocalFS preview
        displayLocalFSPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For Gmail, show info in preview and go to step 3
    if (selectedType === DataSourceType.Gmail) {
        const gmailMode = document.querySelector('input[name="gmailMode"]:checked')?.value || 'both';
        const gmailUsername = document.getElementById('gmailUsername')?.value?.trim();
        const gmailPassword = document.getElementById('gmailPassword')?.value?.trim();
        const gmailSecure = document.getElementById('gmailSecure')?.value === 'true';

        if (!gmailUsername || !gmailPassword) {
            showError('gmail-parse-error', 'Please enter username and password');
            return;
        }

        const readTools = [
            ['list_folders', 'List all email folders (INBOX, Sent, etc.)'],
            ['list_emails', 'List emails in a folder'],
            ['read_email', 'Read a specific email by UID'],
            ['search_emails', 'Search emails with criteria'],
            ['move_email', 'Move email to another folder'],
            ['delete_email', 'Delete an email'],
            ['mark_read', 'Mark email as read/unread']
        ];
        const writeTools = [
            ['send_email', 'Send a new email'],
            ['reply_email', 'Reply to an email'],
            ['forward_email', 'Forward an email']
        ];

        let toolRows = [];
        if (gmailMode === 'read') {
            toolRows = readTools;
        } else if (gmailMode === 'write') {
            toolRows = writeTools;
        } else {
            toolRows = [...readTools, ...writeTools];
        }

        currentDataSource = {
            type: DataSourceType.Gmail,
            name: 'Gmail',
            mode: gmailMode,
            imapHost: gmailMode !== 'write' ? 'imap.gmail.com' : null,
            imapPort: gmailMode !== 'write' ? 993 : null,
            smtpHost: gmailMode !== 'read' ? 'smtp.gmail.com' : null,
            smtpPort: gmailMode !== 'read' ? 587 : null,
            username: gmailUsername,
            password: gmailPassword,
            secure: gmailSecure
        };
        currentParsedData = [{
            tableName: 'email_tools',
            headers: ['tool', 'description'],
            rows: toolRows,
            metadata: {
                rowCount: toolRows.length,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📧 Gmail config saved, showing preview info, mode:', gmailMode);

        displayEmailPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Email, show info in preview and go to step 3
    if (selectedType === DataSourceType.Email) {
        const emailMode = document.querySelector('input[name="emailMode"]:checked')?.value || 'both';
        const emailImapHost = document.getElementById('emailImapHost')?.value?.trim();
        const emailImapPort = document.getElementById('emailImapPort')?.value?.trim() || '993';
        const emailSmtpHost = document.getElementById('emailSmtpHost')?.value?.trim();
        const emailSmtpPort = document.getElementById('emailSmtpPort')?.value?.trim() || '587';
        const emailUsername = document.getElementById('emailUsername')?.value?.trim();
        const emailPassword = document.getElementById('emailPassword')?.value?.trim();
        const emailSecure = document.getElementById('emailSecure')?.value === 'true';

        // Validate based on mode
        if (!emailUsername || !emailPassword) {
            showError('email-parse-error', 'Please enter username and password');
            return;
        }
        if ((emailMode === 'read' || emailMode === 'both') && !emailImapHost) {
            showError('email-parse-error', 'Please enter IMAP host for reading emails');
            return;
        }
        if ((emailMode === 'write' || emailMode === 'both') && !emailSmtpHost) {
            showError('email-parse-error', 'Please enter SMTP host for sending emails');
            return;
        }

        // Define tools based on mode
        const readTools = [
            ['list_folders', 'List all email folders (INBOX, Sent, etc.)'],
            ['list_emails', 'List emails in a folder'],
            ['read_email', 'Read a specific email by UID'],
            ['search_emails', 'Search emails with criteria'],
            ['move_email', 'Move email to another folder'],
            ['delete_email', 'Delete an email'],
            ['mark_read', 'Mark email as read/unread']
        ];
        const writeTools = [
            ['send_email', 'Send a new email'],
            ['reply_email', 'Reply to an email'],
            ['forward_email', 'Forward an email']
        ];

        let toolRows = [];
        if (emailMode === 'read') {
            toolRows = readTools;
        } else if (emailMode === 'write') {
            toolRows = writeTools;
        } else {
            toolRows = [...readTools, ...writeTools];
        }

        // Store Email config
        currentDataSource = {
            type: DataSourceType.Email,
            name: 'Email',
            mode: emailMode,
            imapHost: emailMode !== 'write' ? emailImapHost : null,
            imapPort: emailMode !== 'write' ? parseInt(emailImapPort) : null,
            smtpHost: emailMode !== 'read' ? emailSmtpHost : null,
            smtpPort: emailMode !== 'read' ? parseInt(emailSmtpPort) : null,
            username: emailUsername,
            password: emailPassword,
            secure: emailSecure
        };
        currentParsedData = [{
            tableName: 'email_tools',
            headers: ['tool', 'description'],
            rows: toolRows,
            metadata: {
                rowCount: toolRows.length,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📧 Email config saved, showing preview info, mode:', emailMode);

        // Display Email preview
        displayEmailPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For Slack, show info in preview and go to step 3
    if (selectedType === DataSourceType.Slack) {
        const slackBotToken = document.getElementById('slackBotToken')?.value?.trim();
        const slackDefaultChannel = document.getElementById('slackDefaultChannel')?.value?.trim();

        if (!slackBotToken) {
            showError('slack-parse-error', 'Please enter a Slack Bot Token');
            return;
        }

        // Store Slack config
        currentDataSource = {
            type: DataSourceType.Slack,
            name: 'Slack',
            botToken: slackBotToken,
            defaultChannel: slackDefaultChannel || ''
        };
        currentParsedData = [{
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
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('💬 Slack config saved, showing preview info');

        // Display Slack preview
        displaySlackPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For Discord, show info in preview and go to step 3
    if (selectedType === DataSourceType.Discord) {
        const discordBotToken = document.getElementById('discordBotToken')?.value?.trim();
        const discordDefaultGuildId = document.getElementById('discordDefaultGuildId')?.value?.trim();
        const discordDefaultChannelId = document.getElementById('discordDefaultChannelId')?.value?.trim();

        if (!discordBotToken) {
            showError('discord-parse-error', 'Please enter a Discord Bot Token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Discord,
            name: 'Discord',
            botToken: discordBotToken,
            defaultGuildId: discordDefaultGuildId || '',
            defaultChannelId: discordDefaultChannelId || ''
        };
        currentParsedData = [{
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
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('💬 Discord config saved, showing preview info');

        displayDiscordPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Docker, show info in preview and go to step 3
    if (selectedType === DataSourceType.Docker) {
        const dockerPath = document.getElementById('dockerPath')?.value?.trim();
        currentDataSource = {
            type: DataSourceType.Docker,
            name: 'Docker',
            dockerPath: dockerPath || 'docker'
        };
        currentParsedData = [{
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
            metadata: { rowCount: 11, columnCount: 2, dataTypes: { tool: 'string', description: 'string' } }
        }];

        displayDockerPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Kubernetes, show info in preview and go to step 3
    if (selectedType === DataSourceType.Kubernetes) {
        const kubectlPath = document.getElementById('kubectlPath')?.value?.trim();
        const kubeconfig = document.getElementById('kubeconfigPath')?.value?.trim();
        const namespace = document.getElementById('kubernetesNamespace')?.value?.trim();
        currentDataSource = {
            type: DataSourceType.Kubernetes,
            name: 'Kubernetes',
            kubectlPath: kubectlPath || 'kubectl',
            kubeconfig: kubeconfig || '',
            namespace: namespace || ''
        };
        currentParsedData = [{
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
            metadata: { rowCount: 9, columnCount: 2, dataTypes: { tool: 'string', description: 'string' } }
        }];

        displayKubernetesPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For OpenShift, show info in preview and go to step 3
    if (selectedType === DataSourceType.OpenShift) {
        const ocPath = document.getElementById('ocPath')?.value?.trim();
        const kubeconfig = document.getElementById('ocKubeconfigPath')?.value?.trim();
        const namespace = document.getElementById('openshiftNamespace')?.value?.trim();

        currentDataSource = {
            type: DataSourceType.OpenShift,
            name: 'OpenShift',
            ocPath: ocPath || 'oc',
            kubeconfig: kubeconfig || '',
            namespace: namespace || ''
        };
        currentParsedData = [{
            tableName: 'openshift_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_projects', 'List projects in the cluster'],
                ['get_current_project', 'Get current project'],
                ['list_pods', 'List pods in a project'],
                ['get_pod', 'Get a pod by name'],
                ['list_deployments', 'List deployments in a project'],
                ['scale_deployment', 'Scale a deployment to a replica count'],
                ['delete_pod', 'Delete a pod']
            ],
            metadata: { rowCount: 7, columnCount: 2, dataTypes: { tool: 'string', description: 'string' } }
        }];

        displayOpenShiftPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Elasticsearch, show info in preview and go to step 3
    if (selectedType === DataSourceType.Elasticsearch) {
        const baseUrl = document.getElementById('esBaseUrl')?.value?.trim();
        const index = document.getElementById('esIndex')?.value?.trim();
        const apiKey = document.getElementById('esApiKey')?.value?.trim();
        const username = document.getElementById('esUsername')?.value?.trim();
        const password = document.getElementById('esPassword')?.value?.trim();

        if (!baseUrl) {
            showError('elasticsearch-parse-error', 'Please enter Elasticsearch base URL');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Elasticsearch,
            name: 'Elasticsearch',
            baseUrl,
            index: index || '',
            apiKey: apiKey || '',
            username: username || '',
            password: password || ''
        };
        currentParsedData = [{
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
            metadata: { rowCount: 6, columnCount: 2, dataTypes: { tool: 'string', description: 'string' } }
        }];

        displayElasticsearchPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For OpenSearch, show info in preview and go to step 3
    if (selectedType === DataSourceType.OpenSearch) {
        const baseUrl = document.getElementById('opensearchBaseUrl')?.value?.trim();
        const index = document.getElementById('opensearchIndex')?.value?.trim();
        const apiKey = document.getElementById('opensearchApiKey')?.value?.trim();
        const username = document.getElementById('opensearchUsername')?.value?.trim();
        const password = document.getElementById('opensearchPassword')?.value?.trim();

        if (!baseUrl) {
            showError('opensearch-parse-error', 'Please enter OpenSearch base URL');
            return;
        }

        currentDataSource = {
            type: DataSourceType.OpenSearch,
            name: 'OpenSearch',
            baseUrl,
            index: index || '',
            apiKey: apiKey || '',
            username: username || '',
            password: password || ''
        };
        currentParsedData = [{
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
            metadata: { rowCount: 6, columnCount: 2, dataTypes: { tool: 'string', description: 'string' } }
        }];

        displayOpenSearchPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // If we already have parsed data, just go to step 3
    if (currentParsedData) {
        goToWizardStep(3);
        return;
    }

    const loading = document.getElementById('parse-loading');
    const errorDiv = document.getElementById('parse-error');
    const nextBtn = document.getElementById('next-to-step-3');

    loading?.classList.remove('hidden');
    errorDiv?.classList.add('hidden');
    if (nextBtn) nextBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('type', selectedType);

        if (selectedType === DataSourceType.CSV || selectedType === DataSourceType.Excel) {
            const fileInput = document.getElementById('fileInput');
            const csvExcelFilePathInput = document.getElementById('csvExcelFilePath');
            const selectedPath = csvExcelFilePathInput?.value?.trim();
            if (!fileInput?.files[0] && !selectedPath) {
                throw new Error('Please select a file or provide a file path');
            }
            if (fileInput?.files?.[0]) {
                formData.append('file', fileInput.files[0]);
            } else if (selectedPath) {
                formData.append('filePath', selectedPath);
            }
        } else if (usesDatabaseConnectionForm(selectedType)) {
            const connection = {
                type: selectedType,
                host: document.getElementById('dbHost')?.value,
                port: parseInt(document.getElementById('dbPort')?.value),
                database: document.getElementById('dbName')?.value,
                username: document.getElementById('dbUser')?.value,
                password: document.getElementById('dbPassword')?.value
            };
            if (selectedType === DataSourceType.Hazelcast) {
                connection.clusterName = connection.database;
            } else if (selectedType === DataSourceType.Kafka) {
                connection.topic = connection.database;
            }
            formData.append('connection', JSON.stringify(connection));
            formData.set('type', selectedType);
            // Güvenli olması için metin alanlarını da ekle (multer text fields)
            formData.append('dbType', connection.type || '');
            formData.append('dbHost', connection.host || '');
            formData.append('dbPort', String(connection.port || ''));
            formData.append('dbName', connection.database || '');
            formData.append('dbUser', connection.username || '');
            formData.append('dbPassword', connection.password || '');
        } else if (selectedType === DataSourceType.Rest) {
            const swaggerUrl = document.getElementById('swaggerUrl')?.value?.trim();
            if (!swaggerUrl) throw new Error('Please enter Swagger/OpenAPI URL');
            formData.append('swaggerUrl', swaggerUrl);
        } else if (selectedType === DataSourceType.Curl) {
            const curlUrl = document.getElementById('curlUrl')?.value?.trim();
            if (!curlUrl) throw new Error('Please enter a request URL');

            let headers, body;
            try {
                const headersRaw = document.getElementById('curlHeaders')?.value;
                if (headersRaw) headers = JSON.parse(headersRaw);
            } catch (e) {
                throw new Error('Headers field contains invalid JSON.');
            }
            try {
                const bodyRaw = document.getElementById('curlBody')?.value;
                if (bodyRaw) body = JSON.parse(bodyRaw);
            } catch (e) {
                throw new Error('Body field contains invalid JSON.');
            }

            const curlSetting = {
                url: curlUrl,
                method: document.getElementById('curlMethod')?.value,
                headers: headers,
                body: body,
            };
            formData.append('curlSetting', JSON.stringify(curlSetting));
        }

        const response = await fetch('/api/parse', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            currentParsedData = result.data.parsedData;
            currentDataSource = result.data.dataSource;
            if (currentDataSource.type === DataSourceType.Curl) {
                displayCurlPreview(currentDataSource.curlSetting);
            } else if (currentDataSource.type === DataSourceType.GitHub) {
                displayGitHubPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.X) {
                displayXPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Prometheus) {
                displayPrometheusPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Grafana) {
                displayGrafanaPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.MongoDB) {
                displayMongoDBPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Facebook) {
                displayFacebookPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Instagram) {
                displayInstagramPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.TikTok) {
                displayTikTokPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Notion) {
                displayNotionPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Telegram) {
                displayTelegramPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.LinkedIn) {
                displayLinkedInPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Reddit) {
                displayRedditPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.YouTube) {
                displayYouTubePreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.WhatsAppBusiness) {
                displayWhatsAppBusinessPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Threads) {
                displayThreadsPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Spotify) {
                displaySpotifyPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Sonos) {
                displaySonosPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Shazam) {
                displayShazamPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.PhilipsHue) {
                displayPhilipsHuePreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.EightSleep) {
                displayEightSleepPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.HomeAssistant) {
                displayHomeAssistantPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.AppleNotes) {
                displayAppleNotesPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.AppleReminders) {
                displayAppleRemindersPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Things3) {
                displayThings3Preview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Obsidian) {
                displayObsidianPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.BearNotes) {
                displayBearNotesPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.IMessage) {
                displayIMessagePreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Zoom) {
                displayZoomPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.MicrosoftTeams) {
                displayMicrosoftTeamsPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Signal) {
                displaySignalPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.OpenAI) {
                displayOpenAIPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Claude) {
                displayClaudePreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Gemini) {
                displayGeminiPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Grok) {
                displayGrokPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.FalAI) {
                displayFalAIPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.HuggingFace) {
                displayHuggingFacePreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Llama) {
                displayLlamaPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.DeepSeek) {
                displayDeepSeekPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.AzureOpenAI) {
                displayAzureOpenAIPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Mistral) {
                displayMistralPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Cohere) {
                displayCoherePreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Perplexity) {
                displayPerplexityPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Together) {
                displayTogetherPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Fireworks) {
                displayFireworksPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Groq) {
                displayGroqPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.OpenRouter) {
                displayOpenRouterPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Dropbox) {
                displayDropboxPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.N8n) {
                displayN8nPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Supabase) {
                displaySupabasePreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Npm) {
                displayNpmPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Nuget) {
                displayNugetPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Maven) {
                displayMavenPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Gradle) {
                displayGradlePreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Nexus) {
                displayNexusPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Trello) {
                displayTrelloPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.GitLab) {
                displayGitLabPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Bitbucket) {
                displayBitbucketPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.GDrive) {
                displayGDrivePreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.GoogleCalendar) {
                displayGoogleCalendarPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.GoogleDocs) {
                displayGoogleDocsPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.GoogleSheets) {
                displayGoogleSheetsPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Airtable) {
                displayAirtablePreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Asana) {
                displayAsanaPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Monday) {
                displayMondayPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.ClickUp) {
                displayClickUpPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Linear) {
                displayLinearPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Jenkins) {
                displayJenkinsPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.DockerHub) {
                displayDockerHubPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Jira) {
                displayJiraPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Ftp) {
                displayFtpPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.LocalFS) {
                displayLocalFSPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Webpage) {
                displayWebpagePreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.GraphQL) {
                displayGraphQLPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Soap) {
                displaySoapPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Rss) {
                displayRssPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.OpenShift) {
                displayOpenShiftPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Elasticsearch) {
                displayElasticsearchPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.OpenSearch) {
                displayOpenSearchPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Redis) {
                displayRedisPreview(currentParsedData);
            } else if (currentDataSource.type === DataSourceType.Hazelcast) {
                displayHazelcastPreview(currentParsedData);
            } else {
                displayDataPreview(result.data.parsedData);
            }

            // Go to step 3 after successful parse
            goToWizardStep(3);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        const selectedTypeOnError = document.querySelector('input[name="dataSourceType"]:checked')?.value;
        if (selectedTypeOnError === DataSourceType.Rest) {
            showError('rest-parse-error', error.message);
        } else {
            showError('parse-error', error.message);
        }
    } finally {
        loading?.classList.add('hidden');
        if (nextBtn) nextBtn.disabled = false;
    }
}

// Wizard Navigation Functions
function goToWizardStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.add('hidden');
    });

    // Show target step
    const targetStep = document.getElementById(`wizard-step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.remove('hidden');
    }

    // Show/hide webpage info box in step 3
    if (stepNumber === 3) {
        const webpageInfoBox = document.getElementById('webpage-info-box');
        if (webpageInfoBox) {
            if (currentDataSource?.type === DataSourceType.Webpage) {
                webpageInfoBox.classList.remove('hidden');
            } else {
                webpageInfoBox.classList.add('hidden');
            }
        }
    }

    // Update progress indicators
    updateWizardProgress(stepNumber);

    currentWizardStep = stepNumber;

    // Enable/disable navigation based on step and data state
    updateWizardNavigation();
}

function updateWizardProgress(activeStep) {
    // Reset all step indicators
    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById(`step-${i}-indicator`);
        const stepText = indicator?.parentElement.nextElementSibling.querySelector('p');

        if (i < activeStep) {
            // Completed step
            indicator?.classList.remove('bg-gray-300', 'text-gray-600', 'bg-blue-500', 'bg-slate-100', 'text-slate-400');
            indicator?.classList.add('bg-green-500', 'text-white');
            stepText?.classList.remove('text-gray-500', 'text-blue-600', 'text-slate-400');
            stepText?.classList.add('text-green-600');
        } else if (i === activeStep) {
            // Current step
            indicator?.classList.remove('bg-gray-300', 'text-gray-600', 'bg-green-500', 'bg-slate-100', 'text-slate-400');
            indicator?.classList.add('bg-blue-500', 'text-white');
            stepText?.classList.remove('text-gray-500', 'text-green-600', 'text-slate-400');
            stepText?.classList.add('text-blue-600');
        } else {
            // Future step
            indicator?.classList.remove('bg-blue-500', 'bg-green-500', 'text-white');
            indicator?.classList.add('bg-slate-100', 'text-slate-400');
            stepText?.classList.remove('text-blue-600', 'text-green-600');
            stepText?.classList.add('text-slate-400');
        }
    }

    // Update progress bars
    const progress12 = document.getElementById('progress-1-2');
    const progress23 = document.getElementById('progress-2-3');
    const progress34 = document.getElementById('progress-3-4');

    if (activeStep >= 2) {
        progress12?.classList.remove('bg-gray-200');
        progress12?.classList.add('bg-green-500');
    } else {
        progress12?.classList.remove('bg-green-500');
        progress12?.classList.add('bg-gray-200');
    }

    if (activeStep >= 3) {
        progress23?.classList.remove('bg-gray-200');
        progress23?.classList.add('bg-green-500');
    } else {
        progress23?.classList.remove('bg-green-500');
        progress23?.classList.add('bg-gray-200');
    }

    if (activeStep >= 4) {
        progress34?.classList.remove('bg-gray-200');
        progress34?.classList.add('bg-green-500');
    } else {
        progress34?.classList.remove('bg-green-500');
        progress34?.classList.add('bg-gray-200');
    }
}

// Utility functions


const N8N_TOOL_CATALOG = [
    { name: 'list_users', description: 'Retrieve all users', category: 'admin', defaultEnabled: false },
    { name: 'create_users', description: 'Create multiple users', category: 'admin', defaultEnabled: false },
    { name: 'get_user', description: 'Get user by ID/Email', category: 'admin', defaultEnabled: false },
    { name: 'delete_user', description: 'Delete a user', category: 'admin', defaultEnabled: false },
    { name: 'change_user_role', description: "Change a user's global role", category: 'admin', defaultEnabled: false },
    { name: 'generate_audit', description: 'Generate an audit', category: 'admin', defaultEnabled: false },

    { name: 'list_executions', description: 'Retrieve all executions', category: 'core', defaultEnabled: true },
    { name: 'get_execution', description: 'Retrieve an execution', category: 'core', defaultEnabled: true },
    { name: 'delete_execution', description: 'Delete an execution', category: 'admin', defaultEnabled: false },
    { name: 'retry_execution', description: 'Retry an execution', category: 'builder', defaultEnabled: false },
    { name: 'stop_execution', description: 'Stop an execution', category: 'builder', defaultEnabled: false },
    { name: 'stop_multiple_executions', description: 'Stop multiple executions', category: 'builder', defaultEnabled: false },
    { name: 'get_execution_tags', description: 'Get execution tags', category: 'core', defaultEnabled: true },
    { name: 'update_execution_tags', description: 'Update tags of an execution', category: 'builder', defaultEnabled: false },

    { name: 'create_workflow', description: 'Create a workflow', category: 'builder', defaultEnabled: false },
    { name: 'list_workflows', description: 'Retrieve all workflows', category: 'core', defaultEnabled: true },
    { name: 'get_workflow', description: 'Retrieve a workflow', category: 'core', defaultEnabled: true },
    { name: 'delete_workflow', description: 'Delete a workflow', category: 'admin', defaultEnabled: false },
    { name: 'update_workflow', description: 'Update a workflow', category: 'builder', defaultEnabled: false },
    { name: 'get_workflow_version', description: 'Retrieve a specific workflow version', category: 'core', defaultEnabled: false },
    { name: 'activate_workflow', description: 'Publish a workflow', category: 'builder', defaultEnabled: false },
    { name: 'deactivate_workflow', description: 'Deactivate a workflow', category: 'builder', defaultEnabled: false },
    { name: 'transfer_workflow', description: 'Transfer a workflow to another project', category: 'admin', defaultEnabled: false },
    { name: 'get_workflow_tags', description: 'Get workflow tags', category: 'core', defaultEnabled: true },
    { name: 'update_workflow_tags', description: 'Update tags of a workflow', category: 'builder', defaultEnabled: false },

    { name: 'list_credentials', description: 'List credentials', category: 'admin', defaultEnabled: false },
    { name: 'create_credential', description: 'Create a credential', category: 'admin', defaultEnabled: false },
    { name: 'update_credential', description: 'Update credential by ID', category: 'admin', defaultEnabled: false },
    { name: 'delete_credential', description: 'Delete credential by ID', category: 'admin', defaultEnabled: false },
    { name: 'get_credential_schema', description: 'Show credential data schema', category: 'admin', defaultEnabled: false },
    { name: 'transfer_credential', description: 'Transfer credential to another project', category: 'admin', defaultEnabled: false },

    { name: 'create_tag', description: 'Create a tag', category: 'builder', defaultEnabled: false },
    { name: 'list_tags', description: 'Retrieve all tags', category: 'core', defaultEnabled: true },
    { name: 'get_tag', description: 'Retrieve a tag', category: 'core', defaultEnabled: false },
    { name: 'delete_tag', description: 'Delete a tag', category: 'admin', defaultEnabled: false },
    { name: 'update_tag', description: 'Update a tag', category: 'builder', defaultEnabled: false },

    { name: 'source_control_pull', description: 'Pull changes from source control', category: 'admin', defaultEnabled: false },

    { name: 'create_variable', description: 'Create a variable', category: 'builder', defaultEnabled: false },
    { name: 'list_variables', description: 'Retrieve variables', category: 'core', defaultEnabled: true },
    { name: 'delete_variable', description: 'Delete a variable', category: 'admin', defaultEnabled: false },
    { name: 'update_variable', description: 'Update a variable', category: 'builder', defaultEnabled: false },

    { name: 'list_data_tables', description: 'List all data tables', category: 'core', defaultEnabled: true },
    { name: 'create_data_table', description: 'Create a data table', category: 'builder', defaultEnabled: false },
    { name: 'get_data_table', description: 'Get a data table', category: 'core', defaultEnabled: true },
    { name: 'update_data_table', description: 'Update a data table', category: 'builder', defaultEnabled: false },
    { name: 'delete_data_table', description: 'Delete a data table', category: 'admin', defaultEnabled: false },
    { name: 'list_data_table_rows', description: 'Retrieve rows from a data table', category: 'core', defaultEnabled: true },
    { name: 'insert_data_table_rows', description: 'Insert rows into a data table', category: 'builder', defaultEnabled: false },
    { name: 'update_data_table_rows', description: 'Update rows in a data table', category: 'builder', defaultEnabled: false },
    { name: 'upsert_data_table_rows', description: 'Upsert rows in a data table', category: 'builder', defaultEnabled: false },
    { name: 'delete_data_table_rows', description: 'Delete rows from a data table', category: 'admin', defaultEnabled: false },

    { name: 'create_project', description: 'Create a project', category: 'admin', defaultEnabled: false },
    { name: 'list_projects', description: 'Retrieve projects', category: 'core', defaultEnabled: true },
    { name: 'delete_project', description: 'Delete a project', category: 'admin', defaultEnabled: false },
    { name: 'update_project', description: 'Update a project', category: 'admin', defaultEnabled: false },
    { name: 'list_project_users', description: 'List project members', category: 'core', defaultEnabled: false },
    { name: 'add_project_users', description: 'Add users to a project', category: 'admin', defaultEnabled: false },
    { name: 'delete_project_user', description: 'Delete a user from a project', category: 'admin', defaultEnabled: false },
    { name: 'update_project_user_role', description: "Change a user's role in a project", category: 'admin', defaultEnabled: false }
];

let n8nSelectedTools = new Set(N8N_TOOL_CATALOG.filter((tool) => tool.defaultEnabled).map((tool) => tool.name));

function getSelectedN8nToolNames() {
    return Array.from(n8nSelectedTools);
}

function getSelectedN8nTools() {
    const selected = n8nSelectedTools;
    return N8N_TOOL_CATALOG.filter((tool) => selected.has(tool.name));
}

function syncN8nCategoryToggles() {
    const categories = ['core', 'builder', 'admin'];
    categories.forEach((category) => {
        const toggle = document.getElementById(`n8n-toggle-${category}`);
        if (!toggle) return;
        const categoryTools = N8N_TOOL_CATALOG.filter((tool) => tool.category === category);
        if (categoryTools.length === 0) {
            toggle.checked = false;
            toggle.indeterminate = false;
            return;
        }
        const selectedCount = categoryTools.filter((tool) => n8nSelectedTools.has(tool.name)).length;
        toggle.checked = selectedCount === categoryTools.length;
        toggle.indeterminate = selectedCount > 0 && selectedCount < categoryTools.length;
    });
}

function updateN8nToolsCountLabel() {
    const label = document.getElementById('n8n-tools-count-label');
    if (!label) return;
    label.textContent = `${n8nSelectedTools.size} tools`;
}

function renderN8nToolSelector() {
    const container = document.getElementById('n8n-tool-list');
    if (!container) return;

    container.innerHTML = N8N_TOOL_CATALOG.map((tool) => `
        <label class="flex items-start gap-3 rounded-md p-2 hover:bg-white transition-colors border border-transparent hover:border-slate-200">
            <input type="checkbox" class="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-n8n-tool-name="${tool.name}" ${n8nSelectedTools.has(tool.name) ? 'checked' : ''}>
            <div class="min-w-0">
                <div class="flex items-center gap-2">
                    <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">${tool.name}</code>
                    <span class="text-[10px] uppercase tracking-wide font-semibold ${tool.category === 'core' ? 'text-emerald-600' : tool.category === 'builder' ? 'text-blue-600' : 'text-amber-600'}">${tool.category}</span>
                </div>
                <p class="text-xs text-slate-500 mt-1">${tool.description}</p>
            </div>
        </label>
    `).join('');

    container.querySelectorAll('input[data-n8n-tool-name]').forEach((checkbox) => {
        if (checkbox.dataset.listenerAttached === 'true') return;
        checkbox.addEventListener('change', () => {
            const toolName = checkbox.getAttribute('data-n8n-tool-name');
            if (!toolName) return;
            if (checkbox.checked) n8nSelectedTools.add(toolName);
            else n8nSelectedTools.delete(toolName);
            syncN8nCategoryToggles();
            updateN8nToolsCountLabel();
            updateWizardNavigation();
        });
        checkbox.dataset.listenerAttached = 'true';
    });

    syncN8nCategoryToggles();
    updateN8nToolsCountLabel();
}

function applyN8nCategorySelection(category, enabled) {
    N8N_TOOL_CATALOG
        .filter((tool) => tool.category === category)
        .forEach((tool) => {
            if (enabled) n8nSelectedTools.add(tool.name);
            else n8nSelectedTools.delete(tool.name);
        });
    renderN8nToolSelector();
    updateWizardNavigation();
}

function initializeN8nToolSelector(resetSelection = false) {
    if (resetSelection) {
        n8nSelectedTools = new Set(
            N8N_TOOL_CATALOG
                .filter((tool) => tool.defaultEnabled)
                .map((tool) => tool.name)
        );
    }
    ['core', 'builder', 'admin'].forEach((category) => {
        const toggle = document.getElementById(`n8n-toggle-${category}`);
        if (!toggle || toggle.dataset.listenerAttached === 'true') return;
        toggle.addEventListener('change', () => applyN8nCategorySelection(category, toggle.checked));
        toggle.dataset.listenerAttached = 'true';
    });
    renderN8nToolSelector();
}



function parseCurlCommand(curlCommand) {
    const result = {
        url: '',
        method: 'GET',
        headers: {},
        body: {}
    };

    try {
        // Remove line breaks and extra spaces
        let cmd = curlCommand.replace(/\\\s*\n/g, ' ').replace(/\s+/g, ' ').trim();

        console.log('🔍 parseCurlCommand - original:', curlCommand);
        console.log('🔍 parseCurlCommand - cleaned:', cmd);

        // Remove 'curl' from beginning
        cmd = cmd.replace(/^curl\s+/, '');

        // Extract method (-X or --request) FIRST
        const methodMatch = cmd.match(/(?:-X|--request)\s+([A-Z]+)/i);
        if (methodMatch) {
            result.method = methodMatch[1].toUpperCase();
            // Remove method from command
            cmd = cmd.replace(methodMatch[0], '').trim();
            console.log('🔍 parseCurlCommand - method found:', result.method);
            console.log('🔍 parseCurlCommand - after method removal:', cmd);
        }

        // Extract URL (look for quoted string first, then any URL pattern)
        const quotedUrlMatch = cmd.match(/["']([^"']+)["']/);
        if (quotedUrlMatch) {
            result.url = quotedUrlMatch[1];
            cmd = cmd.replace(quotedUrlMatch[0], '').trim();
            console.log('🔍 parseCurlCommand - quoted URL found:', result.url);
        } else {
            // Try to find URL pattern (starts with http:// or https://)
            const urlPatternMatch = cmd.match(/(https?:\/\/[^\s]+)/);
            if (urlPatternMatch) {
                result.url = urlPatternMatch[1];
                cmd = cmd.replace(urlPatternMatch[0], '').trim();
                console.log('🔍 parseCurlCommand - URL pattern found:', result.url);
            }
        }

        // Extract headers (-H or --header)
        const headerRegex = /(?:-H|--header)\s+["']([^"']+)["']/g;
        let headerMatch;
        while ((headerMatch = headerRegex.exec(cmd)) !== null) {
            const headerStr = headerMatch[1];
            const colonIndex = headerStr.indexOf(':');
            if (colonIndex > 0) {
                const key = headerStr.substring(0, colonIndex).trim();
                const value = headerStr.substring(colonIndex + 1).trim();
                result.headers[key] = value;
            }
        }

        // Extract body (-d or --data)
        const bodyMatch = cmd.match(/(?:-d|--data|--data-raw)\s+["']([^"']+)["']/);
        if (bodyMatch) {
            try {
                result.body = JSON.parse(bodyMatch[1]);
            } catch (e) {
                // If not JSON, treat as form data
                console.warn('Body is not JSON, treating as raw string');
            }
        }

        return result;
    } catch (error) {
        logger.error('Failed to parse curl command:', error);
        throw new Error('Failed to parse curl command. Please check the format.');
    }
}

// Sidebar functions


function setupFileUpload() {
    const fileUpload = document.getElementById('fileUpload');
    const fileInput = document.getElementById('fileInput');
    const csvExcelFilePathInput = document.getElementById('csvExcelFilePath');

    if (!fileUpload || !fileInput) return;

    fileUpload.addEventListener('click', () => fileInput.click());

    fileUpload.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUpload.classList.add('border-blue-400', 'bg-blue-50');
    });

    fileUpload.addEventListener('dragleave', () => {
        fileUpload.classList.remove('border-blue-400', 'bg-blue-50');
    });

    fileUpload.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUpload.classList.remove('border-blue-400', 'bg-blue-50');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            updateFileUploadDisplay(files[0].name);
            if (csvExcelFilePathInput) csvExcelFilePathInput.value = files[0].name;
            updateWizardNavigation();
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            updateFileUploadDisplay(e.target.files[0].name);
            if (csvExcelFilePathInput) csvExcelFilePathInput.value = e.target.files[0].name;
            updateWizardNavigation();
        }
    });

    if (csvExcelFilePathInput && !csvExcelFilePathInput.dataset.listenerAttached) {
        csvExcelFilePathInput.addEventListener('input', updateWizardNavigation);
        csvExcelFilePathInput.dataset.listenerAttached = 'true';
    }
}

function updateFileUploadDisplay(fileName) {
    const fileUpload = document.getElementById('fileUpload');
    if (!fileUpload) return;

    fileUpload.dataset.selectedFile = fileName;
    fileUpload.classList.remove('border-slate-300');
    fileUpload.classList.add('border-emerald-400', 'bg-emerald-50/30');

    const icon = fileUpload.querySelector('i');
    if (icon) {
        icon.classList.remove('fa-cloud-upload-alt', 'text-slate-400');
        icon.classList.add('fa-check', 'text-emerald-600');
    }

    const iconWrap = icon?.closest('div');
    if (iconWrap) {
        iconWrap.classList.remove('bg-slate-100', 'text-slate-400');
        iconWrap.classList.add('bg-emerald-100');
    }

    const titleEl = fileUpload.querySelector('h4');
    if (titleEl) titleEl.textContent = 'File Selected';

    const subtitleEl = fileUpload.querySelector('p');
    if (subtitleEl) subtitleEl.textContent = fileName;

    let resetBtn = fileUpload.querySelector('[data-role="file-upload-reset"]');
    if (!resetBtn) {
        resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.setAttribute('data-role', 'file-upload-reset');
        resetBtn.className = 'mt-3 text-xs text-blue-500 hover:text-blue-600';
        resetBtn.textContent = 'Choose different file';
        resetBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            resetFileUpload();
        });
        fileUpload.appendChild(resetBtn);
    }
}

function resetFileUpload() {
    const fileUpload = document.getElementById('fileUpload');
    const fileInput = document.getElementById('fileInput');
    const csvExcelFilePathInput = document.getElementById('csvExcelFilePath');

    if (fileInput) fileInput.value = '';
    if (csvExcelFilePathInput) csvExcelFilePathInput.value = '';

    if (fileUpload) {
        delete fileUpload.dataset.selectedFile;
        fileUpload.classList.remove('border-emerald-400', 'bg-emerald-50/30');
        fileUpload.classList.add('border-slate-300');

        const icon = fileUpload.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-check', 'text-emerald-600');
            icon.classList.add('fa-cloud-upload-alt', 'text-slate-400');
        }

        const iconWrap = icon?.closest('div');
        if (iconWrap) {
            iconWrap.classList.remove('bg-emerald-100');
            iconWrap.classList.add('bg-slate-100', 'text-slate-400');
        }

        const titleEl = fileUpload.querySelector('h4');
        if (titleEl) titleEl.textContent = 'Click or Drag file here';

        const subtitleEl = fileUpload.querySelector('p');
        if (subtitleEl) subtitleEl.textContent = 'Supports .csv and .xlsx files up to 10MB';

        const resetBtn = fileUpload.querySelector('[data-role="file-upload-reset"]');
        resetBtn?.remove();
    }

    updateWizardNavigation();
}


// Setup filter buttons for data source templates (All, Files, Database, API)
function setupTemplateFilters() {
    const bar = document.getElementById('dataSourceFilterBar');
    if (!bar) return;

    const buttons = bar.querySelectorAll('.template-filter');
    const cards = document.querySelectorAll('[data-role="data-source-card"]');
    const searchInput = document.getElementById('dataSourceSearch');
    let currentFilter = 'all';
    let currentQuery = '';

    const setActive = (activeBtn) => {
        buttons.forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
            btn.classList.add('bg-white', 'text-slate-600', 'border-slate-200');
        });
        activeBtn.classList.remove('bg-white', 'text-slate-600', 'border-slate-200');
        activeBtn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
    };

    const matchesQuery = (card, query) => {
        if (!query) return true;
        const text = (card.innerText || '').toLowerCase();
        return text.includes(query);
    };

    const applyFilter = (filter, query = currentQuery) => {
        currentFilter = filter;
        currentQuery = query;
        cards.forEach(card => {
            const cat = card.getAttribute('data-category') || '';
            const categories = cat.split(/\s+/).filter(Boolean);
            const matchesFilter = filter === 'all' || categories.includes(filter);
            const visible = matchesFilter && matchesQuery(card, currentQuery);
            card.classList.toggle('hidden', !visible);
        });
    };

    buttons.forEach(btn => {
        if (btn.dataset.listenerAttached) return;
        btn.addEventListener('click', () => {
            setActive(btn);
            applyFilter(btn.getAttribute('data-filter'), currentQuery);
        });
        btn.dataset.listenerAttached = 'true';
    });

    if (searchInput && !searchInput.dataset.listenerAttached) {
        searchInput.addEventListener('input', () => {
            const q = (searchInput.value || '').trim().toLowerCase();
            applyFilter(currentFilter, q);
        });
        searchInput.dataset.listenerAttached = 'true';
    }

    // Initialize default state
    const selected = document.querySelector('input[name="dataSourceType"]:checked');
    const selectedCard = selected ? selected.closest('[data-role="data-source-card"]') : null;
    const defaultFilter = selectedCard?.getAttribute('data-category') || 'all';
    const defaultBtn = bar.querySelector(`[data-filter="${defaultFilter}"]`) || bar.querySelector('[data-filter="all"]');
    if (defaultBtn) setActive(defaultBtn);
    applyFilter(defaultFilter, '');
}

function setupDataSourceCardSelectionUx() {
    const cards = document.querySelectorAll('[data-role="data-source-card"]');
    cards.forEach((card) => {
        const surface = card.querySelector('div');
        if (!surface) return;

        surface.classList.add('relative');
        if (!surface.querySelector('[data-role="template-selected-badge"]')) {
            const badge = document.createElement('span');
            badge.setAttribute('data-role', 'template-selected-badge');
            badge.className = 'hidden absolute top-3 right-3 h-8 px-2 rounded-full bg-emerald-500 text-white shadow-md items-center justify-center gap-1';
            badge.innerHTML = '<i class="fas fa-check text-xs"></i><button type="button" class="template-go-next inline-flex items-center justify-center h-5 w-5 rounded-full bg-white/20 hover:bg-white/30" title="Go to next step"><i class="fas fa-arrow-right text-[10px]"></i></button>';
            surface.appendChild(badge);
        }

        if (card.dataset.nextStepBound !== 'true') {
            const goBtn = surface.querySelector('.template-go-next');
            if (goBtn) {
                goBtn.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const radio = card.querySelector('input[name="dataSourceType"]');
                    if (!(radio instanceof HTMLInputElement) || !radio.checked) return;
                    if (currentWizardStep === 1) {
                        goToWizardStep(2);
                    }
                });
            }
            card.dataset.nextStepBound = 'true';
        }
    });

    syncDataSourceCardSelectionState();
}

function isOnPremOnlySource(type) {
    return ON_PREM_ONLY_SOURCE_TYPES.has(String(type || '').trim().toLowerCase());
}

async function getAuthConfigOnce() {
    if (authConfigCache) return authConfigCache;
    if (authConfigPromise) return authConfigPromise;
    const cacheApi = window.QuickMCPClientCache;

    authConfigPromise = (async () => {
        try {
            if (cacheApi && typeof cacheApi.getOrFetchAuthConfig === 'function') {
                const data = await cacheApi.getOrFetchAuthConfig(async () => {
                    const response = await fetch('/api/auth/config');
                    if (!response.ok) return null;
                    const payload = await response.json().catch(() => ({}));
                    const next = payload?.data;
                    return next && typeof next === 'object' ? next : null;
                });
                authConfigCache = data || {};
            } else {
                const response = await fetch('/api/auth/config');
                const payload = await response.json();
                authConfigCache = payload?.data || {};
            }
        } catch {
            authConfigCache = {};
        } finally {
            authConfigPromise = null;
        }
        return authConfigCache;
    })();

    return authConfigPromise;
}

function applyOnPremSourceTypeConfig(configData, isSaasMode) {
    const restrictedTypes = Array.isArray(configData?.dataSourceCapabilities)
        ? configData.dataSourceCapabilities
            .filter((item) => item?.onlyOnPrem === true)
            .map((item) => String(item?.type || '').trim().toLowerCase())
            .filter((type) => type.length > 0)
        : [];

    ON_PREM_ONLY_SOURCE_TYPES.clear();
    if (restrictedTypes.length > 0) {
        for (const type of restrictedTypes) ON_PREM_ONLY_SOURCE_TYPES.add(type);
    }
}

async function applySaasDataSourceRestrictions() {
    const configData = await getAuthConfigOnce();
    const deployMode = String(configData?.deployMode || '').trim().toUpperCase();
    isSaasDeployMode = configData?.isSaasMode === true || deployMode === 'SAAS';
    applyOnPremSourceTypeConfig(configData, isSaasDeployMode);

    const radios = document.querySelectorAll('input[name="dataSourceType"]');
    for (const radio of radios) {
        if (!(radio instanceof HTMLInputElement)) continue;
        const type = String(radio.value || '').trim().toLowerCase();
        const isRestricted = isSaasDeployMode && isOnPremOnlySource(type);
        const card = radio.closest('[data-role="data-source-card"]');
        const surface = card?.querySelector('div');
        if (!surface) continue;

        let badge = surface.querySelector('[data-role="onprem-badge"]');

        if (isRestricted) {
            radio.disabled = true;
            if (radio.checked) radio.checked = false;
            card?.classList.remove('cursor-pointer');
            card?.classList.add('cursor-not-allowed');
            surface.classList.add('opacity-70', 'grayscale-[0.2]', 'overflow-hidden');

            if (!badge) {
                badge = document.createElement('span');
                badge.setAttribute('data-role', 'onprem-badge');
                badge.className = 'absolute top-3 -right-6 z-20 w-24 py-[2px] text-center text-[8px] font-semibold uppercase tracking-[0.12em] bg-slate-900/90 text-white shadow-sm pointer-events-none';
                badge.style.transform = 'rotate(45deg)';
                badge.innerHTML = 'ON-PREM';
                surface.appendChild(badge);
            }
        } else {
            radio.disabled = false;
            card?.classList.remove('cursor-not-allowed');
            card?.classList.add('cursor-pointer');
            surface.classList.remove('opacity-70', 'grayscale-[0.2]', 'overflow-hidden');
            badge?.remove();
        }
    }

    syncDataSourceCardSelectionState();
    toggleDataSourceFields();
    updateWizardNavigation();
}

function syncDataSourceCardSelectionState() {
    const cards = document.querySelectorAll('[data-role="data-source-card"]');
    cards.forEach((card) => {
        const radio = card.querySelector('input[name="dataSourceType"]');
        const surface = card.querySelector('div');
        const badge = surface?.querySelector('[data-role="template-selected-badge"]');
        const selected = radio instanceof HTMLInputElement && radio.checked;
        if (!badge) return;
        badge.classList.toggle('hidden', !selected);
        badge.classList.toggle('inline-flex', selected);
    });
}

function isConnectionTemplateSource(type) {
    return type === DataSourceType.Redis
        || type === DataSourceType.Hazelcast
        || type === DataSourceType.Kafka;
}

function usesDatabaseConnectionForm(type) {
    return isDatabase(type) || isConnectionTemplateSource(type);
}

function configureDatabaseConnectionForm(selectedType) {
    const hint = document.getElementById('db-connection-hint');
    const dbHostLabel = document.getElementById('dbHostLabel');
    const dbPortLabel = document.getElementById('dbPortLabel');
    const dbNameLabel = document.getElementById('dbNameLabel');
    const dbUserLabel = document.getElementById('dbUserLabel');
    const dbPasswordLabel = document.getElementById('dbPasswordLabel');
    const dbHost = document.getElementById('dbHost');
    const dbPort = document.getElementById('dbPort');
    const dbName = document.getElementById('dbName');
    const dbUser = document.getElementById('dbUser');
    const dbPassword = document.getElementById('dbPassword');

    if (!dbHostLabel || !dbPortLabel || !dbNameLabel || !dbUserLabel || !dbPasswordLabel || !dbHost || !dbPort || !dbName || !dbUser || !dbPassword) {
        return;
    }

    dbHostLabel.textContent = 'Host';
    dbPortLabel.textContent = 'Port';
    dbNameLabel.textContent = 'Database Name';
    dbUserLabel.textContent = 'Username';
    dbPasswordLabel.textContent = 'Password';
    dbHost.placeholder = 'localhost';
    dbName.placeholder = 'my_database';
    dbUser.placeholder = 'root';
    dbPassword.placeholder = '••••••••';
    if (hint) hint.textContent = '';

    if (selectedType === DataSourceType.Redis) {
        dbNameLabel.textContent = 'DB Index (Optional)';
        dbUserLabel.textContent = 'Username (Optional)';
        dbPasswordLabel.textContent = 'Password (Optional)';
        dbName.placeholder = '0';
        dbUser.placeholder = 'default';
        if (hint) hint.textContent = 'Redis uses host/port and optional DB index + auth.';
        return;
    }

    if (selectedType === DataSourceType.Hazelcast) {
        dbHostLabel.textContent = 'Member Host';
        dbPortLabel.textContent = 'Member Port';
        dbNameLabel.textContent = 'Cluster Name (Optional)';
        dbUserLabel.textContent = 'Username (Optional)';
        dbPasswordLabel.textContent = 'Password (Optional)';
        dbName.placeholder = 'dev';
        dbUser.placeholder = 'username';
        if (hint) hint.textContent = 'Hazelcast uses member host/port and optional cluster/auth fields.';
        return;
    }

    if (selectedType === DataSourceType.Kafka) {
        dbHostLabel.textContent = 'Bootstrap Host';
        dbPortLabel.textContent = 'Bootstrap Port';
        dbNameLabel.textContent = 'Topic (Optional)';
        dbUserLabel.textContent = 'SASL Username (Optional)';
        dbPasswordLabel.textContent = 'SASL Password (Optional)';
        dbName.placeholder = 'events.topic';
        dbUser.placeholder = 'sasl_user';
        if (hint) hint.textContent = 'Kafka uses bootstrap host/port and optional topic/SASL auth.';
    }
}

// Update default port based on database type
function updateDefaultPort() {
    // Determine selected DB type from source cards
    const selectedType = document.querySelector('input[name="dataSourceType"]:checked')?.value;
    const dbPort = document.getElementById('dbPort');

    const defaultPorts = {
        'mysql': 3306,
        'postgresql': 5432,
        'sqlite': '',
        'mssql': 1433,
        'oracle': 1521,
        'redis': 6379,
        'hazelcast': 5701,
        'kafka': 9092,
        'db2': 446
    };

    if (dbPort) {
        const def = Object.prototype.hasOwnProperty.call(defaultPorts, selectedType) ? defaultPorts[selectedType] : '';
        dbPort.placeholder = def === '' ? '' : String(def);
        // Veritabanı tipi değiştiğinde portu her zaman güncelle
        dbPort.value = def === '' ? '' : String(def);
    }
}


// Hazelcast preview with group/tool selection
function displayHazelcastPreview(parsedData) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const groups = Array.isArray(parsedData) ? parsedData : [];
    let html = '<div class="space-y-4">';

    html += `
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div class="flex items-start space-x-3">
                <i class="fas fa-info-circle text-blue-500 mt-1"></i>
                <div>
                    <h3 class="font-semibold text-blue-900 mb-1">Configure Hazelcast Tool Groups</h3>
                    <p class="text-blue-800 text-sm">Select group(s) and specific tools to include in your MCP server. Example groups: MAPS, QUEUES, SETS, LISTS, TOPICS, DIAGNOSTICS.</p>
                </div>
            </div>
        </div>
    `;

    groups.forEach((group, index) => {
        const groupName = escapeHtml(group?.tableName || `GROUP_${index + 1}`);
        const rows = Array.isArray(group?.rows) ? group.rows : [];
        const panelId = `hazelcast-group-tools-${index}`;
        const iconId = `hazelcast-group-icon-${index}`;

        html += `
            <div class="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden mb-4">
                <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                        <label class="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox"
                                   id="hazelcast-group-select-${index}"
                                   class="qmcp-slide-toggle"
                                   checked
                                   onchange="toggleHazelcastGroupSelection(${index})">
                            <div>
                                <h4 class="font-semibold text-gray-900 text-lg">${groupName}</h4>
                                <p class="text-sm text-gray-600">${rows.length} tool(s)</p>
                            </div>
                        </label>
                        <button class="text-gray-400 hover:text-gray-700 transition-colors" onclick="toggleHazelcastGroupDetails(${index})" title="Expand/Collapse">
                            <i id="${iconId}" class="fas fa-chevron-down transition-transform"></i>
                        </button>
                    </div>
                </div>

                <div id="${panelId}" class="hidden p-4 bg-blue-50 border-b border-gray-200 space-y-2">
                    ${rows.map((row, toolIndex) => {
                        const rawTool = String(row?.[0] || '').trim();
                        const toolName = escapeHtml(rawTool);
                        const toolDesc = escapeHtml(String(row?.[1] || ''));
                        return `
                            <label class="flex items-start gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                                <input type="checkbox"
                                       id="hazelcast-tool-${index}-${toolIndex}"
                                       class="qmcp-slide-toggle mt-0.5"
                                       data-tool-name="${toolName}"
                                       checked>
                                <div>
                                    <div class="text-sm font-mono text-gray-900">${toolName}</div>
                                    <div class="text-xs text-gray-600">${toolDesc}</div>
                                </div>
                            </label>
                        `;
                    }).join('')}

                    <div class="pt-2 flex items-center gap-4">
                        <button onclick="selectAllHazelcastGroupTools(${index})" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            <i class="fas fa-check-square mr-1"></i>Select All
                        </button>
                        <button onclick="deselectAllHazelcastGroupTools(${index})" class="text-sm text-gray-600 hover:text-gray-800 font-medium">
                            <i class="fas fa-square mr-1"></i>Deselect All
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    preview.innerHTML = html;
}

// Redis preview with group/tool selection
function displayRedisPreview(parsedData) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const groups = Array.isArray(parsedData) ? parsedData : [];
    let html = '<div class="space-y-4">';

    html += `
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div class="flex items-start space-x-3">
                <i class="fas fa-info-circle text-blue-500 mt-1"></i>
                <div>
                    <h3 class="font-semibold text-blue-900 mb-1">Configure Redis Tool Groups</h3>
                    <p class="text-blue-800 text-sm">Select group(s) and specific tools to include in your MCP server. Example groups: MAPS, QUEUES, DIAGNOSTICS, STRINGS.</p>
                </div>
            </div>
        </div>
    `;

    groups.forEach((group, index) => {
        const groupName = escapeHtml(group?.tableName || `GROUP_${index + 1}`);
        const rows = Array.isArray(group?.rows) ? group.rows : [];
        const panelId = `redis-group-tools-${index}`;
        const iconId = `redis-group-icon-${index}`;

        html += `
            <div class="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden mb-4">
                <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                        <label class="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox"
                                   id="redis-group-select-${index}"
                                   class="qmcp-slide-toggle"
                                   checked
                                   onchange="toggleRedisGroupSelection(${index})">
                            <div>
                                <h4 class="font-semibold text-gray-900 text-lg">${groupName}</h4>
                                <p class="text-sm text-gray-600">${rows.length} tool(s)</p>
                            </div>
                        </label>
                        <button class="text-gray-400 hover:text-gray-700 transition-colors" onclick="toggleRedisGroupDetails(${index})" title="Expand/Collapse">
                            <i id="${iconId}" class="fas fa-chevron-down transition-transform"></i>
                        </button>
                    </div>
                </div>

                <div id="${panelId}" class="hidden p-4 bg-blue-50 border-b border-gray-200 space-y-2">
                    ${rows.map((row, toolIndex) => {
                        const rawTool = String(row?.[0] || '').trim();
                        const toolName = escapeHtml(rawTool);
                        const toolDesc = escapeHtml(String(row?.[1] || ''));
                        return `
                            <label class="flex items-start gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                                <input type="checkbox"
                                       id="redis-tool-${index}-${toolIndex}"
                                       class="qmcp-slide-toggle mt-0.5"
                                       data-tool-name="${toolName}"
                                       checked>
                                <div>
                                    <div class="text-sm font-mono text-gray-900">${toolName}</div>
                                    <div class="text-xs text-gray-600">${toolDesc}</div>
                                </div>
                            </label>
                        `;
                    }).join('')}

                    <div class="pt-2 flex items-center gap-4">
                        <button onclick="selectAllRedisGroupTools(${index})" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            <i class="fas fa-check-square mr-1"></i>Select All
                        </button>
                        <button onclick="deselectAllRedisGroupTools(${index})" class="text-sm text-gray-600 hover:text-gray-800 font-medium">
                            <i class="fas fa-square mr-1"></i>Deselect All
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    preview.innerHTML = html;
}

// Display data preview
function displayDataPreview(parsedData) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    let html = '<div class="space-y-4">';

    // Header with instructions
    html += `
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div class="flex items-start space-x-3">
                <i class="fas fa-info-circle text-blue-500 mt-1"></i>
                <div>
                    <h3 class="font-semibold text-blue-900 mb-1">Configure Your MCP Server</h3>
                    <p class="text-blue-800 text-sm">Select which tables to include and choose which tools to generate for each table. All tools are enabled by default.</p>
                </div>
            </div>
        </div>
    `;

    // REST endpoints preview
    if (Array.isArray(parsedData) && parsedData.length && parsedData[0]?.path && parsedData[0]?.method) {
        html += `
        <div class="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden mb-4">
            <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
                <h4 class="font-semibold text-gray-900 text-lg">Discovered Endpoints</h4>
                <p class="text-sm text-gray-600">Select endpoints to generate as tools.</p>
            </div>
            <div class="p-4 space-y-2">
                ${parsedData.map((ep, i) => `
                    <label class="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" id="rest-endpoint-${i}" class="w-4 h-4 text-blue-600 border-gray-300 rounded" checked>
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-700">${(ep.method || '').toUpperCase()}</span>
                        <span class="font-mono text-sm text-slate-800 truncate">${ep.path}</span>
                        <span class="text-xs text-slate-500 truncate">${ep.summary || ''}</span>
                    </label>
                `).join('')}
            </div>
        </div>`;
        html += '</div>';
        preview.innerHTML = html;
        return;
    }

    parsedData.forEach((data, index) => {
        const tableName = data.tableName || `Table ${index + 1}`;
        const panelId = `table-panel-${index}`;
        const cleanTableName = tableName.replace(/[^a-zA-Z0-9]/g, '_');

        // Check if table has numeric columns
        const numericColumns = data.headers.filter(header => {
            const dataType = data.metadata.dataTypes[header]?.toLowerCase() || '';
            return dataType.includes('int') || dataType.includes('float') || dataType.includes('decimal') || 
                   dataType.includes('numeric') || dataType.includes('real') || dataType.includes('double') ||
                   dataType === 'number';
        });

        html += `
            <div class="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden mb-4 table-selection-panel">
                <!-- Table Header with Selection -->
                <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" 
                                       id="table-select-${index}" 
                                       class="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                       checked 
                                       onchange="toggleTableSelection(${index})">
                                <div>
                                    <h4 class="font-semibold text-gray-900 text-lg">${tableName}</h4>
                                    <p class="text-sm text-gray-600">${data.metadata.rowCount} rows, ${data.metadata.columnCount} columns</p>
                                </div>
                            </label>
                        </div>
                        <button class="text-gray-400 hover:text-gray-600 transition-colors" onclick="toggleTableDetails('${panelId}')">
                            <i id="${panelId}-icon" class="fas fa-chevron-down transition-transform"></i>
                        </button>
                    </div>
                </div>

                <!-- Tool Selection Panel -->
                <div id="table-tools-${index}" class="bg-blue-50 p-4 border-b border-gray-200">
                    <h5 class="font-medium text-gray-900 mb-3">
                        <i class="fas fa-tools mr-2 text-blue-500"></i>
                        Select Tools to Generate
                    </h5>
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <!-- Basic CRUD Tools -->
                        <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                            <input type="checkbox" 
                                   id="tool-get-${index}" 
                                   class="w-4 h-4 text-blue-600 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                   checked>
                            <span class="text-sm font-medium text-gray-700">GET</span>
                        </label>
                        
                        <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                            <input type="checkbox" 
                                   id="tool-create-${index}" 
                                   class="w-4 h-4 text-green-600 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                   checked>
                            <span class="text-sm font-medium text-gray-700">CREATE</span>
                        </label>
                        
                        <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                            <input type="checkbox" 
                                   id="tool-update-${index}" 
                                   class="w-4 h-4 text-yellow-600 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                                   checked>
                            <span class="text-sm font-medium text-gray-700">UPDATE</span>
                        </label>
                        
                        <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                            <input type="checkbox" 
                                   id="tool-delete-${index}" 
                                   class="w-4 h-4 text-red-600 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                                   checked>
                            <span class="text-sm font-medium text-gray-700">DELETE</span>
                        </label>
                        
                        <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                            <input type="checkbox" 
                                   id="tool-count-${index}" 
                                   class="w-4 h-4 text-purple-600 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                   checked>
                            <span class="text-sm font-medium text-gray-700">COUNT</span>
                        </label>
                        
                        <!-- Aggregate Tools (only if numeric columns exist) -->
                        ${numericColumns.length > 0 ? `
                            <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                                <input type="checkbox" 
                                       id="tool-min-${index}" 
                                       class="w-4 h-4 text-indigo-600 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                                       checked>
                                <span class="text-sm font-medium text-gray-700">MIN</span>
                            </label>
                            
                            <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                                <input type="checkbox" 
                                       id="tool-max-${index}" 
                                       class="w-4 h-4 text-pink-600 border border-gray-300 rounded focus:ring-2 focus:ring-pink-500"
                                       checked>
                                <span class="text-sm font-medium text-gray-700">MAX</span>
                            </label>
                            
                            <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                                <input type="checkbox" 
                                       id="tool-sum-${index}" 
                                       class="w-4 h-4 text-teal-600 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                                       checked>
                                <span class="text-sm font-medium text-gray-700">SUM</span>
                            </label>
                            
                            <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                                <input type="checkbox" 
                                       id="tool-avg-${index}" 
                                       class="w-4 h-4 text-orange-600 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                                       checked>
                                <span class="text-sm font-medium text-gray-700">AVG</span>
                            </label>
                        ` : ''}
                    </div>
                    ${numericColumns.length > 0 ? `
                        <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p class="text-sm text-green-800">
                                <i class="fas fa-calculator mr-2"></i>
                                <strong>Aggregate tools available:</strong> This table has ${numericColumns.length} numeric column(s): 
                                <span class="font-mono">${numericColumns.join(', ')}</span>
                            </p>
                        </div>
                    ` : ''}
                    
                    <!-- Quick Actions -->
                    <div class="mt-4 flex items-center space-x-4">
                        <button onclick="selectAllTools(${index})" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            <i class="fas fa-check-square mr-1"></i>Select All
                        </button>
                        <button onclick="deselectAllTools(${index})" class="text-sm text-gray-600 hover:text-gray-800 font-medium">
                            <i class="fas fa-square mr-1"></i>Deselect All
                        </button>
                        <button onclick="selectOnlyBasicTools(${index})" class="text-sm text-green-600 hover:text-green-800 font-medium">
                            <i class="fas fa-check mr-1"></i>Basic Only
                        </button>
                    </div>
                </div>

                <!-- Table Data Preview (Collapsible) -->
                <div id="${panelId}" class="p-4 hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm">
                            <thead>
                                <tr class="bg-gray-100">`;

        data.headers.forEach(header => {
            const dataType = data.metadata.dataTypes[header];
            html += `<th class="px-3 py-2 text-left font-medium text-gray-700">${header} <span class="text-xs text-gray-500">(${dataType})</span></th>`;
        });
        html += '</tr></thead><tbody>';

        data.rows.slice(0, 5).forEach((row, rowIndex) => {
            html += `<tr class="${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">`;
            row.forEach(cell => {
                html += `<td class="px-3 py-2 text-gray-900">${cell || ''}</td>`;
            });
            html += '</tr>';
        });

        if (data.rows.length > 5) {
            html += `<tr><td colspan="${data.headers.length}" class="px-3 py-2 text-center text-gray-500 italic">... and ${data.rows.length - 5} more rows</td></tr>`;
        }

        html += `</tbody></table>
                    </div>
                </div>
            </div>`;
    });

    html += '</div>';
    preview.innerHTML = html;
}

// Toggle table details panel
function toggleTableDetails(panelId) {
    const panel = document.getElementById(panelId);
    const icon = document.getElementById(`${panelId}-icon`);

    if (panel?.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        icon?.classList.add('rotate-180');
    } else {
        panel?.classList.add('hidden');
        icon?.classList.remove('rotate-180');
    }
}

// Legacy function for backward compatibility
function togglePanel(panelId) {
    toggleTableDetails(panelId);
}

// Toggle table selection
function toggleTableSelection(tableIndex) {
    const checkbox = document.getElementById(`table-select-${tableIndex}`);
    const toolsPanel = document.getElementById(`table-tools-${tableIndex}`);
    
    if (checkbox?.checked) {
        toolsPanel?.classList.remove('opacity-50');
        toolsPanel?.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.disabled = false;
        });
    } else {
        toolsPanel?.classList.add('opacity-50');
        toolsPanel?.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.disabled = true;
        });
    }
}

function toggleHazelcastGroupSelection(groupIndex) {
    const checkbox = document.getElementById(`hazelcast-group-select-${groupIndex}`);
    const toolsPanel = document.getElementById(`hazelcast-group-tools-${groupIndex}`);
    if (!(checkbox instanceof HTMLInputElement)) return;

    const toolInputs = toolsPanel?.querySelectorAll('input[type="checkbox"][data-tool-name]') || [];
    if (checkbox.checked) {
        toolsPanel?.classList.remove('opacity-50');
        toolInputs.forEach((input) => {
            input.disabled = false;
        });
    } else {
        toolsPanel?.classList.add('opacity-50');
        toolInputs.forEach((input) => {
            input.disabled = true;
        });
    }
}

function toggleHazelcastGroupDetails(groupIndex) {
    const panel = document.getElementById(`hazelcast-group-tools-${groupIndex}`);
    const icon = document.getElementById(`hazelcast-group-icon-${groupIndex}`);
    if (!panel) return;
    panel.classList.toggle('hidden');
    icon?.classList.toggle('rotate-180');
}

function selectAllHazelcastGroupTools(groupIndex) {
    const toolInputs = document.querySelectorAll(`#hazelcast-group-tools-${groupIndex} input[type="checkbox"][data-tool-name]`);
    toolInputs.forEach((input) => {
        if (!input.disabled) input.checked = true;
    });
}

function deselectAllHazelcastGroupTools(groupIndex) {
    const toolInputs = document.querySelectorAll(`#hazelcast-group-tools-${groupIndex} input[type="checkbox"][data-tool-name]`);
    toolInputs.forEach((input) => {
        if (!input.disabled) input.checked = false;
    });
}

function toggleRedisGroupSelection(groupIndex) {
    const checkbox = document.getElementById(`redis-group-select-${groupIndex}`);
    const toolsPanel = document.getElementById(`redis-group-tools-${groupIndex}`);
    if (!(checkbox instanceof HTMLInputElement)) return;

    const toolInputs = toolsPanel?.querySelectorAll('input[type="checkbox"][data-tool-name]') || [];
    if (checkbox.checked) {
        toolsPanel?.classList.remove('opacity-50');
        toolInputs.forEach((input) => {
            input.disabled = false;
        });
    } else {
        toolsPanel?.classList.add('opacity-50');
        toolInputs.forEach((input) => {
            input.disabled = true;
        });
    }
}

function toggleRedisGroupDetails(groupIndex) {
    const panel = document.getElementById(`redis-group-tools-${groupIndex}`);
    const icon = document.getElementById(`redis-group-icon-${groupIndex}`);
    if (!panel) return;
    panel.classList.toggle('hidden');
    icon?.classList.toggle('rotate-180');
}

function selectAllRedisGroupTools(groupIndex) {
    const toolInputs = document.querySelectorAll(`#redis-group-tools-${groupIndex} input[type="checkbox"][data-tool-name]`);
    toolInputs.forEach((input) => {
        if (!input.disabled) input.checked = true;
    });
}

function deselectAllRedisGroupTools(groupIndex) {
    const toolInputs = document.querySelectorAll(`#redis-group-tools-${groupIndex} input[type="checkbox"][data-tool-name]`);
    toolInputs.forEach((input) => {
        if (!input.disabled) input.checked = false;
    });
}

// Tool selection helper functions
function selectAllTools(tableIndex) {
    const toolInputs = document.querySelectorAll(`#table-tools-${tableIndex} input[type="checkbox"]`);
    toolInputs.forEach(input => {
        if (!input.disabled) input.checked = true;
    });
}

function deselectAllTools(tableIndex) {
    const toolInputs = document.querySelectorAll(`#table-tools-${tableIndex} input[type="checkbox"]`);
    toolInputs.forEach(input => {
        if (!input.disabled) input.checked = false;
    });
}

function selectOnlyBasicTools(tableIndex) {
    // First deselect all
    deselectAllTools(tableIndex);
    
    // Then select only basic CRUD tools
    const basicTools = ['get', 'create', 'update', 'delete'];
    basicTools.forEach(tool => {
        const input = document.getElementById(`tool-${tool}-${tableIndex}`);
        if (input && !input.disabled) input.checked = true;
    });
}

// Get selected tables and their tools configuration
function getSelectedTablesAndTools() {
    const selectedTables = [];
    if (currentDataSource?.type === DataSourceType.Redis && Array.isArray(currentParsedData)) {
        document.querySelectorAll('[id^="redis-group-select-"]').forEach((groupCheckbox) => {
            if (!(groupCheckbox instanceof HTMLInputElement) || !groupCheckbox.checked) return;

            const rawIndex = Number(groupCheckbox.id.replace('redis-group-select-', ''));
            if (!Number.isFinite(rawIndex) || rawIndex < 0) return;
            const index = Math.trunc(rawIndex);

            const selectedToolNames = [];
            document.querySelectorAll(`#redis-group-tools-${index} input[type="checkbox"][data-tool-name]`).forEach((toolCheckbox) => {
                if (!(toolCheckbox instanceof HTMLInputElement) || !toolCheckbox.checked || toolCheckbox.disabled) return;
                const toolName = String(toolCheckbox.dataset.toolName || '').trim();
                if (toolName) selectedToolNames.push(toolName);
            });

            if (selectedToolNames.length === 0) return;
            selectedTables.push({
                index,
                tableName: currentParsedData[index]?.tableName || `GROUP_${index + 1}`,
                selectedToolNames
            });
        });

        return selectedTables;
    }

    if (currentDataSource?.type === DataSourceType.Hazelcast && Array.isArray(currentParsedData)) {
        document.querySelectorAll('[id^="hazelcast-group-select-"]').forEach((groupCheckbox) => {
            if (!(groupCheckbox instanceof HTMLInputElement) || !groupCheckbox.checked) return;

            const rawIndex = Number(groupCheckbox.id.replace('hazelcast-group-select-', ''));
            if (!Number.isFinite(rawIndex) || rawIndex < 0) return;
            const index = Math.trunc(rawIndex);

            const selectedToolNames = [];
            document.querySelectorAll(`#hazelcast-group-tools-${index} input[type="checkbox"][data-tool-name]`).forEach((toolCheckbox) => {
                if (!(toolCheckbox instanceof HTMLInputElement) || !toolCheckbox.checked || toolCheckbox.disabled) return;
                const toolName = String(toolCheckbox.dataset.toolName || '').trim();
                if (toolName) selectedToolNames.push(toolName);
            });

            if (selectedToolNames.length === 0) return;
            selectedTables.push({
                index,
                tableName: currentParsedData[index]?.tableName || `GROUP_${index + 1}`,
                selectedToolNames
            });
        });

        return selectedTables;
    }

    // REST mode: collect selected endpoints
    if (currentDataSource?.type === DataSourceType.Rest && Array.isArray(currentParsedData)) {
        currentParsedData.forEach((_, idx) => {
            const cb = document.getElementById(`rest-endpoint-${idx}`);
            if (cb && cb.checked) {
                selectedTables.push({ index: idx });
            }
        });
        return selectedTables;
    }
    // Find all table selection checkboxes
    document.querySelectorAll('[id^="table-select-"]').forEach((checkbox, index) => {
        if (checkbox.checked) {
            const toolsConfig = {
                get: document.getElementById(`tool-get-${index}`)?.checked || false,
                create: document.getElementById(`tool-create-${index}`)?.checked || false,
                update: document.getElementById(`tool-update-${index}`)?.checked || false,
                delete: document.getElementById(`tool-delete-${index}`)?.checked || false,
                count: document.getElementById(`tool-count-${index}`)?.checked || false,
                min: document.getElementById(`tool-min-${index}`)?.checked || false,
                max: document.getElementById(`tool-max-${index}`)?.checked || false,
                sum: document.getElementById(`tool-sum-${index}`)?.checked || false,
                avg: document.getElementById(`tool-avg-${index}`)?.checked || false
            };
            
            selectedTables.push({
                index: index,
                tools: toolsConfig
            });
        }
    });
    
    return selectedTables;
}

// Generate server
async function generateServer() {
    const name = document.getElementById('serverName')?.value;
    const description = document.getElementById('serverDescription')?.value;
    const version = document.getElementById('serverVersion')?.value;

    if (!name) {
        showError('generate-error', 'Please provide server name');
        return;
    }

    if (!currentDataSource || !currentParsedData) {
        showError('generate-error', 'Please parse a data source first');
        return;
    }

    // Debug log
    //console.log('🔍 DEBUG - currentDataSource:', currentDataSource);
    //console.log('🔍 DEBUG - currentDataSource.type:', currentDataSource?.type);

    // Get selected tables and their tool configurations
    let selectedTablesConfig = getSelectedTablesAndTools();

    // For data sources that don't need table selection (runtime execution)
    if (isNoTableDataSource(currentDataSource?.type)) {
        selectedTablesConfig = []; // Empty is OK - tools are generated based on config
    } else if (selectedTablesConfig.length === 0) {
        showError('generate-error', 'Please select at least one table to generate server for');
        return;
    }

    console.log('🔍 Selected tables and tools:', selectedTablesConfig);

    const loading = document.getElementById('generate-loading');
    const successDiv = document.getElementById('generate-success');
    const errorDiv = document.getElementById('generate-error');
    const generateBtn = document.getElementById('generateBtn');

    loading?.classList.remove('hidden');
    successDiv?.classList.add('hidden');
    errorDiv?.classList.add('hidden');
    if (generateBtn) generateBtn.disabled = true;

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                description: description || '',
                version: version || '1.0.0',
                type: currentDataSource?.type,
                dataSource: currentDataSource,
                selectedTables: selectedTablesConfig,
                parsedData: currentParsedData
            })
        });

        const result = await response.json();

        if (result.success) {
            showSuccessModal(name, result.data);
            resetForm();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showError('generate-error', error.message);
    } finally {
        loading?.classList.add('hidden');
        if (generateBtn) generateBtn.disabled = false;
    }
}

function resetForm() {
    document.getElementById('serverName').value = '';
    document.getElementById('serverDescription').value = '';
    document.getElementById('serverVersion').value = '1.0.0';

    // Reset data source selection
    document.querySelectorAll('input[name="dataSourceType"]').forEach(radio => {
        radio.checked = false;
    });
    syncDataSourceCardSelectionState();

    document.getElementById('file-upload-section')?.classList.add('hidden');
    document.getElementById('database-section')?.classList.add('hidden');

    resetFileUpload();

    currentParsedData = null;
    currentDataSource = null;
    currentWizardStep = 1;
    initializeN8nToolSelector(true);

    // Reset wizard to step 1
    goToWizardStep(1);

    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) generateBtn.disabled = true;

    const nextBtn = document.getElementById('next-to-step-3');
    if (nextBtn) nextBtn.disabled = true;
}

// Load servers list


function showSuccessModal(serverName, serverData) {
    const modal = document.getElementById("success-modal");
    const messageElement = document.getElementById("success-message");

    let message = `Your MCP server "${serverName}" has been successfully generated and is ready to use.`;

    if (serverData) {
        message += ` Generated ${serverData.toolsCount || 0} tools, ${serverData.resourcesCount || 0} resources, and ${serverData.promptsCount || 0} prompts.`;
    }

    if (messageElement) messageElement.textContent = message;

    if (modal) {
        modal.classList.remove('opacity-0', 'invisible');
        modal.querySelector('.bg-white').classList.remove('scale-95');
    }
}

function closeSuccessModal() {
    const modal = document.getElementById("success-modal");
    if (modal) {
        modal.classList.add('opacity-0', 'invisible');
        modal.querySelector('.bg-white').classList.add('scale-95');
    }
}

function goToManageServers() {
    closeSuccessModal();
    switchTab('manage');
}

// Server name validation
let nameCheckTimeout;

async function checkServerName() {
    const nameInput = document.getElementById('serverName');
    const validationDiv = document.getElementById('name-validation');
    const serverName = nameInput?.value.trim();

    // Clear previous timeout
    if (nameCheckTimeout) {
        clearTimeout(nameCheckTimeout);
    }

    // Hide validation if empty
    if (!serverName) {
        if (validationDiv) validationDiv.style.display = 'none';
        if (nameInput) nameInput.classList.remove('border-green-300', 'border-red-300');
        return;
    }

    // Debounce API calls
    nameCheckTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/servers/check-name/${encodeURIComponent(serverName)}`);
            const result = await response.json();

            if (result.success && validationDiv && nameInput) {
                validationDiv.style.display = 'block';
                if (result.available) {
                    validationDiv.textContent = '✓ Server name is available';
                    validationDiv.className = 'mt-2 text-sm text-green-600';
                    nameInput.classList.remove('border-red-300');
                    nameInput.classList.add('border-green-300');
                } else {
                    validationDiv.textContent = '✗ Server name already exists';
                    validationDiv.className = 'mt-2 text-sm text-red-600';
                    nameInput.classList.remove('border-green-300');
                    nameInput.classList.add('border-red-300');
                }
            }
        } catch (error) {
            logger.error('Error checking server name:', error);
        }
    }, 500);
}

// Generic Alias Validation
let aliasCheckTimeout;
async function checkAlias(aliasType) {
    const inputId = `${aliasType}ToolAlias`;
    const validationId = `${aliasType}-alias-validation`;
    const suffix = `_${aliasType}`;

    const aliasInput = document.getElementById(inputId);
    const validationDiv = document.getElementById(validationId);
    if (!aliasInput || !validationDiv) return;

    const alias = aliasInput.value.trim();

    if (aliasCheckTimeout) {
        clearTimeout(aliasCheckTimeout);
    }

    if (!alias) {
        validationDiv.textContent = '';
        aliasInput.classList.remove('border-green-300', 'border-red-300');
        updateWizardNavigation();
        return;
    }

    const validFormat = /^[a-z0-9_]+$/.test(alias);
    if (!validFormat) {
        validationDiv.textContent = '✗ Invalid format. Use only lowercase letters, numbers, and underscores.';
        validationDiv.className = 'mt-2 text-xs text-red-600';
        aliasInput.classList.remove('border-green-300');
        aliasInput.classList.add('border-red-300');
        updateWizardNavigation();
        return;
    }

    aliasCheckTimeout = setTimeout(async () => {
        try {
            const toolName = `${alias}${suffix}`;
            const response = await fetch(`/api/check-tool-name/${encodeURIComponent(toolName)}`);
            const result = await response.json();

            if (result.success) {
                if (result.available) {
                    validationDiv.textContent = `✓ Tool name (${toolName}) is available`;
                    validationDiv.className = 'mt-2 text-xs text-green-600';
                    aliasInput.classList.remove('border-red-300');
                    aliasInput.classList.add('border-green-300');
                } else {
                    validationDiv.textContent = `✗ Tool name (${toolName}) already exists`;
                    validationDiv.className = 'mt-2 text-xs text-red-600';
                    aliasInput.classList.remove('border-green-300');
                    aliasInput.classList.add('border-red-300');
                }
            }
        } catch (error) {
            logger.error('Error checking tool name:', error);
            validationDiv.textContent = 'Error checking tool name availability.';
            validationDiv.className = 'mt-2 text-xs text-red-600';
        } finally {
            updateWizardNavigation();
        }
    }, 500);
}


// Handle next to step 3 - parse data first
function showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

function showSuccess(elementId, message) {
    const successDiv = document.getElementById(elementId);
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.classList.remove('hidden');
    }
}

function setupEventListeners() {
    document.getElementById('openSidebar')?.addEventListener('click', openSidebar);
    document.getElementById('closeSidebar')?.addEventListener('click', closeSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);

    document.querySelectorAll('.nav-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            const tabName = item.getAttribute('data-tab');
            if (tabName) {
                e.preventDefault();
                switchTab(tabName);
            }
        });
    });

    document.querySelectorAll('input[name="dataSourceType"]').forEach((radio) => {
        radio.addEventListener('change', () => {
            toggleDataSourceFields();
            syncDataSourceCardSelectionState();
        });
    });
    setupDataSourceCardSelectionUx();

    document.getElementById('dbType')?.addEventListener('change', updateDefaultPort);
    document.getElementById('dbType')?.addEventListener('change', updateWizardNavigation);
    document.getElementById('dbHost')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('dbPort')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('dbName')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('dbUser')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('dbPassword')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('swaggerUrl')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('webUrl')?.addEventListener('input', updateWizardNavigation);

    document.getElementById('generateBtn')?.addEventListener('click', generateServer);
    document.getElementById('serverName')?.addEventListener('input', checkServerName);
    document.getElementById('curlToolAlias')?.addEventListener('input', () => checkAlias('curl'));
    document.getElementById('webToolAlias')?.addEventListener('input', () => checkAlias('web'));

    document.getElementById('azureOpenAIBaseUrl')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('azureOpenAIApiVersion')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('azureOpenAIDeployment')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('azureOpenAIApiKey')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('mistralBaseUrl')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('mistralApiKey')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('mistralModel')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('cohereBaseUrl')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('cohereApiKey')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('cohereModel')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('perplexityBaseUrl')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('perplexityApiKey')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('perplexityModel')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('togetherBaseUrl')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('togetherApiKey')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('togetherModel')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('fireworksBaseUrl')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('fireworksApiKey')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('fireworksModel')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('groqBaseUrl')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('groqApiKey')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('groqModel')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('openrouterBaseUrl')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('openrouterApiKey')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('openrouterModel')?.addEventListener('input', updateWizardNavigation);

    const curlPasteTab = document.getElementById('curlPasteTab');
    const curlManualTab = document.getElementById('curlManualTab');
    const curlPasteMode = document.getElementById('curlPasteMode');
    const curlManualMode = document.getElementById('curlManualMode');

    curlPasteTab?.addEventListener('click', () => {
        curlPasteTab.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
        curlPasteTab.classList.remove('text-slate-600');
        curlManualTab?.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
        curlManualTab?.classList.add('text-slate-600');
        curlPasteMode?.classList.remove('hidden');
        curlManualMode?.classList.add('hidden');
    });

    curlManualTab?.addEventListener('click', () => {
        curlManualTab.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
        curlManualTab.classList.remove('text-slate-600');
        curlPasteTab?.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
        curlPasteTab?.classList.add('text-slate-600');
        curlManualMode?.classList.remove('hidden');
        curlPasteMode?.classList.add('hidden');
    });

    document.getElementById('next-to-step-2')?.addEventListener('click', () => goToWizardStep(2));
    document.getElementById('back-to-step-1')?.addEventListener('click', () => goToWizardStep(1));
    document.getElementById('next-to-step-3')?.addEventListener('click', handleNextToStep3);
    document.getElementById('back-to-step-2')?.addEventListener('click', () => goToWizardStep(2));
    document.getElementById('next-to-step-4')?.addEventListener('click', () => goToWizardStep(4));
    document.getElementById('back-to-step-3')?.addEventListener('click', () => goToWizardStep(3));
}

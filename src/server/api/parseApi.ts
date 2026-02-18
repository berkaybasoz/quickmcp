import express from 'express';
import { DataSourceParser } from '../../parsers';
import {
  CsvDataSource,
  CurlDataSource,
  DataSource,
  DataSourceType,
  ExcelDataSource,
  RestDataSource,
  createCsvDataSource,
  createCurlDataSource,
  createExcelDataSource,
  createRestDataSource,
  isDatabase
} from '../../types';
import { upload } from '../../upload/upload-utils';

export class ParseApi {
  constructor(private readonly parser: DataSourceParser) {}

  registerRoutes(app: express.Express): void {
    app.post('/api/parse', upload.single('file'), this.parseDataSource);
  }

  private parseDataSource = async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
      try {
        const { type, connection, swaggerUrl, curlSetting } = req.body as any;
        const file = req.file;
    
        let dataSource: DataSource | CurlDataSource | CsvDataSource | ExcelDataSource;
    
        // Accept database parse when database type is selected or a connection payload is present.
        if (isDatabase(type) || connection) {
          let connObj: any = connection;
          if (typeof connObj === 'string') {
            try { connObj = JSON.parse(connObj); } catch { connObj = null; }
          }
          if (!connObj || !connObj.type) {
            throw new Error('Missing or invalid database connection');
          }
          if (!isDatabase(connObj.type)) {
            throw new Error(`Unsupported database type: ${connObj.type}`);
          }
          dataSource = {
            type: connObj.type,
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
    
        const parsedData = await this.parser.parse(dataSource);
    
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

  };
}

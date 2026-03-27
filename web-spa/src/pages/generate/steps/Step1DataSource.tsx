import { useState, useMemo } from 'react';
import { useGenerateStore } from '../store/useGenerateStore';
import { DataSourceTypeValue } from '../types';

// ─── Data ─────────────────────────────────────────────────────────────────────

type Category =
  | 'all'
  | 'file'
  | 'database'
  | 'api'
  | 'web'
  | 'ai'
  | 'productivity'
  | 'social'
  | 'infra';

interface DataSourceDef {
  value: DataSourceTypeValue;
  category: Exclude<Category, 'all'>;
  label: string;
  desc: string;
  border: string;
  icon?: string;
  iconBg?: string;
  img?: string;
}

const DATA_SOURCES: DataSourceDef[] = [
  // Files
  {
    value: 'csv', category: 'file',
    icon: 'fas fa-file-csv', iconBg: 'bg-green-100 text-green-600',
    border: 'hover:border-green-400 hover:shadow-md hover:shadow-green-500/20 peer-checked:border-green-500 peer-checked:shadow-lg peer-checked:shadow-green-500/30',
    label: 'CSV File', desc: 'Upload a comma-separated values file.',
  },
  {
    value: 'excel', category: 'file',
    icon: 'fas fa-file-excel', iconBg: 'bg-emerald-100 text-emerald-600',
    border: 'hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-500/20 peer-checked:border-emerald-500 peer-checked:shadow-lg peer-checked:shadow-emerald-500/30',
    label: 'Excel File', desc: 'Upload an Excel spreadsheet (.xlsx).',
  },
  {
    value: 'localfs', category: 'file',
    icon: 'fas fa-hard-drive', iconBg: 'bg-violet-100 text-violet-600',
    border: 'hover:border-violet-500 hover:shadow-md hover:shadow-violet-500/20 peer-checked:border-violet-500 peer-checked:shadow-lg peer-checked:shadow-violet-500/30',
    label: 'Local Files', desc: 'Access local files and directories.',
  },
  {
    value: 'ftp', category: 'file',
    icon: 'fas fa-folder-open', iconBg: 'bg-amber-100 text-amber-600',
    border: 'hover:border-amber-500 hover:shadow-md hover:shadow-amber-500/20 peer-checked:border-amber-500 peer-checked:shadow-lg peer-checked:shadow-amber-500/30',
    label: 'FTP / SFTP', desc: 'Connect to FTP or SFTP server.',
  },

  // Database
  {
    value: 'mssql', category: 'database',
    img: '/images/app/mssql.png',
    border: 'hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/20 peer-checked:border-purple-500 peer-checked:shadow-lg peer-checked:shadow-purple-500/30',
    label: 'SQL Server', desc: 'Connect to SQL Server',
  },
  {
    value: 'postgresql', category: 'database',
    img: '/images/app/postgresql.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'PostgreSQL', desc: 'Connect to PostgreSQL',
  },
  {
    value: 'mysql', category: 'database',
    img: '/images/app/mysql.png',
    border: 'hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/20 peer-checked:border-orange-500 peer-checked:shadow-lg peer-checked:shadow-orange-500/30',
    label: 'MySQL', desc: 'Connect to MySQL',
  },
  {
    value: 'sqlite', category: 'database',
    img: '/images/app/sqlite.png',
    border: 'hover:border-slate-400 hover:shadow-md hover:shadow-slate-500/20 peer-checked:border-slate-500 peer-checked:shadow-lg peer-checked:shadow-slate-500/30',
    label: 'SQLite', desc: 'Connect to SQLite',
  },
  {
    value: 'mongodb', category: 'database',
    icon: 'fas fa-leaf', iconBg: 'bg-green-100 text-green-600',
    border: 'hover:border-green-500 hover:shadow-md hover:shadow-green-500/20 peer-checked:border-green-500 peer-checked:shadow-lg peer-checked:shadow-green-500/30',
    label: 'MongoDB', desc: 'Connect to MongoDB',
  },
  {
    value: 'oracle', category: 'database',
    img: '/images/app/oracle.png',
    border: 'hover:border-red-400 hover:shadow-md hover:shadow-red-500/20 peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-500/30',
    label: 'Oracle', desc: 'Connect to Oracle',
  },
  {
    value: 'redis', category: 'database',
    img: '/images/app/redis.png',
    border: 'hover:border-rose-400 hover:shadow-md hover:shadow-rose-500/20 peer-checked:border-rose-500 peer-checked:shadow-lg peer-checked:shadow-rose-500/30',
    label: 'Redis', desc: 'Connect to Redis',
  },
  {
    value: 'hazelcast', category: 'database',
    img: '/images/app/hazelcast.png',
    border: 'hover:border-yellow-400 hover:shadow-md hover:shadow-yellow-500/20 peer-checked:border-yellow-500 peer-checked:shadow-lg peer-checked:shadow-yellow-500/30',
    label: 'Hazelcast', desc: 'Connect to Hazelcast',
  },
  {
    value: 'kafka', category: 'database',
    img: '/images/app/kafka.png',
    border: 'hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-500/20 peer-checked:border-indigo-500 peer-checked:shadow-lg peer-checked:shadow-indigo-500/30',
    label: 'Kafka', desc: 'Connect to Kafka',
  },
  {
    value: 'db2', category: 'database',
    img: '/images/app/db2.png',
    border: 'hover:border-sky-400 hover:shadow-md hover:shadow-sky-500/20 peer-checked:border-sky-500 peer-checked:shadow-lg peer-checked:shadow-sky-500/30',
    label: 'DB2 z/OS', desc: 'Connect to DB2',
  },
  {
    value: 'supabase', category: 'database',
    img: '/images/app/supabase.png',
    border: 'hover:border-green-400 hover:shadow-md hover:shadow-green-500/20 peer-checked:border-green-500 peer-checked:shadow-lg peer-checked:shadow-green-500/30',
    label: 'Supabase', desc: 'Connect to Supabase.',
  },
  {
    value: 'mariadb', category: 'database',
    img: '/images/app/mariadb.png',
    border: 'hover:border-brown-400 hover:shadow-md hover:shadow-amber-700/20 peer-checked:border-amber-700 peer-checked:shadow-lg peer-checked:shadow-amber-700/30',
    label: 'MariaDB', desc: 'Connect to MariaDB',
  },

  // Web
  {
    value: 'rest', category: 'web',
    icon: 'fas fa-network-wired', iconBg: 'bg-cyan-100 text-cyan-600',
    border: 'hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-500/20 peer-checked:border-cyan-500 peer-checked:shadow-lg peer-checked:shadow-cyan-500/30',
    label: 'REST API', desc: 'OpenAPI/Swagger endpoint (e.g. petstore).',
  },
  {
    value: 'web', category: 'web',
    img: '/images/app/webpage.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Web Page', desc: 'Fetch content from a web URL.',
  },
  {
    value: 'rss', category: 'web',
    img: '/images/app/rss.png',
    border: 'hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/20 peer-checked:border-orange-500 peer-checked:shadow-lg peer-checked:shadow-orange-500/30',
    label: 'RSS / Atom Feed', desc: 'Subscribe to an RSS or Atom feed.',
  },

  // API
  {
    value: 'graphql', category: 'web',
    img: '/images/app/graphql.png',
    border: 'hover:border-pink-400 hover:shadow-md hover:shadow-pink-500/20 peer-checked:border-pink-500 peer-checked:shadow-lg peer-checked:shadow-pink-500/30',
    label: 'GraphQL', desc: 'Connect to a GraphQL API.',
  },
  {
    value: 'soap', category: 'web',
    img: '/images/app/soap.png',
    border: 'hover:border-slate-400 hover:shadow-md hover:shadow-slate-500/20 peer-checked:border-slate-500 peer-checked:shadow-lg peer-checked:shadow-slate-500/30',
    label: 'SOAP', desc: 'Connect to a SOAP web service.',
  },
  {
    value: 'curl', category: 'web',
    img: '/images/app/curl_mini.png',
    border: 'hover:border-sky-400 hover:shadow-md hover:shadow-sky-500/20 peer-checked:border-sky-500 peer-checked:shadow-lg peer-checked:shadow-sky-500/30',
    label: 'cURL Request', desc: 'Execute a custom HTTP request.',
  },

  // Productivity
  {
    value: 'slack', category: 'productivity',
    img: '/images/app/slack.png',
    border: 'hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/20 peer-checked:border-purple-500 peer-checked:shadow-lg peer-checked:shadow-purple-500/30',
    label: 'Slack', desc: 'Connect to Slack workspace.',
  },
  {
    value: 'discord', category: 'productivity',
    img: '/images/app/discord.png',
    border: 'hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-500/20 peer-checked:border-indigo-500 peer-checked:shadow-lg peer-checked:shadow-indigo-500/30',
    label: 'Discord', desc: 'Connect to Discord server.',
  },
  {
    value: 'github', category: 'infra',
    img: '/images/app/github.png',
    border: 'hover:border-slate-400 hover:shadow-md hover:shadow-slate-500/20 peer-checked:border-slate-500 peer-checked:shadow-lg peer-checked:shadow-slate-500/30',
    label: 'GitHub', desc: 'Connect to GitHub API.',
  },
  {
    value: 'gitlab', category: 'infra',
    img: '/images/app/gitlab.png',
    border: 'hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/20 peer-checked:border-orange-500 peer-checked:shadow-lg peer-checked:shadow-orange-500/30',
    label: 'GitLab', desc: 'Connect to GitLab API.',
  },
  {
    value: 'bitbucket', category: 'productivity',
    img: '/images/app/bitbucket.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Bitbucket', desc: 'Connect to Bitbucket API.',
  },
  {
    value: 'jira', category: 'productivity',
    img: '/images/app/jira.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Jira', desc: 'Connect to Jira API.',
  },
  {
    value: 'confluence', category: 'productivity',
    img: '/images/app/confluence.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Confluence', desc: 'Connect to Confluence API.',
  },
  {
    value: 'trello', category: 'productivity',
    img: '/images/app/trello.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Trello', desc: 'Connect to Trello API.',
  },
  {
    value: 'notion', category: 'productivity',
    img: '/images/app/notion.png',
    border: 'hover:border-slate-400 hover:shadow-md hover:shadow-slate-500/20 peer-checked:border-slate-500 peer-checked:shadow-lg peer-checked:shadow-slate-500/30',
    label: 'Notion', desc: 'Connect to Notion API.',
  },
  {
    value: 'airtable', category: 'productivity',
    img: '/images/app/airtable.png',
    border: 'hover:border-yellow-400 hover:shadow-md hover:shadow-yellow-500/20 peer-checked:border-yellow-500 peer-checked:shadow-lg peer-checked:shadow-yellow-500/30',
    label: 'Airtable', desc: 'Connect to Airtable API.',
  },
  {
    value: 'asana', category: 'productivity',
    img: '/images/app/asana.png',
    border: 'hover:border-pink-400 hover:shadow-md hover:shadow-pink-500/20 peer-checked:border-pink-500 peer-checked:shadow-lg peer-checked:shadow-pink-500/30',
    label: 'Asana', desc: 'Connect to Asana API.',
  },
  {
    value: 'monday', category: 'productivity',
    img: '/images/app/monday.png',
    border: 'hover:border-red-400 hover:shadow-md hover:shadow-red-500/20 peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-500/30',
    label: 'Monday.com', desc: 'Connect to Monday.com API.',
  },
  {
    value: 'clickup', category: 'productivity',
    img: '/images/app/clickup.png',
    border: 'hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/20 peer-checked:border-purple-500 peer-checked:shadow-lg peer-checked:shadow-purple-500/30',
    label: 'ClickUp', desc: 'Connect to ClickUp API.',
  },
  {
    value: 'linear', category: 'productivity',
    img: '/images/app/linear.png',
    border: 'hover:border-violet-400 hover:shadow-md hover:shadow-violet-500/20 peer-checked:border-violet-500 peer-checked:shadow-lg peer-checked:shadow-violet-500/30',
    label: 'Linear', desc: 'Connect to Linear API.',
  },
  {
    value: 'gdrive', category: 'productivity',
    img: '/images/app/gdrive.png',
    border: 'hover:border-yellow-400 hover:shadow-md hover:shadow-yellow-500/20 peer-checked:border-yellow-500 peer-checked:shadow-lg peer-checked:shadow-yellow-500/30',
    label: 'Google Drive', desc: 'Connect to Google Drive.',
  },
  {
    value: 'googlecalendar', category: 'productivity',
    img: '/images/app/googlecalendar.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Google Calendar', desc: 'Manage Google Calendar.',
  },
  {
    value: 'googledocs', category: 'productivity',
    img: '/images/app/googledocs.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Google Docs', desc: 'Access Google Docs.',
  },
  {
    value: 'googlesheets', category: 'productivity',
    img: '/images/app/googlesheets.png',
    border: 'hover:border-green-400 hover:shadow-md hover:shadow-green-500/20 peer-checked:border-green-500 peer-checked:shadow-lg peer-checked:shadow-green-500/30',
    label: 'Google Sheets', desc: 'Access Google Sheets.',
  },
  {
    value: 'dropbox', category: 'productivity',
    img: '/images/app/dropbox.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Dropbox', desc: 'Connect to Dropbox API.',
  },
  {
    value: 'n8n', category: 'ai',
    img: '/images/app/n8n.png',
    border: 'hover:border-red-400 hover:shadow-md hover:shadow-red-500/20 peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-500/30',
    label: 'n8n', desc: 'Connect to n8n automation.',
  },
  {
    value: 'email', category: 'productivity',
    icon: 'fas fa-envelope', iconBg: 'bg-rose-100 text-rose-600',
    border: 'hover:border-rose-500 hover:shadow-md hover:shadow-rose-500/20 peer-checked:border-rose-500 peer-checked:shadow-lg peer-checked:shadow-rose-500/30',
    label: 'Email', desc: 'IMAP/SMTP email access.',
  },
  {
    value: 'gmail', category: 'productivity',
    img: '/images/app/gmail.png',
    border: 'hover:border-red-400 hover:shadow-md hover:shadow-red-500/20 peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-500/30',
    label: 'Gmail', desc: 'Connect to Gmail.',
  },

  // Social
  {
    value: 'x', category: 'social',
    img: '/images/app/x.png',
    border: 'hover:border-slate-400 hover:shadow-md hover:shadow-slate-500/20 peer-checked:border-slate-500 peer-checked:shadow-lg peer-checked:shadow-slate-500/30',
    label: 'X (Twitter)', desc: 'Connect to X/Twitter API.',
  },
  {
    value: 'facebook', category: 'social',
    img: '/images/app/facebook.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Facebook', desc: 'Connect to Facebook Graph API.',
  },
  {
    value: 'instagram', category: 'social',
    img: '/images/app/instagram.png',
    border: 'hover:border-pink-400 hover:shadow-md hover:shadow-pink-500/20 peer-checked:border-pink-500 peer-checked:shadow-lg peer-checked:shadow-pink-500/30',
    label: 'Instagram', desc: 'Connect to Instagram API.',
  },
  {
    value: 'tiktok', category: 'social',
    img: '/images/app/tiktok.png',
    border: 'hover:border-slate-400 hover:shadow-md hover:shadow-slate-500/20 peer-checked:border-slate-500 peer-checked:shadow-lg peer-checked:shadow-slate-500/30',
    label: 'TikTok', desc: 'Connect to TikTok API.',
  },
  {
    value: 'reddit', category: 'social',
    img: '/images/app/reddit.png',
    border: 'hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/20 peer-checked:border-orange-500 peer-checked:shadow-lg peer-checked:shadow-orange-500/30',
    label: 'Reddit', desc: 'Connect to Reddit API.',
  },
  {
    value: 'linkedin', category: 'social',
    img: '/images/app/linkedin.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'LinkedIn', desc: 'Connect to LinkedIn API.',
  },
  {
    value: 'youtube', category: 'social',
    img: '/images/app/youtube.png',
    border: 'hover:border-red-400 hover:shadow-md hover:shadow-red-500/20 peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-500/30',
    label: 'YouTube', desc: 'Connect to YouTube API.',
  },
  {
    value: 'whatsappbusiness', category: 'social',
    img: '/images/app/whatsappbusiness.png',
    border: 'hover:border-green-400 hover:shadow-md hover:shadow-green-500/20 peer-checked:border-green-500 peer-checked:shadow-lg peer-checked:shadow-green-500/30',
    label: 'WhatsApp Business', desc: 'Connect to WhatsApp Business API.',
  },
  {
    value: 'x-threads', category: 'social',
    img: '/images/app/threads.png',
    border: 'hover:border-slate-400 hover:shadow-md hover:shadow-slate-500/20 peer-checked:border-slate-500 peer-checked:shadow-lg peer-checked:shadow-slate-500/30',
    label: 'Threads', desc: 'Connect to Threads API.',
  },
  {
    value: 'telegram', category: 'social',
    img: '/images/app/telegram.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Telegram', desc: 'Connect to Telegram Bot API.',
  },
  {
    value: 'spotify', category: 'api',
    img: '/images/app/spotify.png',
    border: 'hover:border-green-400 hover:shadow-md hover:shadow-green-500/20 peer-checked:border-green-500 peer-checked:shadow-lg peer-checked:shadow-green-500/30',
    label: 'Spotify', desc: 'Connect to Spotify API.',
  },
  {
    value: 'sonos', category: 'api',
    img: '/images/app/sonos.png',
    border: 'hover:border-slate-400 hover:shadow-md hover:shadow-slate-500/20 peer-checked:border-slate-500 peer-checked:shadow-lg peer-checked:shadow-slate-500/30',
    label: 'Sonos', desc: 'Connect to Sonos API.',
  },
  {
    value: 'shazam', category: 'social',
    img: '/images/app/shazam.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Shazam', desc: 'Connect to Shazam API.',
  },
  {
    value: 'philipshue', category: 'api',
    img: '/images/app/philipshue.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Philips Hue', desc: 'Control Philips Hue lights.',
  },
  {
    value: 'eightsleep', category: 'api',
    img: '/images/app/eightsleep.png',
    border: 'hover:border-slate-400 hover:shadow-md hover:shadow-slate-500/20 peer-checked:border-slate-500 peer-checked:shadow-lg peer-checked:shadow-slate-500/30',
    label: '8Sleep', desc: 'Connect to 8Sleep API.',
  },
  {
    value: 'homeassistant', category: 'api',
    img: '/images/app/homeassistant.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Home Assistant', desc: 'Connect to Home Assistant.',
  },
  {
    value: 'applenotes', category: 'productivity',
    img: '/images/app/applenotes.png',
    border: 'hover:border-yellow-400 hover:shadow-md hover:shadow-yellow-500/20 peer-checked:border-yellow-500 peer-checked:shadow-lg peer-checked:shadow-yellow-500/30',
    label: 'Apple Notes', desc: 'Access Apple Notes.',
  },
  {
    value: 'applereminders', category: 'productivity',
    img: '/images/app/applereminders.png',
    border: 'hover:border-red-400 hover:shadow-md hover:shadow-red-500/20 peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-500/30',
    label: 'Apple Reminders', desc: 'Access Apple Reminders.',
  },
  {
    value: 'things3', category: 'productivity',
    img: '/images/app/things3.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Things 3', desc: 'Connect to Things 3.',
  },
  {
    value: 'obsidian', category: 'productivity',
    img: '/images/app/obsidian.png',
    border: 'hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/20 peer-checked:border-purple-500 peer-checked:shadow-lg peer-checked:shadow-purple-500/30',
    label: 'Obsidian', desc: 'Connect to Obsidian.',
  },
  {
    value: 'bearnotes', category: 'productivity',
    img: '/images/app/bearnotes.png',
    border: 'hover:border-red-400 hover:shadow-md hover:shadow-red-500/20 peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-500/30',
    label: 'Bear Notes', desc: 'Access Bear Notes.',
  },
  {
    value: 'imessage', category: 'social',
    img: '/images/app/imessage.png',
    border: 'hover:border-green-400 hover:shadow-md hover:shadow-green-500/20 peer-checked:border-green-500 peer-checked:shadow-lg peer-checked:shadow-green-500/30',
    label: 'iMessage', desc: 'Connect to iMessage.',
  },
  {
    value: 'zoom', category: 'social',
    img: '/images/app/zoom.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Zoom', desc: 'Connect to Zoom API.',
  },
  {
    value: 'microsoftteams', category: 'social',
    img: '/images/app/microsoftteams.png',
    border: 'hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/20 peer-checked:border-purple-500 peer-checked:shadow-lg peer-checked:shadow-purple-500/30',
    label: 'Microsoft Teams', desc: 'Connect to Teams API.',
  },
  {
    value: 'signal', category: 'social',
    img: '/images/app/signal.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Signal', desc: 'Connect to Signal.',
  },

  // AI
  {
    value: 'openai', category: 'ai',
    img: '/images/app/openai.png',
    border: 'hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-500/20 peer-checked:border-emerald-500 peer-checked:shadow-lg peer-checked:shadow-emerald-500/30',
    label: 'OpenAI', desc: 'Connect to OpenAI API.',
  },
  {
    value: 'claude', category: 'ai',
    img: '/images/app/claude.png',
    border: 'hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/20 peer-checked:border-amber-500 peer-checked:shadow-lg peer-checked:shadow-amber-500/30',
    label: 'Claude (Anthropic)', desc: 'Connect to Claude API.',
  },
  {
    value: 'gemini', category: 'ai',
    img: '/images/app/gemini.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Google Gemini', desc: 'Connect to Gemini API.',
  },
  {
    value: 'grok', category: 'ai',
    img: '/images/app/grok.png',
    border: 'hover:border-slate-400 hover:shadow-md hover:shadow-slate-500/20 peer-checked:border-slate-500 peer-checked:shadow-lg peer-checked:shadow-slate-500/30',
    label: 'Grok (xAI)', desc: 'Connect to Grok API.',
  },
  {
    value: 'mistral', category: 'ai',
    img: '/images/app/mistral.png',
    border: 'hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/20 peer-checked:border-orange-500 peer-checked:shadow-lg peer-checked:shadow-orange-500/30',
    label: 'Mistral', desc: 'Connect to Mistral AI.',
  },
  {
    value: 'cohere', category: 'ai',
    img: '/images/app/cohere.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Cohere', desc: 'Connect to Cohere API.',
  },
  {
    value: 'perplexity', category: 'ai',
    img: '/images/app/perplexity.png',
    border: 'hover:border-teal-400 hover:shadow-md hover:shadow-teal-500/20 peer-checked:border-teal-500 peer-checked:shadow-lg peer-checked:shadow-teal-500/30',
    label: 'Perplexity', desc: 'Connect to Perplexity API.',
  },
  {
    value: 'together', category: 'ai',
    img: '/images/app/together.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Together AI', desc: 'Connect to Together AI.',
  },
  {
    value: 'fireworks', category: 'ai',
    img: '/images/app/fireworks.png',
    border: 'hover:border-red-400 hover:shadow-md hover:shadow-red-500/20 peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-500/30',
    label: 'Fireworks', desc: 'Connect to Fireworks AI.',
  },
  {
    value: 'groq', category: 'ai',
    img: '/images/app/groq.png',
    border: 'hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/20 peer-checked:border-orange-500 peer-checked:shadow-lg peer-checked:shadow-orange-500/30',
    label: 'Groq', desc: 'Connect to Groq API.',
  },
  {
    value: 'openrouter', category: 'ai',
    img: '/images/app/openrouter.png',
    border: 'hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/20 peer-checked:border-purple-500 peer-checked:shadow-lg peer-checked:shadow-purple-500/30',
    label: 'OpenRouter', desc: 'Connect to OpenRouter.',
  },
  {
    value: 'deepseek', category: 'ai',
    img: '/images/app/deepseek.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'DeepSeek', desc: 'Connect to DeepSeek API.',
  },
  {
    value: 'azure-openai', category: 'ai',
    img: '/images/app/azure_openai.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Azure OpenAI', desc: 'Connect to Azure OpenAI.',
  },
  {
    value: 'falai', category: 'ai',
    img: '/images/app/falai.png',
    border: 'hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/20 peer-checked:border-purple-500 peer-checked:shadow-lg peer-checked:shadow-purple-500/30',
    label: 'fal.ai', desc: 'Connect to fal.ai API.',
  },
  {
    value: 'huggingface', category: 'ai',
    img: '/images/app/huggingface.png',
    border: 'hover:border-yellow-400 hover:shadow-md hover:shadow-yellow-500/20 peer-checked:border-yellow-500 peer-checked:shadow-lg peer-checked:shadow-yellow-500/30',
    label: 'Hugging Face', desc: 'Connect to Hugging Face.',
  },
  {
    value: 'llama', category: 'ai',
    img: '/images/app/llama.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Llama (Ollama)', desc: 'Run Llama models locally.',
  },

  // Infra
  {
    value: 'docker', category: 'infra',
    img: '/images/app/docker.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Docker', desc: 'Manage Docker containers.',
  },
  {
    value: 'kubernetes', category: 'infra',
    img: '/images/app/kubernetes.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Kubernetes', desc: 'Manage Kubernetes clusters.',
  },
  {
    value: 'openshift', category: 'infra',
    img: '/images/app/openshift.png',
    border: 'hover:border-red-400 hover:shadow-md hover:shadow-red-500/20 peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-500/30',
    label: 'OpenShift', desc: 'Manage OpenShift clusters.',
  },
  {
    value: 'jenkins', category: 'infra',
    img: '/images/app/jenkins.png',
    border: 'hover:border-red-400 hover:shadow-md hover:shadow-red-500/20 peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-500/30',
    label: 'Jenkins', desc: 'Connect to Jenkins API.',
  },
  {
    value: 'dockerhub', category: 'infra',
    img: '/images/app/dockerhub.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Docker Hub', desc: 'Connect to Docker Hub.',
  },
  {
    value: 'prometheus', category: 'infra',
    img: '/images/app/prometheus.png',
    border: 'hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/20 peer-checked:border-orange-500 peer-checked:shadow-lg peer-checked:shadow-orange-500/30',
    label: 'Prometheus', desc: 'Connect to Prometheus.',
  },
  {
    value: 'grafana', category: 'infra',
    img: '/images/app/grafana.png',
    border: 'hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/20 peer-checked:border-orange-500 peer-checked:shadow-lg peer-checked:shadow-orange-500/30',
    label: 'Grafana', desc: 'Connect to Grafana.',
  },
  {
    value: 'npm', category: 'infra',
    img: '/images/app/npm.png',
    border: 'hover:border-red-400 hover:shadow-md hover:shadow-red-500/20 peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-500/30',
    label: 'npm', desc: 'Search npm packages.',
  },
  {
    value: 'nuget', category: 'infra',
    img: '/images/app/nuget.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'NuGet', desc: 'Search NuGet packages.',
  },
  {
    value: 'maven', category: 'infra',
    img: '/images/app/maven.png',
    border: 'hover:border-red-400 hover:shadow-md hover:shadow-red-500/20 peer-checked:border-red-500 peer-checked:shadow-lg peer-checked:shadow-red-500/30',
    label: 'Maven', desc: 'Search Maven packages.',
  },
  {
    value: 'gradle', category: 'infra',
    img: '/images/app/gradle.png',
    border: 'hover:border-green-400 hover:shadow-md hover:shadow-green-500/20 peer-checked:border-green-500 peer-checked:shadow-lg peer-checked:shadow-green-500/30',
    label: 'Gradle', desc: 'Search Gradle plugins.',
  },
  {
    value: 'nexus', category: 'infra',
    img: '/images/app/nexus.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'Nexus', desc: 'Connect to Nexus repository.',
  },
  {
    value: 'elasticsearch', category: 'infra',
    img: '/images/app/elasticsearch.png',
    border: 'hover:border-yellow-500 hover:shadow-md hover:shadow-yellow-600/20 peer-checked:border-yellow-600 peer-checked:shadow-lg peer-checked:shadow-yellow-600/30',
    label: 'Elasticsearch', desc: 'Connect to Elasticsearch',
  },
  {
    value: 'opensearch', category: 'infra',
    img: '/images/app/opensearch.png',
    border: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/20 peer-checked:border-blue-500 peer-checked:shadow-lg peer-checked:shadow-blue-500/30',
    label: 'OpenSearch', desc: 'Connect to OpenSearch',
  },
];

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTER_TABS: { label: string; value: Category }[] = [
  { label: 'All',          value: 'all' },
  { label: 'Files',        value: 'file' },
  { label: 'Database',     value: 'database' },
  { label: 'API',          value: 'api' },
  { label: 'Web',          value: 'web' },
  { label: 'AI',           value: 'ai' },
  { label: 'Productivity', value: 'productivity' },
  { label: 'Social',       value: 'social' },
  { label: 'Infra',        value: 'infra' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CardProps {
  source: DataSourceDef;
  selected: boolean;
  onPremRestricted: boolean;
  onSelect: (value: DataSourceTypeValue) => void;
  onNext: () => void;
}

function DataSourceCard({ source, selected, onPremRestricted, onSelect, onNext }: CardProps) {
  const { value, label, desc, border, icon, iconBg, img } = source;

  const restrictedClasses = onPremRestricted
    ? 'opacity-70 grayscale cursor-not-allowed'
    : 'cursor-pointer';

  return (
    <label data-role="data-source-card" className={`group relative ${restrictedClasses}`}>
      <input
        type="radio"
        name="dataSourceType"
        value={value}
        className="peer sr-only"
        checked={selected}
        disabled={onPremRestricted}
        onChange={() => {
          if (!onPremRestricted) onSelect(value);
        }}
      />
      <div
        className={[
          'relative p-6 rounded-xl border border-slate-200 shadow-sm bg-slate-50 transition-all h-full',
          onPremRestricted
            ? ''
            : `hover:bg-white ${border}`,
          selected && !onPremRestricted ? 'bg-white' : '',
        ].join(' ')}
      >
        {/* Icon / Image */}
        <div className="w-12 h-12 rounded-lg shadow-sm flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
          {img ? (
            <img src={img} alt={label} className="w-12 h-12 object-contain rounded-lg" />
          ) : (
            <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center`}>
              <i className={`${icon} text-2xl`} />
            </div>
          )}
        </div>

        <h4 className="font-bold text-slate-900 mb-1">{label}</h4>
        <p className="text-xs text-slate-500">{desc}</p>

        {/* Selected badge: check + go-next arrow */}
        {selected && !onPremRestricted && (
          <span className="absolute top-3 right-3 h-8 px-2 rounded-full bg-emerald-500 text-white shadow-md inline-flex items-center justify-center gap-1">
            <i className="fas fa-check text-xs" />
            <button
              type="button"
              title="Go to next step"
              className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-white/20 hover:bg-white/30"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNext();
              }}
            >
              <i className="fas fa-arrow-right text-[10px]" />
            </button>
          </span>
        )}
      </div>

      {/* ON-PREM badge */}
      {onPremRestricted && (
        <div className="absolute top-2 right-2 bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border border-amber-200">
          ON-PREM
        </div>
      )}
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Step1Props {
  onNext: () => void;
}

export function Step1DataSource({ onNext }: Step1Props) {
  const selectedType    = useGenerateStore((s) => s.selectedType);
  const isSaas          = useGenerateStore((s) => s.isSaasDeployMode);
  const onPremOnlyTypes = useGenerateStore((s) => s.onPremOnlyTypes);
  const setSelectedType = useGenerateStore((s) => s.setSelectedType);

  const [activeFilter, setActiveFilter] = useState<Category>('all');
  const [searchQuery, setSearchQuery]   = useState('');

  const filteredSources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DATA_SOURCES.filter((src) => {
      const matchesCategory =
        activeFilter === 'all' || src.category === activeFilter;
      const matchesSearch =
        !q ||
        src.label.toLowerCase().includes(q) ||
        src.desc.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activeFilter, searchQuery]);

  const isRestricted = (value: DataSourceTypeValue) =>
    isSaas && onPremOnlyTypes.has(value);

  const canProceed =
    selectedType !== null && !isRestricted(selectedType);

  return (
    <div id="wizard-step-1">
      {/* Header */}
      <div className="bg-slate-50/50 p-6 border-b border-slate-200/60">
        <h3 className="text-lg font-bold text-slate-900">Choose Data Source</h3>
        <p className="text-sm text-slate-500">Select how you want to import your data.</p>
      </div>

      <div className="p-8 space-y-8">
        {/* Filter bar + search in one row */}
        <div className="flex flex-wrap items-center gap-2 -mt-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveFilter(tab.value)}
              className={[
                'template-filter px-3 py-1.5 rounded-lg border text-sm transition-colors',
                activeFilter === tab.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto w-full md:w-64 relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 py-2"
            />
          </div>
        </div>

        {/* Grid */}
        {filteredSources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {filteredSources.map((src) => (
              <DataSourceCard
                key={src.value}
                source={src}
                selected={selectedType === src.value}
                onPremRestricted={isRestricted(src.value)}
                onSelect={setSelectedType}
                onNext={onNext}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <i className="fas fa-search text-3xl mb-3 block opacity-40" />
            <p className="font-medium">No data sources found</p>
            <p className="text-sm mt-1">Try adjusting your filter or search term.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="button"
            id="next-to-step-2"
            onClick={onNext}
            disabled={!canProceed}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
          >
            Next Step <i className="fas fa-arrow-right ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useGenerateStore } from '../store/useGenerateStore';
import { DataSourceType, isDatabase, isConnectionTemplateSource } from '../types';
import { DatabaseConfig } from '../config-forms/DatabaseConfig';
import { FileUploadConfig } from '../config-forms/FileUploadConfig';
import { MongoDBConfig } from '../config-forms/MongoDBConfig';
import { RestApiConfig } from '../config-forms/RestApiConfig';
import { WebPageConfig } from '../config-forms/WebPageConfig';
import { CurlConfig } from '../config-forms/CurlConfig';
import { GraphQLConfig } from '../config-forms/GraphQLConfig';
import { SOAPConfig } from '../config-forms/SOAPConfig';
import { GitHubConfig } from '../config-forms/GitHubConfig';
import { LocalFSConfig } from '../config-forms/LocalFSConfig';
import { SlackConfig } from '../config-forms/SlackConfig';
import { DiscordConfig } from '../config-forms/DiscordConfig';
import { EmailConfig } from '../config-forms/EmailConfig';
import { GmailConfig } from '../config-forms/GmailConfig';
import { AIModelConfig } from '../config-forms/AIModelConfig';
import { InfraConfig } from '../config-forms/InfraConfig';
import { ProductivityConfig } from '../config-forms/ProductivityConfig';
import { SocialConfig } from '../config-forms/SocialConfig';

const AI_TYPES = new Set([
  DataSourceType.OpenAI, DataSourceType.Claude, DataSourceType.Gemini, DataSourceType.Grok,
  DataSourceType.FalAI, DataSourceType.HuggingFace, DataSourceType.Llama, DataSourceType.DeepSeek,
  DataSourceType.AzureOpenAI, DataSourceType.Mistral, DataSourceType.Cohere,
  DataSourceType.Perplexity, DataSourceType.Together, DataSourceType.Fireworks,
  DataSourceType.Groq, DataSourceType.OpenRouter,
]);

const INFRA_TYPES = new Set([
  DataSourceType.Docker, DataSourceType.Kubernetes, DataSourceType.OpenShift,
  DataSourceType.Prometheus, DataSourceType.Grafana, DataSourceType.Jenkins,
  DataSourceType.DockerHub, DataSourceType.Elasticsearch, DataSourceType.OpenSearch,
  DataSourceType.Npm, DataSourceType.Nuget, DataSourceType.Maven, DataSourceType.Gradle,
  DataSourceType.Nexus, DataSourceType.N8n,
]);

const PRODUCTIVITY_TYPES = new Set([
  DataSourceType.Supabase, DataSourceType.Trello, DataSourceType.GitLab,
  DataSourceType.Bitbucket, DataSourceType.GDrive, DataSourceType.GoogleCalendar,
  DataSourceType.GoogleDocs, DataSourceType.GoogleSheets, DataSourceType.Airtable,
  DataSourceType.Asana, DataSourceType.Monday, DataSourceType.ClickUp,
  DataSourceType.Linear, DataSourceType.Dropbox, DataSourceType.Jira,
  DataSourceType.Confluence, DataSourceType.Notion,
]);

const SOCIAL_TYPES = new Set([
  DataSourceType.X, DataSourceType.Facebook, DataSourceType.Instagram, DataSourceType.TikTok,
  DataSourceType.Reddit, DataSourceType.LinkedIn, DataSourceType.YouTube,
  DataSourceType.WhatsAppBusiness, DataSourceType.Threads, DataSourceType.Telegram,
  DataSourceType.Spotify, DataSourceType.Sonos, DataSourceType.Shazam,
  DataSourceType.PhilipsHue, DataSourceType.EightSleep, DataSourceType.HomeAssistant,
  DataSourceType.AppleNotes, DataSourceType.AppleReminders, DataSourceType.Things3,
  DataSourceType.Obsidian, DataSourceType.BearNotes, DataSourceType.IMessage,
  DataSourceType.Zoom, DataSourceType.MicrosoftTeams, DataSourceType.Signal,
  DataSourceType.Rss,
]);

function getSourceLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function ConfigForm({ type }: { type: string }) {
  if (type === DataSourceType.CSV || type === DataSourceType.Excel) return <FileUploadConfig />;
  if (isDatabase(type as any) || isConnectionTemplateSource(type as any)) return <DatabaseConfig type={type} />;
  if (type === DataSourceType.MongoDB) return <MongoDBConfig />;
  if (type === DataSourceType.Rest) return <RestApiConfig />;
  if (type === DataSourceType.Webpage) return <WebPageConfig />;
  if (type === DataSourceType.Curl) return <CurlConfig />;
  if (type === DataSourceType.GraphQL) return <GraphQLConfig />;
  if (type === DataSourceType.Soap) return <SOAPConfig />;
  if (type === DataSourceType.GitHub) return <GitHubConfig />;
  if (type === DataSourceType.Slack) return <SlackConfig />;
  if (type === DataSourceType.Discord) return <DiscordConfig />;
  if (type === DataSourceType.Email) return <EmailConfig />;
  if (type === DataSourceType.Gmail) return <GmailConfig />;
  if (type === DataSourceType.Ftp) return <SocialConfig type={type} />;
  if (type === DataSourceType.LocalFS) return <LocalFSConfig />;
  if (AI_TYPES.has(type as any)) return <AIModelConfig type={type} />;
  if (INFRA_TYPES.has(type as any)) return <InfraConfig type={type} />;
  if (PRODUCTIVITY_TYPES.has(type as any)) return <ProductivityConfig type={type} />;
  if (SOCIAL_TYPES.has(type as any)) return <SocialConfig type={type} />;
  return (
    <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
      Configuration for <strong>{getSourceLabel(type)}</strong> is not yet implemented.
    </div>
  );
}

interface Step2Props {
  onBack: () => void;
  onNext: () => Promise<void>;
  canProceed: boolean;
  isLoading: boolean;
}

export function Step2Config({ onBack, onNext, canProceed, isLoading }: Step2Props) {
  const { selectedType } = useGenerateStore();

  if (!selectedType) return null;

  return (
    <div id="wizard-step-2" className="wizard-step">
      <div className="bg-slate-50/50 p-6 border-b border-slate-200/60 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Template Configuration</h3>
          <p className="text-sm text-slate-500">Fill in the template fields for your data source.</p>
        </div>
      </div>
      <div id="wizard-step-2-content" className="p-8 space-y-6">
        <ConfigForm type={selectedType} />

        <div className="flex justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2"
          >
            <i className="fas fa-arrow-left mr-2" />
            Back
          </button>
          <button
            type="button"
            id="next-to-step-3"
            onClick={onNext}
            disabled={!canProceed || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2" />
                Loading...
              </>
            ) : (
              <>
                Preview Data <i className="fas fa-arrow-right ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

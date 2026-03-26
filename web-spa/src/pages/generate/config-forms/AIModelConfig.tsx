import { useGenerateStore } from '../store/useGenerateStore';

interface Props { type: string; }

function Field({ label, id, type = 'text', placeholder, value, onChange, readOnly }: {
  label: string; id?: string; type?: string; placeholder?: string;
  value: string; onChange?: (v: string) => void; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 uppercase mb-2">{label}</label>
      {readOnly ? (
        <div className="input bg-slate-50 text-slate-500 text-sm font-mono">{value}</div>
      ) : (
        <input id={id} type={type} className="input" placeholder={placeholder} value={value}
          autoComplete={type === 'password' ? 'new-password' : 'off'}
          onChange={(e) => onChange?.(e.target.value)} />
      )}
    </div>
  );
}

export function AIModelConfig({ type }: Props) {
  const store = useGenerateStore();
  const s = store;

  switch (type) {
    case 'openai':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" value="https://api.openai.com/v1" readOnly />
          <Field label="Model (optional)" placeholder="gpt-4o" value={s.openaiModel} onChange={(v) => s.setField('openaiModel', v)} />
          <Field label="API Key" type="password" id="openaiApiKey" placeholder="sk-..." value={s.openaiApiKey} onChange={(v) => s.setField('openaiApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 7 tools: chat, embeddings, moderations, images, audio_speech, audio_transcriptions, audio_translations</p>
        </div>
      );
    case 'claude':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" value="https://api.anthropic.com/v1" readOnly />
          <Field label="API Version" placeholder="2023-06-01" value={s.claudeApiVersion} onChange={(v) => s.setField('claudeApiVersion', v)} />
          <Field label="Model (optional)" placeholder="claude-opus-4-6" value={s.claudeModel} onChange={(v) => s.setField('claudeModel', v)} />
          <Field label="API Key" type="password" id="claudeApiKey" placeholder="sk-ant-..." value={s.claudeApiKey} onChange={(v) => s.setField('claudeApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 1 tool: chat</p>
        </div>
      );
    case 'gemini':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" value="https://generativelanguage.googleapis.com/v1beta" readOnly />
          <Field label="Model (optional)" placeholder="gemini-pro" value={s.geminiModel} onChange={(v) => s.setField('geminiModel', v)} />
          <Field label="API Key" type="password" id="geminiApiKey" value={s.geminiApiKey} onChange={(v) => s.setField('geminiApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 2 tools: chat, embeddings</p>
        </div>
      );
    case 'grok':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" value="https://api.x.ai/v1" readOnly />
          <Field label="Model (optional)" placeholder="grok-beta" value={s.grokModel} onChange={(v) => s.setField('grokModel', v)} />
          <Field label="API Key" type="password" id="grokApiKey" value={s.grokApiKey} onChange={(v) => s.setField('grokApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 2 tools: chat, images</p>
        </div>
      );
    case 'falai':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" placeholder="https://fal.run" value={s.falaiBaseUrl} onChange={(v) => s.setField('falaiBaseUrl', v)} />
          <Field label="API Key" type="password" id="falaiApiKey" value={s.falaiApiKey} onChange={(v) => s.setField('falaiApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: run_model, run_model_async, get_run_status, get_run_result, cancel_run</p>
        </div>
      );
    case 'huggingface':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" placeholder="https://router.huggingface.co/v1" value={s.huggingfaceBaseUrl} onChange={(v) => s.setField('huggingfaceBaseUrl', v)} />
          <Field label="API Key" type="password" id="huggingfaceApiKey" value={s.huggingfaceApiKey} onChange={(v) => s.setField('huggingfaceApiKey', v)} />
          <Field label="Default Model (optional)" placeholder="meta-llama/Llama-3.1-8B-Instruct" value={s.huggingfaceDefaultModel} onChange={(v) => s.setField('huggingfaceDefaultModel', v)} />
          <p className="text-xs text-slate-500">Creates 1 tool: chat_completion</p>
        </div>
      );
    case 'llama':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Ollama Base URL" placeholder="http://localhost:11434" value={s.llamaBaseUrl} onChange={(v) => s.setField('llamaBaseUrl', v)} />
          <Field label="Model (optional)" placeholder="llama3" value={s.llamaModel} onChange={(v) => s.setField('llamaModel', v)} />
          <p className="text-xs text-slate-500">Creates 3 tools: chat, generate, embeddings</p>
        </div>
      );
    case 'deepseek':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" placeholder="https://api.deepseek.com/v1" value={s.deepseekBaseUrl} onChange={(v) => s.setField('deepseekBaseUrl', v)} />
          <Field label="Model (optional)" placeholder="deepseek-chat" value={s.deepseekModel} onChange={(v) => s.setField('deepseekModel', v)} />
          <Field label="API Key" type="password" id="deepseekApiKey" value={s.deepseekApiKey} onChange={(v) => s.setField('deepseekApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 2 tools: chat, embeddings</p>
        </div>
      );
    case 'azure-openai':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Azure Endpoint" id="azureOpenAIBaseUrl" placeholder="https://{resource}.openai.azure.com" value={s.azureOpenAIBaseUrl} onChange={(v) => s.setField('azureOpenAIBaseUrl', v)} />
          <Field label="API Version" id="azureOpenAIApiVersion" placeholder="2024-02-15-preview" value={s.azureOpenAIApiVersion} onChange={(v) => s.setField('azureOpenAIApiVersion', v)} />
          <Field label="Deployment Name" id="azureOpenAIDeployment" placeholder="gpt-4o" value={s.azureOpenAIDeployment} onChange={(v) => s.setField('azureOpenAIDeployment', v)} />
          <Field label="API Key" type="password" id="azureOpenAIApiKey" value={s.azureOpenAIApiKey} onChange={(v) => s.setField('azureOpenAIApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 2 tools: chat, embeddings</p>
        </div>
      );
    case 'mistral':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" id="mistralBaseUrl" placeholder="https://api.mistral.ai/v1" value={s.mistralBaseUrl} onChange={(v) => s.setField('mistralBaseUrl', v)} />
          <Field label="Model (optional)" id="mistralModel" placeholder="mistral-large-latest" value={s.mistralModel} onChange={(v) => s.setField('mistralModel', v)} />
          <Field label="API Key" type="password" id="mistralApiKey" value={s.mistralApiKey} onChange={(v) => s.setField('mistralApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 2 tools: chat, embeddings</p>
        </div>
      );
    case 'cohere':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" id="cohereBaseUrl" placeholder="https://api.cohere.ai/v1" value={s.cohereBaseUrl} onChange={(v) => s.setField('cohereBaseUrl', v)} />
          <Field label="Model (optional)" id="cohereModel" placeholder="command-r-plus" value={s.cohereModel} onChange={(v) => s.setField('cohereModel', v)} />
          <Field label="API Key" type="password" id="cohereApiKey" value={s.cohereApiKey} onChange={(v) => s.setField('cohereApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 2 tools: chat, embeddings</p>
        </div>
      );
    case 'perplexity':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" id="perplexityBaseUrl" placeholder="https://api.perplexity.ai" value={s.perplexityBaseUrl} onChange={(v) => s.setField('perplexityBaseUrl', v)} />
          <Field label="Model (optional)" id="perplexityModel" placeholder="llama-3.1-sonar-large-128k-online" value={s.perplexityModel} onChange={(v) => s.setField('perplexityModel', v)} />
          <Field label="API Key" type="password" id="perplexityApiKey" value={s.perplexityApiKey} onChange={(v) => s.setField('perplexityApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 1 tool: chat</p>
        </div>
      );
    case 'together':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" id="togetherBaseUrl" placeholder="https://api.together.xyz/v1" value={s.togetherBaseUrl} onChange={(v) => s.setField('togetherBaseUrl', v)} />
          <Field label="Model (optional)" id="togetherModel" placeholder="meta-llama/Llama-3-8b-chat-hf" value={s.togetherModel} onChange={(v) => s.setField('togetherModel', v)} />
          <Field label="API Key" type="password" id="togetherApiKey" value={s.togetherApiKey} onChange={(v) => s.setField('togetherApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 2 tools: chat, embeddings</p>
        </div>
      );
    case 'fireworks':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" id="fireworksBaseUrl" placeholder="https://api.fireworks.ai/inference/v1" value={s.fireworksBaseUrl} onChange={(v) => s.setField('fireworksBaseUrl', v)} />
          <Field label="Model (optional)" id="fireworksModel" placeholder="accounts/fireworks/models/llama-v3p1-8b-instruct" value={s.fireworksModel} onChange={(v) => s.setField('fireworksModel', v)} />
          <Field label="API Key" type="password" id="fireworksApiKey" value={s.fireworksApiKey} onChange={(v) => s.setField('fireworksApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 2 tools: chat, embeddings</p>
        </div>
      );
    case 'groq':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" id="groqBaseUrl" placeholder="https://api.groq.com/openai/v1" value={s.groqBaseUrl} onChange={(v) => s.setField('groqBaseUrl', v)} />
          <Field label="Model (optional)" id="groqModel" placeholder="llama-3.3-70b-versatile" value={s.groqModel} onChange={(v) => s.setField('groqModel', v)} />
          <Field label="API Key" type="password" id="groqApiKey" value={s.groqApiKey} onChange={(v) => s.setField('groqApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 1 tool: chat</p>
        </div>
      );
    case 'openrouter':
      return (
        <div className="space-y-4 mt-6">
          <Field label="Base URL" id="openrouterBaseUrl" placeholder="https://openrouter.ai/api/v1" value={s.openrouterBaseUrl} onChange={(v) => s.setField('openrouterBaseUrl', v)} />
          <Field label="Model (optional)" id="openrouterModel" placeholder="openai/gpt-4o" value={s.openrouterModel} onChange={(v) => s.setField('openrouterModel', v)} />
          <Field label="API Key" type="password" id="openrouterApiKey" value={s.openrouterApiKey} onChange={(v) => s.setField('openrouterApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 1 tool: chat</p>
        </div>
      );
    default:
      return null;
  }
}

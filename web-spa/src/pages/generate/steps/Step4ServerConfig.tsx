import { useEffect, useRef } from 'react';
import { useGenerateStore } from '../store/useGenerateStore';

interface Step4Props {
  onBack: () => void;
  onGenerate: () => Promise<void>;
}

export function Step4ServerConfig({ onBack, onGenerate }: Step4Props) {
  const {
    serverName, serverDescription, serverVersion,
    nameValidation, generateLoading, generateError, generateSuccess,
    setField, setNameValidation,
  } = useGenerateStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const name = serverName.trim();
    if (!name) {
      setNameValidation({ available: null, message: '' });
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/servers/check-name/${encodeURIComponent(name)}`);
        const data = await res.json();
        if (data.success) {
          setNameValidation({
            available: !!data.available,
            message: data.available ? '✓ Server name is available' : '✗ Server name already exists',
          });
        }
      } catch {
        setNameValidation({ available: null, message: '' });
      }
    }, 500);
  }, [serverName]);

  const validationClass =
    nameValidation.available === true
      ? 'text-green-600'
      : nameValidation.available === false
      ? 'text-red-600'
      : 'text-slate-500';

  return (
    <div id="wizard-step-4" className="wizard-step">
      <div className="bg-slate-50/50 p-6 border-b border-slate-200/60">
        <h3 className="text-lg font-bold text-slate-900">Final Configuration</h3>
        <p className="text-sm text-slate-500">Set your server details and generate.</p>
      </div>
      <div className="p-8 space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Server Name</label>
          <input
            type="text"
            id="serverName"
            className="input"
            placeholder="my-mcp-server"
            value={serverName}
            onChange={(e) => setField('serverName', e.target.value)}
          />
          {nameValidation.message && (
            <div id="name-validation" className={`mt-2 text-sm ${validationClass}`}>
              {nameValidation.message}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Description</label>
          <textarea
            id="serverDescription"
            rows={3}
            className="input resize-none"
            placeholder="What does this server do?"
            value={serverDescription}
            onChange={(e) => setField('serverDescription', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Version</label>
          <input
            type="text"
            id="serverVersion"
            className="input"
            value={serverVersion}
            onChange={(e) => setField('serverVersion', e.target.value)}
          />
        </div>

        {generateLoading && (
          <div id="generate-loading" className="text-center py-8">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-purple-600">Generating server code...</p>
          </div>
        )}

        {generateSuccess && (
          <div id="generate-success" className="p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
            {generateSuccess}
          </div>
        )}

        {generateError && (
          <div id="generate-error" className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            {generateError}
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            id="back-to-step-3"
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2"
          >
            <i className="fas fa-arrow-left mr-2" />
            Back
          </button>
          <button
            type="button"
            id="generateBtn"
            onClick={onGenerate}
            disabled={generateLoading || !serverName.trim()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-purple-500/30 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-rocket mr-2" />
            Generate Server
          </button>
        </div>
      </div>
    </div>
  );
}

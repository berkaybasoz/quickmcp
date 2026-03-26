import { useEffect, useRef } from 'react';
import { useGenerateStore } from '../store/useGenerateStore';

export function CurlConfig() {
  const {
    curlToolAlias, curlAliasValidation, curlMode,
    curlCommand, curlUrl, curlMethod, curlHeaders, curlBody,
    setField, setCurlAliasValidation,
  } = useGenerateStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const alias = curlToolAlias.trim();
    if (!alias) {
      setCurlAliasValidation({ available: null, message: '' });
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-tool-name/${encodeURIComponent(alias)}`);
        const data = await res.json();
        if (data.success) {
          setCurlAliasValidation({
            available: !!data.available,
            message: data.available ? '✓ Alias is available' : '✗ Alias already exists',
          });
        }
      } catch {
        setCurlAliasValidation({ available: null, message: '' });
      }
    }, 500);
  }, [curlToolAlias]);

  const validationClass =
    curlAliasValidation.available === true
      ? 'text-green-600'
      : curlAliasValidation.available === false
      ? 'text-red-600'
      : '';

  return (
    <div className="space-y-4 mt-6">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Tool Alias</label>
        <input
          type="text"
          className="input"
          placeholder="my_tool"
          value={curlToolAlias}
          onChange={(e) => setField('curlToolAlias', e.target.value)}
        />
        {curlAliasValidation.message && (
          <div className={`mt-1 text-xs ${validationClass}`}>{curlAliasValidation.message}</div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setField('curlMode', 'paste')}
          className={`flex-1 py-1.5 text-sm rounded-md transition-all ${
            curlMode === 'paste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          Paste cURL
        </button>
        <button
          type="button"
          onClick={() => setField('curlMode', 'manual')}
          className={`flex-1 py-1.5 text-sm rounded-md transition-all ${
            curlMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          Manual
        </button>
      </div>

      {curlMode === 'paste' ? (
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
            cURL Command
          </label>
          <textarea
            className="input resize-none font-mono text-sm"
            rows={4}
            placeholder={"curl -X POST https://api.example.com/data \\\n  -H 'Authorization: Bearer token' \\\n  -d '{\"key\":\"value\"}'"}
            value={curlCommand}
            onChange={(e) => setField('curlCommand', e.target.value)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">URL</label>
            <input
              type="url"
              className="input"
              placeholder="https://api.example.com/endpoint"
              value={curlUrl}
              onChange={(e) => setField('curlUrl', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Method</label>
            <select
              className="input"
              value={curlMethod}
              onChange={(e) => setField('curlMethod', e.target.value)}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Headers (JSON, optional)
            </label>
            <textarea
              className="input resize-none font-mono text-sm"
              rows={3}
              placeholder={'{"Authorization": "Bearer token"}'}
              value={curlHeaders}
              onChange={(e) => setField('curlHeaders', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Body (JSON, optional)
            </label>
            <textarea
              className="input resize-none font-mono text-sm"
              rows={3}
              placeholder={'{"key": "value"}'}
              value={curlBody}
              onChange={(e) => setField('curlBody', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

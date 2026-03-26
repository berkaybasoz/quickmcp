import { useGenerateStore } from '../store/useGenerateStore';

export function CurlConfig() {
  const {
    curlMode,
    curlCommand, curlUrl, curlMethod, curlHeaders, curlBody,
    setField,
  } = useGenerateStore();

  return (
    <div id="curl-section" className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          id="curlPasteTab"
          type="button"
          onClick={() => setField('curlMode', 'paste')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            curlMode === 'paste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Paste cURL Command
        </button>
        <button
          id="curlManualTab"
          type="button"
          onClick={() => setField('curlMode', 'manual')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            curlMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Manual Configuration
        </button>
      </div>

      {curlMode === 'paste' ? (
        <div id="curlPasteMode" className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">cURL Command</label>
            <textarea
              id="curlCommand"
              rows={6}
              className="input font-mono text-xs"
              placeholder={'curl -X GET "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT" \\\n  -H "Accept: application/json"'}
              value={curlCommand}
              onChange={(e) => setField('curlCommand', e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-2">Paste your curl command here. We'll parse it automatically.</p>
          </div>
        </div>
      ) : (
        <div id="curlManualMode" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Request URL</label>
              <input
                type="text"
                autoComplete="off"
                id="curlUrl"
                placeholder="https://api.example.com/data"
                className="input"
                value={curlUrl}
                onChange={(e) => setField('curlUrl', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Method</label>
              <select
                id="curlMethod"
                className="input"
                value={curlMethod}
                onChange={(e) => setField('curlMethod', e.target.value)}
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
                <option>PATCH</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Headers (JSON)</label>
            <textarea
              id="curlHeaders"
              rows={3}
              className="input font-mono text-xs"
              placeholder={'{ "Authorization": "Bearer ..." }'}
              value={curlHeaders}
              onChange={(e) => setField('curlHeaders', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Body (JSON)</label>
            <textarea
              id="curlBody"
              rows={4}
              className="input font-mono text-xs"
              placeholder={'{ "key": "value" }'}
              value={curlBody}
              onChange={(e) => setField('curlBody', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import { useGenerateStore } from '../store/useGenerateStore';

export function WebPageConfig() {
  const { webUrl, setField } = useGenerateStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Web Page URL</label>
        <input
          type="text"
          autoComplete="off"
          id="webUrl"
          className="input"
          placeholder="https://example.com"
          value={webUrl}
          onChange={(e) => setField('webUrl', e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-2">The URL of the web page to fetch.</p>
      </div>
      <div id="web-parse-error" className="hidden p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm" />
    </div>
  );
}

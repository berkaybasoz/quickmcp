import { useEffect, useRef } from 'react';
import { useGenerateStore } from '../store/useGenerateStore';

export function WebPageConfig() {
  const { webUrl, webToolAlias, webAliasValidation, setField, setWebAliasValidation } =
    useGenerateStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const alias = webToolAlias.trim();
    if (!alias) {
      setWebAliasValidation({ available: null, message: '' });
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-tool-name/${encodeURIComponent(alias)}`);
        const data = await res.json();
        if (data.success) {
          setWebAliasValidation({
            available: !!data.available,
            message: data.available ? '✓ Alias is available' : '✗ Alias already exists',
          });
        }
      } catch {
        setWebAliasValidation({ available: null, message: '' });
      }
    }, 500);
  }, [webToolAlias]);

  const validationClass =
    webAliasValidation.available === true
      ? 'text-green-600'
      : webAliasValidation.available === false
      ? 'text-red-600'
      : '';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Tool Name (Alias)</label>
        <input
          type="text"
          id="webToolAlias"
          className="input"
          placeholder="e.g., get_documentation_page"
          value={webToolAlias}
          onChange={(e) => setField('webToolAlias', e.target.value)}
        />
        <div id="web-alias-validation" className={`mt-2 text-xs ${validationClass}`}>
          {webAliasValidation.message}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Required. Use lowercase letters, numbers, and underscores only. This must be unique.
        </p>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Web Page URL</label>
        <input
          type="text"
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

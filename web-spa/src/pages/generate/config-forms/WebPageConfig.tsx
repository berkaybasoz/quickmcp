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
    <div className="space-y-4 mt-6">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Tool Alias</label>
        <input
          type="text"
          className="input"
          placeholder="my_webpage"
          value={webToolAlias}
          onChange={(e) => setField('webToolAlias', e.target.value)}
        />
        {webAliasValidation.message && (
          <div className={`mt-1 text-xs ${validationClass}`}>{webAliasValidation.message}</div>
        )}
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          Web Page URL
        </label>
        <input
          type="url"
          className="input"
          placeholder="https://example.com"
          value={webUrl}
          onChange={(e) => setField('webUrl', e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-1">
          This tool will fetch the HTML content of the specified URL.
        </p>
      </div>
    </div>
  );
}

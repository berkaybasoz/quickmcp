import { useGenerateStore } from '../store/useGenerateStore';

export function RestApiConfig() {
  const { swaggerUrl, setField } = useGenerateStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          Swagger/OpenAPI URL
        </label>
        <input
          type="text"
          id="swaggerUrl"
          className="input"
          placeholder="https://petstore.swagger.io/v2/swagger.json"
          value={swaggerUrl}
          onChange={(e) => setField('swaggerUrl', e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-2">Publicly reachable OpenAPI/Swagger JSON URL.</p>
      </div>
      <div id="rest-parse-error" className="hidden p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm" />
    </div>
  );
}

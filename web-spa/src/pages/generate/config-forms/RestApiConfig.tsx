import { useGenerateStore } from '../store/useGenerateStore';

export function RestApiConfig() {
  const { swaggerUrl, setField } = useGenerateStore();

  return (
    <div className="space-y-4 mt-6">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          Swagger / OpenAPI URL
        </label>
        <input
          type="url"
          className="input"
          placeholder="https://petstore.swagger.io/v2/swagger.json"
          value={swaggerUrl}
          onChange={(e) => setField('swaggerUrl', e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-1">
          Enter the URL of your OpenAPI/Swagger JSON specification.
        </p>
      </div>
    </div>
  );
}

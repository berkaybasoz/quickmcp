import { useGenerateStore } from '../store/useGenerateStore';

export function GraphQLConfig() {
  const { graphqlBaseUrl, graphqlHeaders, setField } = useGenerateStore();

  return (
    <div className="space-y-4 mt-6">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          GraphQL Endpoint
        </label>
        <input
          type="url"
          className="input"
          placeholder="https://api.example.com/graphql"
          value={graphqlBaseUrl}
          onChange={(e) => setField('graphqlBaseUrl', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          Headers (JSON, optional)
        </label>
        <textarea
          className="input resize-none font-mono text-sm"
          rows={3}
          placeholder={'{"Authorization": "Bearer token"}'}
          value={graphqlHeaders}
          onChange={(e) => setField('graphqlHeaders', e.target.value)}
        />
      </div>
      <p className="text-xs text-slate-500">Creates 2 tools: <code>query</code>, <code>introspect</code></p>
    </div>
  );
}

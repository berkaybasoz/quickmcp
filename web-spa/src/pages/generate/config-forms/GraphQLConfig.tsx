import { useGenerateStore } from '../store/useGenerateStore';

export function GraphQLConfig() {
  const { graphqlBaseUrl, graphqlHeaders, setField } = useGenerateStore();

  return (
    <div id="graphql-section" className="space-y-6">
      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <div className="flex items-start gap-3">
          <i className="fas fa-info-circle text-indigo-600 mt-0.5" />
          <div className="text-sm text-indigo-700">
            <p className="font-medium text-indigo-800 mb-1">GraphQL Endpoint</p>
            <p>Execute queries and introspection over HTTP.</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Endpoint URL</label>
        <input
          type="text"
          id="graphqlBaseUrl"
          className="input"
          placeholder="https://api.example.com/graphql"
          value={graphqlBaseUrl}
          onChange={(e) => setField('graphqlBaseUrl', e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-2">GraphQL HTTP endpoint.</p>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Headers (Optional)</label>
        <textarea
          id="graphqlHeaders"
          rows={4}
          className="input font-mono text-xs"
          placeholder={'{"Authorization":"Bearer ..."}'}
          value={graphqlHeaders}
          onChange={(e) => setField('graphqlHeaders', e.target.value)}
        />
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <i className="fas fa-tools mr-2" />
          <strong>2 tools</strong> will be created: query, introspect
        </p>
      </div>
      <div id="graphql-parse-error" className="hidden p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm" />
    </div>
  );
}

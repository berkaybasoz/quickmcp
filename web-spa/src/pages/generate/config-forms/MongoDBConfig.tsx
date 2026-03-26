import { useGenerateStore } from '../store/useGenerateStore';

export function MongoDBConfig() {
  const mongoHost = useGenerateStore((s) => s.mongoHost);
  const mongoPort = useGenerateStore((s) => s.mongoPort);
  const mongoDatabase = useGenerateStore((s) => s.mongoDatabase);
  const mongoAuthSource = useGenerateStore((s) => s.mongoAuthSource);
  const mongoUsername = useGenerateStore((s) => s.mongoUsername);
  const mongoPassword = useGenerateStore((s) => s.mongoPassword);
  const setField = useGenerateStore((s) => s.setField);

  return (
    <div id="mongodb-section" className="space-y-6">
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-start gap-3">
          <i className="fas fa-info-circle text-green-600 mt-0.5" />
          <div className="text-sm text-green-700">
            <p className="font-medium text-green-800 mb-1">MongoDB Connection</p>
            <p>Connect to a MongoDB server and run collection operations.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Host</label>
          <input
            type="text"
            id="mongoHost"
            placeholder="localhost"
            className="input"
            value={mongoHost}
            onChange={(e) => setField('mongoHost', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Port</label>
          <input
            type="number"
            id="mongoPort"
            placeholder="27017"
            className="input"
            value={mongoPort}
            onChange={(e) => setField('mongoPort', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Database</label>
          <input
            type="text"
            id="mongoDatabase"
            placeholder="mydb"
            className="input"
            value={mongoDatabase}
            onChange={(e) => setField('mongoDatabase', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Auth Source (Optional)</label>
          <input
            type="text"
            id="mongoAuthSource"
            placeholder="admin"
            className="input"
            value={mongoAuthSource}
            onChange={(e) => setField('mongoAuthSource', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Username (Optional)</label>
          <input
            type="text"
            id="mongoUsername"
            placeholder="username"
            className="input"
            value={mongoUsername}
            onChange={(e) => setField('mongoUsername', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Password (Optional)</label>
          <input
            type="password" autoComplete="new-password"
            id="mongoPassword"
            placeholder="password"
            className="input"
            value={mongoPassword}
            onChange={(e) => setField('mongoPassword', e.target.value)}
          />
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <i className="fas fa-tools mr-2" />
          <strong>7 tools</strong> will be created: list_databases, list_collections, find, insert_one, update_one, delete_one, aggregate
        </p>
      </div>
      <div id="mongodb-parse-error" className="hidden p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm" />
    </div>
  );
}

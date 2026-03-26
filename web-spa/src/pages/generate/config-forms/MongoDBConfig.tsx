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
    <div className="space-y-4 mt-6">
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
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          Database Name
        </label>
        <input
          type="text"
          id="mongoDatabase"
          placeholder="my_database"
          className="input"
          value={mongoDatabase}
          onChange={(e) => setField('mongoDatabase', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          Auth Source (Optional)
        </label>
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
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          Username (Optional)
        </label>
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
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          Password (Optional)
        </label>
        <input
          type="password"
          id="mongoPassword"
          placeholder="••••••••"
          className="input"
          value={mongoPassword}
          onChange={(e) => setField('mongoPassword', e.target.value)}
        />
      </div>

      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-xs text-green-700">
          Creates 7 tools: list_databases, list_collections, find, insert_one, update_one,
          delete_one, aggregate
        </p>
      </div>
    </div>
  );
}

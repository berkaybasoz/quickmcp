import { useGenerateStore } from '../store/useGenerateStore';

export function LocalFSConfig() {
  const {
    localfsBasePath, localfsAllowRead, localfsAllowWrite, localfsAllowDelete,
    setField, openDirectoryPicker,
  } = useGenerateStore();

  return (
    <div className="space-y-4 mt-6">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          Base Directory Path
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="/path/to/directory"
            value={localfsBasePath}
            onChange={(e) => setField('localfsBasePath', e.target.value)}
          />
          <button
            type="button"
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-300 whitespace-nowrap"
            onClick={() => openDirectoryPicker('localfsBasePath', 'directory')}
          >
            <i className="fas fa-folder-open mr-1" />
            Browse
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Permissions</label>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={localfsAllowRead}
            onChange={(e) => setField('localfsAllowRead', e.target.checked)}
          />
          Allow Read
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={localfsAllowWrite}
            onChange={(e) => setField('localfsAllowWrite', e.target.checked)}
          />
          Allow Write
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={localfsAllowDelete}
            onChange={(e) => setField('localfsAllowDelete', e.target.checked)}
          />
          Allow Delete
        </label>
      </div>
    </div>
  );
}

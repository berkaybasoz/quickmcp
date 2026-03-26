import { useGenerateStore } from '../store/useGenerateStore';

export function LocalFSConfig() {
  const {
    localfsBasePath, localfsAllowWrite, localfsAllowDelete,
    setField, openDirectoryPicker,
  } = useGenerateStore();

  return (
    <div id="localfs-section" className="space-y-6">
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-start gap-3">
          <i className="fas fa-info-circle text-blue-500 mt-0.5" />
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-700 mb-1">Local Filesystem Access</p>
            <p>Access files and directories on this computer. Specify a base path and configure permissions.</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Base Path</label>
        <div className="flex gap-2">
          <input
            type="text"
            id="localfsBasePath"
            className="input flex-1"
            placeholder="/Users/username/Documents"
            value={localfsBasePath}
            onChange={(e) => setField('localfsBasePath', e.target.value)}
          />
          <button
            id="browseDirectoryBtn"
            type="button"
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
            onClick={() => openDirectoryPicker('localfsBasePath', 'directory')}
          >
            <i className="fas fa-folder-open" />
            <span>Browse</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">The root directory that tools can access. All paths will be relative to this.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Allow Write</label>
          <select
            id="localfsAllowWrite"
            className="input"
            value={localfsAllowWrite ? 'true' : 'false'}
            onChange={(e) => setField('localfsAllowWrite', e.target.value === 'true')}
          >
            <option value="true">Yes - Allow creating and modifying files</option>
            <option value="false">No - Read only</option>
          </select>
          <p className="text-xs text-slate-500 mt-2">Enable write, create, and rename operations.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Allow Delete</label>
          <select
            id="localfsAllowDelete"
            className="input"
            value={localfsAllowDelete ? 'true' : 'false'}
            onChange={(e) => setField('localfsAllowDelete', e.target.value === 'true')}
          >
            <option value="false">No - Prevent deletions</option>
            <option value="true">Yes - Allow deleting files</option>
          </select>
          <p className="text-xs text-slate-500 mt-2">Enable delete operations (use with caution).</p>
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <i className="fas fa-tools mr-2" />
          <strong>Up to 10 tools</strong> will be created: list_files, read_file, write_file, delete_file, create_directory, delete_directory, rename, get_file_info, search_files, copy_file
        </p>
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-700">
          <i className="fas fa-exclamation-triangle mr-2" />
          <strong>Security Note:</strong> Only grant access to directories you trust. Path traversal outside the base path is blocked.
        </p>
      </div>
      <div id="localfs-parse-error" className="hidden p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm" />
    </div>
  );
}

import { useGenerateStore } from '../store/useGenerateStore';

export function FTPConfig() {
  const { ftpHost, ftpPort, ftpUsername, ftpPassword, ftpBasePath, ftpSecure, setField } =
    useGenerateStore();

  return (
    <div id="ftp-section" className="space-y-6">
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-start gap-3">
          <i className="fas fa-info-circle text-blue-500 mt-0.5" />
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-700 mb-1">FTP/SFTP Server Connection</p>
            <p>Connect to an FTP, FTPS, or SFTP server to manage files and directories. SFTP (port 22) is automatically detected.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Host</label>
          <input
            type="text"
            id="ftpHost"
            className="input"
            placeholder="ftp.example.com"
            value={ftpHost}
            onChange={(e) => setField('ftpHost', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-2">Hostname or IP (without protocol prefix).</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Port</label>
          <input
            type="number"
            id="ftpPort"
            className="input"
            placeholder="21"
            value={ftpPort}
            onChange={(e) => setField('ftpPort', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-2">21=FTP, 22=SFTP, 990=FTPS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Username</label>
          <input
            type="text"
            id="ftpUsername"
            className="input"
            placeholder="ftpuser"
            value={ftpUsername}
            onChange={(e) => setField('ftpUsername', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-2">FTP username.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Password</label>
          <input
            type="password"
            id="ftpPassword"
            className="input"
            placeholder="Your password"
            value={ftpPassword}
            onChange={(e) => setField('ftpPassword', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-2">FTP password.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Base Path (Optional)</label>
          <input
            type="text"
            id="ftpBasePath"
            className="input"
            placeholder="/"
            value={ftpBasePath}
            onChange={(e) => setField('ftpBasePath', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-2">Default directory to start in.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Secure Connection (FTPS)</label>
          <select
            id="ftpSecure"
            className="input"
            value={ftpSecure ? 'true' : 'false'}
            onChange={(e) => setField('ftpSecure', e.target.value === 'true')}
          >
            <option value="false">No (Plain FTP)</option>
            <option value="true">Yes (FTPS - Explicit TLS)</option>
          </select>
          <p className="text-xs text-slate-500 mt-2">Enable for encrypted connections.</p>
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <i className="fas fa-tools mr-2" />
          <strong>8 tools</strong> will be created: list_files, download_file, upload_file, delete_file, create_directory, delete_directory, rename, get_file_info
        </p>
      </div>
      <div id="ftp-parse-error" className="hidden p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm" />
    </div>
  );
}

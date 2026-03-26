import { useGenerateStore } from '../store/useGenerateStore';

export function FTPConfig() {
  const { ftpHost, ftpPort, ftpUsername, ftpPassword, ftpBasePath, ftpSecure, setField } =
    useGenerateStore();

  const isSftp = ftpPort === '22';
  const protocolHint = isSftp ? 'SFTP (SSH) mode' : ftpSecure ? 'FTPS (SSL) mode' : 'FTP mode';

  return (
    <div className="space-y-4 mt-6">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Host</label>
        <input
          type="text"
          className="input"
          placeholder="ftp.example.com"
          value={ftpHost}
          onChange={(e) => setField('ftpHost', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Port</label>
        <input
          type="number"
          className="input"
          placeholder="21"
          value={ftpPort}
          onChange={(e) => setField('ftpPort', e.target.value)}
        />
        {(isSftp || ftpSecure) && (
          <p className="text-xs text-blue-600 mt-1">{protocolHint}</p>
        )}
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Username</label>
        <input
          type="text"
          className="input"
          placeholder="username"
          value={ftpUsername}
          onChange={(e) => setField('ftpUsername', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Password</label>
        <input
          type="password"
          className="input"
          placeholder="••••••••"
          value={ftpPassword}
          onChange={(e) => setField('ftpPassword', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          Base Path (optional)
        </label>
        <input
          type="text"
          className="input"
          placeholder="/"
          value={ftpBasePath}
          onChange={(e) => setField('ftpBasePath', e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={ftpSecure}
          onChange={(e) => setField('ftpSecure', e.target.checked)}
        />
        Use FTPS (SSL)
      </label>
    </div>
  );
}

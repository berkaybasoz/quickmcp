import { useGenerateStore } from '../store/useGenerateStore';

const READ_TOOLS = ['list_folders', 'list_emails', 'read_email', 'search_emails', 'move_email', 'delete_email', 'mark_read'];
const WRITE_TOOLS = ['send_email', 'reply_email', 'forward_email'];

type GmailMode = 'read' | 'write' | 'both';

const MODE_OPTIONS: { value: GmailMode; icon: string; label: string; sub: string }[] = [
  { value: 'read',  icon: 'fa-inbox',       label: 'Read Only',   sub: 'IMAP - Receive emails' },
  { value: 'write', icon: 'fa-paper-plane',  label: 'Write Only',  sub: 'SMTP - Send emails'    },
  { value: 'both',  icon: 'fa-envelope',     label: 'Both',        sub: 'IMAP + SMTP'           },
];

export function GmailConfig() {
  const { gmailMode, gmailUsername, gmailPassword, gmailSecure, setField } = useGenerateStore();

  const tools = gmailMode === 'read' ? READ_TOOLS : gmailMode === 'write' ? WRITE_TOOLS : [...READ_TOOLS, ...WRITE_TOOLS];

  return (
    <div id="gmail-section" className="space-y-6">
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm text-red-700">
          <i className="fas fa-info-circle mr-2" />
          Gmail access with preset IMAP/SMTP settings.
        </p>
      </div>

      {/* Operation Mode */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-3">
          Operation Mode <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {MODE_OPTIONS.map(({ value, icon, label, sub }) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="gmailMode"
                value={value}
                checked={gmailMode === value}
                onChange={() => setField('gmailMode', value)}
                className="peer sr-only"
              />
              <div className={`p-4 rounded-xl border-2 transition-all text-center ${
                gmailMode === value ? 'border-red-500 bg-red-50' : 'border-slate-200'
              }`}>
                <i className={`fas ${icon} text-2xl mb-2 ${gmailMode === value ? 'text-red-500' : 'text-slate-400'}`} />
                <div className="font-bold text-slate-700">{label}</div>
                <div className="text-xs text-slate-500">{sub}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Credentials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Username <span className="text-red-500">*</span></label>
          <input type="text" id="gmailUsername" placeholder="your.email@gmail.com" className="input" value={gmailUsername} onChange={(e) => setField('gmailUsername', e.target.value)} />
          <p className="text-xs text-slate-500 mt-2">Use your Gmail address.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Password <span className="text-red-500">*</span></label>
          <input type="password" id="gmailPassword" placeholder="App password" className="input" value={gmailPassword} onChange={(e) => setField('gmailPassword', e.target.value)} />
          <p className="text-xs text-slate-500 mt-2">Use a Gmail App Password.</p>
        </div>
      </div>

      {/* Secure connection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Use Secure Connection (TLS/SSL)</label>
          <select
            id="gmailSecure"
            className="input"
            value={gmailSecure ? 'true' : 'false'}
            onChange={(e) => setField('gmailSecure', e.target.value === 'true')}
          >
            <option value="true">Yes - Use TLS/SSL (Recommended)</option>
            <option value="false">No - Plain connection</option>
          </select>
        </div>
      </div>

      <div id="gmail-tools-info" className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <i className="fas fa-tools mr-2" />
          <strong id="gmail-tools-count">{tools.length} tools</strong> will be created: <span id="gmail-tools-list">{tools.join(', ')}</span>
        </p>
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-700">
          <i className="fas fa-exclamation-triangle mr-2" />
          <strong>Gmail Users:</strong> You need to create an App Password at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline">myaccount.google.com/apppasswords</a> (requires 2FA enabled).
        </p>
      </div>
      <div id="gmail-parse-error" className="hidden p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm" />
    </div>
  );
}

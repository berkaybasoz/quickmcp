import { useGenerateStore } from '../store/useGenerateStore';

const READ_TOOLS = ['list_folders', 'list_emails', 'read_email', 'search_emails', 'move_email', 'delete_email', 'mark_read'];
const WRITE_TOOLS = ['send_email', 'reply_email', 'forward_email'];

type EmailMode = 'read' | 'write' | 'both';

const MODE_OPTIONS: { value: EmailMode; icon: string; label: string; sub: string }[] = [
  { value: 'read',  icon: 'fa-inbox',       label: 'Read Only',   sub: 'IMAP - Receive emails' },
  { value: 'write', icon: 'fa-paper-plane',  label: 'Write Only',  sub: 'SMTP - Send emails'    },
  { value: 'both',  icon: 'fa-envelope',     label: 'Both',        sub: 'IMAP + SMTP'           },
];

export function EmailConfig() {
  const {
    emailMode, emailUsername, emailPassword, emailSecure,
    emailImapHost, emailImapPort, emailSmtpHost, emailSmtpPort,
    setField,
  } = useGenerateStore();

  const tools = emailMode === 'read' ? READ_TOOLS : emailMode === 'write' ? WRITE_TOOLS : [...READ_TOOLS, ...WRITE_TOOLS];
  const showImap = emailMode === 'read' || emailMode === 'both';
  const showSmtp = emailMode === 'write' || emailMode === 'both';

  return (
    <div id="email-section" className="space-y-6">
      <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
        <p className="text-sm text-rose-700">
          <i className="fas fa-info-circle mr-2" />
          Configure email access. Choose what operations you need.
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
                name="emailMode"
                value={value}
                checked={emailMode === value}
                onChange={() => setField('emailMode', value)}
                className="peer sr-only"
              />
              <div className={`p-4 rounded-xl border-2 transition-all text-center ${
                emailMode === value ? 'border-rose-500 bg-rose-50' : 'border-slate-200'
              }`}>
                <i className={`fas ${icon} text-2xl mb-2 ${emailMode === value ? 'text-rose-500' : 'text-slate-400'}`} />
                <div className="font-bold text-slate-700">{label}</div>
                <div className="text-xs text-slate-500">{sub}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* IMAP Settings */}
      {showImap && (
        <div id="email-imap-section" className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="font-bold text-slate-700 flex items-center gap-2">
            <i className="fas fa-inbox text-rose-500" /> IMAP Settings (Reading)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">IMAP Host <span className="text-red-500">*</span></label>
              <input type="text" autoComplete="off" id="emailImapHost" placeholder="imap.gmail.com" className="input" value={emailImapHost} onChange={(e) => setField('emailImapHost', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">IMAP Port</label>
              <input type="number" autoComplete="off" id="emailImapPort" placeholder="993" className="input" value={emailImapPort} onChange={(e) => setField('emailImapPort', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* SMTP Settings */}
      {showSmtp && (
        <div id="email-smtp-section" className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="font-bold text-slate-700 flex items-center gap-2">
            <i className="fas fa-paper-plane text-rose-500" /> SMTP Settings (Sending)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">SMTP Host <span className="text-red-500">*</span></label>
              <input type="text" autoComplete="off" id="emailSmtpHost" placeholder="smtp.gmail.com" className="input" value={emailSmtpHost} onChange={(e) => setField('emailSmtpHost', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">SMTP Port</label>
              <input type="number" autoComplete="off" id="emailSmtpPort" placeholder="587" className="input" value={emailSmtpPort} onChange={(e) => setField('emailSmtpPort', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Common credentials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Username <span className="text-red-500">*</span></label>
          <input type="text" autoComplete="off" id="emailUsername" placeholder="your.email@gmail.com" className="input" value={emailUsername} onChange={(e) => setField('emailUsername', e.target.value)} />
          <p className="text-xs text-slate-500 mt-2">Usually your full email address.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Password <span className="text-red-500">*</span></label>
          <input type="password" autoComplete="new-password" id="emailPassword" placeholder="App password or password" className="input" value={emailPassword} onChange={(e) => setField('emailPassword', e.target.value)} />
          <p className="text-xs text-slate-500 mt-2">For Gmail, use an App Password.</p>
        </div>
      </div>

      {/* Secure connection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Use Secure Connection (TLS/SSL)</label>
          <select
            id="emailSecure"
            className="input"
            value={emailSecure ? 'true' : 'false'}
            onChange={(e) => setField('emailSecure', e.target.value === 'true')}
          >
            <option value="true">Yes - Use TLS/SSL (Recommended)</option>
            <option value="false">No - Plain connection</option>
          </select>
        </div>
      </div>

      <div id="email-tools-info" className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <i className="fas fa-tools mr-2" />
          <strong id="email-tools-count">{tools.length} tools</strong> will be created: <span id="email-tools-list">{tools.join(', ')}</span>
        </p>
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-700">
          <i className="fas fa-exclamation-triangle mr-2" />
          <strong>Gmail Users:</strong> You need to create an App Password at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline">myaccount.google.com/apppasswords</a> (requires 2FA enabled).
        </p>
      </div>
      <div id="email-parse-error" className="hidden p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm" />
    </div>
  );
}

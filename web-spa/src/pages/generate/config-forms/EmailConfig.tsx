import { useGenerateStore } from '../store/useGenerateStore';

const READ_TOOLS = ['list_folders', 'list_emails', 'read_email', 'search_emails', 'move_email', 'delete_email', 'mark_read'];
const WRITE_TOOLS = ['send_email', 'reply_email', 'forward_email'];

export function EmailConfig() {
  const {
    emailMode, emailUsername, emailPassword,
    emailImapHost, emailImapPort, emailSmtpHost, emailSmtpPort,
    setField,
  } = useGenerateStore();

  const tools = emailMode === 'read' ? READ_TOOLS : emailMode === 'write' ? WRITE_TOOLS : [...READ_TOOLS, ...WRITE_TOOLS];
  const showImap = emailMode === 'read' || emailMode === 'both';
  const showSmtp = emailMode === 'write' || emailMode === 'both';

  return (
    <div className="space-y-4 mt-6">
      {/* Mode toggle */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Mode</label>
        <div className="flex gap-4">
          {(['read', 'write', 'both'] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="emailMode"
                value={m}
                checked={emailMode === m}
                onChange={() => setField('emailMode', m)}
              />
              {m === 'read' ? 'Read only' : m === 'write' ? 'Write only' : 'Both'}
            </label>
          ))}
        </div>
      </div>

      {/* Common credentials */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Email Address</label>
        <input type="text" className="input" placeholder="user@example.com" value={emailUsername} onChange={(e) => setField('emailUsername', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Password / App Password</label>
        <input type="password" className="input" placeholder="••••••••" value={emailPassword} onChange={(e) => setField('emailPassword', e.target.value)} />
      </div>

      {/* IMAP section */}
      {showImap && (
        <div id="email-imap-section" className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-bold text-slate-700 uppercase">IMAP Settings (Incoming)</p>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">IMAP Host</label>
            <input type="text" className="input" placeholder="imap.gmail.com" value={emailImapHost} onChange={(e) => setField('emailImapHost', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">IMAP Port</label>
            <input type="number" className="input" placeholder="993" value={emailImapPort} onChange={(e) => setField('emailImapPort', e.target.value)} />
          </div>
        </div>
      )}

      {/* SMTP section */}
      {showSmtp && (
        <div id="email-smtp-section" className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-bold text-slate-700 uppercase">SMTP Settings (Outgoing)</p>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">SMTP Host</label>
            <input type="text" className="input" placeholder="smtp.gmail.com" value={emailSmtpHost} onChange={(e) => setField('emailSmtpHost', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">SMTP Port</label>
            <input type="number" className="input" placeholder="587" value={emailSmtpPort} onChange={(e) => setField('emailSmtpPort', e.target.value)} />
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        <span id="email-tools-count">{tools.length} tools</span>:{' '}
        <span id="email-tools-list">{tools.join(', ')}</span>
      </p>
    </div>
  );
}

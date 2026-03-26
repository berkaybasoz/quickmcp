import { useGenerateStore } from '../store/useGenerateStore';

export function GmailConfig() {
  const { gmailMode, gmailUsername, gmailPassword, setField } = useGenerateStore();

  return (
    <div className="space-y-4 mt-6">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Mode</label>
        <div className="flex gap-4">
          {(['read', 'write', 'both'] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="gmailMode"
                value={m}
                checked={gmailMode === m}
                onChange={() => setField('gmailMode', m)}
              />
              {m === 'read' ? 'Read only' : m === 'write' ? 'Write only' : 'Both'}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Gmail Address</label>
        <input type="text" className="input" placeholder="user@gmail.com" value={gmailUsername} onChange={(e) => setField('gmailUsername', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">App Password</label>
        <input type="password" className="input" placeholder="••••••••" value={gmailPassword} onChange={(e) => setField('gmailPassword', e.target.value)} />
        <p className="text-xs text-slate-500 mt-1">Use an App Password from your Google Account security settings.</p>
      </div>
    </div>
  );
}

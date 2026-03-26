import { useGenerateStore } from '../store/useGenerateStore';

export function SlackConfig() {
  const { slackBotToken, slackDefaultChannel, setField } = useGenerateStore();

  return (
    <div className="space-y-4 mt-6">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Bot Token</label>
        <input type="password" className="input" placeholder="xoxb-..." value={slackBotToken} onChange={(e) => setField('slackBotToken', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Default Channel (optional)</label>
        <input type="text" className="input" placeholder="#general" value={slackDefaultChannel} onChange={(e) => setField('slackDefaultChannel', e.target.value)} />
      </div>
    </div>
  );
}

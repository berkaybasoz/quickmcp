import { useGenerateStore } from '../store/useGenerateStore';

export function DiscordConfig() {
  const { discordBotToken, discordDefaultGuildId, discordDefaultChannelId, setField } = useGenerateStore();

  return (
    <div className="space-y-4 mt-6">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Bot Token</label>
        <input type="password" className="input" placeholder="••••••••" value={discordBotToken} onChange={(e) => setField('discordBotToken', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Default Server ID (optional)</label>
        <input type="text" className="input" placeholder="123456789012345678" value={discordDefaultGuildId} onChange={(e) => setField('discordDefaultGuildId', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Default Channel ID (optional)</label>
        <input type="text" className="input" placeholder="123456789012345678" value={discordDefaultChannelId} onChange={(e) => setField('discordDefaultChannelId', e.target.value)} />
      </div>
    </div>
  );
}

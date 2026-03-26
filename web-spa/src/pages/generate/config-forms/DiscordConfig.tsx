import { useGenerateStore } from '../store/useGenerateStore';

export function DiscordConfig() {
  const { discordBotToken, discordDefaultGuildId, discordDefaultChannelId, setField } = useGenerateStore();

  return (
    <div id="discord-section" className="space-y-6">
      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <p className="text-sm text-indigo-700">
          <i className="fas fa-info-circle mr-2" />
          Enter your Discord Bot Token. Create a bot at <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="underline font-semibold">discord.com/developers</a>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Bot Token <span className="text-red-500">*</span></label>
          <input
            type="password" autoComplete="new-password"
            id="discordBotToken"
            className="input"
            placeholder="Bot token"
            value={discordBotToken}
            onChange={(e) => setField('discordBotToken', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-2">Found under Bot settings. Kept securely.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Default Guild ID (Optional)</label>
          <input
            type="text"
            id="discordDefaultGuildId"
            className="input"
            placeholder="Guild (server) ID"
            value={discordDefaultGuildId}
            onChange={(e) => setField('discordDefaultGuildId', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Default Channel ID (Optional)</label>
          <input
            type="text"
            id="discordDefaultChannelId"
            className="input"
            placeholder="Channel ID"
            value={discordDefaultChannelId}
            onChange={(e) => setField('discordDefaultChannelId', e.target.value)}
          />
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <i className="fas fa-tools mr-2" />
          <strong>6 tools</strong> will be created: list_guilds, list_channels, list_users, send_message, get_channel_history, get_user_info, add_reaction
        </p>
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-700">
          <i className="fas fa-exclamation-triangle mr-2" />
          <strong>Required Bot Permissions:</strong> Read Messages/View Channels, Send Messages, Read Message History, Add Reactions, and Guild Members intent.
        </p>
      </div>
      <div id="discord-parse-error" className="hidden p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm" />
    </div>
  );
}

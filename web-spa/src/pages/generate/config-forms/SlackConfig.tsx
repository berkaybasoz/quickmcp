import { useGenerateStore } from '../store/useGenerateStore';

export function SlackConfig() {
  const { slackBotToken, slackDefaultChannel, setField } = useGenerateStore();

  return (
    <div id="slack-section" className="space-y-6">
      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
        <p className="text-sm text-purple-700">
          <i className="fas fa-info-circle mr-2" />
          Enter your Slack Bot Token. Create a Slack App at <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="underline font-semibold">api.slack.com/apps</a>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Bot Token <span className="text-red-500">*</span></label>
          <input
            type="password"
            id="slackBotToken"
            className="input"
            placeholder="xoxb-your-bot-token"
            value={slackBotToken}
            onChange={(e) => setField('slackBotToken', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-2">Starts with <code>xoxb-</code>. Found in OAuth &amp; Permissions.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Default Channel (Optional)</label>
          <input
            type="text"
            id="slackDefaultChannel"
            className="input"
            placeholder="#general or C1234567890"
            value={slackDefaultChannel}
            onChange={(e) => setField('slackDefaultChannel', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-2">Channel ID or name for default operations.</p>
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <i className="fas fa-tools mr-2" />
          <strong>8 tools</strong> will be created: list_channels, list_users, send_message, get_channel_history, get_user_info, add_reaction, upload_file, search_messages
        </p>
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-700">
          <i className="fas fa-exclamation-triangle mr-2" />
          <strong>Required Scopes:</strong> channels:read, channels:history, chat:write, users:read, reactions:write, files:write, search:read
        </p>
      </div>
      <div id="slack-parse-error" className="hidden p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm" />
    </div>
  );
}

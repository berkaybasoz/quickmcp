import { useGenerateStore } from '../store/useGenerateStore';

interface Props { type: string; }

function Field({ label, id, type = 'text', placeholder, value, onChange, optional }: {
  label: string; id?: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; optional?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
        {label}{optional && <span className="font-normal normal-case ml-1 text-slate-400">(optional)</span>}
      </label>
      <input id={id} type={type} className="input" placeholder={placeholder} value={value} autoComplete={type === 'password' ? 'new-password' : 'off'} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function SocialConfig({ type }: Props) {
  const s = useGenerateStore();

  switch (type) {
    case 'x':
      return (
        <div className="space-y-4 mt-6">
          <Field id="xToken" label="Bearer Token" type="password" value={s.xToken} onChange={(v) => s.setField('xToken', v)} />
          <Field id="xUsername" label="Default Username" value={s.xUsername} onChange={(v) => s.setField('xUsername', v)} optional />
          <p className="text-xs text-slate-500">Creates 6 tools: get_user_by_username, get_user, get_user_tweets, search_recent_tweets, get_tweet, create_tweet</p>
        </div>
      );
    case 'facebook':
      return (
        <div className="space-y-4 mt-6">
          <Field id="facebookBaseUrl" label="Base URL" placeholder="https://graph.facebook.com" value={s.facebookBaseUrl} onChange={(v) => s.setField('facebookBaseUrl', v)} />
          <Field id="facebookApiVersion" label="API Version" placeholder="v19.0" value={s.facebookApiVersion} onChange={(v) => s.setField('facebookApiVersion', v)} />
          <Field id="facebookAccessToken" label="Access Token" type="password" value={s.facebookAccessToken} onChange={(v) => s.setField('facebookAccessToken', v)} />
          <Field id="facebookUserId" label="User ID" value={s.facebookUserId} onChange={(v) => s.setField('facebookUserId', v)} optional />
          <Field id="facebookPageId" label="Page ID" value={s.facebookPageId} onChange={(v) => s.setField('facebookPageId', v)} optional />
          <p className="text-xs text-slate-500">Creates 6 tools: get_user, get_pages, get_page_posts, get_post, search, get_page_insights</p>
        </div>
      );
    case 'instagram':
      return (
        <div className="space-y-4 mt-6">
          <Field id="instagramBaseUrl" label="Base URL" placeholder="https://graph.instagram.com" value={s.instagramBaseUrl} onChange={(v) => s.setField('instagramBaseUrl', v)} />
          <Field id="instagramAccessToken" label="Access Token" type="password" value={s.instagramAccessToken} onChange={(v) => s.setField('instagramAccessToken', v)} />
          <Field id="instagramUserId" label="User ID" value={s.instagramUserId} onChange={(v) => s.setField('instagramUserId', v)} optional />
          <p className="text-xs text-slate-500">Creates 4 tools: get_user, get_user_media, get_media, get_media_comments</p>
        </div>
      );
    case 'tiktok':
      return (
        <div className="space-y-4 mt-6">
          <Field id="tiktokBaseUrl" label="Base URL" placeholder="https://open.tiktokapis.com/v2" value={s.tiktokBaseUrl} onChange={(v) => s.setField('tiktokBaseUrl', v)} />
          <Field id="tiktokAccessToken" label="Access Token" type="password" value={s.tiktokAccessToken} onChange={(v) => s.setField('tiktokAccessToken', v)} />
          <Field id="tiktokUserId" label="User ID" value={s.tiktokUserId} onChange={(v) => s.setField('tiktokUserId', v)} optional />
          <p className="text-xs text-slate-500">Creates 4 tools: get_user_info, list_videos, get_video, search_videos</p>
        </div>
      );
    case 'reddit':
      return (
        <div className="space-y-4 mt-6">
          <Field id="redditAccessToken" label="Access Token" type="password" value={s.redditAccessToken} onChange={(v) => s.setField('redditAccessToken', v)} />
          <Field id="redditUserAgent" label="User Agent" placeholder="MyApp/1.0" value={s.redditUserAgent} onChange={(v) => s.setField('redditUserAgent', v)} optional />
          <Field id="redditSubreddit" label="Default Subreddit" placeholder="r/programming" value={s.redditSubreddit} onChange={(v) => s.setField('redditSubreddit', v)} optional />
          <Field id="redditUsername" label="Username" value={s.redditUsername} onChange={(v) => s.setField('redditUsername', v)} optional />
          <p className="text-xs text-slate-500">Creates 8 tools: get_user, get_subreddit, list_hot, list_new, search_posts, get_post, create_post, add_comment</p>
        </div>
      );
    case 'linkedin':
      return (
        <div className="space-y-4 mt-6">
          <Field id="linkedinAccessToken" label="Access Token" type="password" value={s.linkedinAccessToken} onChange={(v) => s.setField('linkedinAccessToken', v)} />
          <Field id="linkedinPersonId" label="Person ID" value={s.linkedinPersonId} onChange={(v) => s.setField('linkedinPersonId', v)} optional />
          <Field id="linkedinOrganizationId" label="Organization ID" value={s.linkedinOrganizationId} onChange={(v) => s.setField('linkedinOrganizationId', v)} optional />
          <p className="text-xs text-slate-500">Creates 8 tools: get_profile, get_organization, list_connections, list_posts, create_post, get_post, search_people, search_companies</p>
        </div>
      );
    case 'youtube':
      return (
        <div className="space-y-4 mt-6">
          <Field id="youtubeApiKey" label="API Key" value={s.youtubeApiKey} onChange={(v) => s.setField('youtubeApiKey', v)} />
          <Field id="youtubeAccessToken" label="OAuth Access Token" type="password" value={s.youtubeAccessToken} onChange={(v) => s.setField('youtubeAccessToken', v)} optional />
          <Field id="youtubeChannelId" label="Channel ID" value={s.youtubeChannelId} onChange={(v) => s.setField('youtubeChannelId', v)} optional />
          <p className="text-xs text-slate-500">Creates 9 tools: search, get_channel, list_channel_videos, list_playlists, list_playlist_items, get_video, get_comments, post_comment, rate_video</p>
        </div>
      );
    case 'whatsappbusiness':
      return (
        <div className="space-y-4 mt-6">
          <Field id="whatsappAccessToken" label="Access Token" type="password" value={s.whatsappAccessToken} onChange={(v) => s.setField('whatsappAccessToken', v)} />
          <Field id="whatsappPhoneNumberId" label="Phone Number ID" value={s.whatsappPhoneNumberId} onChange={(v) => s.setField('whatsappPhoneNumberId', v)} />
          <Field id="whatsappBusinessAccountId" label="Business Account ID" value={s.whatsappBusinessAccountId} onChange={(v) => s.setField('whatsappBusinessAccountId', v)} optional />
          <p className="text-xs text-slate-500">Creates 7 tools: send_text_message, send_template_message, send_media_message, get_message_templates, get_phone_numbers, get_business_profile, set_business_profile</p>
        </div>
      );
    case 'x-threads':
      return (
        <div className="space-y-4 mt-6">
          <Field id="threadsAccessToken" label="Access Token" type="password" value={s.threadsAccessToken} onChange={(v) => s.setField('threadsAccessToken', v)} />
          <Field id="threadsUserId" label="User ID" value={s.threadsUserId} onChange={(v) => s.setField('threadsUserId', v)} optional />
          <p className="text-xs text-slate-500">Creates 6 tools: get_user, list_threads, get_thread, create_thread, delete_thread, get_thread_insights</p>
        </div>
      );
    case 'telegram':
      return (
        <div className="space-y-4 mt-6">
          <Field id="telegramBaseUrl" label="Base URL" placeholder="https://api.telegram.org" value={s.telegramBaseUrl} onChange={(v) => s.setField('telegramBaseUrl', v)} />
          <Field id="telegramBotToken" label="Bot Token" type="password" placeholder="123456:ABC-..." value={s.telegramBotToken} onChange={(v) => s.setField('telegramBotToken', v)} />
          <Field id="telegramChatId" label="Default Chat ID" value={s.telegramChatId} onChange={(v) => s.setField('telegramChatId', v)} optional />
          <p className="text-xs text-slate-500">Creates 3 tools: get_me, get_updates, send_message</p>
        </div>
      );
    case 'spotify':
      return (
        <div className="space-y-4 mt-6">
          <Field id="spotifyBaseUrl" label="Base URL" placeholder="https://api.spotify.com/v1" value={s.spotifyBaseUrl} onChange={(v) => s.setField('spotifyBaseUrl', v)} />
          <Field id="spotifyAccessToken" label="Access Token" type="password" value={s.spotifyAccessToken} onChange={(v) => s.setField('spotifyAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: search, get_track, get_artist, get_album, get_playlist</p>
        </div>
      );
    case 'sonos':
      return (
        <div className="space-y-4 mt-6">
          <Field id="sonosBaseUrl" label="Base URL" placeholder="https://api.ws.sonos.com/control/api/v1" value={s.sonosBaseUrl} onChange={(v) => s.setField('sonosBaseUrl', v)} />
          <Field id="sonosAccessToken" label="Access Token" type="password" value={s.sonosAccessToken} onChange={(v) => s.setField('sonosAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: list_households, list_groups, play, pause, set_volume</p>
        </div>
      );
    case 'shazam':
      return (
        <div className="space-y-4 mt-6">
          <Field id="shazamBaseUrl" label="Base URL" placeholder="https://shazam.p.rapidapi.com" value={s.shazamBaseUrl} onChange={(v) => s.setField('shazamBaseUrl', v)} />
          <Field id="shazamApiKey" label="RapidAPI Key" type="password" value={s.shazamApiKey} onChange={(v) => s.setField('shazamApiKey', v)} />
          <Field id="shazamApiHost" label="API Host" placeholder="shazam.p.rapidapi.com" value={s.shazamApiHost} onChange={(v) => s.setField('shazamApiHost', v)} />
          <p className="text-xs text-slate-500">Creates 4 tools: search, get_track, get_artist, get_charts</p>
        </div>
      );
    case 'philipshue':
      return (
        <div className="space-y-4 mt-6">
          <Field id="philipshueBaseUrl" label="Base URL" placeholder="https://api.meethue.com/bridge" value={s.philipshueBaseUrl} onChange={(v) => s.setField('philipshueBaseUrl', v)} />
          <Field id="philipshueAccessToken" label="Access Token" type="password" value={s.philipshueAccessToken} onChange={(v) => s.setField('philipshueAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: list_lights, get_light, set_light_state, list_groups, set_group_state</p>
        </div>
      );
    case 'eightsleep':
      return (
        <div className="space-y-4 mt-6">
          <Field id="eightsleepBaseUrl" label="Base URL" placeholder="https://app.8slp.net/v1" value={s.eightsleepBaseUrl} onChange={(v) => s.setField('eightsleepBaseUrl', v)} />
          <Field id="eightsleepAccessToken" label="Access Token" type="password" value={s.eightsleepAccessToken} onChange={(v) => s.setField('eightsleepAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 4 tools: get_user, get_sessions, get_trends, set_pod_temperature</p>
        </div>
      );
    case 'homeassistant':
      return (
        <div className="space-y-4 mt-6">
          <Field id="homeassistantBaseUrl" label="Base URL" placeholder="http://homeassistant.local:8123/api" value={s.homeassistantBaseUrl} onChange={(v) => s.setField('homeassistantBaseUrl', v)} />
          <Field id="homeassistantAccessToken" label="Long-Lived Access Token" type="password" value={s.homeassistantAccessToken} onChange={(v) => s.setField('homeassistantAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 4 tools: get_states, get_services, call_service, get_config</p>
        </div>
      );
    case 'zoom':
      return (
        <div className="space-y-4 mt-6">
          <Field id="zoomBaseUrl" label="Base URL" placeholder="https://api.zoom.us/v2" value={s.zoomBaseUrl} onChange={(v) => s.setField('zoomBaseUrl', v)} />
          <Field id="zoomAccessToken" label="Access Token" type="password" value={s.zoomAccessToken} onChange={(v) => s.setField('zoomAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: list_meetings, get_meeting, create_meeting, list_recordings, get_recording</p>
        </div>
      );
    case 'microsoftteams':
      return (
        <div className="space-y-4 mt-6">
          <Field id="microsoftteamsBaseUrl" label="Base URL" placeholder="https://graph.microsoft.com/v1.0" value={s.microsoftteamsBaseUrl} onChange={(v) => s.setField('microsoftteamsBaseUrl', v)} />
          <Field id="microsoftteamsAccessToken" label="Access Token" type="password" value={s.microsoftteamsAccessToken} onChange={(v) => s.setField('microsoftteamsAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: list_teams, list_channels, send_message, list_messages, get_message</p>
        </div>
      );
    case 'signal':
      return (
        <div className="space-y-4 mt-6">
          <Field id="signalBaseUrl" label="Signal CLI REST URL" placeholder="http://localhost:8080" value={s.signalBaseUrl} onChange={(v) => s.setField('signalBaseUrl', v)} />
          <Field id="signalAccessToken" label="Access Token" type="password" value={s.signalAccessToken} onChange={(v) => s.setField('signalAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 4 tools: send_message, list_groups, create_group, list_messages</p>
        </div>
      );
    case 'rss':
      return (
        <div className="space-y-4 mt-6">
          <Field id="rssFeedUrl" label="Feed URL" placeholder="https://example.com/feed.xml" value={s.rssFeedUrl} onChange={(v) => s.setField('rssFeedUrl', v)} />
          <p className="text-xs text-slate-500">Creates 2 tools: get_feed, list_entries</p>
        </div>
      );
    default:
      // Generic: baseUrl + accessToken
      return (
        <div className="space-y-4 mt-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Base URL</label>
            <input type="url" className="input" placeholder="https://api.example.com" value="" readOnly />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Access Token</label>
            <input type="password" className="input" placeholder="••••••••" value="" readOnly />
          </div>
        </div>
      );
  }
}

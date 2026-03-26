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

export function ProductivityConfig({ type }: Props) {
  const s = useGenerateStore();

  switch (type) {
    case 'supabase':
      return (
        <div className="space-y-4 mt-6">
          <Field id="supabaseBaseUrl" label="Supabase REST URL" placeholder="https://xxxx.supabase.co/rest/v1" value={s.supabaseBaseUrl} onChange={(v) => s.setField('supabaseBaseUrl', v)} />
          <Field id="supabaseApiKey" label="API Key" type="password" value={s.supabaseApiKey} onChange={(v) => s.setField('supabaseApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 4 tools: select_rows, insert_row, update_rows, delete_rows</p>
        </div>
      );
    case 'trello':
      return (
        <div className="space-y-4 mt-6">
          <Field id="trelloBaseUrl" label="Base URL" placeholder="https://api.trello.com/1" value={s.trelloBaseUrl} onChange={(v) => s.setField('trelloBaseUrl', v)} />
          <Field id="trelloApiKey" label="API Key" type="password" value={s.trelloApiKey} onChange={(v) => s.setField('trelloApiKey', v)} />
          <Field id="trelloApiToken" label="API Token" type="password" value={s.trelloApiToken} onChange={(v) => s.setField('trelloApiToken', v)} />
          <Field id="trelloMemberId" label="Member ID" value={s.trelloMemberId} onChange={(v) => s.setField('trelloMemberId', v)} optional />
          <Field id="trelloBoardId" label="Board ID" value={s.trelloBoardId} onChange={(v) => s.setField('trelloBoardId', v)} optional />
          <Field id="trelloListId" label="List ID" value={s.trelloListId} onChange={(v) => s.setField('trelloListId', v)} optional />
          <p className="text-xs text-slate-500">Creates 7 tools: get_member, list_boards, get_board, list_lists, list_cards, get_card, create_card</p>
        </div>
      );
    case 'gitlab':
      return (
        <div className="space-y-4 mt-6">
          <Field id="gitlabBaseUrl" label="GitLab URL" placeholder="https://gitlab.com/api/v4" value={s.gitlabBaseUrl} onChange={(v) => s.setField('gitlabBaseUrl', v)} />
          <Field id="gitlabToken" label="Access Token" type="password" placeholder="glpat-..." value={s.gitlabToken} onChange={(v) => s.setField('gitlabToken', v)} />
          <Field id="gitlabProjectId" label="Project ID" value={s.gitlabProjectId} onChange={(v) => s.setField('gitlabProjectId', v)} optional />
          <p className="text-xs text-slate-500">Creates 6 tools: list_projects, get_project, list_issues, create_issue, list_merge_requests, get_file</p>
        </div>
      );
    case 'bitbucket':
      return (
        <div className="space-y-4 mt-6">
          <Field id="bitbucketBaseUrl" label="Base URL" placeholder="https://api.bitbucket.org/2.0" value={s.bitbucketBaseUrl} onChange={(v) => s.setField('bitbucketBaseUrl', v)} />
          <Field id="bitbucketUsername" label="Username" value={s.bitbucketUsername} onChange={(v) => s.setField('bitbucketUsername', v)} />
          <Field id="bitbucketAppPassword" label="App Password" type="password" value={s.bitbucketAppPassword} onChange={(v) => s.setField('bitbucketAppPassword', v)} />
          <Field id="bitbucketWorkspace" label="Workspace" value={s.bitbucketWorkspace} onChange={(v) => s.setField('bitbucketWorkspace', v)} optional />
          <Field id="bitbucketRepoSlug" label="Repository Slug" value={s.bitbucketRepoSlug} onChange={(v) => s.setField('bitbucketRepoSlug', v)} optional />
          <p className="text-xs text-slate-500">Creates 6 tools: list_repos, get_repo, list_issues, create_issue, list_pull_requests, get_file</p>
        </div>
      );
    case 'gdrive':
      return (
        <div className="space-y-4 mt-6">
          <Field id="gdriveBaseUrl" label="Google Drive URL" placeholder="https://www.googleapis.com/drive/v3" value={s.gdriveBaseUrl} onChange={(v) => s.setField('gdriveBaseUrl', v)} />
          <Field id="gdriveAccessToken" label="Access Token" type="password" value={s.gdriveAccessToken} onChange={(v) => s.setField('gdriveAccessToken', v)} />
          <Field id="gdriveRootFolderId" label="Root Folder ID" value={s.gdriveRootFolderId} onChange={(v) => s.setField('gdriveRootFolderId', v)} optional />
          <p className="text-xs text-slate-500">Creates 5 tools: list_files, get_file, download_file, upload_file, create_folder</p>
        </div>
      );
    case 'googlecalendar':
      return (
        <div className="space-y-4 mt-6">
          <Field id="gcalBaseUrl" label="Google Calendar URL" placeholder="https://www.googleapis.com/calendar/v3" value={s.gcalBaseUrl} onChange={(v) => s.setField('gcalBaseUrl', v)} />
          <Field id="gcalAccessToken" label="Access Token" type="password" value={s.gcalAccessToken} onChange={(v) => s.setField('gcalAccessToken', v)} />
          <Field id="gcalCalendarId" label="Calendar ID" placeholder="primary" value={s.gcalCalendarId} onChange={(v) => s.setField('gcalCalendarId', v)} optional />
          <p className="text-xs text-slate-500">Creates 5 tools: list_calendars, list_events, get_event, create_event, update_event</p>
        </div>
      );
    case 'googledocs':
      return (
        <div className="space-y-4 mt-6">
          <Field id="gdocsBaseUrl" label="Google Docs URL" placeholder="https://docs.googleapis.com/v1" value={s.gdocsBaseUrl} onChange={(v) => s.setField('gdocsBaseUrl', v)} />
          <Field id="gdocsAccessToken" label="Access Token" type="password" value={s.gdocsAccessToken} onChange={(v) => s.setField('gdocsAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: list_documents, get_document, create_document, update_document, delete_document</p>
        </div>
      );
    case 'googlesheets':
      return (
        <div className="space-y-4 mt-6">
          <Field id="sheetsBaseUrl" label="Google Sheets URL" placeholder="https://sheets.googleapis.com/v4" value={s.sheetsBaseUrl} onChange={(v) => s.setField('sheetsBaseUrl', v)} />
          <Field id="sheetsAccessToken" label="Access Token" type="password" value={s.sheetsAccessToken} onChange={(v) => s.setField('sheetsAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: list_spreadsheets, get_spreadsheet, read_range, write_range, append_rows</p>
        </div>
      );
    case 'airtable':
      return (
        <div className="space-y-4 mt-6">
          <Field id="airtableBaseUrl" label="Airtable URL" placeholder="https://api.airtable.com/v0" value={s.airtableBaseUrl} onChange={(v) => s.setField('airtableBaseUrl', v)} />
          <Field id="airtableAccessToken" label="Access Token" type="password" value={s.airtableAccessToken} onChange={(v) => s.setField('airtableAccessToken', v)} />
          <Field id="airtableBaseId" label="Base ID" value={s.airtableBaseId} onChange={(v) => s.setField('airtableBaseId', v)} optional />
          <Field id="airtableTableName" label="Table Name" value={s.airtableTableName} onChange={(v) => s.setField('airtableTableName', v)} optional />
          <p className="text-xs text-slate-500">Creates 5 tools: list_bases, list_tables, list_records, create_record, update_record</p>
        </div>
      );
    case 'asana':
      return (
        <div className="space-y-4 mt-6">
          <Field id="asanaBaseUrl" label="Asana URL" placeholder="https://app.asana.com/api/1.0" value={s.asanaBaseUrl} onChange={(v) => s.setField('asanaBaseUrl', v)} />
          <Field id="asanaAccessToken" label="Access Token" type="password" value={s.asanaAccessToken} onChange={(v) => s.setField('asanaAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: list_workspaces, list_projects, list_tasks, create_task, update_task</p>
        </div>
      );
    case 'monday':
      return (
        <div className="space-y-4 mt-6">
          <Field id="mondayBaseUrl" label="Monday.com URL" placeholder="https://api.monday.com/v2" value={s.mondayBaseUrl} onChange={(v) => s.setField('mondayBaseUrl', v)} />
          <Field id="mondayApiKey" label="API Key" type="password" value={s.mondayApiKey} onChange={(v) => s.setField('mondayApiKey', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: list_boards, list_items, create_item, update_item, delete_item</p>
        </div>
      );
    case 'clickup':
      return (
        <div className="space-y-4 mt-6">
          <Field id="clickupBaseUrl" label="ClickUp URL" placeholder="https://api.clickup.com/api/v2" value={s.clickupBaseUrl} onChange={(v) => s.setField('clickupBaseUrl', v)} />
          <Field id="clickupAccessToken" label="Access Token" type="password" value={s.clickupAccessToken} onChange={(v) => s.setField('clickupAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: list_spaces, list_folders, list_lists, list_tasks, create_task</p>
        </div>
      );
    case 'linear':
      return (
        <div className="space-y-4 mt-6">
          <Field id="linearBaseUrl" label="Linear URL" placeholder="https://api.linear.app/graphql" value={s.linearBaseUrl} onChange={(v) => s.setField('linearBaseUrl', v)} />
          <Field id="linearAccessToken" label="Access Token" type="password" value={s.linearAccessToken} onChange={(v) => s.setField('linearAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: list_teams, list_projects, list_issues, create_issue, update_issue</p>
        </div>
      );
    case 'dropbox':
      return (
        <div className="space-y-4 mt-6">
          <Field id="dropboxBaseUrl" label="Dropbox API URL" placeholder="https://api.dropboxapi.com/2" value={s.dropboxBaseUrl} onChange={(v) => s.setField('dropboxBaseUrl', v)} />
          <Field id="dropboxContentBaseUrl" label="Content URL" placeholder="https://content.dropboxapi.com/2" value={s.dropboxContentBaseUrl} onChange={(v) => s.setField('dropboxContentBaseUrl', v)} />
          <Field id="dropboxAccessToken" label="Access Token" type="password" value={s.dropboxAccessToken} onChange={(v) => s.setField('dropboxAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: list_folder, get_metadata, search, download, upload</p>
        </div>
      );
    case 'jira':
      return (
        <div className="space-y-6 mt-6">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-start gap-3">
              <i className="fas fa-info-circle text-blue-500 mt-0.5" />
              <div className="text-sm text-slate-600">
                <p className="font-medium text-slate-700 mb-1">Jira API Token</p>
                <p>Create an API token at <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">id.atlassian.com/manage-profile/security/api-tokens</a>. Use your Atlassian account email and the API token for authentication.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Field id="jiraHost" label="Jira Host" placeholder="https://your-domain.atlassian.net" value={s.jiraHost} onChange={(v) => s.setField('jiraHost', v)} />
              <p className="text-xs text-slate-500 mt-2">Your Jira domain (with or without https://).</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">API Version</label>
              <select id="jiraApiVersion" className="input" value={s.jiraApiVersion} onChange={(e) => s.setField('jiraApiVersion', e.target.value as 'v2' | 'v3')}>
                <option value="v2">API v2 (Jira Server / Data Center)</option>
                <option value="v3">API v3 (Jira Cloud)</option>
              </select>
              <p className="text-xs text-slate-500 mt-2">Select based on your Jira deployment type.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Field id="jiraEmail" label="Email/Username" placeholder="you@example.com" value={s.jiraEmail} onChange={(v) => s.setField('jiraEmail', v)} />
              <p className="text-xs text-slate-500 mt-2">Your Atlassian account email.</p>
            </div>
            <div>
              <Field id="jiraApiToken" label="API Token" type="password" placeholder="Your API token" value={s.jiraApiToken} onChange={(v) => s.setField('jiraApiToken', v)} />
              <p className="text-xs text-slate-500 mt-2">Your Jira API token.</p>
            </div>
          </div>
          <div>
            <Field id="jiraProjectKey" label="Default Project Key" placeholder="e.g., MYPROJ" value={s.jiraProjectKey} onChange={(v) => s.setField('jiraProjectKey', v)} optional />
            <p className="text-xs text-slate-500 mt-2">Default project key for issue operations.</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <i className="fas fa-tools mr-2" />
              <strong>12 tools</strong> will be created: search_issues, get_issue, create_issue, update_issue, add_comment, get_transitions, transition_issue, list_projects, get_project, get_user, assign_issue, get_issue_comments
            </p>
          </div>
        </div>
      );
    case 'confluence':
      return (
        <div className="space-y-4 mt-6">
          <Field id="confluenceHost" label="Confluence Host" placeholder="yourcompany.atlassian.net" value={s.confluenceHost} onChange={(v) => s.setField('confluenceHost', v)} />
          <Field id="confluenceEmail" label="Email" type="email" placeholder="user@company.com" value={s.confluenceEmail} onChange={(v) => s.setField('confluenceEmail', v)} />
          <Field id="confluenceApiToken" label="API Token" type="password" value={s.confluenceApiToken} onChange={(v) => s.setField('confluenceApiToken', v)} />
          <p className="text-xs text-slate-500">Creates 7 tools: list_spaces, get_space, list_pages, get_page, create_page, update_page, search</p>
        </div>
      );
    case 'notion':
      return (
        <div className="space-y-4 mt-6">
          <Field id="notionBaseUrl" label="Notion URL" placeholder="https://api.notion.com/v1" value={s.notionBaseUrl} onChange={(v) => s.setField('notionBaseUrl', v)} />
          <Field id="notionVersion" label="API Version" placeholder="2022-06-28" value={s.notionVersion} onChange={(v) => s.setField('notionVersion', v)} />
          <Field id="notionAccessToken" label="Integration Token" type="password" placeholder="secret_..." value={s.notionAccessToken} onChange={(v) => s.setField('notionAccessToken', v)} />
          <p className="text-xs text-slate-500">Creates 6 tools: search, get_page, get_database, query_database, create_page, update_page</p>
        </div>
      );
    default:
      return null;
  }
}

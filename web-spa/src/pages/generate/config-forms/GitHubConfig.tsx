import { useGenerateStore } from '../store/useGenerateStore';

export function GitHubConfig() {
  const { githubToken, githubOwner, githubRepo, setField } = useGenerateStore();

  return (
    <div id="github-section" className="space-y-6">
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-start gap-3">
          <i className="fas fa-info-circle text-blue-500 mt-0.5" />
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-700 mb-1">GitHub Personal Access Token</p>
            <p>Create a token at <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">github.com/settings/tokens</a> with <code className="bg-slate-200 px-1 rounded">repo</code> scope for full access.</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">GitHub Token</label>
        <input
          type="password" autoComplete="new-password"
          id="githubToken"
          className="input"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          value={githubToken}
          onChange={(e) => setField('githubToken', e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-2">Your GitHub Personal Access Token (PAT).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Default Owner (Optional)</label>
          <input
            type="text"
            id="githubOwner"
            className="input"
            placeholder="e.g., octocat"
            value={githubOwner}
            onChange={(e) => setField('githubOwner', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-2">Default repository owner/organization.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Default Repo (Optional)</label>
          <input
            type="text"
            id="githubRepo"
            className="input"
            placeholder="e.g., hello-world"
            value={githubRepo}
            onChange={(e) => setField('githubRepo', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-2">Default repository name.</p>
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <i className="fas fa-tools mr-2" />
          <strong>10 tools</strong> will be created: list_repos, search_repos, get_repo, list_issues, create_issue, list_pull_requests, get_file_contents, list_commits, get_user, create_issue_comment
        </p>
      </div>
      <div id="github-parse-error" className="hidden p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm" />
    </div>
  );
}

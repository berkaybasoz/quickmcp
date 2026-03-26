import { useGenerateStore } from '../store/useGenerateStore';

export function GitHubConfig() {
  const { githubToken, githubOwner, githubRepo, setField } = useGenerateStore();

  return (
    <div className="space-y-4 mt-6">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Personal Access Token</label>
        <input type="password" className="input" placeholder="ghp_..." value={githubToken} onChange={(e) => setField('githubToken', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Default Owner (optional)</label>
        <input type="text" className="input" placeholder="octocat" value={githubOwner} onChange={(e) => setField('githubOwner', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Default Repository (optional)</label>
        <input type="text" className="input" placeholder="my-repo" value={githubRepo} onChange={(e) => setField('githubRepo', e.target.value)} />
      </div>
      <p className="text-xs text-slate-500">Creates 10 tools: list_repos, search_repos, get_repo, list_issues, create_issue, list_pull_requests, get_file_contents, list_commits, get_user, create_issue_comment</p>
    </div>
  );
}

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type UserRole = 'user' | 'admin';

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
};

type AuthViewer = {
  username?: string;
  role?: string;
  isAdmin?: boolean;
};

type WorkspaceUser = {
  username: string;
  workspaceId?: string;
  role?: string;
  createdAt?: string;
};

type UsersLoadState = 'idle' | 'loading' | 'ready' | 'forbidden' | 'error';
type CreateMessage = { type: 'success' | 'error'; text: string } | null;

const USERS_PAGE_TITLE = 'QuickMCP - Users';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || 'Unknown error');
}

function normalizeRole(role: unknown): UserRole {
  return String(role || '').toLowerCase() === 'admin' ? 'admin' : 'user';
}

export function UsersPage() {
  const [viewer, setViewer] = useState<AuthViewer | null>(null);

  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [usersState, setUsersState] = useState<UsersLoadState>('idle');
  const [usersError, setUsersError] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<CreateMessage>(null);

  const loadViewer = useCallback(async () => {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Unauthorized');
    }
    const payload = await response.json().catch(() => ({})) as ApiEnvelope<AuthViewer>;
    const nextViewer = payload?.data && typeof payload.data === 'object' ? payload.data : {};
    setViewer(nextViewer);
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersState('loading');
    setUsersError('');

    const response = await fetch('/api/auth/users', { credentials: 'include' });
    const payload = await response.json().catch(() => ({})) as ApiEnvelope<{ users?: WorkspaceUser[] }>;

    if (response.status === 403) {
      setUsersState('forbidden');
      setUsers([]);
      return;
    }

    if (!response.ok) {
      setUsersState('error');
      setUsers([]);
      setUsersError(String(payload?.error || payload?.message || `HTTP ${response.status}`));
      return;
    }

    const rows = Array.isArray(payload?.data?.users) ? payload.data!.users! : [];
    setUsers(rows.map((row) => ({
      username: String(row?.username || ''),
      workspaceId: String(row?.workspaceId || ''),
      role: normalizeRole(row?.role),
      createdAt: String(row?.createdAt || '')
    })).filter((row) => row.username));
    setUsersState('ready');
  }, []);

  const refreshPage = useCallback(async () => {
    setCreateMessage(null);
    try {
      await loadViewer();
      await loadUsers();
    } catch (error) {
      setUsersState('error');
      setUsers([]);
      setUsersError(toErrorMessage(error));
    }
  }, [loadUsers, loadViewer]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = USERS_PAGE_TITLE;
    document.body.classList.add('users-page');
    void refreshPage();
    return () => {
      document.body.classList.remove('users-page');
      document.title = previousTitle;
    };
  }, [refreshPage]);

  const viewerText = useMemo(() => {
    if (!viewer?.username) return '';
    return `Signed in as ${viewer.username} (${viewer.role || 'user'})`;
  }, [viewer?.role, viewer?.username]);

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateMessage(null);
    setIsCreating(true);
    try {
      const response = await fetch('/api/auth/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          role: newRole
        })
      });
      const payload = await response.json().catch(() => ({})) as ApiEnvelope<{ user?: { username?: string } }>;
      if (!response.ok) {
        throw new Error(String(payload?.error || payload?.message || `HTTP ${response.status}`));
      }

      const createdName = String(payload?.data?.user?.username || newUsername.trim());
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      setCreateMessage({ type: 'success', text: `User "${createdName}" created.` });
      await loadUsers();
    } catch (error) {
      setCreateMessage({ type: 'error', text: toErrorMessage(error) });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-modern px-8 pt-0 pb-8 relative z-0">
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900">Users</h2>
            <p className="text-slate-600 mt-1">Only users with the <span className="font-semibold">Admin</span> role can add new users.</p>
            <p className="text-sm text-slate-500 mt-2">{viewerText}</p>
          </div>

          {viewer?.isAdmin ? (
            <section id="createUserCard" className="card p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Add User</h3>
              <form className="grid grid-cols-1 md:grid-cols-4 gap-3" autoComplete="off" onSubmit={handleCreateUser}>
                <input
                  className="input"
                  placeholder="username"
                  minLength={3}
                  maxLength={64}
                  required
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                  disabled={isCreating}
                />
                <input
                  type="password"
                  className="input"
                  placeholder="password (min 6)"
                  minLength={6}
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={isCreating}
                />
                <select
                  className="input"
                  value={newRole}
                  onChange={(event) => setNewRole(normalizeRole(event.target.value))}
                  disabled={isCreating}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </form>
              {createMessage ? (
                <p className={createMessage.type === 'success' ? 'text-sm mt-3 text-green-700' : 'text-sm mt-3 text-red-600'}>
                  {createMessage.text}
                </p>
              ) : null}
            </section>
          ) : null}

          <section id="usersListCard" className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">User List</h3>
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 text-sm"
                onClick={() => {
                  void loadUsers();
                }}
              >
                Refresh
              </button>
            </div>

            {usersState === 'loading' ? <p className="text-sm text-slate-500">Loading users...</p> : null}
            {usersState === 'forbidden' ? <p className="text-sm text-amber-700">You do not have permission to view users.</p> : null}
            {usersState === 'error' ? <p className="text-sm text-red-600">{usersError || 'Failed to load users.'}</p> : null}
            {usersState === 'ready' && users.length === 0 ? <p className="text-sm text-slate-500">No users found.</p> : null}

            {usersState === 'ready' && users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-200">
                      <th className="py-2 pr-4 font-semibold text-slate-700">Username</th>
                      <th className="py-2 pr-4 font-semibold text-slate-700">Workspace</th>
                      <th className="py-2 pr-4 font-semibold text-slate-700">Role</th>
                      <th className="py-2 pr-4 font-semibold text-slate-700">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const role = normalizeRole(user.role);
                      return (
                        <tr key={user.username} className="border-b border-slate-100">
                          <td className="py-2 pr-4 text-slate-800">{user.username}</td>
                          <td className="py-2 pr-4 text-slate-600">{user.workspaceId || '-'}</td>
                          <td className="py-2 pr-4">
                            <span className={role === 'admin' ? 'px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700' : 'px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700'}>
                              {role}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-slate-600">{user.createdAt || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

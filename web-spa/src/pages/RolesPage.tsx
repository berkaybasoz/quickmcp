import { useCallback, useEffect, useMemo, useState } from 'react';

type UserRole = 'user' | 'admin';
type ToastType = 'success' | 'error' | 'warning' | 'info';

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
};

type RoleDefinition = {
  id: string;
  name: string;
  description: string;
};

type CurrentUser = {
  username?: string;
  workspaceId?: string;
  role?: string;
  isAdmin?: boolean;
};

type WorkspaceUser = {
  username: string;
  workspaceId?: string;
  role?: string;
};

type WorkspaceLoadState = 'idle' | 'loading' | 'ready' | 'forbidden' | 'error';

type RolesRuntimeWindow = Window & {
  utils?: {
    showToast?: (message: string, type?: ToastType) => void;
  };
};

const ROLES_PAGE_TITLE = 'QuickMCP - Roles';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || 'Unknown error');
}

function normalizeRole(role: unknown): UserRole {
  return String(role || '').toLowerCase() === 'admin' ? 'admin' : 'user';
}

function notify(message: string, type: ToastType): void {
  const runtime = window as RolesRuntimeWindow;
  runtime.utils?.showToast?.(message, type);
}

export function RolesPage() {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [rolesError, setRolesError] = useState('');

  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceLoadState>('idle');
  const [workspaceError, setWorkspaceError] = useState('');

  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>({});
  const [savingByUsername, setSavingByUsername] = useState<Record<string, boolean>>({});

  const canManage = Boolean(currentUser?.isAdmin);

  const loadRoles = useCallback(async () => {
    setRolesError('');
    try {
      const response = await fetch('/api/auth/roles', { credentials: 'include' });
      const payload = await response.json().catch(() => ({})) as ApiEnvelope<{
        roles?: RoleDefinition[];
        currentUser?: CurrentUser;
      }>;

      if (!response.ok) {
        throw new Error(String(payload?.error || payload?.message || `HTTP ${response.status}`));
      }

      const roleRows = Array.isArray(payload?.data?.roles) ? payload.data!.roles! : [];
      setRoles(roleRows.map((role) => ({
        id: String(role?.id || ''),
        name: String(role?.name || ''),
        description: String(role?.description || '')
      })).filter((role) => role.id));

      const viewer = payload?.data?.currentUser && typeof payload.data.currentUser === 'object'
        ? payload.data.currentUser
        : {};
      setCurrentUser(viewer);
    } catch (error) {
      setRoles([]);
      setRolesError(toErrorMessage(error));
    }
  }, []);

  const loadWorkspaceRoles = useCallback(async () => {
    setWorkspaceState('loading');
    setWorkspaceError('');

    const response = await fetch('/api/auth/users', { credentials: 'include' });
    const payload = await response.json().catch(() => ({})) as ApiEnvelope<{ users?: WorkspaceUser[] }>;

    if (response.status === 403) {
      setWorkspaceState('forbidden');
      setUsers([]);
      return;
    }

    if (!response.ok) {
      setWorkspaceState('error');
      setUsers([]);
      setWorkspaceError(String(payload?.error || payload?.message || `HTTP ${response.status}`));
      return;
    }

    const rows = Array.isArray(payload?.data?.users) ? payload.data!.users! : [];
    const normalizedRows = rows
      .map((user) => ({
        username: String(user?.username || ''),
        workspaceId: String(user?.workspaceId || ''),
        role: normalizeRole(user?.role)
      }))
      .filter((user) => user.username);

    setUsers(normalizedRows);
    setSelectedRoles(
      normalizedRows.reduce<Record<string, UserRole>>((acc, user) => {
        acc[user.username] = normalizeRole(user.role);
        return acc;
      }, {})
    );
    setWorkspaceState('ready');
  }, []);

  const refreshPage = useCallback(async () => {
    await loadRoles();
    await loadWorkspaceRoles();
  }, [loadRoles, loadWorkspaceRoles]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = ROLES_PAGE_TITLE;
    void refreshPage();
    return () => {
      document.title = previousTitle;
    };
  }, [refreshPage]);

  const roleCards = useMemo(() => {
    if (rolesError) {
      return <div className="text-red-600 text-sm">{rolesError || 'Failed to load roles.'}</div>;
    }

    if (roles.length === 0) {
      return <div className="text-slate-500 text-sm">Loading roles...</div>;
    }

    return roles.map((role) => {
      const isCurrent = String(currentUser?.role || '') === role.id;
      return (
        <article key={role.id} className={isCurrent ? 'card p-5 border border-blue-400 bg-blue-50/40' : 'card p-5 border border-slate-200'}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{role.name}</h3>
            {isCurrent ? (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">Current</span>
            ) : null}
          </div>
          <p className="text-sm text-slate-600 mt-3">{role.description}</p>
        </article>
      );
    });
  }, [currentUser?.role, roles, rolesError]);

  const saveRole = async (username: string) => {
    if (!canManage) return;

    const role = selectedRoles[username] || 'user';
    setSavingByUsername((prev) => ({ ...prev, [username]: true }));
    try {
      const response = await fetch(`/api/auth/users/${encodeURIComponent(username)}/role`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const payload = await response.json().catch(() => ({})) as ApiEnvelope<{ user?: WorkspaceUser }>;
      if (!response.ok) {
        throw new Error(String(payload?.error || payload?.message || `HTTP ${response.status}`));
      }

      setUsers((prev) => prev.map((user) => (
        user.username === username
          ? { ...user, role: normalizeRole(role) }
          : user
      )));
      notify(`Role updated: ${username} -> ${role}`, 'success');
    } catch (error) {
      notify(toErrorMessage(error), 'error');
    } finally {
      setSavingByUsername((prev) => ({ ...prev, [username]: false }));
    }
  };

  return (
    <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-modern px-8 pt-0 pb-8 relative z-0">
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
          <section className="card p-6">
            <h2 className="text-2xl font-bold text-slate-900">Roles</h2>
            <p className="text-slate-600 mt-2">Role model used by QuickMCP authentication.</p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleCards}
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Workspace User Roles</h3>
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 text-sm"
                onClick={() => {
                  void refreshPage();
                }}
              >
                Refresh
              </button>
            </div>

            {workspaceState === 'loading' ? <p className="text-sm text-slate-500">Loading users...</p> : null}
            {workspaceState === 'forbidden' ? <p className="text-sm text-amber-700">Only admin users can manage workspace roles.</p> : null}
            {workspaceState === 'error' ? <p className="text-sm text-red-600">{workspaceError || 'Failed to load workspace users.'}</p> : null}
            {workspaceState === 'ready' && users.length === 0 ? <p className="text-sm text-slate-500">No users found.</p> : null}

            {workspaceState === 'ready' && users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-200">
                      <th className="py-2 pr-4 font-semibold text-slate-700">Username</th>
                      <th className="py-2 pr-4 font-semibold text-slate-700">Workspace</th>
                      <th className="py-2 pr-4 font-semibold text-slate-700">Role</th>
                      <th className="py-2 pr-4 font-semibold text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const username = user.username;
                      const selected = selectedRoles[username] || normalizeRole(user.role);
                      const isSaving = Boolean(savingByUsername[username]);
                      const disabled = !canManage || isSaving;

                      return (
                        <tr key={username} className="border-b border-slate-100">
                          <td className="py-2 pr-4 text-slate-800">{username}</td>
                          <td className="py-2 pr-4 text-slate-600">{user.workspaceId || '-'}</td>
                          <td className="py-2 pr-4">
                            <select
                              className="input role-select h-9 py-1"
                              value={selected}
                              disabled={disabled}
                              onChange={(event) => {
                                setSelectedRoles((prev) => ({
                                  ...prev,
                                  [username]: normalizeRole(event.target.value)
                                }));
                              }}
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                          <td className="py-2 pr-4">
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
                              disabled={disabled}
                              onClick={() => {
                                void saveRole(username);
                              }}
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                          </td>
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

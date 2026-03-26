import { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const AUTH_CONFIG_CACHE_KEY = 'quickmcp.cache.auth.config';
const AUTH_ME_CACHE_KEY = 'quickmcp.cache.auth.me';
const UI_THEME_CACHE_KEY = 'quickmcp.cache.ui.theme';

type LoginMode = 'loading' | 'lite' | 'supabase';

function resolveNextPath(search: string, fallback = '/quick-ask'): string {
  const raw = new URLSearchParams(search).get('next') || '';
  return raw.startsWith('/') ? raw : fallback;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function clearClientCaches(): void {
  try { localStorage.removeItem(AUTH_CONFIG_CACHE_KEY); } catch {}
  try { localStorage.removeItem(AUTH_ME_CACHE_KEY); } catch {}
  try { localStorage.removeItem(UI_THEME_CACHE_KEY); } catch {}
}

async function hydrateThemeCacheFromServer(): Promise<void> {
  try {
    const response = await fetch('/api/ui/theme', { method: 'GET' });
    if (!response.ok) return;
    const payload = await response.json().catch(() => ({}));
    const raw = String(payload?.data?.theme || '').trim().toLowerCase();
    if (raw === 'dark' || raw === 'light') {
      try {
        localStorage.setItem(UI_THEME_CACHE_KEY, JSON.stringify({ theme: raw }));
      } catch {}
    }
  } catch {}
}

export function LoginPage() {
  const location = useLocation();
  const [mode, setMode] = useState<LoginMode>('loading');
  const [errorText, setErrorText] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'QuickMCP Login';
    document.body.classList.add('login-page');
    return () => {
      document.title = previousTitle;
      document.body.classList.remove('login-page');
    };
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const configRes = await fetch('/api/auth/config');
        const config = await configRes.json().catch(() => ({}));
        const authMode = String(config?.data?.authMode || 'LITE').trim().toUpperCase();

        if (authMode === 'SUPABASE_GOOGLE') {
          if (!active) return;
          setMode('supabase');
          const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          const accessToken = params.get('access_token');
          if (!accessToken) return;

          try {
            const response = await fetch('/api/auth/oauth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken })
            });
            if (!response.ok) {
              const body = await response.json().catch(() => ({ error: 'Supabase login failed' }));
              throw new Error(String(body?.error || 'Supabase login failed'));
            }
            const body = await response.json().catch(() => ({}));
            const queryNext = resolveNextPath(location.search, '/quick-ask');
            const apiNext = String(body?.data?.next || '');
            const next = queryNext.startsWith('/') ? queryNext : (apiNext.startsWith('/') ? apiNext : '/quick-ask');
            clearClientCaches();
            await hydrateThemeCacheFromServer();
            window.location.replace(next);
          } catch (error) {
            if (!active) return;
            setErrorText(toErrorMessage(error, 'Supabase login failed'));
          }
          return;
        }

        if (!active) return;
        setMode('lite');
      } catch (error) {
        if (!active) return;
        setMode('lite');
        setErrorText(toErrorMessage(error, 'Failed to initialize login'));
      }
    };

    void init();
    return () => { active = false; };
  }, [location.search]);

  const submitLiteLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setErrorText('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(String(body?.error || 'Login failed'));
      }

      clearClientCaches();
      await hydrateThemeCacheFromServer();
      const next = resolveNextPath(location.search, '/quick-ask');
      window.location.href = next;
    } catch (error) {
      setErrorText(toErrorMessage(error, 'Login failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const startGoogleLogin = () => {
    if (isGoogleLoading) return;
    setErrorText('');
    setIsGoogleLoading(true);
    const nextTarget = resolveNextPath(location.search, '/quick-ask');
    window.location.href = `/api/auth/oauth/start?next=${encodeURIComponent(nextTarget)}`;
  };

  const subtitle = mode === 'supabase'
    ? 'Sign in with Google to continue.'
    : (mode === 'loading' ? 'Sign in to continue.' : 'LITE auth mode is enabled. Sign in to continue.');

  return (
    <div className="h-screen flex items-center justify-center p-4">
      <main className="login-wrap">
        <section className="login-brand">
          <div>
            <div className="login-badge">QuickMCP Workspace Access</div>
            <h1>Connect data and tools, then let AI execute safely.</h1>
            <p>Secure sign-in for your MCP workspace. Use your account to manage databases, brokers, APIs, and production-ready integrations.</p>
          </div>
          <div className="login-points">
            <div className="login-point">Structured MCP actions for real workflows</div>
            <div className="login-point">Role-based access and token policies</div>
            <div className="login-point">Works across app and database connectors</div>
          </div>
        </section>

        <section className="login-panel">
          <h2 className="login-title">Sign in</h2>
          <p className="login-subtitle">{subtitle}</p>
          {errorText ? <p className="error-text">{errorText}</p> : null}

          {mode === 'lite' ? (
            <form className="space-y-4" autoComplete="off" onSubmit={(event) => { void submitLiteLogin(event); }}>
              <div>
                <label htmlFor="username" className="login-label">Username</label>
                <input
                  id="username"
                  type="text"
                  required
                  className="login-input"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="login-label">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  className="login-input"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <button type="submit" className="login-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Logging in...' : 'Login'}
              </button>
            </form>
          ) : null}

          {mode === 'supabase' ? (
            <div className="space-y-3">
              <button type="button" className="oauth-btn" onClick={startGoogleLogin} disabled={isGoogleLoading}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.2c-2.1 1.6-4.7 2.5-7.3 2.5-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.7 39.6 16.3 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.5l6.2 5.2C36.9 38.9 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
                </svg>
                <span>{isGoogleLoading ? 'Redirecting...' : 'Continue with Google'}</span>
              </button>
              <p className="login-google-note">Use your Google account to access QuickMCP securely.</p>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

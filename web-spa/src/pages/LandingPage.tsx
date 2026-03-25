import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useBootstrapStore } from '../shared/store/bootstrapStore';

type SessionState = 'idle' | 'processing' | 'error';

export function LandingPage() {
  const status = useBootstrapStore((state) => state.status);
  const me = useBootstrapStore((state) => state.me);
  const config = useBootstrapStore((state) => state.config);
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [sessionError, setSessionError] = useState('');
  const authMode = config?.authMode || 'NONE';
  const isAuthenticated = status === 'ready' && (!!me || authMode === 'NONE');
  const ctaHref = authMode === 'NONE' ? '/quick-ask' : '/login';

  useEffect(() => {
    let cancelled = false;

    const completeSupabaseSession = async () => {
      const hash = window.location.hash || '';
      if (!hash.includes('access_token=')) return;
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const accessToken = (params.get('access_token') || '').trim();
      if (!accessToken) return;

      setSessionState('processing');
      try {
        const response = await fetch('/api/auth/oauth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken })
        });
        if (!response.ok) throw new Error('session_failed');
        const body = await response.json().catch(() => ({}));
        const apiNext = typeof body?.data?.next === 'string' ? body.data.next : '';
        const next = apiNext.startsWith('/') ? apiNext : '/oauth/authorize/complete';
        if (!cancelled) {
          window.location.replace(next);
        }
      } catch {
        if (!cancelled) {
          setSessionState('error');
          setSessionError('Could not complete sign-in. Redirecting to login...');
          window.setTimeout(() => {
            window.location.replace(`/login${window.location.hash}`);
          }, 900);
        }
      }
    };

    void completeSupabaseSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const subtitle = useMemo(() => {
    if (sessionState === 'processing') return 'Completing sign-in...';
    return 'Generate, manage, and test MCP servers from one workspace.';
  }, [sessionState]);

  if (isAuthenticated) {
    return <Navigate to="/quick-ask" replace />;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 md:px-10">
        <header className="flex items-center justify-between border-b border-slate-800 pb-6">
          <a href="/landing" className="flex items-center gap-3 text-slate-100 no-underline">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">Q</span>
            <span className="text-lg font-semibold tracking-tight">QuickMCP</span>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/pricing"
              className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 no-underline hover:border-slate-500"
            >
              Pricing
            </a>
            <a
              href={ctaHref}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white no-underline hover:bg-blue-500"
            >
              {authMode === 'NONE' ? 'Open App' : 'Sign In'}
            </a>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-14 md:grid-cols-2">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-200">
              MCP Workspace
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Connect your tools, then let AI act safely.
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-300">
              {subtitle}
            </p>
            {sessionError ? (
              <p className="mt-4 text-sm text-rose-300">{sessionError}</p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={ctaHref}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white no-underline hover:bg-blue-500"
              >
                {authMode === 'NONE' ? 'Go to Quick Ask' : 'Get Started'}
              </a>
              <a
                href="/how-to-use"
                className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 no-underline hover:border-slate-500"
              >
                View Docs
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
            <h2 className="text-lg font-semibold text-slate-100">What you can do</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
                Generate MCP servers from DBs, APIs, files, and connectors.
              </li>
              <li className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
                Control access with token policies and role-based rules.
              </li>
              <li className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
                Test servers instantly from the integrated playground.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

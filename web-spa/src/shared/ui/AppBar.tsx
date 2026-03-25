import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type UiTheme = 'light' | 'dark';

const LEGACY_THEME_CACHE_KEY = 'quickmcp.cache.ui.theme';
const SPA_THEME_CACHE_KEY = 'quickmcp.spa.theme';

function subtitleByPath(pathname: string): string {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p === '/' || p === '/quick-ask') return 'Quick Ask';
  if (p === '/generate') return 'Server Generator';
  if (p === '/manage-servers') return 'Manage Servers';
  if (p === '/test-servers') return 'Test Servers';
  if (p === '/authorization') return 'Authorization';
  if (p === '/users') return 'Users';
  if (p === '/roles') return 'Roles';
  if (p === '/how-to-use') return 'How to Use';
  return 'Server Generator';
}

function readTheme(): UiTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = String(localStorage.getItem(SPA_THEME_CACHE_KEY) || '').trim().toLowerCase();
    if (stored === 'light' || stored === 'dark') return stored as UiTheme;
  } catch {}
  try {
    const raw = localStorage.getItem(LEGACY_THEME_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const legacy = String(parsed?.theme || '').trim().toLowerCase();
      if (legacy === 'light' || legacy === 'dark') return legacy as UiTheme;
    }
  } catch {}
  return 'light';
}

function applyTheme(theme: UiTheme): void {
  const html = document.documentElement;
  html.classList.toggle('dark', theme === 'dark');
}

type AppBarProps = {
  onOpenSidebar?: () => void;
  style?: CSSProperties;
};

export function AppBar({ onOpenSidebar, style }: AppBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<UiTheme>(() => readTheme());

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(SPA_THEME_CACHE_KEY, theme);
      localStorage.setItem(LEGACY_THEME_CACHE_KEY, JSON.stringify({ theme }));
    } catch {}
  }, [theme]);

  const subtitle = useMemo(() => subtitleByPath(location.pathname), [location.pathname]);
  const isDark = theme === 'dark';

  return (
    <header style={style} className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-700/70 shadow-sm relative z-50 h-16 flex-shrink-0 flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-6">
        <div
          className="flex items-center gap-3 cursor-pointer"
          role="link"
          tabIndex={0}
          onClick={() => navigate('/quick-ask')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate('/quick-ask');
            }
          }}
          aria-label="Go to home page"
        >
          <div>
            <h1 className="text-xl font-bold gradient-text leading-tight">QuickMCP</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
          </div>
        </div>
        <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700 to-transparent hidden md:block" />
        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            id="headerNewServerBtn"
            type="button"
            onClick={() => navigate('/generate')}
            className="md:inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-100 hover:text-blue-600 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <i className="fas fa-plus" />
            <span>New Server</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-green-50 dark:bg-emerald-950/45 text-green-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-sm font-medium border border-green-200/50 dark:border-emerald-800/60">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>System Online</span>
        </div>
        <button
          id="themeToggleBtn"
          type="button"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
          aria-label="Switch theme"
          title="Switch theme"
          onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        >
          <span data-theme-icon="sun" className={isDark ? '' : 'hidden'} aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.55 1.55M17.52 17.52l1.55 1.55M2 12h2.2M19.8 12H22M4.93 19.07l1.55-1.55M17.52 6.48l1.55-1.55" />
            </svg>
          </span>
          <span data-theme-icon="moon" className={isDark ? 'hidden' : ''} aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7.1 7.1 0 0 0 9.8 9.8z" />
            </svg>
          </span>
        </button>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-100"
          aria-label="Notifications"
        >
          <i className="fas fa-bell" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>
        <button id="openSidebar" type="button" onClick={onOpenSidebar} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-300">
          <i className="fas fa-bars" />
        </button>
      </div>
    </header>
  );
}

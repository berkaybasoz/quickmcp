import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppBar } from '../ui/AppBar';
import { Sidebar } from '../ui/Sidebar';

declare global {
  interface Window {
    updateUserAvatar?: () => Promise<void> | void;
  }
}

function isClientSideRoute(href: string): boolean {
  if (!href) return false;
  if (!href.startsWith('/')) return false;
  if (href.startsWith('/api/')) return false;
  if (href.startsWith('/mcp')) return false;
  return true;
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('sidebarWidth'));
      if (Number.isFinite(saved) && saved >= 180 && saved <= 420) return Math.round(saved);
    } catch {}
    return 288;
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const isRootEntry = location.pathname === '/';

  useEffect(() => {
    if (isRootEntry) return;
    document.body.classList.add('h-screen', 'flex', 'flex-col', 'overflow-hidden');
  }, [isRootEntry]);

  useEffect(() => {
    if (isRootEntry) return;
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [isRootEntry]);

  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? 'true' : 'false');
    } catch {}
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem('sidebarWidth', String(sidebarWidth));
    } catch {}
  }, [sidebarWidth]);

  useEffect(() => {
    if (isRootEntry) return;
    const offsetPx = sidebarCollapsed ? 48 : sidebarWidth;
    document.documentElement.style.setProperty('--sidebar-offset', `${offsetPx}px`);
    document.body.setAttribute('data-has-sidebar', '1');
  }, [isRootEntry, sidebarCollapsed, sidebarWidth]);

  useEffect(() => {
    if (isRootEntry) return;
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const homeTrigger = target.closest('[aria-label="Go to home page"]');
      if (homeTrigger) {
        event.preventDefault();
        event.stopPropagation();
        navigate('/quick-ask');
        return;
      }

      const newServerBtn = target.closest('#headerNewServerBtn');
      if (newServerBtn) {
        event.preventDefault();
        event.stopPropagation();
        navigate('/generate');
        return;
      }

      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href') || '';
      if (!isClientSideRoute(href)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      event.preventDefault();
      navigate(href);
    };

    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [isRootEntry, navigate]);

  const shellOffsetPx = sidebarCollapsed ? 48 : sidebarWidth;
  const appBarStyle = useMemo(() => {
    if (!isDesktop) return undefined;
    return {
      marginLeft: `${shellOffsetPx}px`,
      width: `calc(100% - ${shellOffsetPx}px)`
    };
  }, [isDesktop, shellOffsetPx]);

  const mainLayoutStyle = useMemo(() => {
    if (!isDesktop) return undefined;
    return { paddingLeft: `calc(${shellOffsetPx}px + var(--sidebar-gutter, 0px))` };
  }, [isDesktop, shellOffsetPx]);

  if (isRootEntry) {
    return <Outlet />;
  }

  return (
    <>
      <AppBar onOpenSidebar={() => setMobileSidebarOpen(true)} style={appBarStyle} />
      <div className="app-main-layout flex flex-1 overflow-x-hidden" id="app" style={mainLayoutStyle}>
        <Sidebar
          collapsed={sidebarCollapsed}
          widthPx={sidebarWidth}
          mobileOpen={mobileSidebarOpen}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onWidthChange={(width) => setSidebarWidth(width)}
        />
        <Outlet />
      </div>
    </>
  );
}

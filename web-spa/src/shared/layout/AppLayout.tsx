import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    renderSidebar?: () => void;
    renderSharedAppBar?: (force?: boolean) => void;
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

  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.className = 'h-screen flex flex-col';
    }

    document.body.classList.add('h-screen', 'flex', 'flex-col', 'overflow-hidden');

    window.renderSharedAppBar?.(true);
    window.renderSidebar?.();
    window.updateUserAvatar?.();
  }, []);

  useEffect(() => {
    window.renderSharedAppBar?.(true);
    window.renderSidebar?.();
  }, [location.pathname]);

  useEffect(() => {
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
  }, [navigate]);

  return (
    <>
      <header className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-700/70 shadow-sm relative z-50 h-16 flex-shrink-0 flex items-center justify-between px-6 py-3" />

      <div className="app-main-layout flex flex-1 overflow-x-hidden" id="app">
        <div
          id="sidebar"
          className="w-72 bg-white/95 backdrop-blur-sm border-r border-slate-200/60 flex flex-col flex-shrink-0 z-[60] fixed inset-y-0 left-0 transform -translate-x-full lg:translate-x-0 lg:top-0 lg:h-screen transition-transform duration-300 ease-in-out h-full pt-16 lg:pt-0"
        />

        <div
          id="sidebarOverlay"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden opacity-0 invisible transition-all duration-300"
        />

        <Outlet />
      </div>
    </>
  );
}

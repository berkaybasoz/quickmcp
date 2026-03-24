import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBootstrapStore } from '../store/bootstrapStore';

type SidebarProps = {
  collapsed: boolean;
  widthPx: number;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  onWidthChange: (width: number) => void;
};

type QuickAskChat = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
};

function isNavPathActive(path: string, pathname: string): boolean {
  const p = pathname.replace(/\/$/, '');
  if (path === '/' || path === '/quick-ask') {
    return p === '' || p === '/' || p === '/quick-ask';
  }
  return p === path;
}

function normalizeChatTitle(chat: any): string {
  const directTitle = String(chat?.title || '').trim();
  if (directTitle) return directTitle;
  const firstUserMessage = Array.isArray(chat?.messages)
    ? chat.messages.find((msg: any) => msg?.role === 'user' && String(msg?.content || '').trim())
    : null;
  const base = firstUserMessage ? String(firstUserMessage.content || '').trim() : '';
  return base ? base.slice(0, 80) : 'New chat';
}

function normalizeChatPreview(chat: any): string {
  const messages = Array.isArray(chat?.messages) ? chat.messages : [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const text = String(messages[i]?.content || '').trim();
    if (text) return text.slice(0, 96);
  }
  return 'No messages yet';
}

export function Sidebar({
  collapsed,
  widthPx,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
  onWidthChange
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const me = useBootstrapStore((state) => state.me);
  const config = useBootstrapStore((state) => state.config);

  const [chats, setChats] = useState<QuickAskChat[]>([]);
  const [chatStatus, setChatStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  const showUsers = (config?.authMode || 'NONE') !== 'NONE' && config?.deployMode !== 'SAAS' && (config as any)?.usersEnabled !== false;

  useEffect(() => {
    let cancelled = false;
    async function loadChats() {
      setChatStatus('loading');
      try {
        const response = await fetch('/api/ask/chats', { credentials: 'include' });
        const payload = await response.json().catch(() => ({}));
        const chatsRaw = (response.ok && payload?.success && Array.isArray(payload?.data?.chats))
          ? payload.data.chats
          : [];

        const nextChats = chatsRaw
          .map((chat: any) => ({
            id: String(chat?.id || '').trim(),
            title: normalizeChatTitle(chat),
            preview: normalizeChatPreview(chat),
            updatedAt: String(chat?.updatedAt || chat?.createdAt || '')
          }))
          .filter((chat: QuickAskChat) => chat.id)
          .sort((a: QuickAskChat, b: QuickAskChat) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
          .slice(0, 8);

        if (cancelled) return;
        setChats(nextChats);
        setChatStatus(nextChats.length ? 'ready' : 'empty');
      } catch {
        if (cancelled) return;
        setChats([]);
        setChatStatus('error');
      }
    }

    void loadChats();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop && mobileOpen) {
      onCloseMobile();
    }
  }, [location.pathname, mobileOpen, onCloseMobile]);

  const userName = String(me?.displayName || me?.username || 'Guest').trim() || 'Guest';
  const userEmail = String(me?.email || '').trim();
  const userAvatar = userName.charAt(0).toUpperCase() || 'G';

  const sidebarStyle = collapsed
    ? { width: '3rem' }
    : { width: `${widthPx}px` };

  const sidebarClass = [
    'w-72 bg-white/95 backdrop-blur-sm border-r border-slate-200/60 flex flex-col flex-shrink-0 z-[60] fixed inset-y-0 left-0 transform lg:translate-x-0 lg:top-0 lg:h-screen transition-transform duration-300 ease-in-out h-full pt-16 lg:pt-0',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'translate-x-0' : '-translate-x-full'
  ].join(' ').trim();

  const quickAskActive = isNavPathActive('/', location.pathname);

  const navItems = useMemo(() => {
    const base = [
      { href: '/quick-ask', icon: 'fa-comment-dots', title: 'Quick Ask', subtitle: 'Ask Aria with MCP tools', active: quickAskActive, iconClass: '' },
      { href: '/generate', icon: 'fa-magic', title: 'Generate Server', subtitle: 'Create new MCP servers', active: isNavPathActive('/generate', location.pathname), iconClass: '' },
      { href: '/manage-servers', icon: 'fa-server', title: 'Manage Servers', subtitle: 'Edit & Control', active: isNavPathActive('/manage-servers', location.pathname), iconClass: '' },
      { href: '/test-servers', icon: 'fa-vial', title: 'Test Servers', subtitle: 'Verify functionality', active: isNavPathActive('/test-servers', location.pathname), iconClass: '' },
      {
        href: '/authorization',
        icon: 'fa-key',
        title: 'Authorization',
        subtitle: 'MCP token policy',
        active: isNavPathActive('/authorization', location.pathname),
        iconClass: 'bg-amber-100 text-amber-700 group-hover:bg-amber-200'
      },
      { href: '/how-to-use', icon: 'fa-book', title: 'How to Use', subtitle: 'Documentation & Guide', active: isNavPathActive('/how-to-use', location.pathname), iconClass: '' }
    ];

    if (showUsers) {
      base.splice(5, 0, {
        href: '/users',
        icon: 'fa-users',
        title: 'Users',
        subtitle: 'User management',
        active: isNavPathActive('/users', location.pathname),
        iconClass: 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200'
      });
    }

    return base;
  }, [location.pathname, quickAskActive, showUsers]);

  const handleResizerMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (collapsed) return;
    const startX = event.clientX;
    const startWidth = widthPx;

    const onMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const next = Math.max(180, Math.min(420, startWidth + delta));
      onWidthChange(next);
    };

    const onUp = () => {
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    event.preventDefault();
  };

  return (
    <>
      <div id="sidebar" className={sidebarClass} style={sidebarStyle} data-ready="1">
        <div className="p-4 bg-white">
          <div id="sidebarHeaderRow" className="flex items-center justify-start gap-2 mb-2">
            <div id="sidebarHeaderMain" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                <i className="fas fa-rocket text-sm" />
              </div>
            </div>
            <div id="sidebarHeaderToggleWrap" className="flex items-center ml-auto">
              <button
                id="sidebarHeaderToggle"
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-blue-600 hover:shadow-sm dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-blue-300 transition-all"
                title="Toggle sidebar"
                onClick={onToggleCollapsed}
              >
                <span id="sidebarCollapseIcon" className="inline-flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 flex-shrink-0" aria-hidden="true">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M9 3v18" />
                  </svg>
                </span>
              </button>
            </div>
            <div id="sidebarHeaderActions" className="flex items-center gap-2">
              <button id="closeSidebar" type="button" className="lg:hidden text-slate-400 hover:text-slate-600" onClick={onCloseMobile}>
                <i className="fas fa-times" />
              </button>
            </div>
          </div>
        </div>

        <div id="sidebarNavList" className="p-3 overflow-y-auto flex-1 scrollbar-modern space-y-1.5">
          {navItems.map((item) => {
            const base = 'nav-item group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors';
            const activeCls = item.active ? ' active bg-slate-100 text-slate-900' : '';
            const iconBase = item.iconClass || 'bg-transparent text-slate-500';
            return (
              <a
                key={item.href}
                href={item.href}
                className={`${base}${activeCls}`}
                aria-current={item.active ? 'page' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(item.href);
                  onCloseMobile();
                }}
              >
                <div className="relative">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${iconBase}`}>
                    <i className={`fas ${item.icon}`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-slate-700 font-medium text-sm block">{item.title}</span>
                  <span className="text-slate-500 text-xs mt-0.5 block">{item.subtitle}</span>
                </div>
              </a>
            );
          })}

          <div id="sharedQuickAskSidebarChats" className="mt-3 pt-3 border-t border-slate-200/60 space-y-2">
            <div className="pt-1 flex items-center justify-between gap-2">
              <p className="text-[11px] tracking-[0.14em] uppercase text-slate-500 font-semibold">Your Chats</p>
              <a
                href="/quick-ask?new=1"
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                onClick={(event) => {
                  event.preventDefault();
                  navigate('/quick-ask?new=1');
                  onCloseMobile();
                }}
              >
                <i className="fas fa-plus text-[10px]" />
                New
              </a>
            </div>
            <div id="sharedQuickAskSidebarChatList" className="space-y-1">
              {chatStatus === 'loading' && <p className="px-2 py-2 text-xs text-slate-500">Loading chats...</p>}
              {chatStatus === 'error' && <p className="px-2 py-2 text-xs text-slate-500">Unable to load chats.</p>}
              {chatStatus === 'empty' && <p className="px-2 py-2 text-xs text-slate-500">No chats yet.</p>}
              {chatStatus === 'ready' && chats.map((chat) => (
                <a
                  key={chat.id}
                  href={`/quick-ask?chat=${encodeURIComponent(chat.id)}`}
                  className="group block rounded-lg border border-slate-200 bg-white px-2 py-2 hover:bg-slate-50"
                  onClick={(event) => {
                    event.preventDefault();
                    navigate(`/quick-ask?chat=${encodeURIComponent(chat.id)}`);
                    onCloseMobile();
                  }}
                >
                  <p className="text-xs font-semibold text-slate-800 truncate">{chat.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 truncate">{chat.preview}</p>
                </a>
              ))}
            </div>
            <a
              href="/quick-ask?new=1"
              className="quick-ask-collapsed-add w-9 h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-blue-600"
              title="New chat"
              aria-label="New chat"
              onClick={(event) => {
                event.preventDefault();
                navigate('/quick-ask?new=1');
                onCloseMobile();
              }}
            >
              <i className="fas fa-plus text-[12px]" />
            </a>
          </div>
        </div>

        <div id="sidebarUserSection" className="p-3 border-t border-slate-200/60 bg-white">
          <button id="sidebarUserButton" data-user-menu-anchor="true" type="button" className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold shadow-md flex-shrink-0" data-user-avatar>
              {userAvatar}
            </div>
            <div id="sidebarUserMeta" className="min-w-0">
              <div id="sidebarUserName" className="text-sm font-semibold text-slate-800 truncate">{userName}</div>
              <div id="sidebarUserEmail" className="text-xs text-slate-500 truncate">{userEmail || 'Not signed in'}</div>
            </div>
          </button>
        </div>

        <div id="sidebarResizer" className="hidden lg:block absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent" onMouseDown={handleResizerMouseDown} />
      </div>

      <div
        id="sidebarOverlay"
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden transition-all duration-300 ${mobileOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={onCloseMobile}
      />
    </>
  );
}

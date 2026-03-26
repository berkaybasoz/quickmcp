import { MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBootstrapStore } from '../store/bootstrapStore';
import { useQuickAskChatsStore } from '../store/QuickAskChatsStore';
import { useQuickAskStore } from '../store/QuickAskStore';

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

type UserSettingsTab = 'account';

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

function sortChatsByRecent<T extends { updatedAt?: string; createdAt?: string }>(chats: T[]): T[] {
  return [...chats].sort((a, b) => {
    const ta = new Date(String(a?.updatedAt || a?.createdAt || 0)).getTime();
    const tb = new Date(String(b?.updatedAt || b?.createdAt || 0)).getTime();
    return tb - ta;
  });
}

function toQuickAskChats(rawChats: unknown[]): QuickAskChat[] {
  return sortChatsByRecent((Array.isArray(rawChats) ? rawChats : []) as any[])
    .map((chat: any) => ({
      id: String(chat?.id || '').trim(),
      title: normalizeChatTitle(chat),
      preview: normalizeChatPreview(chat),
      updatedAt: String(chat?.updatedAt || chat?.createdAt || '')
    }))
    .filter((chat: QuickAskChat) => chat.id);
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
  const globalActiveChatId = useQuickAskStore((state) => state.activeChatId);
  const requestOpenChat = useQuickAskStore((state) => state.requestOpenChat);
  const requestNewChat = useQuickAskStore((state) => state.requestNewChat);
  const setGlobalActiveChatId = useQuickAskStore((state) => state.setActiveChatId);
  const chatsRaw = useQuickAskChatsStore((state) => state.chatsRaw);
  const storedCurrentChatId = useQuickAskChatsStore((state) => state.currentChatId);
  const chatsStoreStatus = useQuickAskChatsStore((state) => state.status);
  const fetchChatsOnce = useQuickAskChatsStore((state) => state.fetchOnce);
  const setChatsSnapshot = useQuickAskChatsStore((state) => state.setSnapshot);

  const [chatSearchText, setChatSearchText] = useState('');
  const [renamingChatId, setRenamingChatId] = useState('');
  const [renameDraft, setRenameDraft] = useState('');
  const [savingChatId, setSavingChatId] = useState('');
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<UserSettingsTab>('account');
  const [userMenuPosition, setUserMenuPosition] = useState<{ top: number; right: number }>({ top: 8, right: 8 });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const userMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const showUsers = (config?.authMode || 'NONE') !== 'NONE' && config?.deployMode !== 'SAAS' && (config as any)?.usersEnabled !== false;
  const chats = useMemo(() => toQuickAskChats(chatsRaw), [chatsRaw]);
  const chatStatus = useMemo<'loading' | 'ready' | 'empty' | 'error'>(() => {
    if (chatsStoreStatus === 'idle' || chatsStoreStatus === 'loading') return 'loading';
    if (chatsStoreStatus === 'error' && chats.length === 0) return 'error';
    return chats.length > 0 ? 'ready' : 'empty';
  }, [chats.length, chatsStoreStatus]);

  useEffect(() => {
    void fetchChatsOnce();
  }, [fetchChatsOnce]);

  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop && mobileOpen) {
      onCloseMobile();
    }
  }, [location.pathname, mobileOpen, onCloseMobile]);

  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsUserSettingsOpen(false);
  }, [location.pathname]);

  const userName = String(me?.displayName || me?.username || 'Guest').trim() || 'Guest';
  const accountUsername = String(me?.username || '').trim() || userName;
  const userEmail = String(me?.email || '').trim();
  const userSecondaryText = userEmail || (me ? 'Signed in' : 'Not signed in');
  const userAvatar = userName.charAt(0).toUpperCase() || 'G';
  const userRole = String(me?.role || 'user').trim() || 'user';
  const userWorkspace = String(me?.workspaceId || '').trim();
  const userCreatedDate = String(me?.createdDate || '').trim();
  const userLastSignInDate = String(me?.lastSignInDate || '').trim();
  const authMode = String(me?.authMode || 'NONE').trim() || 'NONE';
  const showLogout = authMode !== 'NONE';

  const sidebarStyle = collapsed
    ? { width: '3rem' }
    : { width: `${widthPx}px` };

  const sidebarClass = [
    'w-72 bg-white/95 backdrop-blur-sm border-r border-slate-200/60 flex flex-col flex-shrink-0 z-[60] fixed inset-y-0 left-0 transform lg:translate-x-0 lg:top-0 lg:h-screen transition-transform duration-300 ease-in-out h-full pt-16 lg:pt-0',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'translate-x-0' : '-translate-x-full'
  ].join(' ').trim();

  const quickAskActive = isNavPathActive('/', location.pathname);
  const filteredChats = useMemo(() => {
    const query = chatSearchText.trim().toLowerCase();
    if (!query) return chats;
    return chats.filter((chat) => (`${chat.title} ${chat.preview}`).toLowerCase().includes(query));
  }, [chatSearchText, chats]);

  const openChat = useCallback((chatId: string) => {
    const id = String(chatId || '').trim();
    if (!id) return;
    requestOpenChat(id);
    setGlobalActiveChatId(id);
    navigate('/quick-ask');
    onCloseMobile();
  }, [navigate, onCloseMobile, requestOpenChat, setGlobalActiveChatId]);

  const openNewChat = useCallback(() => {
    requestNewChat();
    setGlobalActiveChatId('');
    navigate('/quick-ask');
    onCloseMobile();
  }, [navigate, onCloseMobile, requestNewChat, setGlobalActiveChatId]);

  const persistChatState = useCallback(async (nextRaw: any[], nextCurrentChatId: string) => {
    const response = await fetch('/api/ask/chats', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chats: nextRaw,
        currentChatId: nextCurrentChatId
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    setChatsSnapshot(nextRaw, nextCurrentChatId);
  }, [setChatsSnapshot]);

  const startRename = useCallback((chat: QuickAskChat) => {
    setRenamingChatId(chat.id);
    setRenameDraft(chat.title || 'New chat');
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingChatId('');
    setRenameDraft('');
  }, []);

  const commitRename = useCallback(async (chatId: string, rawTitle: string) => {
    const id = String(chatId || '').trim();
    const title = String(rawTitle || '').trim();
    if (!id || !title) return;

    const nextRaw = chatsRaw.map((chat: any) => (
      String(chat?.id || '').trim() === id
        ? {
            ...chat,
            title: title.slice(0, 80)
          }
        : chat
    ));
    const nextCurrentId = nextRaw.some((chat: any) => String(chat?.id || '').trim() === storedCurrentChatId)
      ? storedCurrentChatId
      : '';

    setSavingChatId(id);
    try {
      await persistChatState(nextRaw, nextCurrentId);
      setRenamingChatId('');
      setRenameDraft('');
    } finally {
      setSavingChatId('');
    }
  }, [chatsRaw, persistChatState, storedCurrentChatId]);

  const deleteChat = useCallback(async (chatId: string) => {
    const id = String(chatId || '').trim();
    if (!id) return;

    const nextRaw = chatsRaw.filter((chat: any) => String(chat?.id || '').trim() !== id);
    const nextCurrentId = nextRaw.some((chat: any) => String(chat?.id || '').trim() === storedCurrentChatId)
      ? storedCurrentChatId
      : '';

    setSavingChatId(id);
    try {
      await persistChatState(nextRaw, nextCurrentId);
      if (renamingChatId === id) {
        setRenamingChatId('');
        setRenameDraft('');
      }
      if (globalActiveChatId === id) {
        setGlobalActiveChatId('');
        navigate('/quick-ask');
      }
    } finally {
      setSavingChatId('');
    }
  }, [chatsRaw, globalActiveChatId, navigate, persistChatState, renamingChatId, setGlobalActiveChatId, storedCurrentChatId]);

  const pendingDeleteChat = useMemo(
    () => chats.find((chat) => chat.id === pendingDeleteChatId) || null,
    [chats, pendingDeleteChatId]
  );

  const requestDeleteChat = useCallback((chatId: string) => {
    const id = String(chatId || '').trim();
    if (!id) return;
    setPendingDeleteChatId(id);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (!pendingDeleteChatId) return;
    if (savingChatId === pendingDeleteChatId) return;
    setPendingDeleteChatId('');
  }, [pendingDeleteChatId, savingChatId]);

  const closeUserSettings = useCallback(() => {
    if (isSigningOut) return;
    setIsUserSettingsOpen(false);
  }, [isSigningOut]);

  const updateUserMenuPosition = useCallback(() => {
    const anchorEl = userMenuAnchorRef.current;
    const menuEl = userMenuRef.current;
    if (!anchorEl || !menuEl) return;

    const rect = anchorEl.getBoundingClientRect();
    const menuHeight = menuEl.offsetHeight || 0;
    const menuWidth = menuEl.offsetWidth || 0;

    let top = rect.bottom + 8;
    const viewportBottom = window.innerHeight - 8;
    if (top + menuHeight > viewportBottom) {
      top = Math.max(8, rect.top - menuHeight - 8);
    }

    let right = Math.max(window.innerWidth - rect.right, 8);
    const left = window.innerWidth - right - menuWidth;
    if (left < 8) {
      right = Math.max(8, window.innerWidth - (8 + menuWidth));
    }

    setUserMenuPosition({ top, right });
  }, []);

  const signOut = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch {
      // Best effort logout; continue to login screen.
    } finally {
      window.location.assign('/login');
    }
  }, [isSigningOut]);

  const confirmDeleteChat = useCallback(async () => {
    const id = String(pendingDeleteChatId || '').trim();
    if (!id) return;
    try {
      await deleteChat(id);
    } finally {
      setPendingDeleteChatId('');
    }
  }, [deleteChat, pendingDeleteChatId]);

  useEffect(() => {
    if (!pendingDeleteChatId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeDeleteModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeDeleteModal, pendingDeleteChatId]);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    updateUserMenuPosition();
    const onResize = () => updateUserMenuPosition();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isUserMenuOpen, updateUserMenuPosition]);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (userMenuRef.current?.contains(target)) return;
      if (userMenuAnchorRef.current?.contains(target)) return;
      setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isUserMenuOpen && !isUserSettingsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (isUserSettingsOpen) {
        closeUserSettings();
        return;
      }
      setIsUserMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeUserSettings, isUserMenuOpen, isUserSettingsOpen]);

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

  const formatDateValue = useCallback((value: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }, []);

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
                  navigate(item.href, item.href === '/generate' ? { state: { new: true } } : undefined);
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
                href="/quick-ask"
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                onClick={(event) => {
                  event.preventDefault();
                  openNewChat();
                }}
              >
                <i className="fas fa-plus text-[10px]" />
                New
              </a>
            </div>
            <div className="px-0.5">
              <input
                type="text"
                value={chatSearchText}
                placeholder="Search chats"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                onChange={(event) => setChatSearchText(event.target.value)}
              />
            </div>
            <div id="sharedQuickAskSidebarChatList" className="space-y-1">
              {chatStatus === 'loading' && <p className="px-2 py-2 text-xs text-slate-500">Loading chats...</p>}
              {chatStatus === 'error' && <p className="px-2 py-2 text-xs text-slate-500">Unable to load chats.</p>}
              {chatStatus === 'empty' && <p className="px-2 py-2 text-xs text-slate-500">No chats yet.</p>}
              {chatStatus === 'ready' && filteredChats.length === 0 ? <p className="px-2 py-2 text-xs text-slate-500">No chats found.</p> : null}
              {chatStatus === 'ready' && filteredChats.map((chat) => {
                const isActive = location.pathname === '/quick-ask' && globalActiveChatId === chat.id;
                const isRenaming = renamingChatId === chat.id;
                const isSaving = savingChatId === chat.id;
                const itemClass = isActive
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50';
                return (
                  <div key={chat.id} className={`group relative rounded-lg border transition-colors ${itemClass}`}>
                    {isRenaming ? (
                      <div className="w-full rounded-lg px-2.5 py-2 pr-20 text-left">
                        <input
                          type="text"
                          value={renameDraft}
                          maxLength={80}
                          className="w-full rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          onChange={(event) => setRenameDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void commitRename(chat.id, renameDraft);
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              cancelRename();
                            }
                          }}
                          disabled={isSaving}
                        />
                        <p className="mt-0.5 text-[11px] text-slate-500 truncate">{chat.preview}</p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-full rounded-lg px-2.5 py-2 pr-20 text-left"
                        onClick={() => openChat(chat.id)}
                      >
                        <p className="text-xs font-semibold text-slate-800 truncate">{chat.title}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500 truncate">{chat.preview}</p>
                      </button>
                    )}

                    {isRenaming ? (
                      <div className="absolute right-1 top-1 flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 p-1 shadow-sm">
                        <button
                          type="button"
                          title="Save"
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                          onClick={() => {
                            void commitRename(chat.id, renameDraft);
                          }}
                          disabled={isSaving}
                        >
                          <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-check'} text-[10px]`}></i>
                        </button>
                        <button
                          type="button"
                          title="Cancel"
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                          onClick={cancelRename}
                          disabled={isSaving}
                        >
                          <i className="fas fa-times text-[10px]"></i>
                        </button>
                      </div>
                    ) : (
                      <div className="absolute right-1 top-1 hidden items-center gap-1 rounded-md border border-slate-200 bg-white/95 p-1 shadow-sm group-hover:flex group-focus-within:flex">
                        <button
                          type="button"
                          title="Rename chat"
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          onClick={() => startRename(chat)}
                        >
                          <i className="fas fa-pen text-[10px]"></i>
                        </button>
                        <button
                          type="button"
                          title="Delete chat"
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => {
                            requestDeleteChat(chat.id);
                          }}
                        >
                          <i className="fas fa-trash text-[10px]"></i>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <a
              href="/quick-ask"
              className="quick-ask-collapsed-add w-9 h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-blue-600"
              title="New chat"
              aria-label="New chat"
              onClick={(event) => {
                event.preventDefault();
                openNewChat();
              }}
            >
              <i className="fas fa-plus text-[12px]" />
            </a>
          </div>
        </div>

        <div id="sidebarUserSection" className="p-3 border-t border-slate-200/60 bg-white">
          <button
            id="sidebarUserButton"
            data-user-menu-anchor="true"
            type="button"
            ref={userMenuAnchorRef}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left"
            onClick={() => {
              setIsUserMenuOpen((current) => !current);
            }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold shadow-md flex-shrink-0" data-user-avatar>
              {userAvatar}
            </div>
            <div id="sidebarUserMeta" className="min-w-0">
              <div id="sidebarUserName" className="text-sm font-semibold text-slate-800 truncate">{userName}</div>
              <div id="sidebarUserEmail" className="text-xs text-slate-500 truncate">{userSecondaryText}</div>
            </div>
          </button>
        </div>

        <div id="sidebarResizer" className="hidden lg:block absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent" onMouseDown={handleResizerMouseDown} />
      </div>

      {isUserMenuOpen ? (
        <div
          id="userAvatarMenu"
          ref={userMenuRef}
          className="fixed z-[120] w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-2"
          style={{ top: `${userMenuPosition.top}px`, right: `${userMenuPosition.right}px` }}
        >
          <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 mb-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Signed In</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{userName}</div>
          </div>
          <button
            type="button"
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => {
              setIsUserMenuOpen(false);
              setActiveSettingsTab('account');
              setIsUserSettingsOpen(true);
            }}
          >
            Settings
          </button>
          {showLogout ? (
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
              onClick={() => {
                setIsUserMenuOpen(false);
                void signOut();
              }}
              disabled={isSigningOut}
            >
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </button>
          ) : null}
        </div>
      ) : null}

      {isUserSettingsOpen ? (
        <div className="fixed inset-0 z-[121] bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close user settings"
            className="absolute inset-0"
            onClick={closeUserSettings}
            disabled={isSigningOut}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="userSettingsDialogTitle"
            className="relative w-[42rem] max-w-[96vw] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-0 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70">
              <h3 id="userSettingsDialogTitle" className="text-base font-semibold text-slate-900 dark:text-slate-100">Settings</h3>
              <button
                type="button"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/60 disabled:opacity-50"
                onClick={closeUserSettings}
                disabled={isSigningOut}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="flex min-h-[24rem]">
              <div className="w-40 border-r border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-800/40">
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    activeSettingsTab === 'account'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setActiveSettingsTab('account')}
                >
                  Account
                </button>
              </div>

              <div className="flex-1 p-5 bg-white dark:bg-slate-900 overflow-auto">
                {activeSettingsTab === 'account' ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4 pb-1">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white flex items-center justify-center text-xl font-bold">
                        {userAvatar}
                      </div>
                      <div>
                        <div className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight">{userName}</div>
                        {userEmail ? <div className="text-sm text-slate-500 mt-1">{userEmail}</div> : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Username</div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">{accountUsername || '-'}</div>
                      </div>
                      {userEmail ? (
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Email</div>
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">{userEmail}</div>
                        </div>
                      ) : null}
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Role</div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">{userRole || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Workspace</div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">{userWorkspace || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">created_date</div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">{formatDateValue(userCreatedDate)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">last_sign_in_date</div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">{formatDateValue(userLastSignInDate)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Sign In</div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {authMode === 'SUPABASE_GOOGLE' ? 'Google' : (authMode || '-')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">No content.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        id="sidebarOverlay"
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden transition-all duration-300 ${mobileOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={onCloseMobile}
      />

      {pendingDeleteChatId ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close delete confirmation"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
            onClick={closeDeleteModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="deleteChatDialogTitle"
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <i className="fas fa-trash text-xs"></i>
              </div>
              <div className="min-w-0">
                <h3 id="deleteChatDialogTitle" className="text-sm font-semibold text-slate-900">Delete chat?</h3>
                <p className="mt-1 text-xs text-slate-600">
                  {pendingDeleteChat?.title
                    ? (
                      <>
                        <strong className="font-semibold text-slate-900">"{pendingDeleteChat.title}"</strong>
                        {' '}will be permanently removed.
                      </>
                    )
                    : 'This chat will be permanently removed.'}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={closeDeleteModal}
                disabled={savingChatId === pendingDeleteChatId}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                onClick={() => {
                  void confirmDeleteChat();
                }}
                disabled={savingChatId === pendingDeleteChatId}
              >
                {savingChatId === pendingDeleteChatId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

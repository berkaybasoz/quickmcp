import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuickAskStore } from '../shared/store/QuickAskStore';

type AskStatusKind = 'idle' | 'ready' | 'busy' | 'error';
type ChatRole = 'user' | 'assistant';
type ToastType = 'success' | 'error' | 'warning' | 'info';

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
};

type AskToolContext = {
  id: string;
  name: string;
  description?: string;
};

type AskServerContext = {
  id: string;
  name: string;
  type?: string;
  tools: AskToolContext[];
};

type AskContextPayload = {
  isSaasMode?: boolean;
  askEnabled?: boolean;
  reason?: string;
  servers?: AskServerContext[];
};

type AskMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  pending?: boolean;
};

type AskChat = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AskMessage[];
  selectedServerIds: string[];
  selectedToolIds: string[];
};

type QuickAskRuntimeWindow = Window & {
  utils?: {
    showToast?: (message: string, type?: ToastType) => void;
  };
};

const QUICK_ASK_PAGE_TITLE = 'QuickMCP - Quick Ask';
const QUICK_ASK_MAX_CHATS = 60;

function notify(message: string, type: ToastType): void {
  const runtime = window as QuickAskRuntimeWindow;
  runtime.utils?.showToast?.(message, type);
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix = 'qa'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildChatTitle(text: string): string {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'New chat';
  return clean.length > 52 ? `${clean.slice(0, 52)}...` : clean;
}

function normalizeIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  value.forEach((item) => {
    const id = String(item || '').trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
  });
  return Array.from(seen);
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function createChat(initialTitle = 'New chat'): AskChat {
  const now = nowIso();
  return {
    id: createId('chat'),
    title: initialTitle,
    createdAt: now,
    updatedAt: now,
    messages: [],
    selectedServerIds: [],
    selectedToolIds: []
  };
}

function normalizeChat(raw: any): AskChat | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim() || createId('chat');
  const title = String(raw.title || 'New chat').trim() || 'New chat';
  const createdAt = String(raw.createdAt || nowIso());
  const updatedAt = String(raw.updatedAt || createdAt);
  const messages = Array.isArray(raw.messages)
    ? raw.messages
        .map((item: any) => ({
          id: String(item?.id || createId('msg')),
          role: item?.role === 'assistant' ? 'assistant' : 'user',
          content: String(item?.content || ''),
          createdAt: String(item?.createdAt || nowIso()),
          pending: item?.pending === true
        } as AskMessage))
    : [];
  return {
    id,
    title,
    createdAt,
    updatedAt,
    messages,
    selectedServerIds: normalizeIdArray(raw.selectedServerIds),
    selectedToolIds: normalizeIdArray(raw.selectedToolIds)
  };
}

function sortChatsByRecent(chats: AskChat[]): AskChat[] {
  return [...chats].sort((a, b) => {
    const ta = new Date(a.updatedAt || 0).getTime();
    const tb = new Date(b.updatedAt || 0).getTime();
    return tb - ta;
  });
}

function normalizeChatState(
  chats: AskChat[],
  currentChatId: string
): { chats: AskChat[]; currentChatId: string } {
  let nextChats = sortChatsByRecent(chats);
  if (nextChats.length > QUICK_ASK_MAX_CHATS) {
    nextChats = nextChats.slice(0, QUICK_ASK_MAX_CHATS);
  }

  let nextCurrent = String(currentChatId || '').trim();
  if (nextCurrent && !nextChats.some((chat) => chat.id === nextCurrent)) {
    nextCurrent = '';
  }

  return { chats: nextChats, currentChatId: nextCurrent };
}

function getChatPreview(chat: AskChat): string {
  if (!Array.isArray(chat.messages) || chat.messages.length === 0) return 'No messages yet';
  const last = chat.messages[chat.messages.length - 1];
  const text = String(last?.content || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'No messages yet';
  return text.length > 56 ? `${text.slice(0, 56)}...` : text;
}

function isSameDay(a: Date, b: Date): boolean {
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatMessageMeta(isoValue: string): string {
  const date = new Date(String(isoValue || ''));
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const timeText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isSameDay(date, now)) return timeText;
  const dateText = date.toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' });
  return `${dateText} ${timeText}`;
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineMarkdown(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-100 text-slate-800 text-[12px]">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/_([^_]+)_/g, '<em>$1</em>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-700 hover:text-blue-800 underline">$1</a>');
  return out;
}

function splitMarkdownTableRow(line: string): string[] {
  const trimmed = String(line || '').trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line: string): boolean {
  const cells = splitMarkdownTableRow(line);
  if (!cells.length) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderMarkdownTextBlock(raw: string): string {
  const lines = String(raw || '').replace(/\r/g, '').split('\n');
  const html: string[] = [];
  let inUl = false;
  let inOl = false;
  let paragraphLines: string[] = [];

  const closeLists = () => {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  };

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const merged = paragraphLines.join(' ').replace(/\s+/g, ' ').trim();
    if (merged) {
      html.push(`<p class="my-2">${renderInlineMarkdown(merged)}</p>`);
    }
    paragraphLines = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeLists();
      continue;
    }

    const nextLine = String(lines[i + 1] || '').trim();
    const maybeTable = trimmed.includes('|') && nextLine.includes('|') && isMarkdownTableSeparator(nextLine);
    if (maybeTable) {
      flushParagraph();
      closeLists();
      const headerCells = splitMarkdownTableRow(trimmed);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length) {
        const rowLine = String(lines[i] || '').trim();
        if (!rowLine || !rowLine.includes('|')) {
          i -= 1;
          break;
        }
        rows.push(splitMarkdownTableRow(rowLine));
        i += 1;
      }

      html.push(`
        <div class="my-3 overflow-x-auto border border-slate-200 rounded-lg">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50">
              <tr>${headerCells.map((cell) => `<th class="px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-200">${renderInlineMarkdown(cell)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${rows.map((row) => `<tr class="odd:bg-white even:bg-slate-50/40">${row.map((cell) => `<td class="px-3 py-2 align-top border-b last:border-b-0 border-slate-100">${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </div>
      `);
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeLists();
      const level = Math.min(6, heading[1].length);
      const sizeMap: Record<number, string> = {
        1: 'text-2xl',
        2: 'text-xl',
        3: 'text-lg',
        4: 'text-base',
        5: 'text-sm',
        6: 'text-sm'
      };
      const sizeClass = sizeMap[level] || 'text-sm';
      html.push(`<h${level} class="${sizeClass} font-semibold text-slate-900 mt-4 mb-2">${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (inOl) {
        html.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        html.push('<ul class="list-disc pl-6 space-y-1 my-2">');
        inUl = true;
      }
      html.push(`<li>${renderInlineMarkdown(unordered[1])}</li>`);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (inUl) {
        html.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        html.push('<ol class="list-decimal pl-6 space-y-1 my-2">');
        inOl = true;
      }
      html.push(`<li>${renderInlineMarkdown(ordered[1])}</li>`);
      continue;
    }

    const quote = trimmed.match(/^>\s?(.+)$/);
    if (quote) {
      flushParagraph();
      closeLists();
      html.push(`<blockquote class="border-l-4 border-slate-300 pl-3 text-slate-700 italic my-2">${renderInlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      closeLists();
      html.push('<hr class="my-4 border-slate-200">');
      continue;
    }

    closeLists();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  closeLists();
  return html.join('');
}

function renderAssistantMarkdown(markdown: string): string {
  const input = String(markdown || '').trim();
  if (!input) return '';

  const html: string[] = [];
  const codeRegex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = codeRegex.exec(input)) !== null) {
    const before = input.slice(cursor, match.index);
    if (before.trim()) {
      html.push(renderMarkdownTextBlock(before));
    }

    const lang = String(match[1] || '').trim();
    const code = String(match[2] || '').replace(/\n$/, '');
    html.push(`
      <div class="my-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-950 text-slate-100">
        ${lang ? `<div class="px-3 py-1 text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-800">${escapeHtml(lang)}</div>` : ''}
        <pre class="p-3 overflow-x-auto text-xs leading-5"><code>${escapeHtml(code)}</code></pre>
      </div>
    `);

    cursor = match.index + match[0].length;
  }

  const rest = input.slice(cursor);
  if (rest.trim()) {
    html.push(renderMarkdownTextBlock(rest));
  }

  const finalHtml = html.join('').trim();
  return finalHtml || `<p class="my-2">${renderInlineMarkdown(input)}</p>`;
}

function buildConversationForRequest(chat: AskChat | null): Array<{ role: ChatRole; content: string }> {
  if (!chat || !Array.isArray(chat.messages)) return [];
  return chat.messages
    .filter((msg) => msg.pending !== true)
    .map((msg) => ({
      role: (msg.role === 'assistant' ? 'assistant' : 'user') as ChatRole,
      content: String(msg.content || '').trim().slice(0, 8000)
    }))
    .filter((msg) => !!msg.content)
    .slice(-24);
}

function sanitizeSelections(
  serverIds: string[],
  toolIds: string[],
  context: AskContextPayload | null
): { serverIds: string[]; toolIds: string[] } {
  const nextServerIds = normalizeIdArray(serverIds);
  const nextToolIds = normalizeIdArray(toolIds);
  const servers = Array.isArray(context?.servers) ? context!.servers! : [];
  if (servers.length === 0) {
    return { serverIds: nextServerIds, toolIds: nextToolIds };
  }

  const allowedServers = new Set(
    servers.map((server) => String(server?.id || '').trim()).filter(Boolean)
  );
  const allowedTools = new Set(
    servers.flatMap((server) => {
      const tools = Array.isArray(server?.tools) ? server.tools : [];
      return tools.map((tool) => String(tool?.id || '').trim()).filter(Boolean);
    })
  );

  return {
    serverIds: nextServerIds.filter((id) => allowedServers.has(id)),
    toolIds: nextToolIds.filter((id) => allowedTools.has(id))
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || 'Unknown error');
}

const STATUS_STYLES: Record<AskStatusKind, string> = {
  idle: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  ready: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-800/60',
  busy: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/45 dark:text-amber-300 dark:border-amber-800/60',
  error: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/45 dark:text-rose-300 dark:border-rose-800/60'
};

const STATUS_DOTS: Record<AskStatusKind, string> = {
  idle: 'bg-slate-400',
  ready: 'bg-emerald-500',
  busy: 'bg-amber-500',
  error: 'bg-rose-500'
};

export function QuickAskPage() {
  const navigationNonce = useQuickAskStore((state) => state.navigationNonce);
  const consumeNavigationIntent = useQuickAskStore((state) => state.consumeNavigationIntent);
  const setGlobalActiveChatId = useQuickAskStore((state) => state.setActiveChatId);

  const [askContext, setAskContext] = useState<AskContextPayload | null>(null);
  const [statusKind, setStatusKind] = useState<AskStatusKind>('idle');
  const [statusText, setStatusText] = useState('Initializing');
  const [isBusy, setIsBusy] = useState(false);

  const [chats, setChats] = useState<AskChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState('');
  const [chatSearchText, setChatSearchText] = useState('');
  const [renamingChatId, setRenamingChatId] = useState('');
  const [renameDraft, setRenameDraft] = useState('');

  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);

  const [inputText, setInputText] = useState('');
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false);

  const chatsRef = useRef<AskChat[]>([]);
  const currentChatIdRef = useRef('');
  const askContextRef = useRef<AskContextPayload | null>(null);

  const persistTimerRef = useRef<number | null>(null);
  const persistInFlightRef = useRef(false);
  const persistDirtyRef = useRef(false);
  const skipPersistRef = useRef(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    chatsRef.current = chats;
    currentChatIdRef.current = currentChatId;
    askContextRef.current = askContext;
  }, [askContext, chats, currentChatId]);

  const currentChat = useMemo(
    () => chats.find((chat) => chat.id === currentChatId) || null,
    [chats, currentChatId]
  );

  const filteredChats = useMemo(() => {
    const query = chatSearchText.trim().toLowerCase();
    const sorted = sortChatsByRecent(chats);
    if (!query) return sorted;
    return sorted.filter((chat) => (`${chat.title} ${getChatPreview(chat)}`).toLowerCase().includes(query));
  }, [chatSearchText, chats]);

  const askEnabled = askContext?.askEnabled === true;
  const selectedCount = selectedToolIds.length;

  const applyStatus = useCallback((kind: AskStatusKind, text: string) => {
    setStatusKind(kind);
    setStatusText(text);
  }, []);

  const persistChatsToServer = useCallback(async () => {
    if (persistInFlightRef.current) {
      persistDirtyRef.current = true;
      return;
    }

    persistInFlightRef.current = true;
    persistDirtyRef.current = false;

    try {
      await fetch('/api/ask/chats', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chats: chatsRef.current,
          currentChatId: currentChatIdRef.current
        })
      });
    } catch {
      // Keep local state; retry on next mutation.
    } finally {
      persistInFlightRef.current = false;
      if (persistDirtyRef.current) {
        persistDirtyRef.current = false;
        window.setTimeout(() => {
          void persistChatsToServer();
        }, 50);
      }
    }
  }, []);

  const schedulePersist = useCallback(() => {
    if (persistTimerRef.current) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      void persistChatsToServer();
    }, 300);
  }, [persistChatsToServer]);

  const applyChatState = useCallback((nextChats: AskChat[], nextCurrentChatId: string, options?: { skipPersist?: boolean }) => {
    chatsRef.current = nextChats;
    currentChatIdRef.current = nextCurrentChatId;
    if (options?.skipPersist) {
      skipPersistRef.current = true;
    }
    setChats(nextChats);
    setCurrentChatId(nextCurrentChatId);
  }, []);

  const setSelections = useCallback((serverIds: string[], toolIds: string[], persist = true) => {
    const resolved = sanitizeSelections(serverIds, toolIds, askContextRef.current);
    setSelectedServerIds(resolved.serverIds);
    setSelectedToolIds(resolved.toolIds);

    const chatId = currentChatIdRef.current;
    if (!chatId) return;

    const chat = chatsRef.current.find((item) => item.id === chatId);
    if (!chat) return;

    const prevServerIds = normalizeIdArray(chat.selectedServerIds);
    const prevToolIds = normalizeIdArray(chat.selectedToolIds);
    const changed = !sameStringArray(prevServerIds, resolved.serverIds)
      || !sameStringArray(prevToolIds, resolved.toolIds);

    if (!changed) return;

    const nextChats = chatsRef.current.map((item) => (
      item.id === chatId
        ? {
            ...item,
            selectedServerIds: resolved.serverIds,
            selectedToolIds: resolved.toolIds
          }
        : item
    ));
    applyChatState(nextChats, chatId, { skipPersist: !persist });
  }, [applyChatState]);

  const applySelectionsFromChat = useCallback((chat: AskChat | null, persistIfChanged = false) => {
    if (!chat) {
      setSelectedServerIds([]);
      setSelectedToolIds([]);
      return;
    }

    const resolved = sanitizeSelections(chat.selectedServerIds, chat.selectedToolIds, askContextRef.current);
    setSelectedServerIds(resolved.serverIds);
    setSelectedToolIds(resolved.toolIds);

    const prevServerIds = normalizeIdArray(chat.selectedServerIds);
    const prevToolIds = normalizeIdArray(chat.selectedToolIds);
    const changed = !sameStringArray(prevServerIds, resolved.serverIds)
      || !sameStringArray(prevToolIds, resolved.toolIds);

    if (!changed) return;

    const nextChats = chatsRef.current.map((item) => (
      item.id === chat.id
        ? {
            ...item,
            selectedServerIds: resolved.serverIds,
            selectedToolIds: resolved.toolIds
          }
        : item
    ));
    applyChatState(nextChats, currentChatIdRef.current, { skipPersist: !persistIfChanged });
  }, [applyChatState]);

  const loadChats = useCallback(async () => {
    const intent = consumeNavigationIntent();
    const requestedChatId = String(intent.openChatId || '').trim();
    const requestNewChat = intent.createNewChat === true;

    let nextChats: AskChat[] = [];
    let nextCurrentId = '';
    let shouldPersistAfterLoad = false;

    try {
      const response = await fetch('/api/ask/chats', { credentials: 'include' });
      const payload = await response.json().catch(() => ({})) as ApiEnvelope<{ chats?: unknown[]; currentChatId?: string }>;
      if (response.ok && payload?.success) {
        nextChats = Array.isArray(payload?.data?.chats)
          ? payload.data!.chats!.map((chat) => normalizeChat(chat)).filter((chat): chat is AskChat => !!chat)
          : [];
        nextCurrentId = String(payload?.data?.currentChatId || '').trim();
      }
    } catch {}

    if (requestNewChat) {
      const chat = createChat('New chat');
      nextChats = [chat, ...nextChats];
      nextCurrentId = chat.id;
      shouldPersistAfterLoad = true;
    }

    if (requestedChatId) {
      if (nextChats.some((chat) => chat.id === requestedChatId)) {
        nextCurrentId = requestedChatId;
      } else {
        nextCurrentId = '';
      }
    }

    const shouldSelectFromIntent = requestNewChat || (requestedChatId ? !!nextCurrentId : false);
    if (!shouldSelectFromIntent) {
      nextCurrentId = '';
    }
    const normalized = normalizeChatState(nextChats, nextCurrentId);
    nextChats = normalized.chats;
    nextCurrentId = normalized.currentChatId;

    applyChatState(nextChats, nextCurrentId, { skipPersist: !shouldPersistAfterLoad });
    initializedRef.current = true;

    const nextCurrent = nextChats.find((chat) => chat.id === nextCurrentId) || null;
    applySelectionsFromChat(nextCurrent, shouldPersistAfterLoad);

    if (shouldPersistAfterLoad) {
      schedulePersist();
    }
  }, [applyChatState, applySelectionsFromChat, consumeNavigationIntent, schedulePersist]);

  const loadContext = useCallback(async () => {
    applyStatus('busy', 'Loading context');
    try {
      const response = await fetch('/api/ask/context', { credentials: 'include' });
      const payload = await response.json().catch(() => ({})) as ApiEnvelope<AskContextPayload>;
      if (!response.ok || !payload?.success) {
        throw new Error(String(payload?.error || payload?.message || `HTTP ${response.status}`));
      }

      const data = payload?.data || {};
      setAskContext(data);
      askContextRef.current = data;

      if (data.askEnabled === true) {
        applyStatus('ready', 'Aria ready');
        const chat = chatsRef.current.find((item) => item.id === currentChatIdRef.current) || null;
        applySelectionsFromChat(chat, true);
      } else {
        setToolsPanelOpen(false);
        setSelectedServerIds([]);
        setSelectedToolIds([]);
        applyStatus('idle', data.isSaasMode ? 'Not configured' : 'On-Prem unsupported');
      }
    } catch (error) {
      setAskContext(null);
      setToolsPanelOpen(false);
      setSelectedServerIds([]);
      setSelectedToolIds([]);
      applyStatus('error', 'Unavailable');
      notify(toErrorMessage(error), 'error');
    }
  }, [applySelectionsFromChat, applyStatus]);

  const createNewChatFromCurrentSelection = useCallback(() => {
    const selectedServerIdsSnapshot = normalizeIdArray(selectedServerIds);
    const selectedToolIdsSnapshot = normalizeIdArray(selectedToolIds);

    const chat = createChat('New chat');
    chat.selectedServerIds = selectedServerIdsSnapshot;
    chat.selectedToolIds = selectedToolIdsSnapshot;

    const normalized = normalizeChatState([chat, ...chatsRef.current], chat.id);
    applyChatState(normalized.chats, normalized.currentChatId);
    applySelectionsFromChat(chat, false);
    setRenamingChatId('');
    setRenameDraft('');
    setInputText('');
  }, [applyChatState, applySelectionsFromChat, selectedServerIds, selectedToolIds]);

  const selectChat = useCallback((chatId: string) => {
    const id = String(chatId || '').trim();
    if (!id) return;
    if (!chatsRef.current.some((chat) => chat.id === id)) return;

    applyChatState(chatsRef.current, id);
    setRenamingChatId('');
    setRenameDraft('');
    const chat = chatsRef.current.find((item) => item.id === id) || null;
    applySelectionsFromChat(chat, true);
  }, [applyChatState, applySelectionsFromChat]);

  const startRename = useCallback((chatId: string) => {
    const chat = chatsRef.current.find((item) => item.id === chatId);
    if (!chat) return;
    setRenamingChatId(chat.id);
    setRenameDraft(chat.title || 'New chat');
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingChatId('');
    setRenameDraft('');
  }, []);

  const commitRename = useCallback((chatId: string, rawTitle: string) => {
    const title = String(rawTitle || '').trim();
    if (!title) {
      notify('Chat title cannot be empty', 'error');
      return;
    }

    const nextChats = chatsRef.current.map((chat) => (
      chat.id === chatId
        ? {
            ...chat,
            title: title.slice(0, 80)
          }
        : chat
    ));

    const normalized = normalizeChatState(nextChats, currentChatIdRef.current);
    applyChatState(normalized.chats, normalized.currentChatId);
    setRenamingChatId('');
    setRenameDraft('');
  }, [applyChatState]);

  const deleteChat = useCallback((chatId: string) => {
    const id = String(chatId || '').trim();
    if (!id) return;

    let nextChats = chatsRef.current.filter((chat) => chat.id !== id);
    let nextCurrentId = currentChatIdRef.current;

    if (nextChats.length === 0) {
      const chat = createChat('New chat');
      nextChats = [chat];
      nextCurrentId = chat.id;
    } else if (nextCurrentId === id) {
      nextCurrentId = String(sortChatsByRecent(nextChats)[0]?.id || '');
    }

    const normalized = normalizeChatState(nextChats, nextCurrentId);
    applyChatState(normalized.chats, normalized.currentChatId);

    const nextCurrent = normalized.chats.find((chat) => chat.id === normalized.currentChatId) || null;
    applySelectionsFromChat(nextCurrent, true);

    if (renamingChatId === id) {
      setRenamingChatId('');
      setRenameDraft('');
    }
  }, [applyChatState, applySelectionsFromChat, renamingChatId]);

  const appendMessage = useCallback((chatId: string, role: ChatRole, content: string, pending = false): string => {
    const message: AskMessage = {
      id: createId('msg'),
      role,
      content: String(content || ''),
      createdAt: nowIso(),
      pending
    };

    const nextChats = chatsRef.current.map((chat) => {
      if (chat.id !== chatId) return chat;
      const nextMessages = [...chat.messages, message];
      const nextChat = {
        ...chat,
        messages: nextMessages,
        updatedAt: nowIso()
      };
      if ((chat.title === 'New chat' || !String(chat.title || '').trim()) && role === 'user') {
        nextChat.title = buildChatTitle(content);
      }
      return nextChat;
    });

    const normalized = normalizeChatState(nextChats, chatId);
    applyChatState(normalized.chats, normalized.currentChatId);
    return message.id;
  }, [applyChatState]);

  const updateMessage = useCallback((chatId: string, messageId: string, content: string, pending = false) => {
    const nextChats = chatsRef.current.map((chat) => {
      if (chat.id !== chatId) return chat;
      return {
        ...chat,
        updatedAt: nowIso(),
        messages: chat.messages.map((msg) => (
          msg.id === messageId
            ? {
                ...msg,
                content: String(content || ''),
                pending
              }
            : msg
        ))
      };
    });

    const normalized = normalizeChatState(nextChats, chatId);
    applyChatState(normalized.chats, normalized.currentChatId);
  }, [applyChatState]);

  const sendPrompt = useCallback(async (promptOverride?: string) => {
    if (isBusy) return;
    if (!askEnabled) return;

    const prompt = String(promptOverride || inputText).trim();
    if (!prompt) {
      notify('Please enter a prompt', 'error');
      return;
    }

    setIsBusy(true);
    applyStatus('busy', 'Aria is thinking');

    let workingChatId = currentChatIdRef.current;
    if (!workingChatId) {
      const chat = createChat('New chat');
      chat.selectedServerIds = normalizeIdArray(selectedServerIds);
      chat.selectedToolIds = normalizeIdArray(selectedToolIds);
      const normalized = normalizeChatState([chat, ...chatsRef.current], chat.id);
      applyChatState(normalized.chats, normalized.currentChatId);
      workingChatId = normalized.currentChatId;
    }

    if (!promptOverride) {
      setInputText('');
    }

    appendMessage(workingChatId, 'user', prompt, false);
    const assistantMessageId = appendMessage(workingChatId, 'assistant', 'Thinking...', true);

    const requestChat = chatsRef.current.find((chat) => chat.id === workingChatId) || null;
    const conversation = buildConversationForRequest(requestChat);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          conversation,
          selectedServerIds: selectedServerIds,
          selectedToolIds: selectedToolIds
        })
      });
      const payload = await response.json().catch(() => ({})) as ApiEnvelope<{ answer?: string }>;
      if (!response.ok || !payload?.success) {
        throw new Error(String(payload?.error || payload?.message || `HTTP ${response.status}`));
      }

      updateMessage(workingChatId, assistantMessageId, String(payload?.data?.answer || 'No response'), false);
      applyStatus('ready', 'Aria ready');
    } catch (error) {
      const message = toErrorMessage(error);
      updateMessage(workingChatId, assistantMessageId, `Request failed: ${message}`, false);
      applyStatus('error', 'Request failed');
      notify(message, 'error');
    } finally {
      setIsBusy(false);
    }
  }, [applyChatState, appendMessage, applyStatus, askEnabled, inputText, isBusy, selectedServerIds, selectedToolIds, updateMessage]);

  const toggleServerSelection = useCallback((server: AskServerContext, checked: boolean) => {
    const serverId = String(server.id || '').trim();
    if (!serverId) return;

    const toolIds = (Array.isArray(server.tools) ? server.tools : [])
      .map((tool) => String(tool?.id || '').trim())
      .filter(Boolean);

    const nextServerIds = checked
      ? normalizeIdArray([...selectedServerIds, serverId])
      : selectedServerIds.filter((id) => id !== serverId);

    const nextToolIds = checked
      ? normalizeIdArray([...selectedToolIds, ...toolIds])
      : selectedToolIds.filter((id) => !toolIds.includes(id));

    setSelections(nextServerIds, nextToolIds, true);
  }, [selectedServerIds, selectedToolIds, setSelections]);

  const toggleToolSelection = useCallback((server: AskServerContext, toolIdRaw: string, checked: boolean) => {
    const serverId = String(server.id || '').trim();
    const toolId = String(toolIdRaw || '').trim();
    if (!serverId || !toolId) return;

    const serverToolIds = (Array.isArray(server.tools) ? server.tools : [])
      .map((tool) => String(tool?.id || '').trim())
      .filter(Boolean);

    const nextToolIds = checked
      ? normalizeIdArray([...selectedToolIds, toolId])
      : selectedToolIds.filter((id) => id !== toolId);

    const allChecked = serverToolIds.length > 0 && serverToolIds.every((id) => nextToolIds.includes(id));
    const nextServerIds = allChecked
      ? normalizeIdArray([...selectedServerIds, serverId])
      : selectedServerIds.filter((id) => id !== serverId);

    setSelections(nextServerIds, nextToolIds, true);
  }, [selectedServerIds, selectedToolIds, setSelections]);

  const handleMessageAction = useCallback(async (action: 'copy' | 'edit' | 'retry', message: AskMessage) => {
    if (message.role !== 'user') return;

    if (action === 'copy') {
      const text = String(message.content || '');
      if (!text) return;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const temp = document.createElement('textarea');
          temp.value = text;
          temp.setAttribute('readonly', 'true');
          temp.style.position = 'absolute';
          temp.style.left = '-9999px';
          document.body.appendChild(temp);
          temp.select();
          document.execCommand('copy');
          temp.remove();
        }
        notify('Copied', 'success');
      } catch {
        notify('Copy failed', 'error');
      }
      return;
    }

    if (action === 'edit') {
      setInputText(String(message.content || ''));
      return;
    }

    if (action === 'retry') {
      if (isBusy) return;
      await sendPrompt(String(message.content || ''));
    }
  }, [isBusy, sendPrompt]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = QUICK_ASK_PAGE_TITLE;
    document.body.classList.add('quick-ask-page');

    void loadChats();
    void loadContext();

    return () => {
      document.title = previousTitle;
      document.body.classList.remove('quick-ask-page');
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [loadChats, loadContext]);

  useEffect(() => {
    if (!initializedRef.current) return;
    void loadChats();
  }, [loadChats, navigationNonce]);

  useEffect(() => {
    if (!initializedRef.current) return;

    const event = new CustomEvent('quickask:chats-updated');
    window.dispatchEvent(event);

    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }

    schedulePersist();
  }, [chats, currentChatId, schedulePersist]);

  useEffect(() => {
    const chat = chatsRef.current.find((item) => item.id === currentChatIdRef.current) || null;
    applySelectionsFromChat(chat, false);
  }, [askContext?.servers, applySelectionsFromChat]);

  useEffect(() => {
    const messagesEl = document.getElementById('quickAskMessages');
    if (!messagesEl) return;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }, [currentChat?.messages]);

  useEffect(() => {
    setGlobalActiveChatId(currentChatId);
  }, [currentChatId, setGlobalActiveChatId]);

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col min-w-0">
      <div className="absolute inset-0 shadow-inner shadow-slate-200/30 pointer-events-none z-10"></div>
      <main className="flex-1 overflow-y-auto scrollbar-modern p-8 relative z-0">
        <div className="max-w-5xl mx-auto pb-20">
          <section id="quickAskSection">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-xl shadow-slate-200/60">
              <div className="absolute -top-16 -right-14 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none"></div>

              <div className="relative p-6 md:p-7 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-blue-700 font-semibold">Quick Ask</p>
                    <h2 className="text-2xl font-bold text-slate-900">Ask Aria with your MCP tools</h2>
                    <p className="text-sm text-slate-600 mt-1">Choose your MCP context, send your prompt, get a focused answer.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id="quickAskNewChatBtn"
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      onClick={createNewChatFromCurrentSelection}
                    >
                      <i className="fas fa-plus text-[11px]"></i>
                      New chat
                    </button>
                    <span id="quickAskStatus" className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_STYLES[statusKind]}`}>
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOTS[statusKind]}`}></span>
                      {statusText}
                    </span>
                  </div>
                </div>

                <div id="quickAskConversationWrap" className={currentChat && currentChat.messages.length > 0 ? 'rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur shadow-inner shadow-slate-100 overflow-hidden' : 'hidden rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur shadow-inner shadow-slate-100 overflow-hidden'}>
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70">
                    <p id="quickAskActiveChatTitle" className="text-sm font-semibold text-slate-800 truncate">{currentChat?.title || 'New chat'}</p>
                  </div>

                  <div id="quickAskMessages" className={currentChat && currentChat.messages.length > 0 ? 'h-[52vh] min-h-[320px] overflow-y-auto scrollbar-modern p-4 space-y-3' : 'hidden h-[52vh] min-h-[320px] overflow-y-auto scrollbar-modern p-4 space-y-3'}>
                    {(currentChat?.messages || []).map((message) => {
                      const isUser = message.role === 'user';
                      const wrapperClass = isUser ? 'flex justify-end w-full' : 'flex justify-start w-full';
                      const bubbleClass = isUser
                        ? 'group relative max-w-[84%] rounded-2xl px-4 py-3 shadow-sm bg-slate-900 text-white border border-slate-800'
                        : 'group relative max-w-[84%] rounded-2xl px-4 py-3 shadow-sm bg-white text-slate-800 border border-slate-200';
                      const userMeta = isUser ? formatMessageMeta(message.createdAt) : '';

                      return (
                        <div key={message.id} className={wrapperClass}>
                          <div className={bubbleClass}>
                            {isUser ? (
                              <p className="text-sm leading-6 whitespace-pre-wrap">{message.content}</p>
                            ) : (
                              <div
                                className="qa-markdown text-sm"
                                dangerouslySetInnerHTML={{
                                  __html: message.pending
                                    ? '<div class="qa-thinking" role="status" aria-live="polite" aria-label="AI is thinking"><span class="qa-thinking-icon"><i class="fas fa-robot"></i></span><span class="qa-thinking-dots" aria-hidden="true"><span></span><span></span><span></span></span></div>'
                                    : (renderAssistantMarkdown(message.content) || '<p class="my-2">No response</p>')
                                }}
                              />
                            )}

                            {isUser ? (
                              <>
                                {userMeta ? (
                                  <div className="mt-1.5 hidden items-center justify-end group-hover:flex group-focus-within:flex">
                                    <span className="text-[11px] text-slate-300">{userMeta}</span>
                                  </div>
                                ) : null}
                                <div className="absolute -top-2 right-2 hidden items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm group-hover:flex group-focus-within:flex">
                                  <button
                                    type="button"
                                    title="Retry"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    onClick={() => {
                                      void handleMessageAction('retry', message);
                                    }}
                                  >
                                    <i className="fas fa-rotate-right text-[10px]"></i>
                                  </button>
                                  <button
                                    type="button"
                                    title="Edit"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    onClick={() => {
                                      void handleMessageAction('edit', message);
                                    }}
                                  >
                                    <i className="fas fa-pen text-[10px]"></i>
                                  </button>
                                  <button
                                    type="button"
                                    title="Copy"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    onClick={() => {
                                      void handleMessageAction('copy', message);
                                    }}
                                  >
                                    <i className="fas fa-copy text-[10px]"></i>
                                  </button>
                                </div>
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div id="quickAskMessagesEmpty" className={currentChat && currentChat.messages.length > 0 ? 'hidden h-[52vh] min-h-[320px] items-center justify-center p-6 text-center' : 'h-[52vh] min-h-[320px] flex items-center justify-center p-6 text-center'}>
                    <div className="max-w-sm space-y-2">
                      <p className="text-sm font-semibold text-slate-700">Start a conversation</p>
                      <p className="text-xs text-slate-500">Your messages and Aria responses will appear here.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white/85 backdrop-blur p-3 md:p-4 shadow-inner shadow-slate-100">
                  <textarea
                    id="quickAskInput"
                    rows={2}
                    className="w-full resize-none bg-transparent border-0 focus:outline-none text-[15px] leading-relaxed text-slate-800 placeholder:text-slate-400"
                    placeholder="Message Aria..."
                    value={inputText}
                    disabled={!askEnabled || isBusy}
                    onChange={(event) => setInputText(event.target.value)}
                    onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void sendPrompt();
                      }
                    }}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <button
                      id="quickAskOpenToolsBtn"
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors"
                      onClick={() => setToolsPanelOpen((current) => !current)}
                    >
                      <i className="fas fa-sliders-h text-[11px]"></i>
                      Selected MCP & Tools
                      <span id="quickAskSelectedCount" className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] px-1">{selectedCount}</span>
                    </button>
                    <button
                      id="quickAskSendBtn"
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!askEnabled || isBusy}
                      onClick={() => {
                        void sendPrompt();
                      }}
                    >
                      <i className={`fas ${isBusy ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-xs`}></i>
                      Ask
                    </button>
                  </div>
                </div>

                <div id="quickAskToolsPanel" className={toolsPanelOpen ? 'rounded-xl border border-slate-200 bg-white/90 p-4 space-y-3' : 'hidden rounded-xl border border-slate-200 bg-white/90 p-4 space-y-3'}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Choose MCP servers and tools</p>
                    <button
                      id="quickAskRefreshBtn"
                      type="button"
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                      onClick={() => {
                        void loadContext();
                      }}
                    >
                      Refresh
                    </button>
                  </div>

                  <div id="quickAskToolsList" className="max-h-72 overflow-auto space-y-2 pr-1">
                    {(Array.isArray(askContext?.servers) ? askContext!.servers! : []).length === 0 ? (
                      <p className="text-xs text-slate-500">No MCP servers found yet.</p>
                    ) : (
                      (askContext?.servers || []).map((server) => {
                        const serverId = String(server.id || '');
                        const serverChecked = selectedServerIds.includes(serverId);
                        const tools = Array.isArray(server.tools) ? server.tools : [];

                        return (
                          <details key={serverId} className="quick-ask-server-details border border-slate-200 rounded-lg bg-slate-50/60">
                            <summary className="quick-ask-server-summary cursor-pointer px-3 py-2.5 flex items-center justify-between gap-3 text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <i className="quick-ask-server-chevron fas fa-chevron-down text-[11px] text-slate-500"></i>
                                <label className="inline-flex items-center gap-2 text-slate-800 font-medium min-w-0" onClick={(event) => event.stopPropagation()}>
                                  <span className="relative inline-flex h-5 w-9 flex-shrink-0">
                                    <input
                                      type="checkbox"
                                      data-quick-ask-server
                                      data-server-id={serverId}
                                      className="peer sr-only quick-ask-toggle-input"
                                      checked={serverChecked}
                                      onChange={(event) => toggleServerSelection(server, event.target.checked)}
                                    />
                                    <span className="quick-ask-toggle-track absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-emerald-500"></span>
                                    <span className="quick-ask-toggle-thumb absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4"></span>
                                  </span>
                                  <span className="truncate">{server.name || serverId}</span>
                                  <span className="text-[11px] text-slate-500 uppercase tracking-wide flex-shrink-0">{server.type || ''}</span>
                                </label>
                              </div>
                              <span className="text-xs text-slate-500">{tools.length} tools</span>
                            </summary>

                            <div className="px-4 pb-3 space-y-2">
                              {tools.length === 0 ? <p className="text-xs text-slate-400">No tools in this server.</p> : null}
                              {tools.map((tool) => {
                                const toolId = String(tool.id || '');
                                const checked = selectedToolIds.includes(toolId);
                                return (
                                  <label key={toolId} className="flex items-start gap-2 text-xs text-slate-700">
                                    <span className="relative inline-flex h-5 w-9 mt-0.5 flex-shrink-0">
                                      <input
                                        type="checkbox"
                                        data-quick-ask-tool
                                        data-server-id={serverId}
                                        data-tool-id={toolId}
                                        className="peer sr-only quick-ask-toggle-input"
                                        checked={checked}
                                        onChange={(event) => toggleToolSelection(server, toolId, event.target.checked)}
                                      />
                                      <span className="quick-ask-toggle-track absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-emerald-500"></span>
                                      <span className="quick-ask-toggle-thumb absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4"></span>
                                    </span>
                                    <span>
                                      <span className="font-semibold text-slate-800">{tool.name || ''}</span>
                                      <span className="text-slate-500">{tool.description ? ` - ${tool.description}` : ''}</span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </details>
                        );
                      })
                    )}
                  </div>

                  <p id="quickAskHint" className="text-xs text-slate-500">
                    {askContext?.reason || 'Select one or more tools to narrow the answer context.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

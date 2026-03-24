let quickAskContext = null;
let quickAskSelectedServerIds = new Set();
let quickAskSelectedToolIds = new Set();
let quickAskBusy = false;
const QUICK_ASK_MAX_CHATS = 60;
let quickAskChats = [];
let quickAskCurrentChatId = '';
let quickAskChatSearchText = '';
let quickAskPersistTimer = null;
let quickAskPersistInFlight = false;
let quickAskPersistDirty = false;
let quickAskInlineRenameChatId = '';

function setQuickAskStatus(kind, text) {
    const el = document.getElementById('quickAskStatus');
    if (!el) return;
    const styles = {
        idle: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        ready: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-800/60',
        busy: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/45 dark:text-amber-300 dark:border-amber-800/60',
        error: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/45 dark:text-rose-300 dark:border-rose-800/60'
    };
    const dots = {
        idle: 'bg-slate-400',
        ready: 'bg-emerald-500',
        busy: 'bg-amber-500',
        error: 'bg-rose-500'
    };
    const mode = Object.prototype.hasOwnProperty.call(styles, kind) ? kind : 'idle';
    el.className = `inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${styles[mode]}`;
    el.innerHTML = `<span class="h-2 w-2 rounded-full ${dots[mode]}"></span>${text || ''}`;
}



function renderInlineMarkdown(text) {
    let out = escapeHtml(text);
    out = out.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-100 text-slate-800 text-[12px]">$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    out = out.replace(/_([^_]+)_/g, '<em>$1</em>');
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-700 hover:text-blue-800 underline">$1</a>');
    return out;
}

function splitMarkdownTableRow(line) {
    const trimmed = String(line || '').trim().replace(/^\|/, '').replace(/\|$/, '');
    return trimmed.split('|').map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line) {
    const cells = splitMarkdownTableRow(line);
    if (!cells.length) return false;
    return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderMarkdownTextBlock(raw) {
    const lines = String(raw || '').replace(/\r/g, '').split('\n');
    const html = [];
    let inUl = false;
    let inOl = false;
    let paragraphLines = [];

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
            const rows = [];
            i += 2; // skip header + separator
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
            const sizeMap = {
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

function renderQuickAskAnswerMarkdown(markdown) {
    const input = String(markdown || '').trim();
    if (!input) return '';

    const html = [];
    const codeRegex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
    let cursor = 0;
    let match;

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

function quickAskNowIso() {
    return new Date().toISOString();
}

function quickAskIsSameDay(a, b) {
    if (!(a instanceof Date) || Number.isNaN(a.getTime())) return false;
    if (!(b instanceof Date) || Number.isNaN(b.getTime())) return false;
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function quickAskFormatMessageMeta(isoValue) {
    const date = new Date(String(isoValue || ''));
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const timeText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (quickAskIsSameDay(date, now)) return timeText;
    const dateText = date.toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' });
    return `${dateText} ${timeText}`;
}

function quickAskCreateId(prefix = 'qa') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function quickAskBuildTitle(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return 'New chat';
    return clean.length > 52 ? `${clean.slice(0, 52)}...` : clean;
}

function quickAskNormalizeIdArray(value) {
    if (!Array.isArray(value)) return [];
    const uniq = new Set(
        value
            .map((item) => String(item || '').trim())
            .filter(Boolean)
    );
    return Array.from(uniq);
}

function quickAskCreateChat(initialTitle = 'New chat') {
    const now = quickAskNowIso();
    return {
        id: quickAskCreateId('chat'),
        title: initialTitle,
        createdAt: now,
        updatedAt: now,
        messages: [],
        selectedServerIds: [],
        selectedToolIds: []
    };
}

function quickAskNormalizeChat(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = String(raw.id || '').trim() || quickAskCreateId('chat');
    const title = String(raw.title || 'New chat').trim() || 'New chat';
    const createdAt = String(raw.createdAt || quickAskNowIso());
    const updatedAt = String(raw.updatedAt || createdAt);
    const messages = Array.isArray(raw.messages)
        ? raw.messages
            .map((item) => {
                const role = item?.role === 'assistant' ? 'assistant' : 'user';
                const content = String(item?.content || '');
                return {
                    id: String(item?.id || quickAskCreateId('msg')),
                    role,
                    content,
                    createdAt: String(item?.createdAt || quickAskNowIso()),
                    pending: item?.pending === true
                };
            })
        : [];
    const selectedServerIds = quickAskNormalizeIdArray(raw.selectedServerIds);
    const selectedToolIds = quickAskNormalizeIdArray(raw.selectedToolIds);
    return { id, title, createdAt, updatedAt, messages, selectedServerIds, selectedToolIds };
}

function quickAskApplySelectionsFromChat(chat) {
    const serverIds = quickAskNormalizeIdArray(chat?.selectedServerIds);
    const toolIds = quickAskNormalizeIdArray(chat?.selectedToolIds);
    if (Array.isArray(quickAskContext?.servers) && quickAskContext.servers.length > 0) {
        const allowedServers = new Set(
            quickAskContext.servers
                .map((server) => String(server?.id || '').trim())
                .filter(Boolean)
        );
        const allowedTools = new Set(
            quickAskContext.servers.flatMap((server) => {
                const tools = Array.isArray(server?.tools) ? server.tools : [];
                return tools
                    .map((tool) => String(tool?.id || '').trim())
                    .filter(Boolean);
            })
        );
        const filteredServerIds = serverIds.filter((id) => allowedServers.has(id));
        const filteredToolIds = toolIds.filter((id) => allowedTools.has(id));
        quickAskSelectedServerIds = new Set(filteredServerIds);
        quickAskSelectedToolIds = new Set(filteredToolIds);
    } else {
        quickAskSelectedServerIds = new Set(serverIds);
        quickAskSelectedToolIds = new Set(toolIds);
    }
    updateQuickAskSelectedCount();
}

function quickAskSameStringArray(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function quickAskPersistSelectionsToCurrentChat(shouldPersist = false) {
    const chat = getCurrentQuickAskChat();
    if (!chat) return;
    let nextServerIds = quickAskNormalizeIdArray(Array.from(quickAskSelectedServerIds));
    let nextToolIds = quickAskNormalizeIdArray(Array.from(quickAskSelectedToolIds));
    if (Array.isArray(quickAskContext?.servers) && quickAskContext.servers.length > 0) {
        const allowedServers = new Set(
            quickAskContext.servers
                .map((server) => String(server?.id || '').trim())
                .filter(Boolean)
        );
        const allowedTools = new Set(
            quickAskContext.servers.flatMap((server) => {
                const tools = Array.isArray(server?.tools) ? server.tools : [];
                return tools
                    .map((tool) => String(tool?.id || '').trim())
                    .filter(Boolean);
            })
        );
        nextServerIds = nextServerIds.filter((id) => allowedServers.has(id));
        nextToolIds = nextToolIds.filter((id) => allowedTools.has(id));
    }
    const prevServerIds = quickAskNormalizeIdArray(chat.selectedServerIds);
    const prevToolIds = quickAskNormalizeIdArray(chat.selectedToolIds);
    const changed = !quickAskSameStringArray(prevServerIds, nextServerIds)
        || !quickAskSameStringArray(prevToolIds, nextToolIds);
    if (!changed) return;
    chat.selectedServerIds = nextServerIds;
    chat.selectedToolIds = nextToolIds;
    if (shouldPersist) persistQuickAskChats();
}

function quickAskSortChats() {
    quickAskChats.sort((a, b) => {
        const ta = new Date(a?.updatedAt || 0).getTime();
        const tb = new Date(b?.updatedAt || 0).getTime();
        return tb - ta;
    });
}

function normalizeQuickAskChatsState() {
    quickAskSortChats();
    if (quickAskChats.length > QUICK_ASK_MAX_CHATS) {
        quickAskChats = quickAskChats.slice(0, QUICK_ASK_MAX_CHATS);
    }
    if (!quickAskChats.some((chat) => chat.id === quickAskCurrentChatId)) {
        quickAskCurrentChatId = quickAskChats[0]?.id || '';
    }
}

async function saveQuickAskChatsToServer() {
    if (quickAskPersistInFlight) {
        quickAskPersistDirty = true;
        return;
    }
    quickAskPersistInFlight = true;
    quickAskPersistDirty = false;
    try {
        const response = await fetch('/api/ask/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chats: quickAskChats,
                currentChatId: quickAskCurrentChatId
            })
        });
        if (!response.ok) {
            throw new Error(`Failed to save chats (${response.status})`);
        }
    } catch {
        // Keep local in-memory state; retry on next mutation.
    } finally {
        quickAskPersistInFlight = false;
        if (quickAskPersistDirty) {
            quickAskPersistDirty = false;
            setTimeout(() => {
                saveQuickAskChatsToServer();
            }, 50);
        }
    }
}

function scheduleQuickAskChatsSave() {
    if (quickAskPersistTimer) clearTimeout(quickAskPersistTimer);
    quickAskPersistTimer = setTimeout(() => {
        quickAskPersistTimer = null;
        saveQuickAskChatsToServer();
    }, 300);
}

function persistQuickAskChats() {
    normalizeQuickAskChatsState();
    scheduleQuickAskChatsSave();
}

async function loadQuickAskChats() {
    quickAskChats = [];
    quickAskCurrentChatId = '';
    const search = new URLSearchParams(window.location.search || '');
    const requestedChatId = String(search.get('chat') || '').trim();
    const requestNewChat = search.get('new') === '1';
    let consumedQuery = false;
    try {
        const response = await fetch('/api/ask/chats');
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload?.success) {
            const chatsRaw = Array.isArray(payload?.data?.chats) ? payload.data.chats : [];
            quickAskChats = chatsRaw.map((chat) => quickAskNormalizeChat(chat)).filter(Boolean);
        }
    } catch {}

    if (requestNewChat) {
        const chat = quickAskCreateChat('New chat');
        quickAskChats.unshift(chat);
        quickAskCurrentChatId = chat.id;
        persistQuickAskChats();
        consumedQuery = true;
    }

    quickAskSortChats();
    if (quickAskChats.length > QUICK_ASK_MAX_CHATS) {
        quickAskChats = quickAskChats.slice(0, QUICK_ASK_MAX_CHATS);
    }

    if (requestedChatId && quickAskChats.some((chat) => chat.id === requestedChatId)) {
        quickAskCurrentChatId = requestedChatId;
        consumedQuery = true;
    }

    if (consumedQuery) {
        const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
        window.history.replaceState(null, '', cleanUrl);
    }
    quickAskApplySelectionsFromChat(getCurrentQuickAskChat());
}

function getCurrentQuickAskChat() {
    return quickAskChats.find((chat) => chat.id === quickAskCurrentChatId) || null;
}

function quickAskTouchChat(chat) {
    if (!chat) return;
    chat.updatedAt = quickAskNowIso();
}

function quickAskRefreshChatTitle(chat) {
    if (!chat) return;
    if (String(chat.title || '').trim() !== 'New chat' && chat.messages.length > 0) return;
    const firstUser = chat.messages.find((msg) => msg.role === 'user' && String(msg.content || '').trim());
    if (!firstUser) return;
    chat.title = quickAskBuildTitle(firstUser.content);
}

function buildQuickAskConversationForRequest(chat) {
    if (!chat || !Array.isArray(chat.messages)) return [];
    return chat.messages
        .filter((msg) => msg && msg.pending !== true)
        .map((msg) => {
            const role = msg?.role === 'assistant' ? 'assistant' : (msg?.role === 'user' ? 'user' : '');
            const content = String(msg?.content || '').trim();
            if (!role || !content) return null;
            return {
                role,
                content: content.slice(0, 8000)
            };
        })
        .filter(Boolean)
        .slice(-24);
}

function quickAskCreateNewChat(options = {}) {
    const preserveSelections = options?.preserveSelections === true;
    const shouldRenderTools = options?.renderTools !== false;
    const selectedServerIds = preserveSelections
        ? quickAskNormalizeIdArray(options?.selectedServerIds ?? Array.from(quickAskSelectedServerIds))
        : [];
    const selectedToolIds = preserveSelections
        ? quickAskNormalizeIdArray(options?.selectedToolIds ?? Array.from(quickAskSelectedToolIds))
        : [];
    const chat = quickAskCreateChat('New chat');
    chat.selectedServerIds = selectedServerIds;
    chat.selectedToolIds = selectedToolIds;
    quickAskChats.unshift(chat);
    quickAskCurrentChatId = chat.id;
    quickAskApplySelectionsFromChat(chat);
    if (shouldRenderTools && quickAskContext?.askEnabled === true) {
        renderQuickAskTools();
    }
    persistQuickAskChats();
    renderQuickAskMessages();
    renderQuickAskSidebarChats();
    const input = document.getElementById('quickAskInput');
    if (input instanceof HTMLTextAreaElement) {
        input.focus();
    }
}

function quickAskStartInlineRename(chatId) {
    const id = String(chatId || '').trim();
    if (!id) return;
    const chat = quickAskChats.find((item) => item.id === id);
    if (!chat) return;
    quickAskInlineRenameChatId = id;
    renderQuickAskSidebarChats();

    requestAnimationFrame(() => {
        const input = document.querySelector(`input[data-quick-ask-rename-input="true"][data-quick-ask-chat-id="${id}"]`);
        if (input instanceof HTMLInputElement) {
            input.focus();
            input.select();
        }
    });
}

function quickAskCommitInlineRename(chatId, rawTitle) {
    const id = String(chatId || '').trim();
    if (!id) return;
    const chat = quickAskChats.find((item) => item.id === id);
    if (!chat) {
        quickAskInlineRenameChatId = '';
        renderQuickAskSidebarChats();
        return;
    }

    const nextTitle = String(rawTitle || '').trim();
    if (!nextTitle) {
        window.utils?.showToast?.('Chat title cannot be empty', 'error');
        return;
    }

    chat.title = nextTitle.slice(0, 80);
    quickAskTouchChat(chat);
    quickAskInlineRenameChatId = '';
    persistQuickAskChats();
    renderQuickAskSidebarChats();
    renderQuickAskMessages();
}

function quickAskCancelInlineRename() {
    if (!quickAskInlineRenameChatId) return;
    quickAskInlineRenameChatId = '';
    renderQuickAskSidebarChats();
}

function quickAskDeleteChat(chatId) {
    const id = String(chatId || '').trim();
    if (!id) return;
    const chat = quickAskChats.find((item) => item.id === id);
    if (!chat) return;

    quickAskChats = quickAskChats.filter((item) => item.id !== id);
    if (quickAskInlineRenameChatId === id) quickAskInlineRenameChatId = '';
    if (quickAskChats.length === 0) {
        const newChat = quickAskCreateChat('New chat');
        quickAskChats = [newChat];
        quickAskCurrentChatId = newChat.id;
    } else if (quickAskCurrentChatId === id) {
        quickAskSortChats();
        quickAskCurrentChatId = String(quickAskChats[0]?.id || '');
    }

    quickAskApplySelectionsFromChat(getCurrentQuickAskChat());
    if (quickAskContext?.askEnabled === true) {
        renderQuickAskTools();
    }
    persistQuickAskChats();
    renderQuickAskSidebarChats();
    renderQuickAskMessages();
}

function closeQuickAskDeleteModal() {
    const modal = document.getElementById('quickAskDeleteConfirmModal');
    if (modal) modal.remove();
}

function showQuickAskDeleteModal(chatId) {
    const id = String(chatId || '').trim();
    if (!id) return;
    const chat = quickAskChats.find((item) => item.id === id);
    if (!chat) return;
    const title = String(chat.title || 'New chat').trim() || 'New chat';

    closeQuickAskDeleteModal();
    const modal = document.createElement('div');
    modal.id = 'quickAskDeleteConfirmModal';
    modal.className = 'fixed inset-0 z-[160] bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-200">
                <p class="text-sm font-semibold text-slate-900">Delete chat?</p>
                <p class="mt-1 text-xs text-slate-500">This will permanently remove <span class="font-semibold text-slate-700">${escapeHtml(title)}</span>.</p>
            </div>
            <div class="px-5 py-4 flex items-center justify-end gap-2">
                <button id="quickAskDeleteCancelBtn" type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button id="quickAskDeleteConfirmBtn" type="button" class="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700">Delete</button>
            </div>
        </div>
    `;

    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeQuickAskDeleteModal();
    });
    document.body.appendChild(modal);

    document.getElementById('quickAskDeleteCancelBtn')?.addEventListener('click', () => {
        closeQuickAskDeleteModal();
    });
    document.getElementById('quickAskDeleteConfirmBtn')?.addEventListener('click', () => {
        closeQuickAskDeleteModal();
        quickAskDeleteChat(id);
    });
}

function quickAskGetChatPreview(chat) {
    if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) return 'No messages yet';
    const last = chat.messages[chat.messages.length - 1];
    const text = String(last?.content || '').replace(/\s+/g, ' ').trim();
    if (!text) return 'No messages yet';
    return text.length > 56 ? `${text.slice(0, 56)}...` : text;
}

function renderQuickAskMessages() {
    const wrap = document.getElementById('quickAskConversationWrap');
    const list = document.getElementById('quickAskMessages');
    const empty = document.getElementById('quickAskMessagesEmpty');
    const title = document.getElementById('quickAskActiveChatTitle');
    if (!list || !empty) return;

    const chat = getCurrentQuickAskChat();
    const messages = Array.isArray(chat?.messages) ? chat.messages : [];
    const hasMessages = messages.length > 0;
    const shouldShowConversation = hasMessages;

    if (wrap) {
        wrap.classList.toggle('hidden', !shouldShowConversation);
    }
    if (!shouldShowConversation) {
        return;
    }

    if (title) {
        title.textContent = chat?.title || 'New chat';
    }

    if (messages.length === 0) {
        list.classList.add('hidden');
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.classList.remove('hidden');
    list.innerHTML = messages.map((msg) => {
        const isUser = msg.role === 'user';
        const bubbleBase = isUser
            ? 'bg-slate-900 text-white border border-slate-800'
            : 'bg-white text-slate-800 border border-slate-200';
        const wrapper = isUser ? 'justify-end' : 'justify-start';
        const metaText = isUser ? quickAskFormatMessageMeta(msg?.createdAt) : '';
        const contentHtml = isUser
            ? `<p class="text-sm leading-6 whitespace-pre-wrap">${escapeHtml(String(msg.content || ''))}</p>`
            : `<div class="qa-markdown text-sm">${msg.pending ? `
                <div class="qa-thinking" role="status" aria-live="polite" aria-label="AI is thinking">
                    <span class="qa-thinking-icon"><i class="fas fa-robot"></i></span>
                    <span class="qa-thinking-dots" aria-hidden="true">
                        <span></span><span></span><span></span>
                    </span>
                </div>
            ` : (renderQuickAskAnswerMarkdown(String(msg.content || '')) || '<p class="my-2">No response</p>')}</div>`;
        const userActionButtons = isUser ? `
            <div class="absolute -top-2 right-2 hidden items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm group-hover:flex group-focus-within:flex">
                <button type="button" data-quick-ask-msg-action="retry" data-quick-ask-message-id="${msg.id}" title="Retry" class="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                    <i class="fas fa-rotate-right text-[10px]"></i>
                </button>
                <button type="button" data-quick-ask-msg-action="edit" data-quick-ask-message-id="${msg.id}" title="Edit" class="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                    <i class="fas fa-pen text-[10px]"></i>
                </button>
                <button type="button" data-quick-ask-msg-action="copy" data-quick-ask-message-id="${msg.id}" title="Copy" class="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                    <i class="fas fa-copy text-[10px]"></i>
                </button>
            </div>
        ` : '';
        const userMeta = isUser && metaText
            ? `<div class="mt-1.5 hidden items-center justify-end group-hover:flex group-focus-within:flex"><span class="text-[11px] text-slate-300">${escapeHtml(metaText)}</span></div>`
            : '';

        return `
            <div class="flex ${wrapper} w-full">
                <div class="group relative max-w-[84%] rounded-2xl px-4 py-3 shadow-sm ${bubbleBase}">
                    ${contentHtml}
                    ${userMeta}
                    ${userActionButtons}
                </div>
            </div>
        `;
    }).join('');

    requestAnimationFrame(() => {
        list.scrollTop = list.scrollHeight;
    });
}

function ensureQuickAskSidebarSection() {
    if (window.__quickmcpReactShell) {
        return true;
    }
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return false;
    const existing = document.getElementById('quickAskSidebarChats');
    if (existing) return true;

    const navList = document.getElementById('sidebarNavList');
    if (!navList) return false;

    const section = document.createElement('div');
    section.id = 'quickAskSidebarChats';
    section.className = 'mt-3 pt-3 border-t border-slate-200/60 space-y-2';
    section.innerHTML = `
        <div class="pt-3 flex items-center justify-between gap-2">
            <p class="text-[11px] tracking-[0.14em] uppercase text-slate-500 font-semibold">Your Chats</p>
            <button id="quickAskSidebarNewChatBtn" type="button" class="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">
                <i class="fas fa-plus text-[10px]"></i>
                New
            </button>
        </div>
        <div class="relative">
            <i class="fas fa-search absolute left-2.5 top-2.5 text-[11px] text-slate-400"></i>
            <input id="quickAskChatSearchInput" type="text" placeholder="Search chats" class="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-7 pr-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200">
        </div>
        <div id="quickAskChatList" class="space-y-1"></div>
        <button id="quickAskCollapsedNewChatBtn" type="button" class="quick-ask-collapsed-add w-9 h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-blue-600" title="New chat" aria-label="New chat">
            <i class="fas fa-plus text-[12px]"></i>
        </button>
    `;
    navList.appendChild(section);

    const newBtn = document.getElementById('quickAskSidebarNewChatBtn');
    const collapsedNewBtn = document.getElementById('quickAskCollapsedNewChatBtn');
    const searchInput = document.getElementById('quickAskChatSearchInput');
    const list = document.getElementById('quickAskChatList');

    newBtn?.addEventListener('click', () => {
        quickAskCreateNewChat();
    });
    collapsedNewBtn?.addEventListener('click', () => {
        quickAskCreateNewChat();
    });
    if (searchInput instanceof HTMLInputElement) {
        searchInput.value = quickAskChatSearchText;
        searchInput.addEventListener('input', () => {
            quickAskChatSearchText = searchInput.value.trim().toLowerCase();
            renderQuickAskSidebarChats();
        });
    }
    list?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const actionBtn = target.closest('button[data-quick-ask-action][data-quick-ask-chat-id]');
        if (actionBtn) {
            event.preventDefault();
            event.stopPropagation();
            const id = String(actionBtn.getAttribute('data-quick-ask-chat-id') || '').trim();
            const action = String(actionBtn.getAttribute('data-quick-ask-action') || '').trim();
            if (!id || !action) return;
            if (action === 'rename') quickAskStartInlineRename(id);
            if (action === 'rename-save') {
                const inputEl = list.querySelector(`input[data-quick-ask-rename-input="true"][data-quick-ask-chat-id="${id}"]`);
                quickAskCommitInlineRename(id, inputEl instanceof HTMLInputElement ? inputEl.value : '');
            }
            if (action === 'rename-cancel') quickAskCancelInlineRename();
            if (action === 'delete') showQuickAskDeleteModal(id);
            return;
        }

        const btn = target.closest('button[data-quick-ask-select][data-quick-ask-chat-id]');
        if (!btn) return;
        const id = String(btn.getAttribute('data-quick-ask-chat-id') || '').trim();
        if (!id) return;
        quickAskCurrentChatId = id;
        if (quickAskInlineRenameChatId && quickAskInlineRenameChatId !== id) {
            quickAskInlineRenameChatId = '';
        }
        quickAskApplySelectionsFromChat(getCurrentQuickAskChat());
        if (quickAskContext?.askEnabled === true) {
            renderQuickAskTools();
        }
        persistQuickAskChats();
        renderQuickAskSidebarChats();
        renderQuickAskMessages();
    });

    list?.addEventListener('keydown', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.getAttribute('data-quick-ask-rename-input') !== 'true') return;
        const id = String(target.getAttribute('data-quick-ask-chat-id') || '').trim();
        if (!id) return;
        if (event.key === 'Enter') {
            event.preventDefault();
            quickAskCommitInlineRename(id, target.value);
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            quickAskCancelInlineRename();
        }
    });

    return true;
}

function mountQuickAskSidebarSectionWithRetry(attempt = 0) {
    if (window.__quickmcpReactShell) return;
    if (ensureQuickAskSidebarSection()) {
        renderQuickAskSidebarChats();
        return;
    }
    if (attempt >= 25) return;
    setTimeout(() => mountQuickAskSidebarSectionWithRetry(attempt + 1), 200);
}

function renderQuickAskSidebarChats() {
    const list = document.getElementById('quickAskChatList');
    if (!list) return;

    quickAskSortChats();
    const filtered = quickAskChats.filter((chat) => {
        if (!quickAskChatSearchText) return true;
        const haystack = `${chat.title} ${quickAskGetChatPreview(chat)}`.toLowerCase();
        return haystack.includes(quickAskChatSearchText);
    });

    if (filtered.length === 0) {
        list.innerHTML = '<p class="px-2 py-3 text-xs text-slate-500">No chats found.</p>';
        return;
    }

    list.innerHTML = filtered.map((chat) => {
        const active = chat.id === quickAskCurrentChatId;
        const isRenaming = chat.id === quickAskInlineRenameChatId;
        const itemClass = active
            ? 'border-blue-200 bg-blue-50'
            : 'border-slate-200 bg-white hover:bg-slate-50';
        const title = String(chat.title || 'New chat');
        const titleBlock = isRenaming
            ? `
                <input
                    type="text"
                    data-quick-ask-rename-input="true"
                    data-quick-ask-chat-id="${chat.id}"
                    value="${escapeHtml(title)}"
                    maxlength="80"
                    class="w-full rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
            `
            : `<p class="text-xs font-semibold text-slate-800 truncate">${escapeHtml(title)}</p>`;
        const actionButtons = isRenaming
            ? `
                <div class="absolute right-1 top-1 flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 p-1 shadow-sm">
                    <button type="button" data-quick-ask-action="rename-save" data-quick-ask-chat-id="${chat.id}" title="Save" class="inline-flex h-6 w-6 items-center justify-center rounded text-emerald-600 hover:bg-emerald-50">
                        <i class="fas fa-check text-[10px]"></i>
                    </button>
                    <button type="button" data-quick-ask-action="rename-cancel" data-quick-ask-chat-id="${chat.id}" title="Cancel" class="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                        <i class="fas fa-times text-[10px]"></i>
                    </button>
                </div>
            `
            : `
                <div class="absolute right-1 top-1 hidden items-center gap-1 rounded-md border border-slate-200 bg-white/95 p-1 shadow-sm group-hover:flex group-focus-within:flex">
                    <button type="button" data-quick-ask-action="rename" data-quick-ask-chat-id="${chat.id}" title="Rename chat" class="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                        <i class="fas fa-pen text-[10px]"></i>
                    </button>
                    <button type="button" data-quick-ask-action="delete" data-quick-ask-chat-id="${chat.id}" title="Delete chat" class="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-rose-50 hover:text-rose-600">
                        <i class="fas fa-trash text-[10px]"></i>
                    </button>
                </div>
            `;
        const rowBody = isRenaming
            ? `
                <div class="w-full rounded-lg px-2.5 py-2 pr-16 text-left">
                    ${titleBlock}
                    <p class="mt-0.5 text-[11px] text-slate-500 truncate">${escapeHtml(quickAskGetChatPreview(chat))}</p>
                </div>
            `
            : `
                <button type="button" data-quick-ask-select="true" data-quick-ask-chat-id="${chat.id}" class="w-full rounded-lg px-2.5 py-2 pr-16 text-left">
                    ${titleBlock}
                    <p class="mt-0.5 text-[11px] text-slate-500 truncate">${escapeHtml(quickAskGetChatPreview(chat))}</p>
                </button>
            `;
        return `
            <div class="group relative rounded-lg border transition-colors ${itemClass}">
                ${rowBody}
                ${actionButtons}
            </div>
        `;
    }).join('');
}

function appendQuickAskMessage(role, content, pending = false) {
    const chat = getCurrentQuickAskChat();
    if (!chat) return '';

    const msg = {
        id: quickAskCreateId('msg'),
        role: role === 'assistant' ? 'assistant' : 'user',
        content: String(content || ''),
        createdAt: quickAskNowIso(),
        pending: pending === true
    };
    chat.messages.push(msg);
    quickAskTouchChat(chat);
    quickAskRefreshChatTitle(chat);
    persistQuickAskChats();
    renderQuickAskMessages();
    renderQuickAskSidebarChats();
    return msg.id;
}

function quickAskSetInputValue(value) {
    const input = document.getElementById('quickAskInput');
    if (!(input instanceof HTMLTextAreaElement)) return;
    input.value = String(value || '');
    input.focus();
    const endPos = input.value.length;
    try {
        input.setSelectionRange(endPos, endPos);
    } catch {}
}

async function quickAskCopyText(value) {
    const text = String(value || '');
    if (!text) return;
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
    } catch {}

    const temp = document.createElement('textarea');
    temp.value = text;
    temp.setAttribute('readonly', 'true');
    temp.style.position = 'absolute';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.select();
    try { document.execCommand('copy'); } catch {}
    temp.remove();
}

function quickAskFindMessageById(chat, messageId) {
    if (!chat || !Array.isArray(chat.messages)) return null;
    const id = String(messageId || '').trim();
    if (!id) return null;
    return chat.messages.find((item) => String(item?.id || '') === id) || null;
}

function updateQuickAskMessage(messageId, content, pending = false) {
    const chat = getCurrentQuickAskChat();
    if (!chat) return;
    const msg = chat.messages.find((item) => item.id === messageId);
    if (!msg) return;
    msg.content = String(content || '');
    msg.pending = pending === true;
    quickAskTouchChat(chat);
    quickAskRefreshChatTitle(chat);
    persistQuickAskChats();
    renderQuickAskMessages();
    renderQuickAskSidebarChats();
}

function updateQuickAskSelectedCount() {
    const countEl = document.getElementById('quickAskSelectedCount');
    if (!countEl) return;
    countEl.textContent = String(quickAskSelectedToolIds.size);
}

function collectQuickAskSelectionsFromDom(shouldPersist = false) {
    quickAskSelectedServerIds = new Set(
        Array.from(document.querySelectorAll('input[data-quick-ask-server]:checked'))
            .map((input) => String(input.getAttribute('data-server-id') || '').trim())
            .filter(Boolean)
    );
    quickAskSelectedToolIds = new Set(
        Array.from(document.querySelectorAll('input[data-quick-ask-tool]:checked'))
            .map((input) => String(input.getAttribute('data-tool-id') || '').trim())
            .filter(Boolean)
    );
    quickAskPersistSelectionsToCurrentChat(shouldPersist);
    updateQuickAskSelectedCount();
}

function renderQuickAskTools() {
    const root = document.getElementById('quickAskToolsList');
    if (!root) return;
    const servers = Array.isArray(quickAskContext?.servers) ? quickAskContext.servers : [];
    if (servers.length === 0) {
        root.innerHTML = '<p class="text-xs text-slate-500">No MCP servers found yet.</p>';
        collectQuickAskSelectionsFromDom(true);
        return;
    }

    root.innerHTML = servers.map((server) => {
        const serverId = String(server?.id || '');
        const tools = Array.isArray(server?.tools) ? server.tools : [];
        const checkedServer = quickAskSelectedServerIds.has(serverId);
        return `
            <details class="quick-ask-server-details border border-slate-200 rounded-lg bg-slate-50/60">
                <summary class="quick-ask-server-summary cursor-pointer px-3 py-2.5 flex items-center justify-between gap-3 text-sm">
                    <div class="flex items-center gap-2 min-w-0">
                        <i class="quick-ask-server-chevron fas fa-chevron-down text-[11px] text-slate-500"></i>
                        <label class="inline-flex items-center gap-2 text-slate-800 font-medium min-w-0" onclick="event.stopPropagation()">
                            <span class="relative inline-flex h-5 w-9 flex-shrink-0">
                                <input type="checkbox" data-quick-ask-server data-server-id="${serverId}" class="peer sr-only quick-ask-toggle-input" ${checkedServer ? 'checked' : ''}>
                                <span class="quick-ask-toggle-track absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-emerald-500"></span>
                                <span class="quick-ask-toggle-thumb absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4"></span>
                            </span>
                            <span class="truncate">${server?.name || serverId}</span>
                            <span class="text-[11px] text-slate-500 uppercase tracking-wide flex-shrink-0">${server?.type || ''}</span>
                        </label>
                    </div>
                    <span class="text-xs text-slate-500">${tools.length} tools</span>
                </summary>
                <div class="px-4 pb-3 space-y-2">
                    ${tools.map((tool) => {
                        const toolId = String(tool?.id || '');
                        const checkedTool = quickAskSelectedToolIds.has(toolId);
                        return `
                            <label class="flex items-start gap-2 text-xs text-slate-700">
                                <span class="relative inline-flex h-5 w-9 mt-0.5 flex-shrink-0">
                                    <input type="checkbox" data-quick-ask-tool data-server-id="${serverId}" data-tool-id="${toolId}" class="peer sr-only quick-ask-toggle-input" ${checkedTool ? 'checked' : ''}>
                                    <span class="quick-ask-toggle-track absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-emerald-500"></span>
                                    <span class="quick-ask-toggle-thumb absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4"></span>
                                </span>
                                <span>
                                    <span class="font-semibold text-slate-800">${tool?.name || ''}</span>
                                    <span class="text-slate-500">${tool?.description ? ` - ${tool.description}` : ''}</span>
                                </span>
                            </label>
                        `;
                    }).join('') || '<p class="text-xs text-slate-400">No tools in this server.</p>'}
                </div>
            </details>
        `;
    }).join('');

    root.querySelectorAll('input[data-quick-ask-server]').forEach((input) => {
        input.addEventListener('change', (event) => {
            const serverInput = event.target;
            if (!(serverInput instanceof HTMLInputElement)) return;
            const serverId = String(serverInput.getAttribute('data-server-id') || '').trim();
            const toolInputs = root.querySelectorAll(`input[data-quick-ask-tool][data-server-id="${serverId}"]`);
            toolInputs.forEach((toolEl) => {
                if (toolEl instanceof HTMLInputElement) {
                    toolEl.checked = serverInput.checked;
                }
            });
            collectQuickAskSelectionsFromDom(true);
        });
    });

    root.querySelectorAll('input[data-quick-ask-tool]').forEach((input) => {
        input.addEventListener('change', (event) => {
            const toolInput = event.target;
            if (!(toolInput instanceof HTMLInputElement)) return;
            const serverId = String(toolInput.getAttribute('data-server-id') || '').trim();
            const serverInput = root.querySelector(`input[data-quick-ask-server][data-server-id="${serverId}"]`);
            const allServerTools = Array.from(root.querySelectorAll(`input[data-quick-ask-tool][data-server-id="${serverId}"]`));
            const allChecked = allServerTools.length > 0 && allServerTools.every((el) => el instanceof HTMLInputElement && el.checked);
            if (serverInput instanceof HTMLInputElement) {
                serverInput.checked = allChecked;
            }
            collectQuickAskSelectionsFromDom(true);
        });
    });

    collectQuickAskSelectionsFromDom(true);
}

async function loadQuickAskContext() {
    const input = document.getElementById('quickAskInput');
    const sendBtn = document.getElementById('quickAskSendBtn');
    const hint = document.getElementById('quickAskHint');
    const panel = document.getElementById('quickAskToolsPanel');
    if (!input || !sendBtn || !hint || !panel) return;

    setQuickAskStatus('busy', 'Loading context');
    try {
        const response = await fetch('/api/ask/context');
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.error || 'Failed to load Ask context');
        }

        quickAskContext = payload?.data || {};
        const enabled = quickAskContext?.askEnabled === true;
        input.disabled = !enabled;
        sendBtn.disabled = !enabled;
        if (!enabled) {
            panel.classList.add('hidden');
        }
        hint.textContent = quickAskContext?.reason || 'Select one or more tools to narrow the answer context.';

        if (enabled) {
            setQuickAskStatus('ready', 'Aria ready');
            renderQuickAskTools();
        } else {
            setQuickAskStatus('idle', quickAskContext?.isSaasMode ? 'Not configured' : 'On-Prem unsupported');
            quickAskSelectedServerIds.clear();
            quickAskSelectedToolIds.clear();
            updateQuickAskSelectedCount();
        }
    } catch (error) {
        input.disabled = true;
        sendBtn.disabled = true;
        hint.textContent = 'Ask context could not be loaded.';
        setQuickAskStatus('error', 'Unavailable');
        const message = error instanceof Error ? error.message : 'Ask context could not be loaded';
        window.utils?.showToast?.(message, 'error');
    }
}

async function sendQuickAskPrompt(promptOverride = '') {
    const input = document.getElementById('quickAskInput');
    const sendBtn = document.getElementById('quickAskSendBtn');
    if (!(input instanceof HTMLTextAreaElement) || !(sendBtn instanceof HTMLButtonElement)) return;
    if (quickAskBusy) return;

    const overrideText = String(promptOverride || '');
    const usingOverride = overrideText.trim().length > 0;
    const prompt = usingOverride ? overrideText.trim() : input.value.trim();
    if (!prompt) {
        window.utils?.showToast?.('Please enter a prompt', 'error');
        return;
    }

    quickAskBusy = true;
    sendBtn.disabled = true;
    setQuickAskStatus('busy', 'Aria is thinking');
    collectQuickAskSelectionsFromDom();
    const selectedServerIdsSnapshot = Array.from(quickAskSelectedServerIds);
    const selectedToolIdsSnapshot = Array.from(quickAskSelectedToolIds);
    const userMessage = prompt;
    if (!usingOverride) input.value = '';

    if (!getCurrentQuickAskChat()) {
        quickAskCreateNewChat({
            preserveSelections: true,
            selectedServerIds: selectedServerIdsSnapshot,
            selectedToolIds: selectedToolIdsSnapshot,
            renderTools: false
        });
    }
    const selectedServerIdsForRequest = Array.from(quickAskSelectedServerIds);
    const selectedToolIdsForRequest = Array.from(quickAskSelectedToolIds);
    appendQuickAskMessage('user', userMessage, false);
    const assistantMessageId = appendQuickAskMessage('assistant', 'Thinking...', true);
    const conversation = buildQuickAskConversationForRequest(getCurrentQuickAskChat());

    try {
        const response = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: userMessage,
                conversation,
                selectedServerIds: selectedServerIdsForRequest,
                selectedToolIds: selectedToolIdsForRequest
            })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.error || 'Ask request failed');
        }
        updateQuickAskMessage(assistantMessageId, String(payload?.data?.answer || 'No response'), false);
        setQuickAskStatus('ready', 'Aria ready');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Ask request failed';
        updateQuickAskMessage(assistantMessageId, `Request failed: ${message}`, false);
        setQuickAskStatus('error', 'Request failed');
        window.utils?.showToast?.(message, 'error');
    } finally {
        quickAskBusy = false;
        sendBtn.disabled = quickAskContext?.askEnabled !== true;
    }
}

function initializeQuickAsk() {
    const section = document.getElementById('quickAskSection');
    if (!section) return;

    const toggleBtn = document.getElementById('quickAskOpenToolsBtn');
    const refreshBtn = document.getElementById('quickAskRefreshBtn');
    const newChatBtn = document.getElementById('quickAskNewChatBtn');
    const panel = document.getElementById('quickAskToolsPanel');
    const sendBtn = document.getElementById('quickAskSendBtn');
    const input = document.getElementById('quickAskInput');

    toggleBtn?.addEventListener('click', () => {
        panel?.classList.toggle('hidden');
    });
    refreshBtn?.addEventListener('click', () => {
        loadQuickAskContext();
    });
    newChatBtn?.addEventListener('click', () => {
        quickAskCreateNewChat();
    });
    sendBtn?.addEventListener('click', () => {
        sendQuickAskPrompt();
    });
    if (input instanceof HTMLTextAreaElement) {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendQuickAskPrompt();
            }
        });
    }
    const messageList = document.getElementById('quickAskMessages');
    if (messageList && messageList.dataset.listenerAttached !== 'true') {
        messageList.addEventListener('click', async (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const actionBtn = target.closest('button[data-quick-ask-msg-action][data-quick-ask-message-id]');
            if (!actionBtn) return;
            event.preventDefault();
            event.stopPropagation();

            const action = String(actionBtn.getAttribute('data-quick-ask-msg-action') || '').trim();
            const messageId = String(actionBtn.getAttribute('data-quick-ask-message-id') || '').trim();
            const chat = getCurrentQuickAskChat();
            const msg = quickAskFindMessageById(chat, messageId);
            if (!msg || msg.role !== 'user') return;

            if (action === 'copy') {
                await quickAskCopyText(msg.content);
                window.utils?.showToast?.('Copied', 'success');
                return;
            }
            if (action === 'edit') {
                quickAskSetInputValue(msg.content);
                return;
            }
            if (action === 'retry') {
                if (quickAskBusy) return;
                await sendQuickAskPrompt(msg.content);
            }
        });
        messageList.dataset.listenerAttached = 'true';
    }

    mountQuickAskSidebarSectionWithRetry();
    loadQuickAskChats()
        .then(() => {
            renderQuickAskMessages();
            renderQuickAskSidebarChats();
            mountQuickAskSidebarSectionWithRetry();
        })
        .catch(() => {
            renderQuickAskMessages();
            renderQuickAskSidebarChats();
        });
    loadQuickAskContext();
}

// Setup event listeners

function setupQuickAskPageEventListeners() {
    document.getElementById('openSidebar')?.addEventListener('click', openSidebar);
    document.getElementById('closeSidebar')?.addEventListener('click', closeSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);

    document.querySelectorAll('.nav-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            const tabName = item.getAttribute('data-tab');
            if (tabName) {
                e.preventDefault();
                switchTab(tabName);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupQuickAskPageEventListeners();
    initializeQuickAsk();
    if (!window.renderSidebar) {
        try { applySidebarCollapsedState(); } catch {}
    }
});

window.addEventListener('load', () => {
    if (!window.renderSidebar) {
        try { initSidebarResizer(); } catch {}
        try { applySidebarCollapsedState(); } catch {}
    }
});

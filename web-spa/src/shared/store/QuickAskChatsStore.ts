import { create } from 'zustand';

type QuickAskChatsStatus = 'idle' | 'loading' | 'ready' | 'error';

type AskChatsResponsePayload = {
  success?: boolean;
  data?: {
    chats?: unknown[];
    currentChatId?: string;
  };
};

type QuickAskChatsStore = {
  status: QuickAskChatsStatus;
  chatsRaw: any[];
  currentChatId: string;
  error: string | null;
  fetchOnce: () => Promise<void>;
  refresh: () => Promise<void>;
  setSnapshot: (chatsRaw: any[], currentChatId: string) => void;
};

let fetchPromise: Promise<void> | null = null;

async function fetchChatsFromApi(): Promise<{ chatsRaw: any[]; currentChatId: string }> {
  const response = await fetch('/api/ask/chats', { credentials: 'include' });
  const payload = await response.json().catch(() => ({})) as AskChatsResponsePayload;
  const chatsRaw = (response.ok && payload?.success && Array.isArray(payload?.data?.chats))
    ? (payload.data!.chats as any[])
    : [];
  const currentChatId = String(payload?.data?.currentChatId || '').trim();
  return { chatsRaw, currentChatId };
}

export const useQuickAskChatsStore = create<QuickAskChatsStore>((set, get) => ({
  status: 'idle',
  chatsRaw: [],
  currentChatId: '',
  error: null,

  fetchOnce: async () => {
    const current = get();
    if (current.status === 'ready') return;
    if (fetchPromise) return fetchPromise;

    set((prev) => ({
      status: prev.status === 'ready' ? 'ready' : 'loading',
      error: null
    }));

    fetchPromise = (async () => {
      try {
        const next = await fetchChatsFromApi();
        set({
          status: 'ready',
          chatsRaw: next.chatsRaw,
          currentChatId: next.currentChatId,
          error: null
        });
      } catch (error) {
        set((prev) => ({
          status: prev.chatsRaw.length > 0 ? 'ready' : 'error',
          error: error instanceof Error ? error.message : 'Unable to load chats'
        }));
      } finally {
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  },

  refresh: async () => {
    if (fetchPromise) return fetchPromise;
    set((prev) => ({
      status: prev.status === 'ready' ? 'ready' : 'loading',
      error: null
    }));
    fetchPromise = (async () => {
      try {
        const next = await fetchChatsFromApi();
        set({
          status: 'ready',
          chatsRaw: next.chatsRaw,
          currentChatId: next.currentChatId,
          error: null
        });
      } catch (error) {
        set((prev) => ({
          status: prev.chatsRaw.length > 0 ? 'ready' : 'error',
          error: error instanceof Error ? error.message : 'Unable to refresh chats'
        }));
      } finally {
        fetchPromise = null;
      }
    })();
    return fetchPromise;
  },

  setSnapshot: (chatsRaw: any[], currentChatId: string) => {
    set({
      status: 'ready',
      chatsRaw: Array.isArray(chatsRaw) ? chatsRaw : [],
      currentChatId: String(currentChatId || '').trim(),
      error: null
    });
  }
}));

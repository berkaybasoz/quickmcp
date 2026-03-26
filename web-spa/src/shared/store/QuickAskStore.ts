import { create } from 'zustand';

type QuickAskNavigationIntent = {
  openChatId: string;
  createNewChat: boolean;
};

type QuickAskStore = {
  activeChatId: string;
  pendingOpenChatId: string;
  pendingCreateNewChat: boolean;
  navigationNonce: number;
  setActiveChatId: (chatId: string) => void;
  requestOpenChat: (chatId: string) => void;
  requestNewChat: () => void;
  consumeNavigationIntent: () => QuickAskNavigationIntent;
};

export const useQuickAskStore = create<QuickAskStore>((set, get) => ({
  activeChatId: '',
  pendingOpenChatId: '',
  pendingCreateNewChat: false,
  navigationNonce: 0,

  setActiveChatId: (chatId: string) => {
    set({ activeChatId: String(chatId || '').trim() });
  },

  requestOpenChat: (chatId: string) => {
    const id = String(chatId || '').trim();
    if (!id) return;
    set((state) => ({
      pendingOpenChatId: id,
      pendingCreateNewChat: false,
      navigationNonce: state.navigationNonce + 1
    }));
  },

  requestNewChat: () => {
    set((state) => ({
      pendingOpenChatId: '',
      pendingCreateNewChat: true,
      navigationNonce: state.navigationNonce + 1
    }));
  },

  consumeNavigationIntent: () => {
    const state = get();
    const intent = {
      openChatId: String(state.pendingOpenChatId || '').trim(),
      createNewChat: state.pendingCreateNewChat === true
    };
    set({
      pendingOpenChatId: '',
      pendingCreateNewChat: false
    });
    return intent;
  }
}));

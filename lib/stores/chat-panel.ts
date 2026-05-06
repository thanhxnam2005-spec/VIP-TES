import { create } from "zustand";

interface ChatPanelState {
  isOpen: boolean;
  activeConversationId: string | null;

  /** Current page context derived from URL (set by layout) */
  pageNovelId: string | null;
  pageChapterId: string | null;

  /** Attached context from conversation DB record */
  attachedNovelId: string | null;
  attachedChapterId: string | null;

  toggle: () => void;
  open: () => void;
  close: () => void;
  setActiveConversation: (id: string | null) => void;
  setPageContext: (
    novelId: string | null,
    chapterId: string | null,
  ) => void;
  setAttachedContext: (
    novelId: string | null,
    chapterId: string | null,
  ) => void;
  detachNovel: () => void;
}

export const useChatPanel = create<ChatPanelState>((set, get) => ({
  isOpen: false,
  activeConversationId: null,
  pageNovelId: null,
  pageChapterId: null,
  attachedNovelId: null,
  attachedChapterId: null,
  toggle: () => set({ isOpen: !get().isOpen }),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setPageContext: (novelId, chapterId) => {
    const { pageNovelId, pageChapterId } = get();
    if (pageNovelId === novelId && pageChapterId === chapterId) return;
    set({ pageNovelId: novelId, pageChapterId: chapterId });
  },
  setAttachedContext: (novelId, chapterId) =>
    set({ attachedNovelId: novelId, attachedChapterId: chapterId }),
  detachNovel: () =>
    set({ attachedNovelId: null, attachedChapterId: null }),
}));

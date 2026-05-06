import { create } from "zustand";

export type ScopeFilter = "all" | "novel" | "global";
export type DictPanelTab = "dict" | "replace" | "rejected";

interface NameDictPanelState {
  isOpen: boolean;
  activeNovelId: string | null;
  activeTab: DictPanelTab;
  searchQuery: string;
  categoryFilter: string | null;
  scopeFilter: ScopeFilter;

  toggle: (novelId?: string | null) => void;
  open: (novelId: string) => void;
  close: () => void;
  setNovelId: (novelId: string | null) => void;
  setActiveTab: (tab: DictPanelTab) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string | null) => void;
  setScopeFilter: (scope: ScopeFilter) => void;
}

export const useNameDictPanel = create<NameDictPanelState>((set, get) => ({
  isOpen: false,
  activeNovelId: null,
  activeTab: "dict" as DictPanelTab,
  searchQuery: "",
  categoryFilter: null,
  scopeFilter: "all" as ScopeFilter,

  toggle: (novelId) => {
    const next = !get().isOpen;
    if (next) {
      if (novelId) set({ isOpen: true, activeNovelId: novelId });
      else set({ isOpen: true });
    } else {
      set({ isOpen: false });
    }
  },

  open: (novelId) => {
    set({ isOpen: true, activeNovelId: novelId, searchQuery: "", categoryFilter: null, scopeFilter: "all" });
  },

  close: () => {
    set({ isOpen: false });
  },

  setNovelId: (novelId) => set({ activeNovelId: novelId }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setScopeFilter: (scope) => set({ scopeFilter: scope }),
}));

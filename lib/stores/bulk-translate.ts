import { create } from "zustand";

export type ChapterTranslateStatus = "pending" | "translating" | "done" | "error";

export interface TranslateChapterResult {
  chapterId: string;
  chapterTitle: string;
  originalTitle: string;
  newTitle?: string;
  originalLineCount: number;
  translatedLineCount: number;
  /** Per-scene translated content, keyed by scene ID */
  scenes: { sceneId: string; content: string }[];
}

export interface TranslateError {
  chapterId: string;
  chapterTitle: string;
  message: string;
}

interface BulkTranslateState {
  step: "config" | "progress" | "results";
  isRunning: boolean;
  chapterIds: string[];

  // Progress
  statuses: Map<string, ChapterTranslateStatus>;
  currentChapterId: string | null;
  chaptersCompleted: number;
  totalChapters: number;

  // Results
  results: Map<string, TranslateChapterResult>;
  errors: TranslateError[];
  savedChapterIds: Set<string>;

  // Abort
  abortController: AbortController | null;

  // Actions
  start: (chapterIds: string[]) => void;
  setStep: (step: BulkTranslateState["step"]) => void;
  setChapterStatus: (chapterId: string, status: ChapterTranslateStatus) => void;
  setCurrentChapter: (chapterId: string | null) => void;
  addResult: (result: TranslateChapterResult) => void;
  addError: (error: TranslateError) => void;
  markSaved: (chapterIds: string[]) => void;
  incrementCompleted: () => void;
  finish: () => void;
  startRetry: (failedIds: string[]) => void;
  cancel: () => void;
  reset: () => void;
}

export const useBulkTranslateStore = create<BulkTranslateState>((set, get) => ({
  step: "config",
  isRunning: false,
  chapterIds: [],
  statuses: new Map(),
  currentChapterId: null,
  chaptersCompleted: 0,
  totalChapters: 0,
  results: new Map(),
  errors: [],
  savedChapterIds: new Set(),
  abortController: null,

  start: (chapterIds) => {
    const statuses = new Map<string, ChapterTranslateStatus>();
    for (const id of chapterIds) statuses.set(id, "pending");
    set({
      step: "progress",
      isRunning: true,
      chapterIds,
      statuses,
      currentChapterId: null,
      chaptersCompleted: 0,
      totalChapters: chapterIds.length,
      results: new Map(),
      errors: [],
      savedChapterIds: new Set(),
      abortController: new AbortController(),
    });
  },

  setStep: (step) => set({ step }),

  setChapterStatus: (chapterId, status) => {
    const statuses = new Map(get().statuses);
    statuses.set(chapterId, status);
    set({ statuses });
  },

  setCurrentChapter: (chapterId) => set({ currentChapterId: chapterId }),

  addResult: (result) => {
    const results = new Map(get().results);
    results.set(result.chapterId, result);
    set({ results });
  },

  addError: (error) =>
    set((s) => ({ errors: [...s.errors, error] })),

  markSaved: (chapterIds) => {
    const saved = new Set(get().savedChapterIds);
    for (const id of chapterIds) saved.add(id);
    set({ savedChapterIds: saved });
  },

  incrementCompleted: () =>
    set((s) => ({ chaptersCompleted: s.chaptersCompleted + 1 })),

  finish: () => set({ isRunning: false, step: "results" }),

  startRetry: (failedIds) => {
    const { statuses, errors, results } = get();
    const newStatuses = new Map(statuses);
    for (const id of failedIds) newStatuses.set(id, "pending");
    set({
      isRunning: true,
      step: "progress",
      statuses: newStatuses,
      errors: errors.filter((e) => !failedIds.includes(e.chapterId)),
      chaptersCompleted: results.size,
      abortController: new AbortController(),
    });
  },

  cancel: () => {
    get().abortController?.abort();
    set({ isRunning: false });
  },

  reset: () =>
    set({
      step: "config",
      isRunning: false,
      chapterIds: [],
      statuses: new Map(),
      currentChapterId: null,
      chaptersCompleted: 0,
      totalChapters: 0,
      results: new Map(),
      errors: [],
      savedChapterIds: new Set(),
      abortController: null,
    }),
}));

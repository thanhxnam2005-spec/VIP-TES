import { create } from "zustand";
import { db } from "../db";
import { detectAdapter } from "../scraper/adapters";
import { scrapeChapters } from "../scraper/engine";
import { stripHtml, countWords } from "../utils";
import type { ChapterLink, SiteAdapter } from "../scraper/types";
import { toast } from "sonner";

export interface ScraperJob {
  id: string; // novelId
  title: string;
  url: string;
  adapter: SiteAdapter;
  chaptersToScrape: ChapterLink[];
  progress: { completed: number; total: number; current: string };
  status: "pending" | "scraping" | "paused" | "done" | "error";
  error?: string;
  warnCount: number;
  delayMs: number;
  abortController: AbortController | null;
  createdAt: Date;
}

interface ScraperQueueState {
  jobs: Record<string, ScraperJob>;
  isOverlayMinimized: boolean;

  addJob: (
    novelId: string,
    title: string,
    url: string,
    chapters: ChapterLink[],
    delayMs: number
  ) => void;
  removeJob: (id: string) => void;
  pauseJob: (id: string) => void;
  resumeJob: (id: string) => void;
  cancelJob: (id: string) => void;
  clearDone: () => void;
  setMinimized: (min: boolean) => void;
  processQueue: () => Promise<void>;
}

const MAX_CONCURRENCY = 2;

export const useScraperQueueStore = create<ScraperQueueState>((set, get) => ({
  jobs: {},
  isOverlayMinimized: false,

  setMinimized: (min) => set({ isOverlayMinimized: min }),

  addJob: async (novelId, title, url, chapters, delayMs) => {
    const adapter = detectAdapter(url);
    if (!adapter) {
      toast.error("Không tìm thấy adapter cho URL này");
      return;
    }

    // Pre-scrape duplicate filtering
    const existingChapters = await db.chapters.where("novelId").equals(novelId).toArray();
    const existingTitles = new Set(existingChapters.map(c => c.title.toLowerCase().trim()));
    const newChapters = chapters.filter(ch => !existingTitles.has(ch.title.toLowerCase().trim()));

    if (newChapters.length === 0) {
      toast.success(`Tất cả chương của '${title}' đã có sẵn!`);
      return;
    }

    if (newChapters.length < chapters.length) {
      toast.info(`Bỏ qua ${chapters.length - newChapters.length} chương đã tồn tại.`);
    }

    const job: ScraperJob = {
      id: novelId,
      title,
      url,
      adapter,
      chaptersToScrape: newChapters,
      progress: { completed: 0, total: newChapters.length, current: "Đang đợi..." },
      status: "pending",
      warnCount: 0,
      delayMs,
      abortController: new AbortController(),
      createdAt: new Date(),
    };

    set((state) => ({ jobs: { ...state.jobs, [novelId]: job } }));
    
    // Trigger queue processing
    get().processQueue();
  },

  processQueue: async () => {
    const state = get();
    const activeCount = Object.values(state.jobs).filter(j => j.status === "scraping" || j.status === "paused").length;
    
    if (activeCount >= MAX_CONCURRENCY) return; // Queue full

    const nextJob = Object.values(state.jobs)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .find(j => j.status === "pending");

    if (!nextJob) return; // No pending jobs

    // Mark as scraping
    set((s) => ({ jobs: { ...s.jobs, [nextJob.id]: { ...nextJob, status: "scraping" } } }));

    // Start scraping in background
    (async () => {
      try {
        await scrapeChapters(
          nextJob.chaptersToScrape,
          nextJob.adapter,
          (completed, total, currentTitle) => {
            set((s) => {
              const j = s.jobs[nextJob.id];
              if (!j) return s;
              return {
                jobs: {
                  ...s.jobs,
                  [nextJob.id]: {
                    ...j,
                    progress: { completed, total, current: currentTitle },
                  },
                },
              };
            });
          },
          nextJob.abortController?.signal,
          async (entry) => {
            // Increment warnings if needed
            if (entry.timedOut || entry.parsed.content.length < 100 || entry.parsed.warning) {
              set((s) => {
                const j = s.jobs[nextJob.id];
                if (!j) return s;
                return { jobs: { ...s.jobs, [nextJob.id]: { ...j, warnCount: j.warnCount + 1 } } };
              });
            }

            const now = new Date();
            const normalizedTitle = entry.parsed.title.toLowerCase().trim();
            
            const existing = await db.chapters
              .where("novelId")
              .equals(nextJob.id)
              .toArray()
              .then(chs => chs.find(c => c.title.toLowerCase().trim() === normalizedTitle));

            if (existing) {
              const scenes = await db.scenes.where("chapterId").equals(existing.id).toArray();
              const activeScene = scenes.find(s => s.isActive === 1);
              if (activeScene) {
                await db.scenes.update(activeScene.id, {
                  content: entry.parsed.content,
                  wordCount: countWords(stripHtml(entry.parsed.content)),
                  updatedAt: now,
                });
              }
            } else {
              const chapterId = crypto.randomUUID();
              const plainText = stripHtml(entry.parsed.content);
              const currentOrder = await db.chapters.where("novelId").equals(nextJob.id).count();

              await db.chapters.add({
                id: chapterId,
                novelId: nextJob.id,
                title: entry.parsed.title,
                order: entry.parsed.order ?? currentOrder,
                createdAt: now,
                updatedAt: now,
              });

              await db.scenes.add({
                id: crypto.randomUUID(),
                chapterId,
                novelId: nextJob.id,
                title: entry.parsed.title,
                content: entry.parsed.content,
                order: 0,
                wordCount: countWords(plainText),
                version: 0,
                versionType: "manual",
                isActive: 1,
                createdAt: now,
                updatedAt: now,
              });
            }
          },
          nextJob.delayMs,
          () => get().jobs[nextJob.id]?.status === "paused"
        );

        // Done
        set((s) => {
          const j = s.jobs[nextJob.id];
          if (!j) return s;
          return { jobs: { ...s.jobs, [nextJob.id]: { ...j, status: "done" } } };
        });
        toast.success(`Đã tải xong truyện: ${nextJob.title}`);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          set((s) => {
            const j = s.jobs[nextJob.id];
            if (!j) return s;
            return { jobs: { ...s.jobs, [nextJob.id]: { ...j, status: "error", error: err.message } } };
          });
          toast.error(`Lỗi tải truyện ${nextJob.title}: ${err.message}`);
        }
      } finally {
        // Continue processing queue
        get().processQueue();
      }
    })();

    // Attempt to process next job immediately (in case max concurrency isn't reached yet)
    get().processQueue();
  },

  removeJob: (id) => {
    set((state) => {
      const newJobs = { ...state.jobs };
      delete newJobs[id];
      return { jobs: newJobs };
    });
  },

  pauseJob: (id) => {
    set((state) => {
      const j = state.jobs[id];
      if (!j || j.status !== "scraping") return state;
      return { jobs: { ...state.jobs, [id]: { ...j, status: "paused" } } };
    });
  },

  resumeJob: (id) => {
    set((state) => {
      const j = state.jobs[id];
      if (!j || j.status !== "paused") return state;
      return { jobs: { ...state.jobs, [id]: { ...j, status: "scraping" } } };
    });
  },

  cancelJob: (id) => {
    const j = get().jobs[id];
    if (j && j.abortController) {
      j.abortController.abort();
    }
    get().removeJob(id);
    setTimeout(() => get().processQueue(), 500);
  },

  clearDone: () => {
    set((state) => {
      const newJobs = { ...state.jobs };
      for (const [id, job] of Object.entries(newJobs)) {
        if (job.status === "done" || job.status === "error") {
          delete newJobs[id];
        }
      }
      return { jobs: newJobs };
    });
  },
}));

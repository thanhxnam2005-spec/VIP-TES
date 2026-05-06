import { db } from "@/lib/db";
import MiniSearch from "minisearch";

// ─── Types ──────────────────────────────────────────────────

export type SearchResultType =
  | "page"
  | "novel"
  | "chapter"
  | "character"
  | "note"
  | "scene";

export interface SearchDocument {
  id: string;
  type: SearchResultType;
  title: string;
  text: string;
  route: string;
  subtitle: string;
  novelId?: string;
}

export interface SearchResult {
  type: SearchResultType;
  title: string;
  subtitle: string;
  route: string;
  score: number;
  novelId?: string;
}

// ─── Static pages (derived from navConfig) ──────────────────

import { navConfig, miscNav } from "@/components/app-sidebar";

/** Extra search keywords per route for better discoverability */
const PAGE_KEYWORDS: Record<string, string> = {
  "/dashboard": "home dashboard trang chủ bảng điều khiển",
  "/library": "library novels tiểu thuyết",
  "/import": "import nhập sách",
  "/convert": "convert translate dịch chuyển đổi",
  "/settings/providers": "providers api key nhà cung cấp",
  "/settings/instructions": "instructions system prompt hệ thống",
  "/settings/data": "backup restore sao lưu khôi phục",
  "/changelog": "changelog updates cập nhật",
};

const LANDING_PAGE = {
  title: "Giới thiệu Novel Studio",
  route: "/",
  keywords: "landing trang công khai giới thiệu novel studio",
};

const PAGES = [
  LANDING_PAGE,
  ...[...navConfig, ...miscNav].map((item) => ({
    title: item.title,
    route: item.href,
    keywords: PAGE_KEYWORDS[item.href] ?? "",
  })),
];

// ─── Index singleton ────────────────────────────────────────

let cachedIndex: MiniSearch<SearchDocument> | null = null;

function createIndex(): MiniSearch<SearchDocument> {
  return new MiniSearch<SearchDocument>({
    fields: ["title", "text"],
    storeFields: ["type", "title", "route", "subtitle", "novelId"],
    searchOptions: {
      boost: { title: 3 },
      fuzzy: 0.25,
      prefix: true,
      maxFuzzy: 4,
    },
    processTerm: (term) => term.normalize("NFC").toLowerCase(),
  });
}

/** Invalidate the cached index so it rebuilds on next search. */
export function invalidateSearchIndex() {
  cachedIndex = null;
}

// Set up Dexie hooks to auto-invalidate on data changes.
// Hooks are registered once at module load.
const tables = [
  db.novels,
  db.chapters,
  db.scenes,
  db.characters,
  db.notes,
] as const;
for (const table of tables) {
  table.hook("creating", () => {
    invalidateSearchIndex();
  });
  table.hook("updating", () => {
    invalidateSearchIndex();
    return undefined;
  });
  table.hook("deleting", () => {
    invalidateSearchIndex();
  });
}

// ─── Index builder ──────────────────────────────────────────

async function buildIndex(): Promise<MiniSearch<SearchDocument>> {
  const index = createIndex();
  const docs: SearchDocument[] = [];

  // Pages (static)
  for (const page of PAGES) {
    docs.push({
      id: `page:${page.route}`,
      type: "page",
      title: page.title,
      text: page.keywords,
      route: page.route,
      subtitle: "Trang",
    });
  }

  // Fetch all tables in parallel
  const [novels, chapters, characters, notes, scenes] = await Promise.all([
    db.novels.toArray(),
    db.chapters.toArray(),
    db.characters.toArray(),
    db.notes.toArray(),
    db.scenes.where("isActive").equals(1).toArray(),
  ]);

  // Build lookup maps
  const novelTitleMap = new Map<string, string>();
  for (const novel of novels) {
    novelTitleMap.set(novel.id, novel.title);
  }
  const chapterMap = new Map(chapters.map((c) => [c.id, c]));

  // Novels
  for (const novel of novels) {
    docs.push({
      id: `novel:${novel.id}`,
      type: "novel",
      title: novel.title,
      text: [
        novel.description,
        novel.author,
        novel.synopsis,
        novel.genres?.join(" "),
        novel.tags?.join(" "),
        novel.worldOverview,
        novel.storySetting,
        novel.factions?.map((f) => `${f.name} ${f.description}`).join(" "),
        novel.keyLocations?.map((l) => `${l.name} ${l.description}`).join(" "),
      ]
        .filter(Boolean)
        .join(" "),
      route: `/novels/${novel.id}`,
      subtitle: novel.author ? `Tác giả: ${novel.author}` : "Tiểu thuyết",
    });
  }

  // Chapters
  for (const chapter of chapters) {
    const novelTitle = novelTitleMap.get(chapter.novelId) ?? "";
    docs.push({
      id: `chapter:${chapter.id}`,
      type: "chapter",
      title: chapter.title,
      text: chapter.summary ?? "",
      route: `/novels/${chapter.novelId}/chapters/${chapter.id}`,
      subtitle: `Chương ${chapter.order} · ${novelTitle}`,
      novelId: chapter.novelId,
    });
  }

  // Characters
  for (const char of characters) {
    const novelTitle = novelTitleMap.get(char.novelId) ?? "";
    docs.push({
      id: `character:${char.id}`,
      type: "character",
      title: char.name,
      text: [char.role, char.description, char.personality, char.appearance]
        .filter(Boolean)
        .join(" "),
      route: `/novels/${char.novelId}`,
      subtitle: `${char.role} · ${novelTitle}`,
      novelId: char.novelId,
    });
  }

  // Notes
  for (const note of notes) {
    const novelTitle = novelTitleMap.get(note.novelId) ?? "";
    docs.push({
      id: `note:${note.id}`,
      type: "note",
      title: note.title,
      text: note.content,
      route: `/novels/${note.novelId}`,
      subtitle: `${note.category} · ${novelTitle}`,
      novelId: note.novelId,
    });
  }

  // Scenes (active only)
  for (const scene of scenes) {
    const chapter = chapterMap.get(scene.chapterId);
    const novelTitle = novelTitleMap.get(scene.novelId) ?? "";
    docs.push({
      id: `scene:${scene.id}`,
      type: "scene",
      title: scene.title,
      text: scene.content,
      route: `/novels/${scene.novelId}/chapters/${scene.chapterId}`,
      subtitle: chapter ? `${chapter.title} · ${novelTitle}` : novelTitle,
      novelId: scene.novelId,
    });
  }

  index.addAll(docs);
  return index;
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Get or build the search index (cached singleton).
 */
export async function getSearchIndex(): Promise<MiniSearch<SearchDocument>> {
  if (cachedIndex) return cachedIndex;
  cachedIndex = await buildIndex();
  return cachedIndex;
}

/**
 * Search across all content. Returns results grouped-ready (sorted by score).
 * Optionally filter by novelId for scoped search (used by chat tools).
 */
export async function globalSearch(
  query: string,
  options?: { novelId?: string; limit?: number; types?: SearchResultType[] },
): Promise<SearchResult[]> {
  const index = await getSearchIndex();
  const normalizedQuery = query.normalize("NFC");

  let results = index.search(normalizedQuery);

  if (options?.novelId) {
    results = results.filter(
      (r) => r.novelId === options.novelId || r.type === "page",
    );
  }
  if (options?.types?.length) {
    const allowedTypes = new Set(options.types);
    results = results.filter((r) =>
      allowedTypes.has(r.type as SearchResultType),
    );
  }

  const limit = options?.limit ?? 50;

  return results.slice(0, limit).map((hit) => ({
    type: hit.type as SearchResultType,
    title: (hit.title as string) ?? "",
    subtitle: (hit.subtitle as string) ?? "",
    route: (hit.route as string) ?? "",
    score: Math.round(hit.score * 100) / 100,
    novelId: hit.novelId as string | undefined,
  }));
}

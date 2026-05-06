"use client";

import { miscNav, navConfig } from "@/components/app-sidebar";
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useNovels } from "@/lib/hooks";
import { useDebouncedCallback } from "@/lib/hooks/use-debounce";
import {
  globalSearch,
  type SearchResult,
  type SearchResultType,
} from "@/lib/search/global-search";
import { useGlobalSearch } from "@/lib/stores/global-search";
import { cn } from "@/lib/utils";
import {
  BookOpenIcon,
  ChevronRightIcon,
  FileTextIcon,
  HashIcon,
  LoaderIcon,
  NotebookPenIcon,
  ScrollTextIcon,
  SearchIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

// ─── Type metadata with themed colors ───────────────────────

const TYPE_META: Record<
  SearchResultType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  page: {
    label: "Trang",
    icon: HashIcon,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10 dark:bg-blue-500/15",
  },
  novel: {
    label: "Tiểu thuyết",
    icon: BookOpenIcon,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10 dark:bg-amber-500/15",
  },
  chapter: {
    label: "Chương",
    icon: ScrollTextIcon,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10 dark:bg-emerald-500/15",
  },
  character: {
    label: "Nhân vật",
    icon: UserIcon,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10 dark:bg-violet-500/15",
  },
  note: {
    label: "Ghi chú",
    icon: NotebookPenIcon,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-500/10 dark:bg-rose-500/15",
  },
  scene: {
    label: "Nội dung",
    icon: FileTextIcon,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10 dark:bg-cyan-500/15",
  },
};

const GROUP_ORDER: SearchResultType[] = [
  "page",
  "novel",
  "chapter",
  "character",
  "note",
  "scene",
];

const MAX_PER_GROUP = 3;
const MAX_RECENT_NOVELS = 5;

const QUICK_NAV = [...navConfig, ...miscNav];

// ─── Subcomponents ──────────────────────────────────────────

function TypeBadge({ type }: { type: SearchResultType }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-lg",
        meta.bgColor,
        meta.color,
      )}
    >
      <Icon className="size-3.5" />
    </span>
  );
}

function SearchResultItem({
  item,
  onSelect,
}: {
  item: SearchResult;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={`${item.route}|${item.title}`}
      onSelect={onSelect}
      className="gap-3 py-2.5!"
    >
      <TypeBadge type={item.type} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.title}</div>
        {item.subtitle && (
          <div className="truncate text-xs text-muted-foreground/70">
            {item.subtitle}
          </div>
        )}
      </div>
      <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/40" />
    </CommandItem>
  );
}

// ─── Main component ─────────────────────────────────────────

export function GlobalSearchDialog() {
  const { isOpen, close } = useGlobalSearch();
  const router = useRouter();
  const novels = useNovels();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebouncedCallback(async (value: string) => {
    setIsSearching(true);
    const hits = await globalSearch(value);
    setResults(hits);
    setIsSearching(false);
  }, 150);

  const handleClose = useCallback(() => {
    close();
    setQuery("");
    setResults([]);
    setIsSearching(false);
    setExpandedGroups(new Set());
    debouncedSearch.cancel();
  }, [close, debouncedSearch]);

  const handleValueChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (!value.trim()) {
        setResults([]);
        setIsSearching(false);
        debouncedSearch.cancel();
        return;
      }
      setIsSearching(true);
      debouncedSearch.run(value);
    },
    [debouncedSearch],
  );

  const handleSelect = useCallback(
    (route: string) => {
      handleClose();
      router.push(route);
    },
    [handleClose, router],
  );

  // Group results by type
  const grouped = new Map<SearchResultType, SearchResult[]>();
  for (const r of results) {
    const arr = grouped.get(r.type) ?? [];
    arr.push(r);
    grouped.set(r.type, arr);
  }

  const hasQuery = !!query.trim();
  const recentNovels = novels?.slice(0, MAX_RECENT_NOVELS);
  const totalResults = results.length;

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      title="Tìm kiếm"
      className="sm:max-w-2xl"
      description="Tìm trang, tiểu thuyết, chương, nhân vật, ghi chú..."
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Tìm kiếm trang, tiểu thuyết, nhân vật..."
          value={query}
          onValueChange={handleValueChange}
        />

        {/* Search status bar */}
        {hasQuery && (
          <div className="flex items-center justify-between border-b px-3 py-1.5">
            {isSearching ? (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <LoaderIcon className="size-3 animate-spin" />
                Đang tìm kiếm...
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                {totalResults > 0
                  ? `${totalResults} kết quả`
                  : "Không có kết quả"}
              </span>
            )}
            <div className="flex gap-1">
              {GROUP_ORDER.filter((type) => grouped.has(type)).map((type) => {
                const meta = TYPE_META[type];
                const count = grouped.get(type)!.length;
                return (
                  <span
                    key={type}
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                      meta.bgColor,
                      meta.color,
                    )}
                  >
                    {count} {meta.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <CommandList className="max-h-80">
          {/* Empty states */}
          {hasQuery && !isSearching && results.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <SearchIcon className="size-8 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Không tìm thấy kết quả
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/60">
                  Thử từ khóa khác hoặc kiểm tra chính tả
                </p>
              </div>
            </div>
          )}

          {/* ─── Default view: quick nav + recent novels ─── */}
          {!hasQuery && (
            <>
              <CommandGroup heading="Truy cập nhanh">
                {QUICK_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      value={`${item.href}|${item.title}`}
                      onSelect={() => handleSelect(item.href)}
                    >
                      <span className="inline-flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <span className="text-sm">{item.title}</span>
                      {item.href === "/dashboard" && (
                        <CommandShortcut>Trang chủ</CommandShortcut>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              {recentNovels && recentNovels.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Tiểu thuyết gần đây">
                    {recentNovels.map((novel) => (
                      <CommandItem
                        key={novel.id}
                        value={`/novels/${novel.id}|${novel.title}`}
                        onSelect={() => handleSelect(`/novels/${novel.id}`)}
                        className="gap-3 py-2.5!"
                      >
                        {/* Novel color dot */}
                        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                          <BookOpenIcon className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {novel.title}
                          </div>
                          {novel.author && (
                            <div className="truncate text-xs text-muted-foreground/70">
                              {novel.author}
                            </div>
                          )}
                        </div>
                        <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/40" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          )}

          {/* ─── Search results grouped by type ─── */}
          {hasQuery &&
            !isSearching &&
            GROUP_ORDER.filter((type) => grouped.has(type)).map((type) => {
              const items = grouped.get(type)!;
              const meta = TYPE_META[type];
              const isExpanded = expandedGroups.has(type);
              const visible = isExpanded
                ? items
                : items.slice(0, MAX_PER_GROUP);
              const remaining = items.length - MAX_PER_GROUP;

              return (
                <CommandGroup key={type} heading={meta.label}>
                  {visible.map((item, i) => (
                    <SearchResultItem
                      key={`${type}-${i}`}
                      item={item}
                      onSelect={() => handleSelect(item.route)}
                    />
                  ))}
                  {!isExpanded && remaining > 0 && (
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                        meta.color,
                      )}
                      onClick={() =>
                        setExpandedGroups((prev) => new Set([...prev, type]))
                      }
                    >
                      Xem thêm {remaining} kết quả...
                    </button>
                  )}
                </CommandGroup>
              );
            })}
        </CommandList>

        {/* Fixed footer — always visible below scrollable list */}
        <div className="shrink-0 border-t px-3 py-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
            <span>
              <kbd className="rounded border border-border/50 px-1 py-0.5 font-mono text-[9px]">
                ↑↓
              </kbd>{" "}
              di chuyển{" "}
              <kbd className="rounded border border-border/50 px-1 py-0.5 font-mono text-[9px]">
                ↵
              </kbd>{" "}
              mở{" "}
              <kbd className="rounded border border-border/50 px-1 py-0.5 font-mono text-[9px]">
                esc
              </kbd>{" "}
              đóng
            </span>
            {!hasQuery && (
              <span className="flex items-center gap-1">
                <SparklesIcon className="size-3" />
                Hỗ trợ fuzzy tiếng Việt
              </span>
            )}
            {hasQuery && !isSearching && totalResults > 0 && (
              <span>{totalResults} kết quả</span>
            )}
          </div>
        </div>
      </Command>
    </CommandDialog>
  );
}

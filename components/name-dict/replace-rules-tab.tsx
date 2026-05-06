"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import type { ReplaceRule } from "@/lib/db";
import {
  deleteReplaceRule,
  updateReplaceRule,
} from "@/lib/hooks/use-replace-rules";
import { cn } from "@/lib/utils";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Edit3Icon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ReplaceRuleDialog } from "./replace-rule-dialog";

export function ReplaceRulesTab({
  activeNovelId,
  isNovelContext,
  globalRules,
  novelRules,
}: {
  activeNovelId: string | null;
  isNovelContext: boolean;
  globalRules: ReplaceRule[] | undefined;
  novelRules: ReplaceRule[] | undefined;
}) {
  const [scopeFilter, setScopeFilter] = useState<"all" | "novel" | "global">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ReplaceRule | null>(null);

  const allRules = useMemo(() => {
    if (!isNovelContext) return globalRules ?? [];
    if (scopeFilter === "global") return globalRules ?? [];
    if (scopeFilter === "novel") return novelRules ?? [];
    // "all" — merge with novel overriding global
    const merged = new Map<string, ReplaceRule>();
    for (const r of globalRules ?? []) merged.set(r.pattern, r);
    for (const r of novelRules ?? []) merged.set(r.pattern, r);
    return Array.from(merged.values()).sort((a, b) => a.order - b.order);
  }, [isNovelContext, scopeFilter, globalRules, novelRules]);

  const filtered = useMemo(() => {
    if (!searchQuery) return allRules;
    const q = searchQuery.toLowerCase();
    return allRules.filter(
      (r) =>
        r.pattern.toLowerCase().includes(q) ||
        r.replacement.toLowerCase().includes(q),
    );
  }, [allRules, searchQuery]);

  const handleToggleEnabled = async (entry: ReplaceRule) => {
    await updateReplaceRule(entry.id, { enabled: !entry.enabled });
  };

  const handleDelete = async (id: string) => {
    await deleteReplaceRule(id);
  };

  const handleMoveUp = async (entry: ReplaceRule, index: number) => {
    if (index === 0) return;
    const prev = filtered[index - 1];
    await updateReplaceRule(entry.id, { order: prev.order });
    await updateReplaceRule(prev.id, { order: entry.order });
  };

  const handleMoveDown = async (entry: ReplaceRule, index: number) => {
    if (index >= filtered.length - 1) return;
    const next = filtered[index + 1];
    await updateReplaceRule(entry.id, { order: next.order });
    await updateReplaceRule(next.id, { order: entry.order });
  };

  const defaultScope = isNovelContext ? "novel" : "global";

  return (
    <>
      {/* Search + scope + add */}
      <div className="flex gap-1.5 border-b p-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm rule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Button
          size="icon-sm"
          className="size-8"
          onClick={() => {
            setEditingEntry(null);
            setDialogOpen(true);
          }}
          title="Thêm rule"
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </div>

      {/* Scope filter (novel context only) */}
      {isNovelContext && (
        <div className="flex gap-1 border-b px-3 py-2">
          {(
            [
              ["all", "Tất cả"],
              ["novel", "Riêng"],
              ["global", "Chung"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              variant={scopeFilter === value ? "default" : "outline"}
              size="sm"
              className="h-6 flex-1 text-xs"
              onClick={() => setScopeFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {/* Rules list */}
      <ScrollArea className="h-[calc(100dvh-180px)]">
        <div className="divide-y">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {searchQuery ? "Không tìm thấy rule" : "Chưa có rule nào"}
            </p>
          )}
          {filtered.map((entry, i) => {
            const isNovelEntry = entry.scope !== "global";
            return (
              <div
                key={entry.id}
                className={cn(
                  "group px-3 py-2",
                  !entry.enabled && "opacity-50",
                )}
              >
                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-mono text-xs flex-1 truncate">
                      {entry.pattern}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="truncate text-xs flex-1 font-mono">
                      {entry.replacement}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    {entry.isRegex && (
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        Regex
                      </Badge>
                    )}
                    {entry.caseSensitive && (
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        Aa
                      </Badge>
                    )}
                    {!isNovelEntry && isNovelContext && (
                      <Badge
                        variant="secondary"
                        className="h-4 px-1 text-[10px]"
                      >
                        Chung
                      </Badge>
                    )}
                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-0.5 ml-auto">
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-6"
                          onClick={() => handleMoveUp(entry, i)}
                          disabled={i === 0}
                        >
                          <ArrowUpIcon className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-6"
                          onClick={() => handleMoveDown(entry, i)}
                          disabled={i >= filtered.length - 1}
                        >
                          <ArrowDownIcon className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-6"
                          onClick={() => {
                            setEditingEntry(entry);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit3Icon className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-6"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2Icon className="size-3" />
                        </Button>
                      </div>
                      <Switch
                        checked={entry.enabled}
                        onCheckedChange={() => handleToggleEnabled(entry)}
                        className="scale-75"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex shrink-0 items-center border-t px-4 py-2">
        <span className="text-xs text-muted-foreground">
          {filtered.length} rules
        </span>
      </div>

      {/* Add/Edit dialog */}
      <ReplaceRuleDialog
        open={dialogOpen}
        onOpenChange={(v: boolean) => {
          setDialogOpen(v);
          if (!v) setEditingEntry(null);
        }}
        editingEntry={editingEntry}
        activeNovelId={activeNovelId}
        isNovelContext={isNovelContext}
        defaultScope={defaultScope}
        nextOrder={allRules.length}
      />
    </>
  );
}

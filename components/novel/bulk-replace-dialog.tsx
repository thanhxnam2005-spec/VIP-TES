"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InlineDiffViewer } from "@/components/ui/inline-diff-viewer";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { TextCompareEditor } from "@/components/ui/text-compare-editor";
import { db, type Chapter, type ReplaceRule as DbReplaceRule } from "@/lib/db";
import { useReplaceEngine } from "@/lib/hooks/use-replace-engine";
import {
  getMergedReplaceRules,
  toEngineRule,
} from "@/lib/hooks/use-replace-rules";
import {
  createSceneVersion,
  ensureInitialVersion,
} from "@/lib/hooks/use-scene-versions";
import { updateScene } from "@/lib/hooks/use-scenes";
import type { ReplaceRule } from "@/lib/replace-engine";
import {
  CheckCircle2Icon,
  ColumnsIcon,
  Loader2Icon,
  RowsIcon,
  SkipForwardIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Separator } from "../ui/separator";

interface ChapterResult {
  chapterId: string;
  sceneId: string;
  title: string;
  original: string;
  output: string;
  matchCount: number;
}

type ReviewStatus = "pending" | "approved" | "skipped";

export function BulkReplaceDialog({
  open,
  onOpenChange,
  novelId,
  chapterIds,
  chapters,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  novelId: string;
  chapterIds: string[];
  chapters: Chapter[];
}) {
  const [step, setStep] = useState<"config" | "processing" | "review" | "done">(
    "config",
  );
  const [results, setResults] = useState<ChapterResult[]>([]);
  const [reviewStatuses, setReviewStatuses] = useState<
    Map<string, ReviewStatus>
  >(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [diffView, setDiffView] = useState<"side" | "inline">("side");

  // Rule preview state
  const [loadedRules, setLoadedRules] = useState<DbReplaceRule[]>([]);
  const [disabledRuleIds, setDisabledRuleIds] = useState<Set<string>>(
    new Set(),
  );
  const [isLoadingRules, setIsLoadingRules] = useState(false);

  const engine = useReplaceEngine();

  // Load rules when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoadingRules(true);
    getMergedReplaceRules(novelId).then((rules) => {
      if (cancelled) return;
      setLoadedRules(rules);
      setDisabledRuleIds(new Set());
      setIsLoadingRules(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, novelId]);

  const toggleRule = useCallback((id: string) => {
    setDisabledRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const enabledRules = useMemo(
    () => loadedRules.filter((r) => !disabledRuleIds.has(r.id)),
    [loadedRules, disabledRuleIds],
  );

  const selectedChapters = useMemo(
    () => chapters.filter((c) => chapterIds.includes(c.id)),
    [chapters, chapterIds],
  );

  const handleStart = useCallback(async () => {
    if (enabledRules.length === 0) {
      toast.info("Không có rules thay thế nào được bật");
      return;
    }

    setStep("processing");
    setProcessedCount(0);
    setResults([]);

    try {
      const engineRules: ReplaceRule[] = enabledRules.map(toEngineRule);

      // Fetch scenes for selected chapters
      const scenes = await db.scenes
        .where("[novelId+isActive]")
        .equals([novelId, 1])
        .toArray();

      const sceneMap = new Map(scenes.map((s) => [s.chapterId, s]));

      const items: Array<{ itemId: string; text: string }> = [];
      const chapterInfo = new Map<string, { title: string; sceneId: string }>();

      for (const ch of selectedChapters) {
        const scene = sceneMap.get(ch.id);
        if (scene?.content) {
          items.push({ itemId: ch.id, text: scene.content });
          chapterInfo.set(ch.id, { title: ch.title, sceneId: scene.id });
        }
      }

      const batchResults: ChapterResult[] = [];

      await engine.replaceBatch(
        items,
        engineRules,
        (itemId, output, matchCount) => {
          const info = chapterInfo.get(itemId);
          const originalScene = scenes.find(
            (s) => s.chapterId === itemId && s.isActive === 1,
          );
          if (info && originalScene) {
            batchResults.push({
              chapterId: itemId,
              sceneId: info.sceneId,
              title: info.title,
              original: originalScene.content,
              output,
              matchCount,
            });
          }
          setProcessedCount((c) => c + 1);
        },
      );

      // Filter out chapters with no changes
      const changed = batchResults.filter(
        (r) => r.matchCount > 0 && r.output !== r.original,
      );

      if (changed.length === 0) {
        toast.info("Không có thay đổi nào");
        setStep("config");
        return;
      }

      setResults(changed);
      setReviewStatuses(
        new Map(changed.map((r) => [r.chapterId, "pending" as ReviewStatus])),
      );
      setCurrentIndex(0);
      setStep("review");
    } catch (err) {
      console.error("Bulk replace failed:", err);
      toast.error("Lỗi khi thay thế hàng loạt");
      setStep("config");
    }
  }, [novelId, selectedChapters, engine, enabledRules]);

  const handleApprove = useCallback(() => {
    const current = results[currentIndex];
    if (!current) return;
    setReviewStatuses((prev) => {
      const next = new Map(prev);
      next.set(current.chapterId, "approved");
      return next;
    });
    if (currentIndex < results.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [results, currentIndex]);

  const handleSkip = useCallback(() => {
    const current = results[currentIndex];
    if (!current) return;
    setReviewStatuses((prev) => {
      const next = new Map(prev);
      next.set(current.chapterId, "skipped");
      return next;
    });
    if (currentIndex < results.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [results, currentIndex]);

  const handleApproveAll = useCallback(() => {
    setReviewStatuses((prev) => {
      const next = new Map(prev);
      for (const [id, status] of next) {
        if (status === "pending") next.set(id, "approved");
      }
      return next;
    });
  }, []);

  const approvedCount = useMemo(
    () =>
      Array.from(reviewStatuses.values()).filter((s) => s === "approved")
        .length,
    [reviewStatuses],
  );
  const skippedCount = useMemo(
    () =>
      Array.from(reviewStatuses.values()).filter((s) => s === "skipped").length,
    [reviewStatuses],
  );
  const pendingCount = useMemo(
    () =>
      Array.from(reviewStatuses.values()).filter((s) => s === "pending").length,
    [reviewStatuses],
  );

  const handleApplyAll = useCallback(async () => {
    setIsApplying(true);
    try {
      const approved = results.filter(
        (r) => reviewStatuses.get(r.chapterId) === "approved",
      );
      for (const result of approved) {
        await ensureInitialVersion(result.sceneId, novelId, result.original);
        await createSceneVersion(
          result.sceneId,
          novelId,
          "find-replace",
          result.output,
        );
        await updateScene(result.sceneId, { content: result.output });
      }
      toast.success(`Đã áp dụng thay thế cho ${approved.length} chương`);
      setStep("done");
    } catch (err) {
      console.error("Apply failed:", err);
      toast.error("Lỗi khi áp dụng");
    } finally {
      setIsApplying(false);
    }
  }, [results, reviewStatuses, novelId]);

  const handleClose = () => {
    setStep("config");
    setResults([]);
    setReviewStatuses(new Map());
    setCurrentIndex(0);
    onOpenChange(false);
  };

  const currentResult = results[currentIndex];
  const allReviewed = pendingCount === 0 && results.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Thay thế hàng loạt</DialogTitle>
        </DialogHeader>

        {/* Config step */}
        {step === "config" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Chạy rules thay thế trên <strong>{chapterIds.length}</strong>{" "}
              chương đã chọn.
            </p>

            {/* Rule list */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  Rules ({enabledRules.length}/{loadedRules.length} bật)
                </span>
                {disabledRuleIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setDisabledRuleIds(new Set())}
                  >
                    Bật tất cả
                  </Button>
                )}
              </div>
              {isLoadingRules ? (
                <div className="space-y-2 py-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : loadedRules.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Không có rules thay thế nào
                </p>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="divide-y rounded-md border">
                    {loadedRules.map((rule) => {
                      const isEnabled = !disabledRuleIds.has(rule.id);
                      return (
                        <div
                          key={rule.id}
                          className="flex items-center gap-2 overflow-hidden px-3 py-2"
                        >
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => toggleRule(rule.id)}
                            className="shrink-0 scale-75"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="w-0 flex-1 truncate font-mono">
                                {rule.pattern}
                              </span>
                              <span className="shrink-0 text-muted-foreground">
                                →
                              </span>
                              <span className="w-0 flex-1 truncate font-mono">
                                {rule.replacement || ""}
                              </span>
                            </div>
                            <div className="mt-0.5 flex gap-1">
                              {rule.isRegex && (
                                <Badge
                                  variant="outline"
                                  className="h-4 px-1 text-[10px]"
                                >
                                  Regex
                                </Badge>
                              )}
                              {rule.caseSensitive && (
                                <Badge
                                  variant="outline"
                                  className="h-4 px-1 text-[10px]"
                                >
                                  Aa
                                </Badge>
                              )}
                              {rule.scope !== "global" && (
                                <Badge
                                  variant="secondary"
                                  className="h-4 px-1 text-[10px]"
                                >
                                  Riêng
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            <Button
              onClick={handleStart}
              className="w-full"
              disabled={enabledRules.length === 0 || isLoadingRules}
            >
              Chạy thay thế ({enabledRules.length} rules)
            </Button>
          </div>
        )}

        {/* Processing step */}
        {step === "processing" && (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center gap-2">
              <Loader2Icon className="size-5 animate-spin" />
              <span className="text-sm">
                Đang xử lý... {processedCount}/{chapterIds.length}
              </span>
            </div>
            <Progress value={(processedCount / chapterIds.length) * 100} />
          </div>
        )}

        {/* Review step */}
        {step === "review" && currentResult && (
          <div className="space-y-3">
            {/* Progress info */}
            <div className="flex items-center text-xs text-muted-foreground">
              <span>
                Chương {currentIndex + 1}/{results.length}:{" "}
                <strong className="text-foreground">
                  {currentResult.title}
                </strong>
              </span>
              <span className="ml-auto">
                {currentResult.matchCount} thay thế
              </span>
              <Separator
                orientation="vertical"
                className="mx-2 h-4 translate-y-1"
              />
              {/* Diff view toggle + content */}
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant={diffView === "side" ? "default" : "ghost"}
                  size="icon-xs"
                  onClick={() => setDiffView("side")}
                  title="So sánh song song"
                >
                  <ColumnsIcon />
                </Button>
                <Button
                  variant={diffView === "inline" ? "default" : "ghost"}
                  size="icon-xs"
                  onClick={() => setDiffView("inline")}
                  title="So sánh nội tuyến"
                >
                  <RowsIcon />
                </Button>
              </div>
            </div>

            {diffView === "side" ? (
              <TextCompareEditor
                leftValue={currentResult.original}
                rightValue={currentResult.output}
                showDiff
                leftLabel="Bản gốc"
                rightLabel="Kết quả"
                panelWrapperClassName="h-[50vh]"
                storageKey="bulk-replace-diff"
              />
            ) : (
              <InlineDiffViewer
                original={currentResult.original}
                modified={currentResult.output}
                className="h-[50vh]"
              />
            )}

            {/* Review summary */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400">
                {approvedCount} áp dụng
              </span>
              <span className="text-amber-600 dark:text-amber-400">
                {skippedCount} bỏ qua
              </span>
              <span>{pendingCount} chưa xem</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleSkip}
              >
                <SkipForwardIcon className="mr-1 size-3" />
                Bỏ qua
              </Button>
              <Button size="sm" className="flex-1" onClick={handleApprove}>
                <CheckCircle2Icon className="mr-1 size-3" />
                Áp dụng
              </Button>
            </div>

            {pendingCount > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleApproveAll}
              >
                Áp dụng tất cả còn lại ({pendingCount})
              </Button>
            )}

            {allReviewed && (
              <Button
                className="w-full"
                onClick={handleApplyAll}
                disabled={isApplying || approvedCount === 0}
              >
                {isApplying ? (
                  <>
                    <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                    Đang áp dụng...
                  </>
                ) : (
                  `Xác nhận áp dụng ${approvedCount} chương`
                )}
              </Button>
            )}
          </div>
        )}

        {/* Done step */}
        {step === "done" && (
          <>
            <div className="flex items-center flex-col gap-3 py-8">
              <CheckCircle2Icon className="size-10 shrink-0 text-emerald-500" />
              <div>
                <p className="text-xl text-center text-emerald-500 dark:text-emerald-400 font-serif font-bold">
                  Hoàn thành!
                </p>
                <p className="mt-3">
                  Đã áp dụng thay thế cho {approvedCount} chương, bỏ qua{" "}
                  {skippedCount} chương.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Đóng</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

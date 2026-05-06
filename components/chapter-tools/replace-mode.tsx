"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import { useReplaceEngine } from "@/lib/hooks/use-replace-engine";
import {
  createReplaceRule,
  getMergedReplaceRules,
  toEngineRule,
  useReplaceRules,
} from "@/lib/hooks/use-replace-rules";
import type { ReplaceRule } from "@/lib/replace-engine";
import { validatePattern } from "@/lib/replace-engine";
import { useChapterTools } from "@/lib/stores/chapter-tools";
import { useNameDictPanel } from "@/lib/stores/name-dict-panel";
import {
  BookmarkPlusIcon,
  CheckCircle2Icon,
  GlobeIcon,
  Loader2Icon,
  ReplaceAllIcon,
  SearchIcon,
  SettingsIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
interface ReplaceSummary {
  matchCount: number;
  ruleCount: number;
}

export function ReplaceMode({
  content,
  novelId,
  renderFooter,
}: {
  content: string;
  novelId: string;
  renderFooter: (node: React.ReactNode) => void;
}) {
  // Ad-hoc inputs
  const [findPattern, setFindPattern] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<ReplaceSummary | null>(null);

  const engine = useReplaceEngine();
  const enabledRules = useReplaceRules(novelId);
  const setFindHighlights = useChapterTools((s) => s.setFindHighlights);
  const findMatchCount = useChapterTools((s) => s.findMatchCount);
  const completedResult = useChapterTools((s) => s.completedResult);
  const findDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounced find on pattern change
  useEffect(() => {
    if (findDebounceRef.current) clearTimeout(findDebounceRef.current);

    if (!findPattern.trim()) {
      setFindHighlights(null);
      return;
    }

    // Validate regex early
    if (isRegex) {
      const err = validatePattern(findPattern);
      if (err) {
        setFindHighlights(null);
        return;
      }
    }

    findDebounceRef.current = setTimeout(async () => {
      try {
        const result = await engine.find(content, findPattern, {
          isRegex,
          caseSensitive,
        });
        setFindHighlights(result.matches, result.count);
      } catch {
        setFindHighlights(null);
      }
    }, 250);

    return () => {
      if (findDebounceRef.current) clearTimeout(findDebounceRef.current);
    };
  }, [findPattern, isRegex, caseSensitive, content, engine, setFindHighlights]);

  // Clear highlights on unmount
  useEffect(() => {
    return () => setFindHighlights(null);
  }, [setFindHighlights]);

  // Reset to config screen when result is cleared (user accepted or cancelled in main view)
  useEffect(() => {
    if (completedResult === null && summary) {
      setSummary(null);
    }
  }, [completedResult, summary]);

  const handleAdHocReplace = useCallback(async () => {
    if (!findPattern.trim()) {
      toast.error("Nhập mẫu tìm kiếm");
      return;
    }
    if (isRegex) {
      const err = validatePattern(findPattern);
      if (err) {
        toast.error(`Regex không hợp lệ: ${err}`);
        return;
      }
    }
    setIsProcessing(true);
    setSummary(null);
    try {
      const rules: ReplaceRule[] = [
        {
          pattern: findPattern,
          replacement: replaceText,
          isRegex,
          caseSensitive,
        },
      ];
      const result = await engine.replace(content, rules);
      if (result.matchCount === 0) {
        toast.info("Không tìm thấy kết quả nào");
        setIsProcessing(false);
        return;
      }
      // Store result in Zustand for main area diff view
      useChapterTools.getState().finishStreaming(result.output);
      useChapterTools.getState().setPendingVersionType("find-replace");
      setSummary({ matchCount: result.matchCount, ruleCount: 1 });
      setFindHighlights(null);
    } catch (err) {
      toast.error("Lỗi khi thay thế");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [
    findPattern,
    replaceText,
    isRegex,
    caseSensitive,
    content,
    engine,
    setFindHighlights,
  ]);

  const handleDictReplace = useCallback(async () => {
    setIsProcessing(true);
    setSummary(null);
    try {
      const rules = await getMergedReplaceRules(novelId);
      if (rules.length === 0) {
        toast.info("Không có rules thay thế nào được bật");
        setIsProcessing(false);
        return;
      }
      const engineRules: ReplaceRule[] = rules.map(toEngineRule);
      const result = await engine.replace(content, engineRules);
      if (result.matchCount === 0) {
        toast.info("Không tìm thấy kết quả nào");
        setIsProcessing(false);
        return;
      }
      // Store result in Zustand for main area diff view
      useChapterTools.getState().finishStreaming(result.output);
      useChapterTools.getState().setPendingVersionType("find-replace");
      setSummary({ matchCount: result.matchCount, ruleCount: rules.length });
      setFindHighlights(null);
    } catch (err) {
      toast.error("Lỗi khi thay thế");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [novelId, content, engine, setFindHighlights]);

  // Footer — only show during processing
  useEffect(() => {
    renderFooter(null);
    return () => renderFooter(null);
  }, [renderFooter]);

  const handleSaveAsRule = useCallback(
    async (scope: "novel" | "global") => {
      if (!findPattern.trim()) return;
      const resolvedScope = scope === "novel" ? novelId : "global";
      const count = await db.replaceRules
        .where("scope")
        .equals(resolvedScope)
        .count();
      await createReplaceRule({
        scope: resolvedScope,
        pattern: findPattern.trim(),
        replacement: replaceText,
        isRegex,
        caseSensitive,
        enabled: true,
        order: count,
      });
      toast.success(
        scope === "novel" ? "Đã lưu rule cho tiểu thuyết" : "Đã lưu rule chung",
      );
    },
    [findPattern, replaceText, isRegex, caseSensitive, novelId],
  );

  const showConfig = !isProcessing && completedResult === null && !summary;
  const enabledRuleCount = enabledRules?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Config */}
      {showConfig && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Tìm</Label>
            <div className="flex gap-2">
              <Input
                value={findPattern}
                onChange={(e) => setFindPattern(e.target.value)}
                placeholder="Nhập mẫu tìm kiếm..."
                className="h-8 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={async () => {
                  if (!findPattern.trim()) return;
                  if (isRegex) {
                    const err = validatePattern(findPattern);
                    if (err) {
                      toast.error(`Regex không hợp lệ: ${err}`);
                      return;
                    }
                  }
                  const result = await engine.find(content, findPattern, {
                    isRegex,
                    caseSensitive,
                  });
                  setFindHighlights(result.matches, result.count);
                }}
              >
                <SearchIcon className="mr-1 size-3" />
                Tìm
              </Button>
            </div>
            {findMatchCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Tìm thấy {findMatchCount} kết quả
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Thay thế bằng</Label>
            <Input
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Nhập nội dung thay thế..."
              className="h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="replace-regex"
                checked={isRegex}
                onCheckedChange={(v) => setIsRegex(v === true)}
              />
              <Label htmlFor="replace-regex" className="cursor-pointer text-xs">
                Regex
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="replace-case"
                checked={caseSensitive}
                onCheckedChange={(v) => setCaseSensitive(v === true)}
              />
              <Label htmlFor="replace-case" className="cursor-pointer text-xs">
                Phân biệt hoa/thường
              </Label>
            </div>
          </div>

          <Button
            size="sm"
            className="w-full"
            onClick={handleAdHocReplace}
            disabled={!findPattern.trim()}
          >
            <ReplaceAllIcon className="mr-1.5 size-3.5" />
            Thay thế
          </Button>

          {findPattern.trim() && (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 flex-1 text-xs"
                onClick={() => handleSaveAsRule("novel")}
              >
                <BookmarkPlusIcon className="mr-1 size-3" />
                Lưu rule riêng
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 flex-1 text-xs"
                onClick={() => handleSaveAsRule("global")}
              >
                <GlobeIcon className="mr-1 size-3" />
                Lưu rule chung
              </Button>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Hoặc dùng từ điển thay thế</p>
              <Button
                variant="ghost"
                size="icon-xs"
                title="Mở từ điển thay thế"
                onClick={() => {
                  const store = useNameDictPanel.getState();
                  store.setActiveTab("replace");
                  if (!store.isOpen) store.toggle(novelId);
                }}
              >
                <SettingsIcon />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {enabledRuleCount} rules đang bật
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleDictReplace}
              disabled={enabledRuleCount === 0}
            >
              <ReplaceAllIcon className="mr-1.5 size-3.5" />
              Chạy tất cả rules
            </Button>
          </div>
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <div className="flex items-center gap-2 py-4">
          <Loader2Icon className="size-4 animate-spin" />
          <span className="text-sm text-muted-foreground">
            Đang thay thế...
          </span>
        </div>
      )}

      {/* Result info (diff shown in main area) */}
      {summary && completedResult !== null && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400">
          <CheckCircle2Icon className="size-4 shrink-0" />
          <span className="text-xs font-medium">
            {summary.matchCount} thay thế từ {summary.ruleCount} rule — xem kết
            quả bên trái
          </span>
        </div>
      )}
    </div>
  );
}

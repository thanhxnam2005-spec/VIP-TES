"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  getMergedNameDict,
} from "@/lib/hooks/use-name-entries";
import { stvTranslate, type STVTranslateProgress } from "@/lib/api/stv-translator";
import {
  createSceneVersion,
  ensureInitialVersion,
} from "@/lib/hooks/use-scene-versions";
import { updateScene, useScenes } from "@/lib/hooks/use-scenes";
import {
  CheckCircle2Icon,
  GitCompareArrowsIcon,
  Loader2Icon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { TranslateResult } from "./translate-mode";

interface ConvertSummary {
  originalLines: number;
  convertedLines: number;
  oldTitle: string | null;
  newTitle: string | null;
}

export function ConvertMode({
  content,
  novelId,
  chapterId,
  chapterTitle,
  onTranslated,
  onRevert,
  renderFooter,
}: {
  content: string;
  novelId: string;
  chapterId: string;
  chapterTitle: string;
  onTranslated: (result: TranslateResult) => void;
  onRevert: () => void;
  renderFooter: (node: React.ReactNode) => void;
}) {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<STVTranslateProgress | null>(null);
  const [summary, setSummary] = useState<ConvertSummary | null>(null);
  const [useNameDict, setUseNameDict] = useState(true);
  const [convertTitle, setConvertTitle] = useState(true);
  const scenes = useScenes(chapterId);

  const handleConvert = useCallback(async () => {
    if (!content.trim()) {
      toast.error("Không có nội dung để convert");
      return;
    }
    setIsConverting(true);
    setSummary(null);
    setProgress(null);
    
    try {
      const nameDict = useNameDict
        ? await getMergedNameDict(novelId)
        : undefined;
      
      const onProgress = (p: STVTranslateProgress) => {
        setProgress(p);
      };

      // Convert content
      const convertedContent = await stvTranslate(content, {
        dictionary: nameDict,
        onProgress
      });

      // Convert chapter title if enabled
      let newTitle: string | undefined;
      if (convertTitle && chapterTitle.trim()) {
        newTitle = await stvTranslate(chapterTitle, {
          dictionary: nameDict
        });
      }

      // Save version before overwriting
      if (scenes?.length) {
        const scene = scenes[0];
        await ensureInitialVersion(scene.id, novelId, content);
        await createSceneVersion(
          scene.id,
          novelId,
          "stv-convert",
          convertedContent,
        );
        await updateScene(scene.id, { content: convertedContent });
      }

      // Apply to textarea
      onTranslated({ content: convertedContent, title: newTitle });

      setSummary({
        originalLines: content.split("\n").length,
        convertedLines: convertedContent.split("\n").length,
        oldTitle: convertTitle ? chapterTitle : null,
        newTitle: newTitle ?? null,
      });

      toast.success("Đã convert STV và áp dụng");
    } catch (err) {
      console.error("STV Convert failed:", err);
      toast.error("Lỗi khi convert STV");
    } finally {
      setIsConverting(false);
      setProgress(null);
    }
  }, [
    content,
    novelId,
    chapterTitle,
    convertTitle,
    useNameDict,
    scenes,
    onTranslated,
  ]);

  const handleReConvert = useCallback(() => {
    onRevert();
    setSummary(null);
  }, [onRevert]);

  // Footer
  useEffect(() => {
    if (isConverting) {
      renderFooter(null);
      return;
    }
    if (summary) {
      renderFooter(
        <Button onClick={handleReConvert} variant="outline" className="w-full">
          <GitCompareArrowsIcon className="mr-1.5 size-3.5" />
          Convert lại
        </Button>,
      );
      return;
    }
    renderFooter(
      <Button
        className="w-full"
        onClick={handleConvert}
        disabled={!content.trim()}
      >
        <GitCompareArrowsIcon className="mr-1.5 size-3.5" />
        Bắt đầu Convert STV
      </Button>,
    );
    return () => renderFooter(null);
  }, [
    isConverting,
    summary,
    handleConvert,
    handleReConvert,
    renderFooter,
    content,
  ]);

  const showConfig = !isConverting && !summary;
  const percent = progress ? Math.round(((progress.currentChunk + 1) / progress.totalChunks) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Config */}
      {showConfig && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Sử dụng server SangTacViet để convert văn bản. Tốc độ khoảng 10.000 ký tự / 2 giây.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="convert-title"
                checked={convertTitle}
                onCheckedChange={(v) => setConvertTitle(v === true)}
              />
              <Label htmlFor="convert-title" className="cursor-pointer text-xs">
                Convert tiêu đề chương
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="convert-use-name-dict"
                checked={useNameDict}
                onCheckedChange={(v) => setUseNameDict(v === true)}
              />
              <Label
                htmlFor="convert-use-name-dict"
                className="cursor-pointer text-xs"
              >
                Sử dụng từ điển tên (ưu tiên nghĩa trong từ điển)
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* Converting indicator */}
      {isConverting && (
        <div className="space-y-3 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
               <Loader2Icon className="size-4 animate-spin text-primary" />
               <span className="text-muted-foreground">Đang xử lý STV...</span>
            </span>
            <span className="font-mono text-xs">{percent}%</span>
          </div>
          <Progress value={percent} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground italic text-center">
             Vui lòng không đóng bảng điều khiển khi đang chạy.
          </p>
        </div>
      )}

      {/* Summary */}
      {summary && !isConverting && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
            <CheckCircle2Icon className="size-4 shrink-0" />
            <span className="text-xs font-medium">
              Đã convert STV và áp dụng thành công
            </span>
          </div>

          <div className="space-y-1.5 rounded-md border bg-muted/30 p-3 text-xs">
            {summary.newTitle && (
              <div>
                <span className="text-muted-foreground">Tiêu đề: </span>
                <span className="text-muted-foreground/60 line-through">
                  {summary.oldTitle}
                </span>
                {" → "}
                <span className="font-medium">{summary.newTitle}</span>
              </div>
            )}
            <div className="text-muted-foreground">
              {summary.originalLines} dòng gốc → {summary.convertedLines} dòng
              convert
              {summary.convertedLines !== summary.originalLines && (
                <span
                  className={
                    summary.convertedLines > summary.originalLines
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }
                >
                  {" "}
                  ({summary.convertedLines > summary.originalLines ? "+" : ""}
                  {summary.convertedLines - summary.originalLines})
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


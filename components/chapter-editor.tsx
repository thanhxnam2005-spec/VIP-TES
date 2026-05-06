"use client";

import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useScenes, updateScene } from "@/lib/hooks";
import { toast } from "sonner";

export function ChapterEditor({ chapterId }: { chapterId: string }) {
  const scenes = useScenes(chapterId);
  const scene = scenes?.[0]; // Each chapter has one scene (from import)
  const [localContent, setLocalContent] = useState<string | null>(null);

  const content = localContent ?? scene?.content ?? "";
  const isDirty = localContent !== null && localContent !== scene?.content;

  const handleSave = useCallback(async () => {
    if (!scene || !isDirty || localContent === null) return;
    try {
      await updateScene(scene.id, { content: localContent });
      setLocalContent(null);
      toast.success("Đã lưu chương");
    } catch {
      toast.error("Lưu thất bại");
    }
  }, [scene, isDirty, localContent]);

  if (!scenes) return <div className="p-3 text-xs text-muted-foreground">Đang tải...</div>;
  if (!scene) return <div className="p-3 text-xs text-muted-foreground">Không có nội dung</div>;

  return (
    <div className="space-y-2 p-3 pt-0">
      <Textarea
        value={content}
        onChange={(e) => setLocalContent(e.target.value)}
        onBlur={handleSave}
        className="min-h-[200px] font-mono text-sm leading-relaxed"
        placeholder="Nội dung chương..."
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {content.split(/\s+/).filter(Boolean).length.toLocaleString()} từ
        </span>
        {isDirty && (
          <span className="text-amber-500">Chưa lưu thay đổi</span>
        )}
      </div>
    </div>
  );
}

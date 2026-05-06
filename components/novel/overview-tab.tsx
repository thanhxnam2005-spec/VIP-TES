"use client";

import { Badge } from "@/components/ui/badge";

export function OverviewTab({
  chapterCount,
  wordCount,
  characterCount,
}: {
  chapterCount: number;
  wordCount: number;
  characterCount: number;
}) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex gap-3">
        <Badge variant="secondary">{chapterCount} chương</Badge>
        <Badge variant="secondary">{wordCount.toLocaleString()} từ</Badge>
        <Badge variant="secondary">{characterCount} nhân vật</Badge>
      </div>
    </div>
  );
}

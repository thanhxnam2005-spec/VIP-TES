"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  ClockIcon,
  CircleDashedIcon,
  GripVerticalIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Chapter } from "@/lib/db";
import {
  updateChapter,
  deleteChapter,
  type ChapterAnalysisStatus,
} from "@/lib/hooks";
import { ChapterEditor } from "@/components/chapter-editor";

const STATUS_CONFIG: Record<
  ChapterAnalysisStatus,
  { icon: React.ElementType; label: string; className: string }
> = {
  analyzed: {
    icon: CheckCircleIcon,
    label: "Đã phân tích",
    className: "text-green-500",
  },
  stale: {
    icon: ClockIcon,
    label: "Đã sửa đổi",
    className: "text-amber-500",
  },
  unanalyzed: {
    icon: CircleDashedIcon,
    label: "Chưa phân tích",
    className: "text-muted-foreground",
  },
};

function ChapterListItem({
  chapter,
  status,
  wordCount,
}: {
  chapter: Chapter;
  status: ChapterAnalysisStatus;
  wordCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(chapter.title);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  const handleSaveTitle = async () => {
    if (titleDraft.trim() && titleDraft.trim() !== chapter.title) {
      await updateChapter(chapter.id, { title: titleDraft.trim() });
      toast.success("Đã cập nhật tiêu đề");
    }
    setEditingTitle(false);
  };

  const handleDelete = async () => {
    try {
      await deleteChapter(chapter.id);
      toast.success("Đã xóa chương");
    } catch {
      toast.error("Xóa chương thất bại");
    }
  };

  return (
    <>
      <div className="rounded-lg border">
        <div className="flex items-center gap-2 p-3">
          <GripVerticalIcon className="size-4 shrink-0 cursor-grab text-muted-foreground/40" />

          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0"
          >
            {expanded ? (
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            )}
          </button>

          <span className="w-6 text-center text-xs font-medium text-muted-foreground">
            {chapter.order + 1}
          </span>

          {editingTitle ? (
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") {
                  setTitleDraft(chapter.title);
                  setEditingTitle(false);
                }
              }}
              className="h-7 flex-1 text-sm"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setExpanded(!expanded)}
              className="min-w-0 flex-1 text-left text-sm font-medium"
            >
              {chapter.title}
            </button>
          )}

          <div className="flex shrink-0 items-center gap-2">
            {wordCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {wordCount.toLocaleString()}w
              </Badge>
            )}

            <StatusIcon
              className={`size-4 ${statusConfig.className}`}
              title={statusConfig.label}
            />

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setTitleDraft(chapter.title);
                setEditingTitle(true);
              }}
            >
              <PencilIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDeleteOpen(true)}
            >
              <TrashIcon className="size-3.5" />
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="border-t">
            <ChapterEditor chapterId={chapter.id} />
          </div>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chương</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa &quot;{chapter.title}&quot; và toàn bộ nội dung? Không thể
              hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ChapterList({
  chapters,
  analysisStatuses,
  wordCounts,
}: {
  chapters: Chapter[];
  analysisStatuses:
    | { chapterId: string; status: ChapterAnalysisStatus }[]
    | undefined;
  wordCounts: Map<string, number>;
}) {
  const getStatus = (chapterId: string): ChapterAnalysisStatus =>
    analysisStatuses?.find((s) => s.chapterId === chapterId)?.status ??
    "unanalyzed";

  if (chapters.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Chưa có chương nào. Thêm mới để bắt đầu.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {chapters.map((ch) => (
        <ChapterListItem
          key={ch.id}
          chapter={ch}
          status={getStatus(ch.id)}
          wordCount={wordCounts.get(ch.id) ?? 0}
        />
      ))}
    </div>
  );
}

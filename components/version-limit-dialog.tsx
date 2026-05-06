"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2Icon } from "lucide-react";
import { useSceneVersions, deleteSceneVersions, MAX_VERSIONS } from "@/lib/hooks";
import { VERSION_TYPE_LABELS, formatRelativeTime } from "@/lib/scene-version-utils";

interface VersionLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sceneId: string;
  /** Called after user deletes versions and space is available. */
  onSpaceFreed: () => void;
}

export function VersionLimitDialog({
  open,
  onOpenChange,
  sceneId,
  onSpaceFreed,
}: VersionLimitDialogProps) {
  const versions = useSceneVersions(sceneId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      await deleteSceneVersions([...selected]);
      setSelected(new Set());
      onSpaceFreed();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Đã đạt giới hạn phiên bản</DialogTitle>
          <DialogDescription>
            Bạn đã có {MAX_VERSIONS} phiên bản. Chọn phiên bản để xóa trước khi lưu.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-72">
          <div className="space-y-1 pr-3">
            {versions?.map((v) => (
              <label
                key={v.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selected.has(v.id)}
                  onCheckedChange={() => toggleSelect(v.id)}
                />
                <span className="font-mono text-xs font-medium">v{v.version}</span>
                <Badge variant="outline" className="text-[10px]">
                  {VERSION_TYPE_LABELS[v.versionType]}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatRelativeTime(v.createdAt)}
                </span>
              </label>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={selected.size === 0 || deleting}
            onClick={handleDelete}
          >
            <Trash2Icon className="mr-1.5 size-3.5" />
            {deleting ? "Đang xóa..." : `Xóa ${selected.size > 0 ? selected.size : ""} đã chọn`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

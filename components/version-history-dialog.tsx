"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VersionDiffView } from "@/components/version-diff-view";
import { VersionLimitDialog } from "@/components/version-limit-dialog";
import type { Scene } from "@/lib/db";
import {
  createSceneVersion,
  deleteSceneVersion,
  useSceneVersions,
  MAX_VERSIONS,
} from "@/lib/hooks";
import {
  VERSION_TYPE_LABELS,
  VERSION_TYPE_VARIANTS,
  formatRelativeTime,
} from "@/lib/scene-version-utils";
import {
  ArrowLeftIcon,
  GitCompareArrowsIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sceneId: string;
  novelId: string;
  currentContent: string;
  onRevert: (content: string) => void;
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
  sceneId,
  novelId,
  currentContent,
  onRevert,
}: VersionHistoryDialogProps) {
  const versions = useSceneVersions(sceneId);
  const [selectedVersion, setSelectedVersion] = useState<Scene | null>(
    null,
  );
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [pendingRevertContent, setPendingRevertContent] = useState<
    string | null
  >(null);

  const handleCompare = (version: Scene) => {
    setSelectedVersion(version);
  };

  const handleBack = () => {
    setSelectedVersion(null);
  };

  const handleRevert = useCallback(
    async (version: Scene) => {
      try {
        // Auto-save current content as new version before reverting
        const versionId = await createSceneVersion(
          sceneId,
          novelId,
          "manual",
          currentContent,
        );
        if (versionId === null) {
          // Limit reached — show limit dialog, save revert target
          setPendingRevertContent(version.content);
          setShowLimitDialog(true);
          return;
        }
        onRevert(version.content);
        toast.success(`Đã khôi phục v${version.version}`);
      } catch {
        toast.error("Khôi phục thất bại");
      }
    },
    [sceneId, novelId, currentContent, onRevert],
  );

  const handleLimitSpaceFreed = useCallback(async () => {
    if (pendingRevertContent === null) return;
    try {
      // Retry: save current content as version, then revert
      await createSceneVersion(sceneId, novelId, "manual", currentContent);
      onRevert(pendingRevertContent);
      setPendingRevertContent(null);
      setShowLimitDialog(false);
      toast.success("Đã khôi phục");
    } catch {
      toast.error("Khôi phục thất bại");
    }
  }, [sceneId, novelId, currentContent, pendingRevertContent, onRevert]);

  const handleDelete = async (id: string) => {
    await deleteSceneVersion(id);
    if (selectedVersion?.id === id) {
      setSelectedVersion(null);
    }
    toast.success("Đã xóa phiên bản");
  };

  const versionCount = versions?.length ?? 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-6xl">
          <DialogHeader>
            {selectedVersion ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-sm" onClick={handleBack}>
                  <ArrowLeftIcon className="size-4" />
                </Button>
                <DialogTitle>
                  So sánh v{selectedVersion.version} với hiện tại
                </DialogTitle>
              </div>
            ) : (
              <>
                <DialogTitle>Lịch sử phiên bản</DialogTitle>
                <DialogDescription>
                  {versionCount} / {MAX_VERSIONS} phiên bản
                </DialogDescription>
              </>
            )}
          </DialogHeader>

          {selectedVersion ? (
            /* Compare view — overflow-hidden creates a BFC so flex-1 constrains height */
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <VersionDiffView
                versionContent={selectedVersion.content}
                currentContent={currentContent}
              />
            </div>
          ) : (
            /* List view */
            <ScrollArea className="flex-1 max-h-[50vh]">
              {versionCount === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Chưa có phiên bản nào.
                </p>
              ) : (
                <div className="space-y-1 pr-3">
                  {versions?.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 rounded-md border px-3 py-2.5"
                    >
                      <span className="font-mono text-sm font-semibold">
                        v{v.version}
                      </span>
                      <Badge
                        variant={VERSION_TYPE_VARIANTS[v.versionType]}
                        className="text-[10px]"
                      >
                        {VERSION_TYPE_LABELS[v.versionType]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(v.createdAt)}
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCompare(v)}
                          title="So sánh"
                        >
                          <GitCompareArrowsIcon className="mr-1 size-3.5" />
                          So sánh
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevert(v)}
                          title="Khôi phục"
                        >
                          <RotateCcwIcon className="mr-1 size-3.5" />
                          Khôi phục
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              title="Xóa"
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Xóa phiên bản v{v.version}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Hành động này không thể hoàn tác. Phiên bản sẽ
                                bị xóa vĩnh viễn.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(v.id)}
                              >
                                Xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showLimitDialog && (
        <VersionLimitDialog
          open={showLimitDialog}
          onOpenChange={setShowLimitDialog}
          sceneId={sceneId}
          onSpaceFreed={handleLimitSpaceFreed}
        />
      )}
    </>
  );
}

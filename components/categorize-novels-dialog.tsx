"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { db, type Novel } from "@/lib/db";
import { useNovelCollections } from "@/lib/hooks/use-novel-collections";
import { FolderSymlinkIcon } from "lucide-react";

interface CategorizeNovelsDialogProps {
  novels: Novel[];
}

export function CategorizeNovelsDialog({ novels }: CategorizeNovelsDialogProps) {
  const collections = useNovelCollections();
  const [open, setOpen] = useState(false);
  const [selectedNovelIds, setSelectedNovelIds] = useState<Set<string>>(new Set());
  const [targetGenre, setTargetGenre] = useState<string>("");

  // Chỉ lấy những truyện chưa có thể loại (nằm ở khu vực gốc)
  const unassignedNovels = useMemo(() => {
    return novels.filter(n => !n.genre);
  }, [novels]);

  const toggleNovel = (id: string) => {
    const next = new Set(selectedNovelIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedNovelIds(next);
  };

  const selectAll = () => {
    if (selectedNovelIds.size === unassignedNovels.length) {
      setSelectedNovelIds(new Set());
    } else {
      setSelectedNovelIds(new Set(unassignedNovels.map(n => n.id)));
    }
  };

  const handleSave = async () => {
    if (!targetGenre) {
      toast.error("Vui lòng chọn một thể loại đích!");
      return;
    }
    if (selectedNovelIds.size === 0) {
      toast.error("Vui lòng chọn ít nhất một truyện!");
      return;
    }

    try {
      for (const id of Array.from(selectedNovelIds)) {
        await db.novels.update(id, { genre: targetGenre });
      }
      toast.success(`Đã chuyển ${selectedNovelIds.size} truyện vào thể loại ${targetGenre}!`);
      setOpen(false);
      setSelectedNovelIds(new Set());
      setTargetGenre("");
    } catch (e: any) {
      toast.error("Lỗi: " + e.message);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="ml-2 hidden sm:flex border-dashed">
        <FolderSymlinkIcon className="size-4 mr-2 text-muted-foreground" />
        Phân loại truyện
      </Button>
      <Button variant="outline" size="icon" onClick={() => setOpen(true)} className="sm:hidden border-dashed">
        <FolderSymlinkIcon className="size-4 text-muted-foreground" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Chuyển truyện vào Thể loại</DialogTitle>
            <DialogDescription>
              Chọn các truyện từ "Khu vực gốc" (chưa có thể loại) để chuyển vào một thể loại cụ thể.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm font-medium whitespace-nowrap">Chuyển vào:</span>
            <Select value={targetGenre} onValueChange={setTargetGenre}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="-- Chọn thể loại --" />
              </SelectTrigger>
              <SelectContent>
                {collections?.map(col => (
                  <SelectItem key={col.id} value={col.name}>{col.name}</SelectItem>
                ))}
                {!collections?.length && (
                  <SelectItem value="none" disabled>Chưa có thể loại nào</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 min-h-[250px] mt-4 border rounded-md p-3 bg-muted/20">
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <span className="text-sm font-medium">Danh sách truyện chưa phân loại ({unassignedNovels.length})</span>
              <Button variant="ghost" size="sm" onClick={selectAll} disabled={unassignedNovels.length === 0}>
                {selectedNovelIds.size === unassignedNovels.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </Button>
            </div>

            {unassignedNovels.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Không có truyện nào ở khu vực gốc (chưa phân loại).
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {unassignedNovels.map(novel => {
                  const isSelected = selectedNovelIds.has(novel.id);
                  return (
                    <label key={novel.id} className={`flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50 bg-background'}`}>
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleNovel(novel.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{novel.title}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={!targetGenre || selectedNovelIds.size === 0}>
              Chuyển {selectedNovelIds.size} truyện
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

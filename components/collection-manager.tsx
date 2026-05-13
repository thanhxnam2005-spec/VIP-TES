"use client";

import { useState } from "react";
import { FolderIcon, PlusIcon, MoreVerticalIcon, Trash2Icon, Edit2Icon, BookPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useNovelCollections, createNovelCollection, updateNovelCollection, deleteNovelCollection } from "@/lib/hooks/use-novel-collections";
import type { Novel, NovelCollection } from "@/lib/db";
import { db } from "@/lib/db";

interface CollectionManagerProps {
  novels: Novel[];
  activeGenre: string;
  onSelectGenre: (genre: string) => void;
}

export function CollectionManager({ novels, activeGenre, onSelectGenre }: CollectionManagerProps) {
  const collections = useNovelCollections();
  const [createOpen, setCreateOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  
  const [editCollection, setEditCollection] = useState<NovelCollection | null>(null);
  const [deleteCollection, setDeleteCollection] = useState<NovelCollection | null>(null);
  
  const [addNovelOpen, setAddNovelOpen] = useState<NovelCollection | null>(null);
  const [selectedNovelIds, setSelectedNovelIds] = useState<Set<string>>(new Set());

  const handleCreate = async () => {
    if (!newCollectionName.trim()) return;
    try {
      await createNovelCollection(newCollectionName.trim());
      setCreateOpen(false);
      setNewCollectionName("");
      toast.success("Tạo thể loại mới thành công!");
    } catch (e: any) {
      toast.error("Lỗi: " + e.message);
    }
  };

  const handleUpdate = async () => {
    if (!editCollection || !newCollectionName.trim()) return;
    try {
      // Cũng phải cập nhật tất cả truyện đang có genre này
      const oldName = editCollection.name;
      const newName = newCollectionName.trim();
      
      await updateNovelCollection(editCollection.id, newName);
      
      // Cập nhật truyện
      const novelsToUpdate = novels.filter(n => n.genre === oldName);
      for (const n of novelsToUpdate) {
        await db.novels.update(n.id, { genre: newName });
      }
      
      setEditCollection(null);
      if (activeGenre === oldName) onSelectGenre(newName);
      toast.success("Đã đổi tên thể loại!");
    } catch (e: any) {
      toast.error("Lỗi: " + e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteCollection) return;
    try {
      await deleteNovelCollection(deleteCollection.id);
      if (activeGenre === deleteCollection.name) onSelectGenre("all");
      setDeleteCollection(null);
      toast.success("Đã xóa thể loại (các truyện bên trong vẫn được giữ lại)!");
    } catch (e: any) {
      toast.error("Lỗi: " + e.message);
    }
  };

  const openAddNovelDialog = (col: NovelCollection) => {
    const currentIds = novels.filter(n => n.genre === col.name).map(n => n.id);
    setSelectedNovelIds(new Set(currentIds));
    setAddNovelOpen(col);
  };

  const toggleNovelSelection = (id: string) => {
    const next = new Set(selectedNovelIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedNovelIds(next);
  };

  const handleSaveNovelsToCollection = async () => {
    if (!addNovelOpen) return;
    try {
      const colName = addNovelOpen.name;
      
      // Cập nhật những truyện được chọn thành genre này
      for (const id of Array.from(selectedNovelIds)) {
        await db.novels.update(id, { genre: colName });
      }
      
      // Xóa genre khỏi những truyện đã bỏ chọn (mà trước đó thuộc genre này)
      const currentNovels = novels.filter(n => n.genre === colName);
      for (const n of currentNovels) {
        if (!selectedNovelIds.has(n.id)) {
          await db.novels.update(n.id, { genre: "" });
        }
      }
      
      setAddNovelOpen(null);
      toast.success(`Đã cập nhật truyện trong thể loại ${colName}!`);
    } catch (e: any) {
      toast.error("Lỗi: " + e.message);
    }
  };

  if (!collections) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Khu vực Thể loại</h2>
        <Button variant="outline" size="sm" onClick={() => { setNewCollectionName(""); setCreateOpen(true); }}>
          <PlusIcon className="size-4 mr-2" />
          Tạo Thể loại
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Card 
          className={`cursor-pointer transition-colors hover:bg-muted/50 border-dashed ${activeGenre === "all" ? "ring-2 ring-primary border-transparent" : ""}`}
          onClick={() => onSelectGenre("all")}
        >
          <CardContent className="p-1.5 pr-3 flex items-center gap-2.5">
            <div className="bg-primary/10 p-1.5 rounded-md">
              <FolderIcon className="size-4 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm leading-none">Tất cả truyện</p>
              <span className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded-md text-muted-foreground leading-none">{novels.length}</span>
            </div>
          </CardContent>
        </Card>

        {collections.map(col => {
          const novelCount = novels.filter(n => n.genre === col.name).length;
          const isActive = activeGenre === col.name;

          return (
            <Card 
              key={col.id} 
              className={`cursor-pointer transition-colors hover:bg-muted/50 group relative ${isActive ? "ring-2 ring-primary border-transparent" : ""}`}
              onClick={() => onSelectGenre(col.name)}
            >
              <CardContent className="p-1.5 pr-8 flex items-center gap-2.5">
                <div className="bg-blue-500/10 p-1.5 rounded-md">
                  <FolderIcon className="size-4 text-blue-500" />
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm leading-none">{col.name}</p>
                  <span className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded-md text-muted-foreground leading-none">{novelCount}</span>
                </div>
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                        <MoreVerticalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openAddNovelDialog(col)}>
                        <BookPlusIcon className="size-4 mr-2" />
                        Thêm/Sửa truyện
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setNewCollectionName(col.name); setEditCollection(col); }}>
                        <Edit2Icon className="size-4 mr-2" />
                        Đổi tên
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteCollection(col)}>
                        <Trash2Icon className="size-4 mr-2" />
                        Xóa thể loại
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo thể loại mới</DialogTitle>
            <DialogDescription>Nhập tên thể loại (VD: Tiên Hiệp, Đô Thị, ...)</DialogDescription>
          </DialogHeader>
          <Input 
            placeholder="Tên thể loại..." 
            value={newCollectionName} 
            onChange={e => setNewCollectionName(e.target.value)} 
            onKeyDown={e => e.key === "Enter" && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate}>Tạo mới</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCollection} onOpenChange={open => !open && setEditCollection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên thể loại</DialogTitle>
          </DialogHeader>
          <Input 
            placeholder="Tên thể loại..." 
            value={newCollectionName} 
            onChange={e => setNewCollectionName(e.target.value)} 
            onKeyDown={e => e.key === "Enter" && handleUpdate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCollection(null)}>Hủy</Button>
            <Button onClick={handleUpdate}>Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteCollection} onOpenChange={open => !open && setDeleteCollection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa thể loại</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa thể loại <strong>{deleteCollection?.name}</strong>? Các truyện bên trong sẽ không bị xóa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCollection(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Novel Dialog */}
      <Dialog open={!!addNovelOpen} onOpenChange={open => !open && setAddNovelOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Thêm truyện vào "{addNovelOpen?.name}"</DialogTitle>
            <DialogDescription>Chọn các truyện bạn muốn đưa vào thể loại này.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 min-h-[300px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {novels.map(novel => {
                const isSelected = selectedNovelIds.has(novel.id);
                // Cảnh báo nếu truyện này đang ở thể loại khác
                const otherGenre = novel.genre && novel.genre !== addNovelOpen?.name ? novel.genre : null;
                
                return (
                  <label key={novel.id} className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'}`}>
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => toggleNovelSelection(novel.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{novel.title}</p>
                      {otherGenre && !isSelected && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">Đang thuộc: {otherGenre}</p>
                      )}
                    </div>
                  </label>
                );
              })}
              {novels.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8">
                  Chưa có truyện nào trong thư viện.
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddNovelOpen(null)}>Hủy</Button>
            <Button onClick={handleSaveNovelsToCollection}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

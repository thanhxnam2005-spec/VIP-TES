"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function FactionEditDialog({
  open,
  onOpenChange,
  type,
  item,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "faction" | "location";
  item?: { name: string; description: string };
  onSave: (item: { name: string; description: string }) => void;
}) {
  const isEditing = !!item;
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");

  // Reset when dialog opens with different item
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(item?.name ?? "");
      setDescription(item?.description ?? "");
    }
  }

  const label = type === "faction" ? "Phe phái" : "Địa điểm";

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Tên là bắt buộc");
      return;
    }
    onSave({ name: name.trim(), description: description.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Sửa ${label}` : `Thêm ${label}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tên</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              placeholder={`Tên ${label.toLowerCase()}`}
            />
          </div>
          <div>
            <Label>Mô tả</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
              placeholder={`Mô tả ${label.toLowerCase()} này...`}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? "Lưu" : `Thêm ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

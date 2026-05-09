"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserProfile } from "@/lib/hooks/use-profile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadIcon } from "lucide-react";

interface UserProfileDialogProps {
  profile: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated: () => void;
}

const PRESET_AVATARS = [
  "TienTon", "MaDe", "YeuNu", "KiemKhach", "DaoTruong", 
  "HaoHan", "NuHiep", "ThieuGia", "BangChu", "ThanThu",
  "HuyenThoai", "PhongTon", "TuyetNu", "LinhTung", "LongDe",
  "AnGia", "SatThu", "MinhChu", "NgocNu", "DocCo"
].map(seed => `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}`);

export function UserProfileDialog({ profile, open, onOpenChange, onProfileUpdated }: UserProfileDialogProps) {
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const MAX_SIZE = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to base64
        const dataUrl = canvas.toDataURL("image/webp", 0.8);
        setAvatarUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", profile.id);

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Cập nhật ảnh đại diện thành công!");
      onProfileUpdated();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Cài đặt ảnh đại diện</DialogTitle>
          <DialogDescription>
            Chọn một ảnh đại diện từ danh sách, dán link ảnh, hoặc tải ảnh lên từ máy của bạn.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label className="font-semibold text-muted-foreground">Chọn ảnh đại diện có sẵn (20 mẫu):</Label>
            <ScrollArea className="h-[220px] w-full rounded-md border p-3 bg-muted/20">
              <div className="grid grid-cols-5 gap-3">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(url)}
                    className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${
                      avatarUrl === url ? "border-primary ring-2 ring-primary ring-offset-1 ring-offset-background scale-105" : "border-transparent"
                    }`}
                  >
                    <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover bg-white/10" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <div className="flex flex-col gap-2 mt-2">
            <Label htmlFor="avatar_url" className="font-semibold text-muted-foreground">Hoặc tải ảnh từ máy / dán Link ảnh:</Label>
            <div className="flex gap-2">
              <Input
                id="avatar_url"
                placeholder="VD: https://i.imgur.com/xxxxx.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="flex-1"
              />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
              />
              <Button 
                variant="secondary" 
                className="shrink-0" 
                onClick={() => fileInputRef.current?.click()}
                title="Tải ảnh lên từ máy tính"
              >
                <UploadIcon className="size-4 mr-2" />
                Tải lên
              </Button>
            </div>
            {avatarUrl && avatarUrl.startsWith("data:image") && (
              <p className="text-[10px] text-emerald-500">Đã tải ảnh lên thành công (sẽ lưu dạng nội bộ).</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

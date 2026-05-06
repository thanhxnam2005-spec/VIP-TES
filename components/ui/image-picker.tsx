"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ImageIcon, LinkIcon, UploadIcon, XIcon } from "lucide-react";

interface ImagePickerProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  /** Aspect ratio class, e.g. "aspect-[2/3]" or "aspect-square". Defaults to "aspect-square" */
  aspectRatio?: string;
  /** Max dimension (px) to resize uploaded images to. Defaults to 512 */
  maxSize?: number;
  className?: string;
  placeholder?: string;
}

/** Resize an image file to a max dimension and return a base64 data URL */
async function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas context unavailable"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/webp", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export function ImagePicker({
  value,
  onChange,
  aspectRatio = "aspect-square",
  maxSize = 512,
  className,
  placeholder = "Ảnh",
}: ImagePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlMode, setUrlMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    try {
      const dataUrl = await resizeImage(file, maxSize);
      onChange(dataUrl);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSetUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    onChange(url);
    setUrlInput("");
    setUrlMode(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setLoading(true);
    try {
      const dataUrl = await resizeImage(file, maxSize);
      onChange(dataUrl);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Preview / upload zone */}
      <div
        className={cn(
          "group relative w-full overflow-hidden rounded-lg border-2 border-dashed bg-muted/30 transition-colors",
          aspectRatio,
          !value && "cursor-pointer hover:border-primary/50 hover:bg-muted/50",
          loading && "opacity-60",
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !value && fileRef.current?.click()}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={placeholder}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
              aria-label="Xóa ảnh"
            >
              <XIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
              className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
            >
              <UploadIcon className="size-3" />
              Thay thế
            </button>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 p-4 text-muted-foreground/60">
            {loading ? (
              <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground/80" />
            ) : (
              <>
                <ImageIcon className="size-6" />
                <span className="text-center text-xs leading-tight">
                  Nhấp để tải lên
                  <br />
                  hoặc kéo thả
                </span>
              </>
            )}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* URL input toggle */}
      {urlMode ? (
        <div className="flex gap-1.5">
          <Input
            autoFocus
            placeholder="https://..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSetUrl();
              }
              if (e.key === "Escape") {
                setUrlMode(false);
                setUrlInput("");
              }
            }}
            className="h-7 text-xs"
          />
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleSetUrl}
            disabled={!urlInput.trim()}
          >
            Đặt
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => {
              setUrlMode(false);
              setUrlInput("");
            }}
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setUrlMode(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <LinkIcon className="size-3" />
          Dùng URL
        </button>
      )}
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createExcludedName } from "@/lib/hooks/use-excluded-names";
import { createNameEntry } from "@/lib/hooks/use-name-entries";
import type { DictPair } from "@/lib/workers/qt-engine.types";
import { BookmarkPlusIcon, SparklesIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ConvertDetectedNamesProps {
  detectedNames: DictPair[];
  /** Novel ID to save names to (if provided, saves as novel-specific) */
  novelId?: string;
  /** Called when a name is dismissed — parent should re-convert */
  onDismiss?: (chinese: string) => void;
}

export function ConvertDetectedNames({
  detectedNames,
  novelId,
  onDismiss,
}: ConvertDetectedNamesProps) {
  const [saved, setSaved] = useState<Set<string>>(new Set());

  if (!detectedNames.length) return null;

  const visible = detectedNames.filter((n) => !saved.has(n.chinese));
  if (!visible.length) return null;

  const handleSave = async (name: DictPair) => {
    try {
      await createNameEntry({
        scope: novelId ?? "global",
        chinese: name.chinese,
        vietnamese: name.vietnamese,
        category: "nhân vật",
      });
      setSaved((prev) => new Set(prev).add(name.chinese));
      toast.success(`Đã thêm "${name.chinese}" vào từ điển`);
    } catch {
      toast.error("Lỗi khi thêm vào từ điển");
    }
  };

  const handleDismiss = async (chinese: string) => {
    try {
      await createExcludedName({
        scope: novelId ?? "global",
        chinese,
      });
      onDismiss?.(chinese);
    } catch {
      toast.error("Lỗi khi loại trừ tên");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <SparklesIcon className="size-3" />
        Tên nhận diện:
      </span>
      {visible.map((name) => (
        <Badge
          key={name.chinese}
          variant="secondary"
          className="gap-1 py-0.5 pr-0.5 text-xs font-normal"
        >
          <span className="font-medium">{name.chinese}</span>
          <span className="text-muted-foreground">{name.vietnamese}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-4 rounded-sm"
                onClick={() => handleSave(name)}
              >
                <BookmarkPlusIcon className="size-2.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Thêm vào từ điển {novelId ? "riêng" : "chung"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-4 rounded-sm"
                onClick={() => handleDismiss(name.chinese)}
              >
                <XIcon className="size-2.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Loại trừ tên này</TooltipContent>
          </Tooltip>
        </Badge>
      ))}
    </div>
  );
}

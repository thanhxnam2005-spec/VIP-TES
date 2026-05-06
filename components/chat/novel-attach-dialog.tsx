"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { updateConversation, useNovels } from "@/lib/hooks";
import { useChatPanel } from "@/lib/stores/chat-panel";
import { BookPlusIcon } from "lucide-react";
import { useState } from "react";

export function NovelAttachButton() {
  const { attachedNovelId, activeConversationId, setAttachedContext } =
    useChatPanel();
  const novels = useNovels();
  const [open, setOpen] = useState(false);

  if (attachedNovelId) return null;

  const handleSelect = async (novelId: string) => {
    setAttachedContext(novelId, null);
    setOpen(false);
    if (activeConversationId) {
      await updateConversation(activeConversationId, {
        novelId,
        chapterId: undefined,
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          title="Đính kèm tiểu thuyết"
        >
          <BookPlusIcon className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-1"
        side="top"
        align="start"
        sideOffset={8}
      >
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Đính kèm tiểu thuyết
        </div>
        <div className="max-h-48 overflow-y-auto">
          {!novels?.length ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              Chưa có tiểu thuyết nào
            </div>
          ) : (
            novels.map((novel) => (
              <button
                key={novel.id}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => handleSelect(novel.id)}
              >
                <span className="truncate">{novel.title}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

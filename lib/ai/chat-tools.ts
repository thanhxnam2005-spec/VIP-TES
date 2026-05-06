import { createNovelReadTools } from "@/lib/ai/novel-read-tools";
import { createNovelWriteTools } from "@/lib/ai/novel-write-tools";

/**
 * Full tool set for autonomous chat workflows: read + write tools scoped to a novel.
 */
export function createChatTools(novelId: string) {
  return {
    ...createNovelWriteTools(novelId),
    ...createNovelReadTools(novelId),
  };
}

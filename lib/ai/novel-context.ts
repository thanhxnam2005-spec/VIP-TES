import { db } from "@/lib/db";

/**
 * Build a minimal context string for system prompt injection
 * when a novel is attached to a conversation.
 */
export async function buildNovelContext(
  novelId: string,
  chapterId?: string | null,
): Promise<string> {
  const [novel, characters] = await Promise.all([
    db.novels.get(novelId),
    db.characters.where("novelId").equals(novelId).toArray(),
  ]);
  if (!novel) return "";

  const lines: string[] = [
    "## Ngữ cảnh tiểu thuyết đính kèm",
    `**Tiểu thuyết:** ${novel.title}`,
  ];

  if (novel.synopsis) {
    lines.push(`**Tóm tắt:** ${novel.synopsis}`);
  }

  if (characters.length > 0) {
    const charList = characters
      .map((c) => `${c.name} (${c.role})`)
      .join(", ");
    lines.push(`**Nhân vật:** ${charList}`);
  }

  if (chapterId) {
    const chapter = await db.chapters.get(chapterId);
    if (chapter) {
      lines.push(`\n**Chương hiện tại:** Chương ${chapter.order} - ${chapter.title}`);
      if (chapter.summary) {
        lines.push(`**Tóm tắt chương:** ${chapter.summary}`);
      }
    }
  }

  lines.push(
    "\nBạn có các công cụ để tra cứu thêm chi tiết về tiểu thuyết này: tổng quan, thế giới quan (phe phái/địa danh/hệ thống sức mạnh), chi tiết chương, nội dung chương, nhân vật, ghi chú, tìm kiếm nội dung (fuzzy). Hãy sử dụng khi cần thông tin cụ thể.",
  );

  return lines.join("\n");
}

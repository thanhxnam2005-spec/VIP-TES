/**
 * Scan first N chapters of a novel to analyze style, genre, and generate
 * a custom translation prompt optimized for that specific novel.
 */
import { generateText } from "ai";
import type { LanguageModel } from "ai";
import { db } from "@/lib/db";
import type { Scene } from "@/lib/db";

const SCAN_CHAPTER_COUNT = 10;
const MAX_CHARS_PER_CHAPTER = 3000; // Take first 3000 chars of each chapter

/**
 * Collect sample text from first N chapters of a novel.
 * Returns concatenated content with chapter markers.
 */
async function collectSampleText(novelId: string): Promise<{
  sampleText: string;
  chapterCount: number;
  chapterTitles: string[];
}> {
  const chapters = await db.chapters
    .where("novelId")
    .equals(novelId)
    .sortBy("order");

  const firstChapters = chapters.slice(0, SCAN_CHAPTER_COUNT);

  if (firstChapters.length === 0) {
    throw new Error("Truyện chưa có chương nào. Hãy import chương trước.");
  }

  // Get active scenes for these chapters
  const chapterIds = new Set(firstChapters.map((c) => c.id));
  const allScenes = await db.scenes
    .where("[novelId+isActive]")
    .equals([novelId, 1])
    .toArray();

  const scenesByChapter = new Map<string, Scene[]>();
  for (const s of allScenes) {
    if (!chapterIds.has(s.chapterId)) continue;
    const arr = scenesByChapter.get(s.chapterId) ?? [];
    arr.push(s);
    scenesByChapter.set(s.chapterId, arr);
  }
  for (const scenes of scenesByChapter.values()) {
    scenes.sort((a, b) => a.order - b.order);
  }

  const parts: string[] = [];
  const chapterTitles: string[] = [];

  for (const chapter of firstChapters) {
    const scenes = scenesByChapter.get(chapter.id) ?? [];
    const content = scenes.map((s) => s.content).join("\n\n");
    if (!content.trim()) continue;

    chapterTitles.push(chapter.title);
    // Take first N chars to keep token usage reasonable
    const sample = content.slice(0, MAX_CHARS_PER_CHAPTER);
    parts.push(`【${chapter.title}】\n${sample}`);
  }

  return {
    sampleText: parts.join("\n\n---\n\n"),
    chapterCount: parts.length,
    chapterTitles,
  };
}

const SCAN_SYSTEM_PROMPT = `Bạn là chuyên gia phân tích văn học và dịch thuật tiểu thuyết Trung Quốc → Tiếng Việt.

Nhiệm vụ: Phân tích đoạn trích từ một tiểu thuyết và tạo ra **prompt dịch thuật tối ưu** riêng cho bộ truyện này.

Bạn cần phân tích:
1. **Thể loại** (tu tiên, đô thị, huyền huyễn, ngôn tình, xuyên không, v.v.)
2. **Phong cách viết** (cổ phong, hiện đại, hài hước, nghiêm túc, lạnh lùng, v.v.)
3. **Nhân vật chính** — tên, tính cách, xưng hô (ta/ngươi, tôi/anh, v.v.)
4. **Cách xưng hô** giữa các nhân vật — mối quan hệ ảnh hưởng đến ngôi xưng
5. **Thuật ngữ đặc trưng** (chiêu thức, cảnh giới, vũ khí, v.v.)
6. **Từ ngữ cần cấm/tránh** trong bản dịch (ví dụ: dùng "huynh" thay "anh" trong truyện cổ)
7. **Tone dịch phù hợp** — trang trọng, thân mật, hay pha trộn

Output: Trả về MỘT prompt dịch thuật hoàn chỉnh theo format sau (CHÍNH XÁC format này, không thêm bớt):

---BEGIN_PROMPT---
# Vai trò
[Mô tả vai trò dịch giả phù hợp với thể loại truyện]

# Thông tin truyện
- Thể loại: [thể loại]
- Phong cách: [phong cách viết]
- Tone: [tone dịch phù hợp]

# Nhân vật & Xưng hô
[Liệt kê nhân vật chính + cách xưng hô]

# Thuật ngữ đặc trưng
[Liệt kê thuật ngữ quan trọng cần dịch nhất quán]

# Quy tắc dịch
1. [Rule 1 cụ thể cho truyện này]
2. [Rule 2...]
...

# Từ ngữ CẤM dùng
[Liệt kê từ/cụm từ không phù hợp với truyện này]

# Output
Chỉ trả về bản dịch hoàn chỉnh. Không giải thích, ghi chú, bình luận.
---END_PROMPT---`;

/**
 * Scan first chapters and generate a custom translation prompt.
 */
export async function scanNovelStyle(
  novelId: string,
  model: LanguageModel,
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<string> {
  onProgress?.("Đang thu thập mẫu văn bản...");

  const { sampleText, chapterCount, chapterTitles } =
    await collectSampleText(novelId);

  // Get novel metadata
  const novel = await db.novels.get(novelId);
  const novelTitle = novel?.title || "Không rõ";

  onProgress?.(`Đang phân tích ${chapterCount} chương đầu...`);

  const userPrompt = `Tiểu thuyết: "${novelTitle}"
Số chương mẫu: ${chapterCount}
Tiêu đề các chương: ${chapterTitles.join(", ")}

Đoạn trích từ ${chapterCount} chương đầu:

${sampleText}

Hãy phân tích phong cách, thể loại, nhân vật, và tạo prompt dịch thuật TỐI ƯU cho bộ truyện này.`;

  const result = await generateText({
    model,
    system: SCAN_SYSTEM_PROMPT,
    prompt: userPrompt,
    abortSignal: signal,
  });

  const text = result.text;

  // Extract the prompt between markers
  const startMarker = "---BEGIN_PROMPT---";
  const endMarker = "---END_PROMPT---";
  const startIdx = text.indexOf(startMarker);
  const endIdx = text.indexOf(endMarker);

  let customPrompt: string;
  if (startIdx !== -1 && endIdx !== -1) {
    customPrompt = text.slice(startIdx + startMarker.length, endIdx).trim();
  } else {
    // Fallback: use the entire response if markers are missing
    customPrompt = text.trim();
  }

  onProgress?.("Đang lưu prompt vào truyện...");

  // Save to novel
  await db.novels.update(novelId, {
    customTranslatePrompt: customPrompt,
    styleScannedAt: new Date(),
    updatedAt: new Date(),
  });

  return customPrompt;
}

import { generateObject } from "ai";
import { z } from "zod";
import type { LanguageModel } from "ai";

export const SplitterResultSchema = z.object({
  results: z.array(z.object({
    chinese: z.string(),
    vietnamese: z.string(),
    category: z.enum([
      "core", 
      "tienhiep", 
      "hiendai", 
      "luatnhan_tienhiep", 
      "luatnhan_hiendai", 
      "khac"
    ]).describe("core: phổ thông, tienhiep: tiên hiệp/huyền huyễn, hiendai: hiện đại/đô thị, luatnhan_*: đại từ nhân xưng, khac: thể loại khác"),
  }))
});

export type SplitterResult = z.infer<typeof SplitterResultSchema>;

const SPLITTER_SYSTEM_PROMPT = `# Vai trò
Bạn là một chuyên gia ngôn ngữ học tiếng Trung - Việt, chuyên biên soạn từ điển cho các thể loại truyện (Tiên Hiệp, Hiện Đại, v.v.).

# Nhiệm vụ
Bạn sẽ nhận được một danh sách các từ vựng (Trung=Việt) đang bị trộn lẫn.
Nhiệm vụ của bạn là phân loại từng từ vào đúng nhóm ngữ cảnh của nó.

# Các nhóm phân loại (category) BẮT BUỘC:
1. "core": Các từ phổ thông, dùng được cho mọi thể loại (ví dụ: cái bàn, đi học, ăn cơm, mỉm cười).
2. "tienhiep": Các từ ĐẶC THÙ của thể loại Tiên Hiệp, Huyền Huyễn, Cổ Đại (ví dụ: tu vi, linh thạch, tông môn, phi kiếm).
3. "hiendai": Các từ ĐẶC THÙ của thể loại Hiện Đại, Đô Thị, Khoa Huyễn (ví dụ: tổng tài, công ty, siêu xe, máy tính).
4. "luatnhan_tienhiep": Các đại từ nhân xưng, cách xưng hô cổ đại (ví dụ: tại hạ, bổn tọa, sư huynh, sư đệ, ta, ngươi).
5. "luatnhan_hiendai": Các đại từ nhân xưng, cách xưng hô hiện đại (ví dụ: tôi, cậu, giám đốc, anh, em).
6. "khac": Các từ thuộc thể loại võng du, nsfw, hoặc từ lạ không rõ ràng.

# Yêu cầu đầu ra:
Bạn phải trả về định dạng JSON chính xác theo cấu trúc yêu cầu, giữ nguyên "chinese" và "vietnamese" của từng từ, chỉ thêm trường "category" cho đúng.
Tuyệt đối KHÔNG thay đổi nghĩa tiếng Việt (vietnamese) hay chữ Hán (chinese).`;

export async function splitDictionaryChunk(
  model: LanguageModel,
  entries: Array<{ chinese: string; vietnamese: string }>,
  signal?: AbortSignal,
): Promise<SplitterResult> {
  const inputText = entries.map(e => `${e.chinese}=${e.vietnamese}`).join("\\n");
  
  const { object } = await generateObject({
    model,
    system: SPLITTER_SYSTEM_PROMPT,
    prompt: `Hãy phân loại danh sách từ vựng sau:\\n\\n${inputText}`,
    schema: SplitterResultSchema,
    abortSignal: signal,
  });

  return object;
}

import { generateStructured } from "@/lib/ai";
import { jsonSchema, generateText } from "ai";
import type { LanguageModel } from "ai";

const nameExtractionSchema = jsonSchema<{ names: Array<{ chinese: string, vietnamese: string }> }>({
  type: "object",
  properties: {
    names: {
      type: "array",
      items: {
        type: "object",
        properties: {
          chinese: { type: "string", description: "Tên gốc tiếng Trung" },
          vietnamese: { type: "string", description: "Tên Hán Việt hoặc dịch nghĩa (tùy phong cách)" },
        },
        required: ["chinese", "vietnamese"],
      },
    },
  },
  required: ["names"],
});

export async function aiExtractNames(opts: {
  model: LanguageModel;
  sourceText: string;
}) {
  const prompt = `
Dưới đây là một đoạn trích từ tiểu thuyết Trung Quốc.
Hãy phân tích và trích xuất TẤT CẢ tên nhân vật, tên địa danh, hoặc môn phái xuất hiện trong đoạn văn này.
Kết quả trả về danh sách các cặp từ: từ tiếng Trung nguyên gốc và tên phiên âm Hán-Việt tương ứng.

<source_text>
${opts.sourceText}
</source_text>
  `;

  const result = await generateStructured({
    model: opts.model,
    schema: nameExtractionSchema,
    system: "Bạn là chuyên gia dịch thuật và trích xuất thực thể từ văn bản.",
    prompt,
  });

  return result.object.names;
}

export async function aiPolishTranslation(opts: {
  model: LanguageModel;
  sourceText: string;
  draftTranslation: string;
}) {
  const prompt = `
Dưới đây là đoạn văn gốc tiếng Trung và bản dịch thô từ điển STV.
Nhiệm vụ của bạn là rà soát và dịch lại đoạn văn bản này. Yêu cầu TUYỆT ĐỐI tuân thủ:
1. Sát truyện gốc 100%, không tự ý sửa đổi, không thêm bớt chi tiết.
2. Dịch đúng theo phong cách của truyện, văn phong trôi chảy, rõ ràng, đúng ngữ pháp tiếng Việt.
3. BẮT BUỘC giữ nguyên các tên riêng, xưng hô, và thuật ngữ từ bản dịch STV.
4. Tự động xóa bỏ nội dung rác (quảng cáo web, tên miền, ký tự lạ, v.v.).
5. KHÔNG giải thích, KHÔNG bình luận, KHÔNG có lời chào hỏi.

<source_text>
${opts.sourceText}
</source_text>

<stv_draft_translation>
${opts.draftTranslation}
</stv_draft_translation>

Hãy trả về DUY NHẤT kết quả văn bản.
  `;

  const result = await generateText({
    model: opts.model,
    system: "Bạn là biên dịch viên chuyên nghiệp, chuyên nhuận sắc tiểu thuyết.",
    prompt,
  });

  return result.text;
}

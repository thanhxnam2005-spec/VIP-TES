const LABELS: Record<string, string> = {
  getNovelOverview: "Đang đọc tổng quan tiểu thuyết…",
  getWorldBuilding: "Đang đọc bối cảnh & thế giới…",
  getChapterDetails: "Đang đọc danh sách / chi tiết chương…",
  getChapterContent: "Đang đọc nội dung chương trước…",
  getCharacters: "Đang tra cứu nhân vật…",
  getNovelNotes: "Đang đọc ghi chú…",
  searchNovelContent: "Đang tìm kiếm trong tiểu thuyết…",
};

export function getSmartWriterToolLabelVi(toolName: string): string {
  return LABELS[toolName] ?? `Đang gọi công cụ: ${toolName}…`;
}

export const SMART_WRITER_WRITING_LABEL_VI = "Đang viết chương…";

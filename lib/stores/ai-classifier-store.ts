import { create } from "zustand";
import { type ReadingRoomMetadata } from "@/lib/google-drive-admin-v2";
import { resolveStep } from "@/lib/ai/resolve-step";
import { toast } from "sonner";

// Replicate categories and prompt constants
const CATEGORY_GROUPS: Record<string, string[]> = {
    "Thể loại": [
        "Tiên Hiệp", "Huyền Huyễn", "Khoa Huyễn", "Võng Du", "Đô Thị", "Đồng Nhân", "Dã Sử", "Kỳ Ảo", "Huyền Nghi", "Võ Hiệp", "Cung Đấu", "Gia Đấu", "Trinh Thám", "Mạt Thế", "Lịch Sử", "Quân Sự"
    ],
    "Tính cách": [
        "Sát Phạt", "Cơ Trí", "Vô Sỉ", "Văn Nhã", "Mãng Phu", "Nhẹ Nhàng", "Hài Hước", "Lạnh Lùng", "Nhiệt Huyết"
    ],
    "Bối cảnh": [
        "Chư Thiên Vạn Giới", "Vô Hạn Lưu", "Đông Phương Huyền Huyễn", "Tây Phương Kỳ Ảo", "Hiện Đại Tu Chân", "Hư Nghĩ Võng Du", "Thời Không Xuyên Toa", "Đô Thị Dị Năng", "Đô Thị Sinh Hoạt", "Học Đường", "Vương Triều Tranh Bá"
    ],
    "Lưu phái": [
        "Hệ Thống", "Xuyên Không", "Trọng Sinh", "Vô Địch", "Đầu Cơ", "Ngu Nhạc Minh Tinh", "Ngự Thú", "Điền Viên", "Bác Sĩ", "Học Hối", "Sau Màn", "Khoái Xuyên", "Nữ Phụ", "Sảng Văn", "Ngôn Tình", "Nữ Cường"
    ]
};

const STANDARD_GENRES = Object.values(CATEGORY_GROUPS).flat();

interface AIClassifierState {
    isProcessingBatch: boolean;
    batchLog: string[];
    onNovelUpdated: ((novelId: string, genres: string[]) => void) | null;
    setOnNovelUpdated: (callback: ((novelId: string, genres: string[]) => void) | null) => void;
    startBatchClassify: (
        novels: ReadingRoomMetadata[],
        selectedProvider: string,
        selectedModel: string,
        useWebSearch: boolean
    ) => Promise<void>;
}

export const useAIClassifierStore = create<AIClassifierState>((set, get) => {
    let activeCancel = false;

    // Helper helper for classify with retry to be run inside stores
    async function classifyWithRetry(
        model: any,
        sysPrompt: string,
        usrPrompt: string,
        fallbackPrompt: string,
        bareFallbackPrompt: string,
        maxRetries = 3
    ): Promise<string> {
        let delay = 3500;
        const { generateText } = await import("ai");
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const activePrompt = attempt === 1 ? usrPrompt : (attempt === 2 ? fallbackPrompt : bareFallbackPrompt);
                const { text } = await generateText({
                    model: model,
                    system: sysPrompt,
                    prompt: activePrompt,
                    temperature: 0.1,
                });
                return text;
            } catch (err: any) {
                console.error(`Attempt ${attempt} failed:`, err);
                if (attempt === maxRetries) {
                    throw err;
                }
                const errorStr = (err?.message || "").toLowerCase();
                // If it is blocked by safety filter or proxy blocks, retry immediately with fallback
                if (errorStr.includes("safety") || errorStr.includes("block") || errorStr.includes("forbidden") || errorStr.includes("403")) {
                    continue;
                }
                await new Promise((res) => setTimeout(res, delay));
                delay *= 2;
            }
        }
        throw new Error("Tất cả số lần thử đều thất bại.");
    }

    function extractJsonArray(text: string): string[] {
        try {
            // Remove markdown code fences if present
            let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
            // Find [ and ] if wrapped in other text
            const startIdx = cleaned.indexOf("[");
            const endIdx = cleaned.lastIndexOf("]");
            if (startIdx !== -1 && endIdx !== -1) {
                cleaned = cleaned.substring(startIdx, endIdx + 1);
            }
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) {
                return parsed.map((s: any) => String(s).trim()).filter(Boolean);
            }
        } catch (e) {
            console.warn("Failed to parse JSON response:", text);
        }
        return [];
    }

    return {
        isProcessingBatch: false,
        batchLog: [],
        onNovelUpdated: null,
        setOnNovelUpdated: (callback) => set({ onNovelUpdated: callback }),
        startBatchClassify: async (novels, selectedProvider, selectedModel, useWebSearch) => {
            const state = get();
            if (state.isProcessingBatch) return;

            set({ isProcessingBatch: true, batchLog: ["Bắt đầu chạy tiến trình phân loại ngầm..."] });

            try {
                const model = await resolveStep({ providerId: selectedProvider, modelId: selectedModel });
                if (!model) throw new Error("Không thể khởi tạo AI model.");

                const genreListStr = STANDARD_GENRES.join(", ");
                const unclassified = novels.filter(n => !n.genres || n.genres.length === 0);

                if (unclassified.length === 0) {
                    set(prev => ({
                        isProcessingBatch: false,
                        batchLog: [...prev.batchLog, "Tất cả các bộ truyện đều đã được gán thể loại."]
                    }));
                    return;
                }

                set(prev => ({
                    batchLog: [...prev.batchLog, `Cần xử lý: ${unclassified.length} bộ truyện.`]
                }));

                for (const novel of unclassified) {
                    set(prev => ({
                        batchLog: [...prev.batchLog, `Đang xử lý truyện: "${novel.title}"...`]
                    }));

                    try {
                        const detailRes = await fetch(`/api/reading-room?action=novel_data&id=${novel.id}`);
                        let description = novel.description || "";
                        let mottruyenContext = "";
                        if (detailRes.ok) {
                            const detailData = await detailRes.json();
                            if (detailData.success && detailData.novel) {
                                description = detailData.novel.description || description;
                                if (detailData.novel.mottruyenGenre) {
                                    mottruyenContext = `\n\nTHỂ LOẠI GỐC (từ nguồn Mottruyen): ${detailData.novel.mottruyenGenre}`;
                                }
                                if (detailData.novel.mottruyenIntro && !description) {
                                    description = detailData.novel.mottruyenIntro;
                                }
                            }
                        }

                        let webSearchContext = "";
                        if (useWebSearch) {
                            try {
                                const query = `${novel.title} ${novel.author || ""} truyện chữ thể loại gì`;
                                const searchRes = await fetch(`/api/reading-room?action=search_web&q=${encodeURIComponent(query)}`);
                                if (searchRes.ok) {
                                    const searchData = await searchRes.json();
                                    if (searchData.success && searchData.results) {
                                        webSearchContext = `\n\nKẾT QUẢ TÌM KIẾM TRÊN WEB về truyện này (hãy tham khảo để chọn thể loại chính xác):\n${searchData.results}`;
                                    }
                                }
                            } catch (e) {
                                console.error("Web search failed for", novel.title, e);
                            }
                        }

                        const sysPrompt = `Bạn là một chuyên gia phân loại thể loại tiểu thuyết mạng. Hãy phân loại thể loại cho bộ truyện dựa vào tên và mô tả. Chọn tối đa 1 đến 4 thể loại KHỚP NHẤT từ danh sách sau: ${genreListStr}.`;
                        const usrPrompt = `Tên truyện: ${novel.title}\nMô tả:\n${description}${mottruyenContext}${webSearchContext}\n\nTrả về DUY NHẤT một mảng JSON các chuỗi tương ứng với các thể loại được chọn, không giải thích gì thêm, ví dụ: ["Huyền huyễn", "Hệ thống"].`;

                        const fallbackPrompt = `Tên truyện: ${novel.title}\nTác giả: ${novel.author || ""}${mottruyenContext}${webSearchContext}\n\nTrả về DUY NHẤT một mảng JSON các chuỗi tương ứng với các thể loại được chọn, không giải thích gì thêm, ví dụ: ["Huyền huyễn", "Hệ thống"].`;
                        const bareFallbackPrompt = `Tên truyện: ${novel.title}\nTác giả: ${novel.author || ""}\n\nTrả về DUY NHẤT một mảng JSON các chuỗi tương ứng với các thể loại được chọn, không giải thích gì thêm, ví dụ: ["Huyền huyễn", "Hệ thống"].`;

                        const text = await classifyWithRetry(model, sysPrompt, usrPrompt, fallbackPrompt, bareFallbackPrompt);
                        const classifiedGenres = extractJsonArray(text);

                        if (classifiedGenres.length === 0) {
                            throw new Error("AI trả về kết quả trống.");
                        }

                        const updateRes = await fetch(`/api/reading-room?action=edit_metadata&novelId=${novel.id}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                newTitle: novel.title,
                                newDescription: description,
                                newGenres: classifiedGenres
                            })
                        });

                        if (!updateRes.ok) throw new Error(`HTTP ${updateRes.status}`);

                        // Trigger UI updates
                        const callback = get().onNovelUpdated;
                        if (callback) {
                            callback(novel.id, classifiedGenres);
                        }

                        set(prev => ({
                            batchLog: [...prev.batchLog, `✅ "${novel.title}" -> ${classifiedGenres.join(", ")}`]
                        }));
                    } catch (err: any) {
                        set(prev => ({
                            batchLog: [...prev.batchLog, `❌ Lỗi với "${novel.title}": ${err.message}`]
                        }));
                    }

                    // Throttle delay between calls
                    await new Promise(r => setTimeout(r, 1200));
                }

                set(prev => ({
                    isProcessingBatch: false,
                    batchLog: [...prev.batchLog, "🎉 Đã hoàn thành phân loại toàn bộ hàng loạt!"]
                }));
            } catch (err: any) {
                set(prev => ({
                    isProcessingBatch: false,
                    batchLog: [...prev.batchLog, `🚨 Lỗi nghiêm trọng: ${err.message}`]
                }));
            }
        }
    };
});

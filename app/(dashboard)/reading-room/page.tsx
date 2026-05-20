"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookOpenIcon, SearchIcon, XIcon, Loader2Icon, SparklesIcon, FilterIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type ReadingRoomMetadata } from "@/lib/google-drive-admin-v2";
import { useProfile } from "@/lib/hooks/use-profile";
import { useAIProviders, useAIModels } from "@/lib/hooks/use-ai-providers";
import { resolveStep } from "@/lib/ai/resolve-step";
import { generateText } from "ai";
import { toast } from "sonner";
import { useAIClassifierStore } from "@/lib/stores/ai-classifier-store";
import { getAutoClassifySettingAction, saveAutoClassifySettingAction } from "@/app/actions/admin-settings";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

const PAGE_SIZE = 9;

const CATEGORY_GROUPS: Record<string, string[]> = {
    "Thể loại": [
        "Tiên Hiệp", "Huyền Huyễn", "Khoa Huyễn", "Võng Du", "Đô Thị", "Đồng Nhân", "Dã Sử",
        "Cạnh Kỹ", "Huyền Nghi", "Kiếm Hiệp", "Kỳ Ảo", "Light Novel", "Hiện Đại Ngôn Tình",
        "Huyền Huyễn Ngôn Tình", "Tiên Hiệp Kỳ Duyên", "Cổ Đại Ngôn Tình", "Huyền Nghi Thần Quái",
        "Khoa Huyễn Không Gian", "Lãng Mạn Thanh Xuân"
    ],
    "Tính cách": [
        "Điềm Đạm", "Nhiệt Huyết", "Vô Sỉ", "Thiết Huyết", "Nhẹ Nhàng", "Cơ Trí",
        "Lãnh Khốc", "Kiêu Ngạo", "Ngu Ngốc", "Giảo Hoạt"
    ],
    "Bối cảnh": [
        "Đông Phương Huyền Huyễn", "Dị Thế Đại Lục", "Vương Triều Tranh Bá", "Cao Võ Thế Giới",
        "Tây Phương Kỳ Huyễn", "Hiện Đại Ma Pháp", "Hắc Ám Huyền Tưởng", "Lịch Sử Thần Thoại",
        "Võ Hiệp Huyền Tưởng", "Cổ Võ Tương Lai", "Tu Chân Văn Minh", "Huyền Tưởng Tu Tiên",
        "Hiện Đại Tu Chân", "Thần Thoại Tu Chân", "Cổ Điển Tiên Hiệp", "Viễn Cổ Hồng Hoang",
        "Đô Thị Sinh Hoạt", "Đô Thị Dị Năng", "Thanh Xuân Vườn Trường", "Ngu Nhạc Minh Tinh",
        "Thương Chiến Chức Tràng", "Giả Không Lịch Sử", "Lịch Sử Quân Sự", "Dân Gian Truyền Thuyết",
        "Lịch Sử Quan Trường", "Hư Nghĩ Võng Du", "Du Hí Dị Giới", "Điện Tử Cạnh Kỹ",
        "Thể Dục Cạnh Kỹ", "Cổ Võ Cơ Giáp", "Thế Giới Tương Lai", "Tinh Tế Văn Minh",
        "Tiến Hóa Biến Dị", "Mạt Thế Nguy Cơ", "Thời Không Xuyên Toa", "Quỷ Bí Huyền Nghi",
        "Kỳ Diệu Thế Giới", "Trinh Thám Thôi Lý", "Thám Hiểm Sinh Tồn", "Cung Vi Trạch Đấu",
        "Kinh Thương Chủng Điền", "Tiên Lữ Kỳ Duyên", "Hào Môn Thế Gia", "Dị Tộc Luyến Tình",
        "Ma Pháp Huyền Tình", "Tinh Tế Luyến Ca", "Linh Khí Khôi Phục", "Chư Thiên Vạn Giới",
        "Nguyên Sinh Huyền Tưởng", "Yêu Đương Thường Ngày", "Diễn Sinh Đồng Nhân", "Cáo Tiểu Thổ Tào"
    ],
    "Lưu phái": [
        "Hệ Thống", "Lão Gia", "Bàn Thờ", "Tùy Thân", "Phàm Nhân", "Vô Địch",
        "Xuyên Qua", "Nữ Cường", "Khế Ước", "Trọng Sinh", "Hồng Lâu", "Học Viện",
        "Biến Thân", "Cổ Ngu", "Chuyển Thế", "Xuyên Sách", "Đàn Xuyên", "Phế Tài",
        "Dưỡng Thành", "Cơm Mềm", "Vô Hạn", "Mary Sue", "Cá Mặn", "Xây Dựng Thế Lực",
        "Xuyên Nhanh", "Nữ Phụ", "Vả Mặt", "Sảng Văn", "Xuyên Không", "Ngọt Sủng",
        "Ngự Thú", "Điền Viên", "Toàn Dân", "Mỹ Thực", "Phản Phái", "Sau Màn", "Thiên Tài"
    ]
};

const STANDARD_GENRES = Object.values(CATEGORY_GROUPS).flat();

function extractJsonArray(text: string): string[] {
    try {
        const start = text.indexOf("[");
        const end = text.lastIndexOf("]");
        if (start !== -1 && end !== -1 && end > start) {
            const jsonText = text.substring(start, end + 1);
            const parsed = JSON.parse(jsonText);
            if (Array.isArray(parsed)) {
                return parsed.map(String);
            }
        }
    } catch (e) {
        console.error("Failed to parse JSON array from AI response:", text, e);
    }

    return text
        .split(/[,\n]/)
        .map(s => s.trim().replace(/^[-*•]\s*/, "").replace(/^["']|["']$/g, ""))
        .filter(s => s.length > 0);
}

async function classifyWithRetry(
    model: any,
    sysPrompt: string,
    usrPrompt: string,
    fallbackPrompt: string,
    bareFallbackPrompt: string,
    maxRetries = 3
): Promise<string> {
    let delay = 3500;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            let promptToUse = usrPrompt;
            if (attempt === 2) {
                promptToUse = fallbackPrompt;
            } else if (attempt >= 3) {
                promptToUse = bareFallbackPrompt;
            }

            const { text } = await generateText({
                model,
                system: sysPrompt,
                prompt: promptToUse,
            });
            return text;
        } catch (err: any) {
            const isLast = attempt === maxRetries;
            const isSafetyOrProxyError = err.message?.includes("successful response") ||
                err.message?.includes("safety") ||
                err.message?.includes("block") ||
                err.message?.includes("filter");

            if (isSafetyOrProxyError && attempt < 3) {
                // Return immediate retry with simple or bare prompt
                continue;
            }

            if (isLast) {
                throw err;
            }

            // Rate-limiting backoff delay
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
        }
    }
    throw new Error("Không thể phân loại sau nhiều lần thử.");
}

export default function ReadingRoomPage() {
    const [novels, setNovels] = useState<ReadingRoomMetadata[] | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeGenres, setActiveGenres] = useState<string[]>([]);
    const [tempGenres, setTempGenres] = useState<string[]>([]);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [autoClassifyEnabled, setAutoClassifyEnabled] = useState(false);
    const [isSavingAutoClassify, setIsSavingAutoClassify] = useState(false);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const router = useRouter();

    const { isAdmin } = useProfile();
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>("");
    const providers = useAIProviders();
    const models = useAIModels(selectedProvider);

    const { isProcessingBatch, batchLog, setOnNovelUpdated, startBatchClassify } = useAIClassifierStore();

    // Load persisted settings from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedShowAdmin = localStorage.getItem("rr_show_admin_panel");
            if (savedShowAdmin) setShowAdminPanel(savedShowAdmin === "true");

            const savedProvider = localStorage.getItem("rr_selected_provider");
            if (savedProvider) setSelectedProvider(savedProvider);

            const savedModel = localStorage.getItem("rr_selected_model");
            if (savedModel) setSelectedModel(savedModel);

            const savedWebSearch = localStorage.getItem("rr_use_web_search");
            if (savedWebSearch) setUseWebSearch(savedWebSearch === "true");
        }
    }, []);

    const toggleAdminPanel = () => {
        const nextVal = !showAdminPanel;
        setShowAdminPanel(nextVal);
        localStorage.setItem("rr_show_admin_panel", nextVal ? "true" : "false");
    };

    const handleProviderChange = (value: string) => {
        setSelectedProvider(value);
        localStorage.setItem("rr_selected_provider", value);
        setSelectedModel("");
        localStorage.removeItem("rr_selected_model");
    };

    const handleModelChange = (value: string) => {
        setSelectedModel(value);
        localStorage.setItem("rr_selected_model", value);
    };

    const handleWebSearchChange = (checked: boolean) => {
        setUseWebSearch(checked);
        localStorage.setItem("rr_use_web_search", checked ? "true" : "false");
    };

    useEffect(() => {
        // Only auto-select if there is no provider set AND no provider in localStorage
        const savedProvider = typeof window !== "undefined" ? localStorage.getItem("rr_selected_provider") : null;
        if (providers && providers.length > 0 && !selectedProvider && !savedProvider) {
            setSelectedProvider(providers[0].id);
        }
    }, [providers, selectedProvider]);

    useEffect(() => {
        // Only auto-select if there is no model set AND no model in localStorage
        const savedModel = typeof window !== "undefined" ? localStorage.getItem("rr_selected_model") : null;
        if (models && models.length > 0 && !selectedModel && !savedModel) {
            setSelectedModel(models[0].id);
        }
    }, [models, selectedModel]);

    useEffect(() => {
        getAutoClassifySettingAction().then((res) => {
            if (res.success) {
                setAutoClassifyEnabled(res.value);
            }
        });
    }, []);

    useEffect(() => {
        setOnNovelUpdated((novelId, newGenres) => {
            setNovels((prev) => {
                if (!prev) return null;
                return prev.map((n) =>
                    n.id === novelId ? { ...n, genres: newGenres } : n
                );
            });
        });
        return () => {
            setOnNovelUpdated(null);
        };
    }, [setOnNovelUpdated]);

    const [useWebSearch, setUseWebSearch] = useState(false);

    // Observer for infinite scroll
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement | null) => {
        if (novels === null) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prev => prev + PAGE_SIZE);
            }
        });

        if (node) observer.current.observe(node);
    }, [novels]);

    useEffect(() => {
        fetch('/api/reading-room?action=list')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setNovels(data.novels);
                } else {
                    setNovels([]);
                }
            })
            .catch(() => setNovels([]));
    }, []);

    const handleAutoClassify = async (novel: ReadingRoomMetadata) => {
        if (!selectedProvider || !selectedModel) {
            toast.error("Vui lòng cấu hình Provider và Model AI trước.");
            return;
        }

        const toastId = toast.loading(`Đang phân tích và gán thể loại cho "${novel.title}"...`);
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

            const model = await resolveStep({ providerId: selectedProvider, modelId: selectedModel });
            if (!model) throw new Error("Không thể tải model AI. Hãy kiểm tra API key.");

            // Web search context
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
                    console.error("Web search query failed, proceeding normally", e);
                }
            }

            const genreListStr = STANDARD_GENRES.join(", ");
            const sysPrompt = `Bạn là một chuyên gia phân loại thể loại tiểu thuyết mạng. Hãy phân loại thể loại cho bộ truyện dựa vào tên và mô tả. Chọn tối đa 1 đến 4 thể loại KHỚP NHẤT từ danh sách sau: ${genreListStr}.`;
            const usrPrompt = `Tên truyện: ${novel.title}\nMô tả:\n${description}${mottruyenContext}${webSearchContext}\n\nTrả về DUY NHẤT một mảng JSON các chuỗi tương ứng với các thể loại được chọn, không giải thích gì thêm, ví dụ: ["Huyền huyễn", "Hệ thống"].`;

            const fallbackPrompt = `Tên truyện: ${novel.title}\nTác giả: ${novel.author || ""}${mottruyenContext}${webSearchContext}\n\nTrả về DUY NHẤT một mảng JSON các chuỗi tương ứng với các thể loại được chọn, không giải thích gì thêm, ví dụ: ["Huyền huyễn", "Hệ thống"].`;
            const bareFallbackPrompt = `Tên truyện: ${novel.title}\nTác giả: ${novel.author || ""}\n\nTrả về DUY NHẤT một mảng JSON các chuỗi tương ứng với các thể loại được chọn, không giải thích gì thêm, ví dụ: ["Huyền huyễn", "Hệ thống"].`;
            const text = await classifyWithRetry(model, sysPrompt, usrPrompt, fallbackPrompt, bareFallbackPrompt);

            const classifiedGenres = extractJsonArray(text);
            if (classifiedGenres.length === 0) {
                throw new Error("AI không trả về kết quả hợp lệ.");
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

            if (!updateRes.ok) {
                const errJson = await updateRes.json().catch(() => ({}));
                throw new Error(errJson.error || `HTTP ${updateRes.status}`);
            }

            toast.success(`Đã tự động gán thể loại: ${classifiedGenres.join(", ")}`, { id: toastId });

            setNovels(prev => {
                if (!prev) return null;
                return prev.map(n => n.id === novel.id ? { ...n, genres: classifiedGenres } : n);
            });
        } catch (e: any) {
            toast.error(`Lỗi phân loại AI: ${e.message}`, { id: toastId });
        }
    };

    const handleBatchClassify = async () => {
        if (!novels || novels.length === 0) {
            toast.error("Không có bộ truyện nào trong danh sách.");
            return;
        }
        if (!selectedProvider || !selectedModel) {
            toast.error("Vui lòng chọn AI Provider và Model trước.");
            return;
        }

        const confirm = window.confirm("Bạn có chắc chắn muốn phân danh mục tự động bằng AI cho TẤT CẢ các bộ truyện chưa có thể loại?");
        if (!confirm) return;

        startBatchClassify(novels, selectedProvider, selectedModel, useWebSearch);
    };

    function formatDate(ts: number) {
        return new Date(ts).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    const filteredNovels = useMemo(() => {
        if (!novels) return null;
        let res = novels;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            res = res.filter(n => n.title.toLowerCase().includes(q));
        }

        if (activeGenres.length > 0) {
            res = res.filter(n => n.genres && activeGenres.every(g => n.genres?.includes(g)));
        }

        return res;
    }, [novels, searchQuery, activeGenres]);

    const displayedNovels = useMemo(() => {
        if (!filteredNovels) return [];
        return filteredNovels.slice(0, visibleCount);
    }, [filteredNovels, visibleCount]);

    const hasMore = filteredNovels ? visibleCount < filteredNovels.length : false;

    // Reset visible count when search or genre changes
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [searchQuery, activeGenres]);

    if (novels === null || filteredNovels === null) {
        return (
            <main className="mx-auto w-full max-w-6xl px-6 py-8">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="mt-2 h-4 w-72" />
                </div>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="aspect-3/4 w-full rounded-lg bg-muted" />
                            <div className="mt-2 space-y-1.5 px-0.5">
                                <div className="h-3 w-4/5 rounded bg-muted" />
                                <div className="h-2.5 w-3/5 rounded bg-muted" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-8">
            <div className="mb-8 border-b pb-6">
                <h1 className="font-heading text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <BookOpenIcon className="w-8 h-8" />
                    </div>
                    Phòng Đọc Cộng Đồng
                    {novels !== null && novels.length > 0 && (
                        <span className="text-lg font-normal text-muted-foreground self-end mb-1">
                            ({novels.length} bộ truyện)
                        </span>
                    )}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                    Nơi chia sẻ và đọc truyện được tải lên bởi các thành viên. Khám phá kho truyện phong phú, đa dạng thể loại.
                </p>
            </div>

            {novels.length > 0 && (
                <>
                    <div className="mb-6 flex flex-wrap gap-3 items-center">
                        <div className="relative w-full sm:w-72">
                            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm truyện trong Phòng Đọc..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-8"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                                >
                                    <XIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Popover Filter Selector */}
                        <Popover open={popoverOpen} onOpenChange={(open) => { setPopoverOpen(open); if (open) { setTempGenres(activeGenres); } }}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <FilterIcon className="w-4 h-4 text-muted-foreground" />
                                    <span>Thể Loại: {activeGenres.length === 0 ? "Tất Cả" : (activeGenres.length > 2 ? `${activeGenres.slice(0, 2).join(", ")}...` : activeGenres.join(", "))}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[520px] p-4 bg-popover border shadow-lg rounded-xl" align="start">
                                <div className="text-xs font-bold text-foreground mb-3 border-b pb-2 flex items-center justify-between">
                                    <span className="uppercase tracking-wider">Bộ Lọc Chi Tiết & Phong Cách ({tempGenres.length} đã chọn)</span>
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        onClick={() => setTempGenres([])}
                                        className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                                    >
                                        Xóa nháp
                                    </Button>
                                </div>
                                <div className="max-h-[380px] overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                                    {Object.entries(CATEGORY_GROUPS).map(([groupName, items]) => (
                                        <div key={groupName} className="space-y-1.5">
                                            <h4 className="text-[11px] font-bold text-primary tracking-wide uppercase border-l-2 border-primary pl-1.5">{groupName}</h4>
                                            <div className="grid grid-cols-3 gap-1">
                                                {items.map((g) => {
                                                    const isChecked = tempGenres.includes(g);
                                                    return (
                                                        <Button
                                                            key={g}
                                                            variant={isChecked ? "default" : "ghost"}
                                                            size="xs"
                                                            className="justify-start text-[11px] font-normal truncate h-7 px-2"
                                                            title={g}
                                                            onClick={() => setTempGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g])}
                                                        >
                                                            {g}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-3 border-t flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="xs"
                                        onClick={() => {
                                            setTempGenres([]);
                                            setActiveGenres([]);
                                            setPopoverOpen(false);
                                        }}
                                        className="h-8 text-xs font-semibold px-3"
                                    >
                                        Đặt lại (Tất cả)
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="xs"
                                        onClick={() => {
                                            setActiveGenres(tempGenres);
                                            setPopoverOpen(false);
                                        }}
                                        className="h-8 text-xs font-semibold px-4"
                                    >
                                        Lọc ({tempGenres.length})
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Admin Tools Trigger */}
                        {isAdmin && (
                            <Button
                                variant={showAdminPanel ? "default" : "outline"}
                                size="sm"
                                className="flex items-center gap-2 border-primary/20 hover:border-primary/50"
                                onClick={toggleAdminPanel}
                            >
                                <SparklesIcon className="w-4 h-4 text-amber-500 animate-pulse" />
                                <span>Phân Loại Thể Loại AI (Admin)</span>
                            </Button>
                        )}
                    </div>

                    {/* Admin Panel Details */}
                    {isAdmin && showAdminPanel && (
                        <div className="mb-8 p-6 rounded-2xl border bg-card/60 backdrop-blur-md shadow-sm relative overflow-hidden transition-all duration-300">
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 mb-4">
                                <div>
                                    <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                                        <SparklesIcon className="w-5 h-5 text-amber-500" />
                                        Phân Loại Thể Loại AI
                                    </h2>
                                    <p className="text-muted-foreground text-xs mt-0.5">
                                        Quét nội dung và tự động gán nhãn thể loại cho truyện dựa trên Tên và Mô tả.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Provider Select */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-medium text-muted-foreground">AI:</span>
                                        <Select value={selectedProvider} onValueChange={handleProviderChange}>
                                            <SelectTrigger className="w-[150px] h-8 text-xs">
                                                <SelectValue placeholder="Chọn Provider..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {providers?.map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="text-xs">
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Model Select */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-medium text-muted-foreground">Model:</span>
                                        <Select value={selectedModel} onValueChange={handleModelChange}>
                                            <SelectTrigger className="w-[160px] h-8 text-xs" disabled={!selectedProvider}>
                                                <SelectValue placeholder="Chọn Model..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {models?.map(m => (
                                                    <SelectItem key={m.id} value={m.id} className="text-xs">
                                                        {m.name || m.modelId}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Web search toggle option */}
                                    <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none bg-background/50 border px-2.5 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={useWebSearch}
                                            onChange={(e) => handleWebSearchChange(e.target.checked)}
                                            className="rounded border-input text-amber-500 focus:ring-amber-500 size-3.5"
                                        />
                                        <span className="text-muted-foreground font-medium">Tìm kết quả Web hỗ trợ AI</span>
                                    </label>

                                    {/* Auto Classify Toggle */}
                                    <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none bg-background/50 border px-2.5 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={autoClassifyEnabled}
                                            disabled={isSavingAutoClassify}
                                            onChange={async (e) => {
                                                const checked = e.target.checked;
                                                setAutoClassifyEnabled(checked);
                                                setIsSavingAutoClassify(true);
                                                try {
                                                    const res = await saveAutoClassifySettingAction(checked);
                                                    if (res.success) {
                                                        toast.success(checked ? "Đã bật tự động phân loại khi thêm truyện mới!" : "Đã tắt tự động phân loại!");
                                                    } else {
                                                        toast.error("Không thể lưu cấu hình: " + res.error);
                                                    }
                                                } catch (err: any) {
                                                    toast.error("Lỗi: " + err.message);
                                                } finally {
                                                    setIsSavingAutoClassify(false);
                                                }
                                            }}
                                            className="rounded border-input text-amber-500 focus:ring-amber-500 size-3.5"
                                        />
                                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                                            <span>Tự động quét khi có bộ mới</span>
                                            {isSavingAutoClassify && <Loader2Icon className="w-3 h-3 animate-spin text-muted-foreground/60" />}
                                        </span>
                                    </label>

                                    {/* Batch Action */}
                                    <Button
                                        size="sm"
                                        className="h-8 text-xs font-semibold flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                                        disabled={isProcessingBatch}
                                        onClick={handleBatchClassify}
                                    >
                                        {isProcessingBatch ? (
                                            <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <SparklesIcon className="w-3.5 h-3.5" />
                                        )}
                                        Phân loại hàng loạt (Truyện chưa có thể loại)
                                    </Button>
                                </div>
                            </div>

                            {/* Batch Log if running */}
                            {batchLog.length > 0 && (
                                <div className="mb-4 p-3 rounded-lg bg-black/10 dark:bg-black/40 border text-xs font-mono max-h-32 overflow-y-auto space-y-1">
                                    {batchLog.map((log, idx) => (
                                        <div key={idx} className="text-muted-foreground">{log}</div>
                                    ))}
                                </div>
                            )}

                            {/* Novels Admin Table */}
                            <div className="overflow-x-auto border rounded-xl bg-background/50">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/80 text-muted-foreground text-xs uppercase font-semibold border-b">
                                        <tr>
                                            <th className="py-2.5 px-4">Tên truyện</th>
                                            <th className="py-2.5 px-4 font-normal">Người đăng</th>
                                            <th className="py-2.5 px-4 font-normal">Thể loại</th>
                                            <th className="py-2.5 px-4 text-right font-normal">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {novels.map(novel => (
                                            <tr key={novel.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-2 px-4 font-semibold text-foreground/80 truncate max-w-[240px]">
                                                    {novel.title}
                                                </td>
                                                <td className="py-2 px-4 text-xs text-muted-foreground">
                                                    {novel.uploaderName}
                                                </td>
                                                <td className="py-2 px-4 flex flex-wrap gap-1.5 items-center min-h-[36px]">
                                                    {novel.genres && novel.genres.length > 0 ? (
                                                        novel.genres.map(g => (
                                                            <Badge key={g} variant="outline" className="px-1.5 py-0 text-[10px]">
                                                                {g}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground/60 italic">Chưa phân loại</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            size="xs"
                                                            variant="outline"
                                                            className="h-7 text-[11px] font-medium flex items-center gap-1 border-amber-500/20 hover:border-amber-500/50"
                                                            disabled={isProcessingBatch}
                                                            onClick={() => handleAutoClassify(novel)}
                                                        >
                                                            <SparklesIcon className="w-3 h-3 text-amber-500" />
                                                            Phân loại AI
                                                        </Button>
                                                        <Button
                                                            size="xs"
                                                            variant="ghost"
                                                            className="h-7 text-[11px] font-medium text-destructive hover:bg-destructive/10"
                                                            onClick={() => {
                                                                const userConfirm = window.confirm(`Bạn có chắc chắn muốn xóa "${novel.title}" khỏi phòng đọc?`);
                                                                if (userConfirm) {
                                                                    fetch(`/api/reading-room?action=delete&novelId=${novel.id}`, { method: "POST" })
                                                                        .then(res => res.json())
                                                                        .then(data => {
                                                                            if (data.success) {
                                                                                toast.success("Đã xóa truyện khỏi phòng đọc");
                                                                                setNovels(prev => prev ? prev.filter(n => n.id !== novel.id) : null);
                                                                            } else {
                                                                                toast.error(data.error || "Không thể xóa truyện");
                                                                            }
                                                                        })
                                                                        .catch(() => toast.error("Có lỗi xảy ra"));
                                                                }
                                                            }}
                                                        >
                                                            Xóa
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {filteredNovels.length === 0 ? (
                <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
                    <BookOpenIcon className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-semibold text-foreground/80">
                        {novels.length === 0 ? "Chưa có bộ truyện nào" : "Không tìm thấy bộ truyện nào"}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
                        {novels.length === 0
                            ? "Hãy là người đầu tiên chia sẻ truyện từ Thư viện cá nhân lên Phòng Đọc!"
                            : "Không tìm thấy kết quả phù hợp. Hãy thử thay đổi từ khoá hoặc bộ lọc."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {displayedNovels.map((novel, index) => (
                        <Link
                            key={novel.id}
                            href={`/reading-room/${novel.id}`}
                            className="group cursor-pointer block"
                        >
                            {/* Book cover — portrait 3:4 ratio */}
                            <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg bg-muted shadow-sm transition-shadow group-hover:shadow-md">
                                {novel.coverImage ? (
                                    <img
                                        src={novel.coverImage}
                                        alt={novel.title}
                                        referrerPolicy="no-referrer"
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                    />
                                ) : (
                                    <div className="flex h-full flex-col justify-center items-center p-3 font-serif bg-gradient-to-br from-primary/10 to-primary/5">
                                        <p className="line-clamp-3 text-sm font-semibold leading-snug text-center text-foreground/80">
                                            {novel.title}
                                        </p>
                                    </div>
                                )}
                                {/* Genre + chapter count overlay */}
                                <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-linear-to-t from-black/60 to-transparent p-2 pt-4">
                                    <span className="rounded-sm bg-black/50 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white/90 backdrop-blur-sm">
                                        {novel.chapterCount} ch
                                    </span>
                                    {novel.genres && novel.genres[0] && (
                                        <span className="rounded-sm bg-primary/70 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white/90 backdrop-blur-sm">
                                            {novel.genres[0]}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Info below cover */}
                            <div className="mt-2 px-0.5">
                                <p className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                                    {novel.title}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground font-medium">
                                    {novel.uploaderName}
                                </p>
                                <p className="text-[10px] text-muted-foreground/60">
                                    {formatDate(novel.updatedAt)}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Infinite Scroll Trigger */}
            {hasMore && (
                <div ref={lastElementRef} className="py-12 flex justify-center">
                    <Loader2Icon className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {!hasMore && filteredNovels && filteredNovels.length > 0 && (
                <div className="mt-16 text-center text-muted-foreground text-sm">
                    Bạn đã xem hết tất cả bộ truyện. 🎉
                </div>
            )}
        </main>
    );
}

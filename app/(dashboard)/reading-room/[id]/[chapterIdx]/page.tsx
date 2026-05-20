"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ListIcon } from "lucide-react";
import Link from "next/link";
import { useReaderPanel } from "@/lib/stores/reader-panel";
import { SentenceRenderer } from "@/components/reader/sentence-renderer";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReadingRoomChapterPage(props: { params: Promise<{ id: string, chapterIdx: string }> }) {
    const params = use(props.params);
    const novelId = params.id;
    const chapterOrder = params.chapterIdx;
    const router = useRouter();

    const [chapter, setChapter] = useState<{ id: string, title: string, order: number } | null>(null);
    const [scenes, setScenes] = useState<{ id: string, content: string, version: number, activeSceneId?: string }[]>([]);

    // Total chapters count to prevent "Next" when at the end
    const [totalChapters, setTotalChapters] = useState(0);
    const [novelTitle, setNovelTitle] = useState("");

    const isReaderOpen = useReaderPanel((s) => s.isOpen);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [fontSize, setFontSize] = useState(20);
    const [fontFamily, setFontFamily] = useState("font-serif");

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedSize = localStorage.getItem("rr_font_size");
        const savedFamily = localStorage.getItem("rr_font_family");
        if (savedSize) setFontSize(parseInt(savedSize));
        if (savedFamily) setFontFamily(savedFamily);
    }, []);

    // Save settings when changed
    const updateFontSize = (newSize: number) => {
        const val = Math.max(14, Math.min(32, newSize));
        setFontSize(val);
        localStorage.setItem("rr_font_size", val.toString());
    };

    const updateFontFamily = (newFamily: string) => {
        setFontFamily(newFamily);
        localStorage.setItem("rr_font_family", newFamily);
    };

    useEffect(() => {
        setLoading(true);
        // Fetch chapter — API now returns totalChapters & novelTitle too
        fetch(`/api/reading-room?action=chapter&id=${novelId}&idx=${chapterOrder}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setChapter(data.chapter);
                    setScenes(data.scenes || []);
                    if (data.totalChapters) setTotalChapters(data.totalChapters);
                    if (data.novelTitle) setNovelTitle(data.novelTitle);
                } else {
                    setError(data.error || "Không tìm thấy chương.");
                }
            })
            .catch(() => setError("Lỗi kết nối."))
            .finally(() => setLoading(false));
    }, [novelId, chapterOrder]);

    const currentOrder = Number(chapterOrder);

    // Sync store whenever the chapter changes
    useEffect(() => {
        if (novelId && novelTitle && totalChapters > 0) {
            useReaderPanel.getState().setNovelContext({
                novelId,
                novelTitle,
                totalChapters,
                chapterIndex: currentOrder,
            });
        }
    }, [novelId, novelTitle, totalChapters, currentOrder]);

    // Keep chapter title in sync
    useEffect(() => {
        if (chapter?.title) {
            useReaderPanel.getState().setChapterTitle(chapter.title);
        }
    }, [chapter?.title]);

    if (loading) {
        return (
            <main className="mx-auto w-full max-w-3xl px-4 py-8">
                <Skeleton className="h-4 w-24 mb-12" />
                <Skeleton className="h-10 w-3/4 mx-auto mb-12" />
                <div className="space-y-4">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <Skeleton key={i} className="h-5 w-full" style={{ opacity: 1 - i * 0.05 }} />
                    ))}
                </div>
            </main>
        );
    }

    if (error || !chapter) {
        return (
            <main className="mx-auto flex h-[70vh] flex-col items-center justify-center p-6 text-center">
                <h1 className="text-xl font-semibold mb-2">Lỗi Tải Chương</h1>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={() => router.push(`/reading-room/${novelId}`)}>
                    Quay lại Mục Lục
                </Button>
            </main>
        );
    }

    const UNWANTED_PATTERNS = [
        "Bạn đang xem văn bản gốc chưa dịch, có thể kéo xuống cuối trang để chọn bản dịch.",
        "Mời bạn đọc tiếp tại",
        "Chúc bạn đọc truyện vui vẻ",
        "Hãy ủng hộ tác giả bằng cách",
    ];

    const cleanContent = (text: string) => {
        let cleaned = text;
        UNWANTED_PATTERNS.forEach(pattern => {
            cleaned = cleaned.replace(new RegExp(pattern, "gi"), "");
        });
        return cleaned.trim();
    };

    const displayScenes = scenes
        .map(s => cleanContent(s.content))
        .filter(text => text.length > 0);

    const rawTitle = chapter.title || "Không Tên";
    const rawTitleLower = rawTitle.toLowerCase();
    const hasExistingPrefix = rawTitleLower.startsWith("chương ") || rawTitleLower.startsWith("chương") || rawTitleLower.startsWith("đệ ") || rawTitleLower.startsWith("第") || rawTitleLower.match(/^[0-9]+:/);

    const displayTitle = hasExistingPrefix ? rawTitle : `Chương ${currentOrder + 1}: ${rawTitle}`;

    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-0 sm:px-8 bg-background min-h-screen pb-24">
            {/* Navbar đọc truyện - Sticky */}
            <div className="sticky top-0 z-50 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-md border-b flex items-center justify-between mb-8 shadow-sm">
                <Link href={`/reading-room/${novelId}`} className="text-muted-foreground hover:text-primary transition-colors flex items-center text-sm font-medium">
                    <ListIcon className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Mục lục</span>
                </Link>
                <div className="flex gap-3 items-center">
                    <Select value={fontFamily} onValueChange={updateFontFamily}>
                        <SelectTrigger className="w-[120px] sm:w-[150px] h-8 bg-transparent">
                            <SelectValue placeholder="Font chữ" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="font-serif">Serif (Mặc định)</SelectItem>
                            <SelectItem value="font-sans">Sans-serif</SelectItem>
                            <SelectItem value="font-mono">Monospace</SelectItem>
                            <SelectItem value="!font-['Palatino_Linotype',_'Book_Antiqua',_Palatino,_serif]">Palatino</SelectItem>
                            <SelectItem value="!font-['Times_New_Roman',_Times,_serif]">Times New Roman</SelectItem>
                            <SelectItem value="!font-[Arial,_Helvetica,_sans-serif]">Arial</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex gap-1 items-center bg-muted/30 p-0.5 rounded-md border">
                        <Button variant="ghost" size="icon-xs" className="h-7 w-7" onClick={() => updateFontSize(fontSize - 2)}>A-</Button>
                        <span className="text-[10px] font-bold w-5 text-center tabular-nums">{fontSize}</span>
                        <Button variant="ghost" size="icon-xs" className="h-7 w-7" onClick={() => updateFontSize(fontSize + 2)}>A+</Button>
                    </div>
                </div>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-center text-foreground mb-12 leading-snug px-4 pt-8">
                {displayTitle}
            </h1>

            {isReaderOpen ? (
                <div className={`prose prose-sm max-w-none dark:prose-invert ${fontFamily.startsWith('!') ? '' : fontFamily}`} style={fontFamily.startsWith('!') ? { fontFamily: fontFamily.replace('!font-[', '').replace(']', '').replace(/_/g, ' ') } : {}}>
                    <SentenceRenderer content={`${displayTitle}\n\n` + displayScenes.join('\n\n')} />
                </div>
            ) : (
                <div
                    className={`prose prose-p:leading-relaxed prose-p:mb-6 max-w-none text-foreground/90 whitespace-pre-wrap ${fontFamily.startsWith('!') ? '' : fontFamily}`}
                    style={{ fontSize: `${fontSize}px`, ...(fontFamily.startsWith('!') ? { fontFamily: fontFamily.replace('!font-[', '').replace(']', '').replace(/_/g, ' ').replace(/'/g, '') } : {}) }}
                >
                    {displayScenes.map((text, idx) => (
                        <div key={idx} className="mb-6">{text.split('\n').map(l => l.trim()).filter(l => l.length > 0).map((line, i) => (
                            <p key={i} className="mb-4">{line}</p>
                        ))}</div>
                    ))}
                </div>
            )}

            <div className="mt-16 pt-8 border-t flex items-center justify-center gap-4">
                <Button
                    variant="outline"
                    size="lg"
                    disabled={currentOrder <= 0}
                    onClick={() => router.push(`/reading-room/${novelId}/${currentOrder - 1}`)}
                >
                    <ChevronLeftIcon className="w-5 h-5 mr-1" /> Trước
                </Button>
                <Button
                    variant="outline"
                    size="lg"
                    disabled={totalChapters > 0 && currentOrder >= totalChapters - 1}
                    onClick={() => router.push(`/reading-room/${novelId}/${currentOrder + 1}`)}
                >
                    Sau <ChevronRightIcon className="w-5 h-5 ml-1" />
                </Button>
            </div>
        </main>
    );
}

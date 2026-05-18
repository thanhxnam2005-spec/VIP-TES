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

    useEffect(() => {
        setLoading(true);
        // Fetch chapter
        fetch(`/api/reading-room?action=chapter&id=${novelId}&idx=${chapterOrder}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setChapter(data.chapter);
                    setScenes(data.scenes || []);
                } else {
                    setError(data.error || "Không tìm thấy chương.");
                }
            })
            .catch(() => setError("Lỗi kết nối."))
            .finally(() => setLoading(false));

        // Lấy thông tin novel để biết tổng chương
        fetch(`/api/reading-room?action=novel_data&id=${novelId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.chapters) {
                    setTotalChapters(data.chapters.length);
                    setNovelTitle(data.title || "Reading Room");
                }
            })
            .catch(console.error);

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

    const UNWANTED_TEXT = "Bạn đang xem văn bản gốc chưa dịch, có thể kéo xuống cuối trang để chọn bản dịch.";

    const displayScenes = scenes
        .map(s => s.content.replace(UNWANTED_TEXT, "").trim())
        .filter(text => text.length > 0);

    const rawTitle = chapter.title || "Không Tên";
    const rawTitleLower = rawTitle.toLowerCase();
    const hasExistingPrefix = rawTitleLower.startsWith("chương ") || rawTitleLower.startsWith("chương") || rawTitleLower.startsWith("đệ ") || rawTitleLower.startsWith("第") || rawTitleLower.match(/^[0-9]+:/);

    const displayTitle = hasExistingPrefix ? rawTitle : `Chương ${currentOrder + 1}: ${rawTitle}`;

    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 bg-background min-h-screen pb-24">
            {/* Navbar đọc truyện */}
            <div className="sticky top-0 z-10 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/90 backdrop-blur border-b flex items-center justify-between mb-8">
                <Link href={`/reading-room/${novelId}`} className="text-muted-foreground hover:text-primary transition-colors flex items-center text-sm font-medium">
                    <ListIcon className="w-4 h-4 mr-2" /> Mục lục
                </Link>
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <Select value={fontFamily} onValueChange={setFontFamily}>
                            <SelectTrigger className="w-[140px] h-8 bg-transparent">
                                <SelectValue placeholder="Chọn font" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="font-serif">Serif (Mặc định)</SelectItem>
                                <SelectItem value="font-sans">Sans-serif</SelectItem>
                                <SelectItem value="font-mono">Monospace</SelectItem>
                                <SelectItem value="!font-['Palatino_Linotype',_'Book_Antiqua',_Palatino,_serif]">Palatino</SelectItem>
                                <SelectItem value="!font-['Times_New_Roman',_Times,_serif]">Times New Roman</SelectItem>
                                <SelectItem value="!font-[Arial,_Helvetica,_sans-serif]">Arial</SelectItem>
                                <SelectItem value="!font-[Verdana,_Geneva,_sans-serif]">Verdana</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setFontSize(f => Math.max(14, f - 2))}>A-</Button>
                        <Button variant="outline" size="sm" onClick={() => setFontSize(f => Math.min(32, f + 2))}>A+</Button>
                    </div>
                </div>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-center text-foreground mb-12 leading-snug px-4">
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

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpenIcon, UserIcon, ClockIcon, SearchIcon, XIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReadingRoomMetadata } from "@/lib/google-drive-admin-v2";

const PAGE_SIZE = 9;

export default function ReadingRoomPage() {
    const [novels, setNovels] = useState<ReadingRoomMetadata[] | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeGenre, setActiveGenre] = useState<string>("all");
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const router = useRouter();

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

    function formatDate(ts: number) {
        return new Date(ts).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    const allGenres = useMemo(() => {
        if (!novels) return [];
        const genresSet = new Set<string>();
        novels.forEach(n => {
            if (n.genres && Array.isArray(n.genres)) {
                n.genres.forEach(g => genresSet.add(g));
            }
        });
        return Array.from(genresSet).sort();
    }, [novels]);

    const filteredNovels = useMemo(() => {
        if (!novels) return null;
        let res = novels;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            res = res.filter(n => n.title.toLowerCase().includes(q));
        }

        if (activeGenre !== "all") {
            res = res.filter(n => n.genres && n.genres.includes(activeGenre));
        }

        return res;
    }, [novels, searchQuery, activeGenre]);

    // Slice based on visibleCount
    const displayedNovels = useMemo(() => {
        if (!filteredNovels) return [];
        return filteredNovels.slice(0, visibleCount);
    }, [filteredNovels, visibleCount]);

    const hasMore = filteredNovels ? visibleCount < filteredNovels.length : false;

    // Reset visible count when search or genre changes
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [searchQuery, activeGenre]);

    if (novels === null || filteredNovels === null) {
        return (
            <main className="mx-auto w-full max-w-6xl px-6 py-8">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="mt-2 h-4 w-72" />
                </div>
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="animate-pulse space-y-4">
                            <div className="aspect-[16/9] w-full rounded-xl bg-muted" />
                            <div className="space-y-2">
                                <div className="h-4 w-4/5 rounded bg-muted" />
                                <div className="h-3 w-2/5 rounded bg-muted" />
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
                </h1>
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                    Nơi chia sẻ và đọc truyện được tải lên bởi các thành viên. Khám phá kho truyện phong phú, đa dạng thể loại.
                </p>
            </div>

            {novels.length > 0 && (
                <div className="mb-8 space-y-6">
                    <div className="relative max-w-md">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm truyện trong Phòng Đọc..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-10 h-11 rounded-xl"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {allGenres.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant={activeGenre === "all" ? "default" : "outline"}
                                className={`cursor-pointer px-4 py-1.5 rounded-full transition-all ${activeGenre === "all" ? "shadow-md shadow-primary/20" : "hover:bg-primary/5"}`}
                                onClick={() => setActiveGenre("all")}
                            >
                                Tất Cả
                            </Badge>
                            {allGenres.map(genre => (
                                <Badge
                                    key={genre}
                                    variant={activeGenre === genre ? "default" : "outline"}
                                    className={`cursor-pointer px-4 py-1.5 rounded-full transition-all ${activeGenre === genre ? "shadow-md shadow-primary/20" : "hover:bg-primary/5"}`}
                                    onClick={() => setActiveGenre(genre)}
                                >
                                    {genre}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {filteredNovels.length === 0 ? (
                <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
                    <BookOpenIcon className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-semibold text-foreground/80">{novels.length === 0 ? "Chưa có bộ truyện nào" : "Không tìm thấy bộ truyện nào"}</h3>
                    <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">{novels.length === 0 ? "Hãy là người đầu tiên chia sẻ truyện từ Thư viện cá nhân của bạn lên Phòng Đọc!" : "Chúng tôi không tìm thấy kết quả nào phù hợp. Hãy thử thay đổi từ khoá hoặc bộ lọc."}</p>
                </div>
            ) : (
                <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {displayedNovels.map((novel, index) => (
                        <div
                            key={novel.id}
                            className="group cursor-pointer flex flex-col"
                            onClick={() => router.push(`/reading-room/${novel.id}`)}
                        >
                            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-muted shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 ring-1 ring-border/50">
                                {novel.coverImage ? (
                                    <img
                                        src={novel.coverImage}
                                        alt={novel.title}
                                        referrerPolicy="no-referrer"
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex h-full flex-col justify-center items-center p-6 font-serif bg-gradient-to-br from-primary/10 to-primary/5">
                                        <p className="line-clamp-3 text-lg font-bold leading-tight text-center text-foreground/80">
                                            {novel.title}
                                        </p>
                                    </div>
                                )}
                                <div className="absolute bottom-4 left-4 flex gap-2">
                                    <Badge className="bg-black/60 hover:bg-black/70 text-white backdrop-blur-md border-0 px-3 py-1 text-[11px] font-bold">
                                        {novel.chapterCount} chương
                                    </Badge>
                                    {novel.genres && novel.genres[0] && (
                                        <Badge className="bg-primary/80 hover:bg-primary/90 text-primary-foreground backdrop-blur-md border-0 px-3 py-1 text-[11px] font-bold">
                                            {novel.genres[0]}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 flex-1">
                                <h3 className="line-clamp-2 text-lg font-bold leading-tight group-hover:text-primary transition-colors duration-300">
                                    {novel.title}
                                </h3>
                                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground leading-relaxed italic">
                                    {novel.description || "Chưa có mô tả cho bộ truyện này..."}
                                </p>

                                <div className="mt-4 flex items-center justify-between border-t pt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                            {novel.uploaderName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold leading-none">{novel.uploaderName}</span>
                                            <span className="text-[10px] text-muted-foreground mt-1">Người đăng</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[11px] font-medium leading-none">{formatDate(novel.updatedAt)}</span>
                                        <span className="text-[10px] text-muted-foreground mt-1">Cập nhật</span>
                                    </div>
                                </div>
                            </div>
                        </div>
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


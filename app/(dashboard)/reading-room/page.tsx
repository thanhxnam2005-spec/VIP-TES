"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpenIcon, UserIcon, ClockIcon, SearchIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReadingRoomMetadata } from "@/lib/google-drive-admin-v2";

export default function ReadingRoomPage() {
    const [novels, setNovels] = useState<ReadingRoomMetadata[] | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeGenre, setActiveGenre] = useState<string>("all");
    const router = useRouter();

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

    if (novels === null || filteredNovels === null) {
        return (
            <main className="mx-auto w-full max-w-6xl px-6 py-8">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="mt-2 h-4 w-72" />
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                <h1 className="font-heading text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                    <BookOpenIcon className="w-8 h-8" />
                    Phòng Đọc Cộng Đồng
                </h1>
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                    Nơi chia sẻ và đọc truyện được tải lên bởi các thành viên. Tốc độ cao, không giật lag.
                </p>
            </div>

            {novels.length > 0 && (
                <div className="mb-6 space-y-4">
                    <div className="relative max-w-sm">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm truyện trong Phòng Đọc..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-9"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                            >
                                <XIcon className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {allGenres.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant={activeGenre === "all" ? "default" : "outline"}
                                className={`cursor-pointer transition-colors ${activeGenre === "all" ? "" : "hover:bg-primary/10"}`}
                                onClick={() => setActiveGenre("all")}
                            >
                                Tất Cả
                            </Badge>
                            {allGenres.map(genre => (
                                <Badge
                                    key={genre}
                                    variant={activeGenre === genre ? "default" : "outline"}
                                    className={`cursor-pointer transition-colors ${activeGenre === genre ? "" : "hover:bg-primary/10"}`}
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
                <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
                    <BookOpenIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">{novels.length === 0 ? "Chưa có bộ truyện nào" : "Không tìm thấy bộ truyện nào"}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{novels.length === 0 ? "Hãy là người đầu tiên chia sẻ truyện từ Thư viện cá nhân của bạn lên Phòng Đọc!" : "Thử đổi từ khoá tìm kiếm hoặc chọn thể loại khác."}</p>
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredNovels.map((novel) => (
                        <div
                            key={novel.id}
                            className="group cursor-pointer"
                            onClick={() => router.push(`/reading-room/${novel.id}`)}
                        >
                            <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg bg-muted shadow-sm transition-all group-hover:shadow-md ring-1 ring-border/50">
                                {novel.coverImage ? (
                                    <img
                                        src={novel.coverImage}
                                        alt={novel.title}
                                        referrerPolicy="no-referrer"
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                    />
                                ) : (
                                    <div className="flex h-full flex-col justify-center items-center p-3 font-serif bg-primary/10">
                                        <p className="line-clamp-3 text-sm font-semibold leading-snug text-foreground/80">
                                            {novel.title}
                                        </p>
                                    </div>
                                )}
                                <div className="absolute top-1.5 right-1.5">
                                    <Badge variant="secondary" className="bg-black/50 hover:bg-black/60 text-white backdrop-blur-md border-0 text-[10px] px-1.5 py-0">
                                        {novel.chapterCount} chương
                                    </Badge>
                                </div>
                            </div>
                            <div className="mt-2.5 px-1">
                                <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary transition-colors">
                                    {novel.title}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                                    <UserIcon className="w-3 h-3" />
                                    <span className="truncate">{novel.uploaderName}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground/70">
                                    <ClockIcon className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{formatDate(novel.updatedAt)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}

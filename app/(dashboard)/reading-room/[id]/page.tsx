"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon, BookOpenIcon, ChevronRightIcon, ListIcon, LockIcon, UnlockIcon } from "lucide-react";
import Link from "next/link";
import { type Novel } from "@/lib/db";
import { useProfile } from "@/lib/hooks/use-profile";
import { PencilIcon, CheckIcon, Loader2Icon, XIcon, ThumbsUpIcon, ThumbsDownIcon, MessageCircleIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ReadingRoomInteractions } from "@/components/reading-room/interactions";

export default function ReadingRoomNovelDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const novelId = params.id;
    const router = useRouter();

    const [novel, setNovel] = useState<Novel | null>(null);
    const [chapters, setChapters] = useState<{ id: string, title: string, order: number, isLocked?: boolean }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { profile } = useProfile();

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [isSavingTitle, setIsSavingTitle] = useState(false);

    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [newDesc, setNewDesc] = useState("");
    const [isSavingDesc, setIsSavingDesc] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/reading-room?action=novel_data&id=${novelId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setNovel(data.novel);
                    setChapters(data.chapters || []);
                } else {
                    setError(data.error || "Không tìm thấy truyện.");
                }
            })
            .catch(() => setError("Lỗi kết nối."))
            .finally(() => setLoading(false));
    }, [novelId]);

    if (loading) {
        return (
            <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
                <Skeleton className="h-6 w-24 mb-6" />
                <div className="flex flex-col sm:flex-row gap-6 mb-8">
                    <Skeleton className="w-48 h-72 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                        <div className="space-y-2 mt-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (error || !novel) {
        return (
            <main className="mx-auto flex h-[70vh] flex-col items-center justify-center p-6 text-center">
                <div className="rounded-full bg-destructive/10 p-4 mb-4">
                    <BookOpenIcon className="w-8 h-8 text-destructive" />
                </div>
                <h1 className="text-xl font-semibold mb-2">Không thể tải truyện</h1>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={() => router.push("/reading-room")}>
                    <ArrowLeftIcon className="w-4 h-4 mr-2" /> Quay lại Phòng Đọc
                </Button>
            </main>
        );
    }

    const isUploader = profile && (novel as any).uploaderId && profile.id === (novel as any).uploaderId;

    const handleSaveTitle = async () => {
        if (!newTitle.trim() || newTitle === novel.title) {
            setIsEditingTitle(false);
            return;
        }
        setIsSavingTitle(true);
        try {
            const res = await fetch(`/api/reading-room?action=edit_metadata&novelId=${novelId}`, {
                method: 'POST',
                body: JSON.stringify({ newTitle: newTitle.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setNovel({ ...novel, title: newTitle.trim() });
                toast.success('Đã cập nhật tiêu đề thành công');
                setIsEditingTitle(false);
            } else {
                toast.error(data.error || 'Có lỗi xảy ra');
            }
        } catch (err: any) {
            toast.error(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSavingTitle(false);
        }
    };

    const handleSaveDesc = async () => {
        setIsSavingDesc(true);
        try {
            const res = await fetch(`/api/reading-room?action=edit_metadata&novelId=${novelId}`, {
                method: 'POST',
                body: JSON.stringify({ newDescription: newDesc.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setNovel({ ...novel, description: newDesc.trim() });
                toast.success('Đã cập nhật giới thiệu thành công');
                setIsEditingDesc(false);
            } else {
                toast.error(data.error || 'Có lỗi xảy ra');
            }
        } catch (err: any) {
            toast.error(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSavingDesc(false);
        }
    };

    const handleToggleLock = async (idx: number) => {
        try {
            const res = await fetch(`/api/reading-room?action=toggle_chapter_lock&novelId=${novelId}&idx=${idx}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setChapters(prev => prev.map((ch, i) => i === idx ? { ...ch, isLocked: data.isLocked } : ch));
                toast.success(data.isLocked ? "Đã khóa chương" : "Đã mở khóa chương");
            } else {
                toast.error(data.error || 'Lỗi khóa chương');
            }
        } catch (err: any) {
            toast.error(err.message || 'Lỗi');
        }
    };

    const handleDeleteNovel = async () => {
        if (!confirm("Bạn có chắc chắn muốn xoá truyện này khỏi Phòng Đọc không? Toàn bộ bình luận và đánh giá cũng sẽ bị mất.")) return;

        try {
            const res = await fetch(`/api/reading-room?action=delete&novelId=${novelId}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                toast.success("Đã xoá truyện khỏi Phòng Đọc thành công!");
                router.push("/reading-room");
            } else {
                toast.error(data.error || "Xoá truyện thất bại.");
            }
        } catch (err: any) {
            toast.error("Lỗi: " + err.message);
        }
    };

    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
            <Link href="/reading-room" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 mt-2 transition-colors">
                <ArrowLeftIcon className="w-4 h-4 mr-2" /> Quay lại Phòng Đọc
            </Link>

            <div className="flex flex-col sm:flex-row gap-6 mb-12">
                <div className="shrink-0 mx-auto sm:mx-0 w-48 shadow-lg ring-1 ring-border/50 rounded-lg overflow-hidden relative">
                    {novel.coverImage ? (
                        <img src={novel.coverImage} alt={novel.title} className="w-full aspect-3/4 object-cover block" referrerPolicy="no-referrer" />
                    ) : (
                        <div className="w-full aspect-3/4 bg-primary/10 flex items-center justify-center p-4 text-center break-words">
                            <span className="font-serif font-semibold text-primary/70">{novel.title}</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center sm:items-start text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mb-2 w-full justify-center sm:justify-start">
                        {isEditingTitle ? (
                            <div className="flex items-center gap-2 w-full max-w-sm">
                                <Input
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    className="text-lg font-heading"
                                    autoFocus
                                    disabled={isSavingTitle}
                                />
                                <Button
                                    size="icon"
                                    onClick={handleSaveTitle}
                                    disabled={isSavingTitle}
                                >
                                    {isSavingTitle ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setIsEditingTitle(false)}
                                    disabled={isSavingTitle}
                                >
                                    <XIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <h1 className="text-3xl sm:text-4xl font-bold font-heading text-primary leading-tight flex items-center gap-3">
                                {novel.title}
                                {isUploader && (
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => {
                                            setNewTitle(novel.title);
                                            setIsEditingTitle(true);
                                        }}
                                    >
                                        <PencilIcon className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                )}
                            </h1>
                        )}
                    </div>
                    {novel.author && (
                        <p className="text-lg text-muted-foreground mb-4 font-medium">Tác giả: {novel.author}</p>
                    )}

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-6">
                        {novel.genres?.map(g => (
                            <Badge key={g} variant="secondary" className="px-3 py-1 font-normal text-xs">{g}</Badge>
                        ))}
                        <Badge variant="outline" className="px-3 py-1 font-normal text-xs bg-primary/5 text-primary border-primary/20">
                            {chapters.length} Chương
                        </Badge>
                    </div>

                    <div className="mt-auto pt-4 flex flex-wrap gap-3">
                        <Button
                            size="lg"
                            className="rounded-full px-8 shadow-md"
                            disabled={chapters.length === 0}
                            onClick={() => router.push(`/reading-room/${novel.id}/0`)}
                        >
                            <BookOpenIcon className="w-5 h-5 mr-2" /> Đọc Ngay
                        </Button>
                        {isUploader && (
                            <Button
                                size="lg"
                                variant="destructive"
                                className="rounded-full px-8 shadow-md"
                                onClick={handleDeleteNovel}
                            >
                                <Trash2Icon className="w-4 h-4 mr-2" /> Xoá Khỏi Phòng Đọc
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="border-b px-6 py-4 bg-muted/30 flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <ListIcon className="w-5 h-5 text-primary" /> Mô tả & Mục lục
                    </h2>
                    {isUploader && !isEditingDesc && (
                        <Button variant="ghost" size="sm" onClick={() => { setNewDesc(novel.description || ""); setIsEditingDesc(true); }}>
                            <PencilIcon className="w-4 h-4 mr-2" /> Sửa
                        </Button>
                    )}
                </div>

                <div className="p-6 border-b">
                    {isEditingDesc ? (
                        <div className="space-y-4">
                            <textarea
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                className="w-full min-h-[200px] p-3 text-sm rounded-md border resize-y focus:ring-1 focus:ring-primary outline-none whitespace-pre-wrap font-sans"
                            />
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setIsEditingDesc(false)} disabled={isSavingDesc}>Hủy</Button>
                                <Button onClick={handleSaveDesc} disabled={isSavingDesc}>
                                    {isSavingDesc && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                                    Lưu Mô Tả
                                </Button>
                            </div>
                        </div>
                    ) : (
                        novel.description ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {novel.description}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm italic">Tác giả chưa cập nhật lời giới thiệu.</p>
                        )
                    )}
                </div>

                <div className="divide-y">
                    {chapters.length === 0 ? (
                        <p className="p-6 text-center text-muted-foreground">Truyện chưa có chương nào.</p>
                    ) : (
                        <div className="flex flex-col">
                            {chapters.map((ch, idx) => (
                                <div
                                    key={ch.id}
                                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
                                >
                                    <Link
                                        href={`/reading-room/${novel.id}/${idx}`}
                                        className="flex-1 text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors text-foreground/80 flex items-center gap-3"
                                    >
                                        <span className="text-muted-foreground/50 w-6 text-right tabular-nums text-xs">{idx + 1}</span>
                                        <span className="flex items-center gap-2">
                                            {ch.isLocked && <LockIcon className="w-3.5 h-3.5 text-destructive" />}
                                            {ch.title || `Chương ${idx + 1}`}
                                        </span>
                                    </Link>
                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isUploader && (
                                            <Button variant="ghost" size="sm" className="h-8" onClick={() => handleToggleLock(idx)}>
                                                {ch.isLocked ? <UnlockIcon className="w-3.5 h-3.5 text-success" /> : <LockIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="sm" className="h-8 gap-1.5" asChild>
                                            <Link href={`/reading-room/${novel.id}/${idx}`}>
                                                <BookOpenIcon className="w-3.5 h-3.5" />
                                                Đọc
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ReadingRoomInteractions novelId={novel.id} />
        </main>
    );
}

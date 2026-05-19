"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUpIcon, ThumbsDownIcon, MessageCircleIcon, Trash2Icon, SendIcon, ReplyIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ReadingRoomInteractions({ novelId }: { novelId: string }) {
    const supabase = createClient();
    const { profile } = useProfile();
    const [likes, setLikes] = useState(0);
    const [dislikes, setDislikes] = useState(0);
    const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);

    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");

    useEffect(() => {
        if (!novelId) return;

        // Bắt đầu load votes
        const loadVotes = async () => {
            const { data, error } = await supabase
                .from('reading_room_votes')
                .select('vote_type, user_id')
                .eq('novel_id', novelId);

            if (!error && data) {
                const likeCount = data.filter(d => d.vote_type === 'like').length;
                const dislikeCount = data.filter(d => d.vote_type === 'dislike').length;
                setLikes(likeCount);
                setDislikes(dislikeCount);

                if (profile?.id) {
                    const myVote = data.find(d => d.user_id === profile.id);
                    setUserVote(myVote ? (myVote.vote_type as 'like' | 'dislike') : null);
                }
            }
        };

        const loadComments = async () => {
            const { data, error } = await supabase
                .from('reading_room_comments')
                .select('*')
                .eq('novel_id', novelId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setComments(data);
            }
        };

        loadVotes();
        loadComments();

        // Lắng nghe thay đổi real-time từ supabase
        const channel = supabase
            .channel(`public:reading_room:${novelId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reading_room_comments', filter: `novel_id=eq.${novelId}` }, payload => {
                loadComments();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reading_room_votes', filter: `novel_id=eq.${novelId}` }, payload => {
                loadVotes();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [novelId, profile?.id, supabase]);

    const handleVote = async (type: 'like' | 'dislike') => {
        if (!profile?.id) {
            toast.error("Bạn cần đăng nhập để thả tym");
            return;
        }

        try {
            if (userVote === type) {
                // Remove vote
                setUserVote(null);
                type === 'like' ? setLikes(l => l - 1) : setDislikes(d => d - 1);
                await supabase.from('reading_room_votes').delete().eq('novel_id', novelId).eq('user_id', profile.id);
                return;
            }

            // Xử lý UI optimistic update trước
            const oldVote = userVote;
            setUserVote(type);
            if (oldVote === 'like') setLikes(l => Math.max(0, l - 1));
            if (oldVote === 'dislike') setDislikes(d => Math.max(0, d - 1));

            if (type === 'like') setLikes(l => l + 1);
            else setDislikes(d => d + 1);

            const { error } = await supabase
                .from('reading_room_votes')
                .upsert(
                    { novel_id: novelId, user_id: profile.id, vote_type: type },
                    { onConflict: 'novel_id,user_id' }
                );

            if (error) throw error;
        } catch (err: any) {
            toast.error("Lỗi: " + err.message);
        }
    };

    const handleComment = async (parentId?: string) => {
        if (!profile?.id) {
            toast.error("Vui lòng đợi tải xong tài khoản hoặc đăng nhập lại.");
            return;
        }

        const content = parentId ? replyContent : newComment;
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('reading_room_comments').insert({
                novel_id: novelId,
                user_id: profile.id,
                display_name: profile.display_name || "Khách",
                content: content.trim(),
                parent_id: parentId || null
            });

            if (error) throw error;

            if (parentId) {
                setReplyContent("");
                setReplyingTo(null);
            } else {
                setNewComment("");
            }
            toast.success("Đã gửi bình luận");
        } catch (err: any) {
            toast.error("Lỗi đăng bình luận: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteComment = async (id: string, uuid: string) => {
        if (uuid !== profile?.id) return;
        if (!confirm("Bạn có chắc muốn xoá bình luận này? (Các trả lời cũng sẽ bị xóa theo)")) return;

        try {
            const { error } = await supabase.from('reading_room_comments').delete().eq('id', id);
            if (error) throw error;
            toast.success("Đã xoá bình luận");
        } catch (err: any) {
            toast.error("Lỗi xoá bình luận: " + err.message);
        }
    };

    const rootComments = comments.filter(c => !c.parent_id);
    const childrenByParent = comments.reduce((acc, c) => {
        if (c.parent_id) {
            if (!acc[c.parent_id]) acc[c.parent_id] = [];
            acc[c.parent_id].push(c);
        }
        return acc;
    }, {} as Record<string, any[]>);

    // Xếp con theo thời gian tăng dần (cũ nhất ở trên cùng)
    Object.keys(childrenByParent).forEach(key => {
        childrenByParent[key].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    return (
        <div className="mt-8 space-y-8">
            {/* Votes Section */}
            <div className="flex items-center justify-center gap-6 border-b pb-8">
                <Button
                    variant="outline"
                    size="lg"
                    className={cn("rounded-full px-8 gap-2 font-semibold transition-all w-32 justify-center",
                        userVote === 'like' && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    onClick={() => handleVote('like')}
                >
                    <ThumbsUpIcon className={cn("w-5 h-5", userVote === 'like' ? "fill-current" : "")} />
                    <span>{likes > 0 && likes} Thích</span>
                </Button>
                <Button
                    variant="outline"
                    size="lg"
                    className={cn("rounded-full px-8 gap-2 font-semibold transition-all w-48 justify-center")}
                    style={userVote === 'dislike' ? { backgroundColor: '#ef4444', color: 'white', borderColor: '#ef4444' } : {}}
                    onClick={() => handleVote('dislike')}
                >
                    <ThumbsDownIcon className={cn("w-5 h-5", userVote === 'dislike' ? "fill-current" : "")} />
                    <span>{dislikes > 0 && dislikes} Không thích</span>
                </Button>
            </div>

            {/* Comments Section */}
            <div className="space-y-6">
                <h3 className="text-xl font-heading flex items-center gap-2">
                    <MessageCircleIcon className="w-5 h-5 text-primary" /> Bình luận {comments.length > 0 && `(${comments.length})`}
                </h3>

                {profile?.id ? (
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 uppercase">
                            {profile.display_name?.charAt(0) || "U"}
                        </div>
                        <div className="flex-1 space-y-3">
                            <Textarea
                                placeholder="Cảm nghĩ của bạn về bộ truyện này..."
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                className="resize-none h-24"
                            />
                            <div className="flex justify-end">
                                <Button onClick={() => handleComment()} disabled={!newComment.trim() || isSubmitting}>
                                    <SendIcon className="w-4 h-4 mr-2" /> Đăng bình luận
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-muted p-4 rounded-lg text-center text-muted-foreground text-sm">
                        Đang tải thông tin tài khoản của bạn...
                    </div>
                )}

                <div className="space-y-6 mt-6">
                    {rootComments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 group bg-card p-4 rounded-lg border shadow-sm flex-col">
                            <div className="flex gap-4 w-full">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold shrink-0 uppercase border">
                                    {comment.display_name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="font-semibold text-sm">{comment.display_name}</div>
                                        <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: vi })}
                                        </div>
                                    </div>
                                    <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{comment.content}</p>

                                    <div className="mt-2 flex gap-4 items-center">
                                        <button
                                            onClick={() => {
                                                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                                setReplyContent("");
                                            }}
                                            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center font-medium"
                                        >
                                            <ReplyIcon className="w-3.5 h-3.5 mr-1" />
                                            Trả lời
                                        </button>

                                        {profile?.id === comment.user_id && (
                                            <button
                                                onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                                                className="text-xs text-destructive hover:text-destructive/80 transition-opacity"
                                            >
                                                Xóa
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Children Replies */}
                            {(childrenByParent[comment.id] || []).length > 0 && (
                                <div className="pl-14 space-y-4 mt-2">
                                    {childrenByParent[comment.id].map((child: any) => (
                                        <div key={child.id} className="flex gap-3 group/child">
                                            <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center font-bold text-xs shrink-0 uppercase border">
                                                {child.display_name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-semibold text-xs">{child.display_name}</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {formatDistanceToNow(new Date(child.created_at), { addSuffix: true, locale: vi })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">{child.content}</p>
                                                {profile?.id === child.user_id && (
                                                    <button
                                                        onClick={() => handleDeleteComment(child.id, child.user_id)}
                                                        className="text-xs mt-1 opacity-0 group-hover/child:opacity-100 text-destructive transition-opacity"
                                                    >
                                                        Xóa
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Reply Input Box */}
                            {replyingTo === comment.id && profile?.id && (
                                <div className="pl-14 mt-3 flex flex-col gap-2">
                                    <Textarea
                                        placeholder={`Trả lời ${comment.display_name}...`}
                                        value={replyContent}
                                        onChange={e => setReplyContent(e.target.value)}
                                        className="h-20 text-sm"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Hủy</Button>
                                        <Button size="sm" onClick={() => handleComment(comment.id)} disabled={!replyContent.trim() || isSubmitting}>
                                            <SendIcon className="w-3.5 h-3.5 mr-1" /> Gửi
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {rootComments.length === 0 && (
                        <p className="text-center text-muted-foreground p-8 bg-muted/20 rounded-lg border border-dashed">
                            Chưa có bình luận nào. Hãy là người đầu tiên bóc tem!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

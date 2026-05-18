import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SAVE_DIR = path.join(process.cwd(), "downloads", "mottruyen");
import { getReadingRoomIndex, downloadNovelFromReadingRoom } from "@/lib/google-drive-admin-v2";

// Hàng đợi tải truyện ngầm
// @ts-ignore
if (!global.mottruyenQueue) {
    // @ts-ignore
    global.mottruyenQueue = [];
    // @ts-ignore
    global.isQueueRunning = false;
}

// @ts-ignore
if (!global.mottruyenProgress) global.mottruyenProgress = {};

const processQueue = async () => {
    // @ts-ignore
    if (global.isQueueRunning) return;
    // @ts-ignore
    global.isQueueRunning = true;
    
    // Tốc độ tải: Dùng số Batch làm giới hạn song song, nhưng mặc định là 5 để tránh bị chặn IP
    // @ts-ignore
    const CONCURRENCY = global.mottruyenConcurrency || 5;
    
    // @ts-ignore
    while (global.mottruyenQueue.length > 0) {
        // @ts-ignore
        const batch = global.mottruyenQueue.splice(0, CONCURRENCY);
        await Promise.all(batch.map((task: any) => task()));
    }
    
    // @ts-ignore
    global.isQueueRunning = false;
};

const downloadNovelTask = async (id: number, data: any, existingInRR?: any) => {
    try {
        const novelName = data.data.NAME;
        const author = data.data.AUTHOR || "Unknown";
        let currentChapId = data.data.CHAPTER[0].id;
        
        const totalChap = parseInt(data.data.TOTALCHAPTER || "0");
        
        let novelData = {
            id: `mottruyen-${id}`,
            title: novelName,
            author: author,
            coverUrl: data.data.IMG || "",
            description: data.data.DESC || "",
            sourceUrl: `http://api.mottruyen.com/story/?story_id=${id}`,
            createdAt: new Date().toISOString(),
            chapters: [] as any[]
        };

        let chapCount = 0;

        // Xử lý nếu truyện đã có trên phòng đọc nhưng thiếu chương
        if (existingInRR) {
            try {
                const oldJsonStr = await downloadNovelFromReadingRoom(existingInRR.id);
                if (oldJsonStr) {
                    const oldData = JSON.parse(oldJsonStr);
                    // Giữ lại data cũ
                    novelData = { ...oldData.novel, chapters: oldData.chapters || [] };
                    
                    if (novelData.chapters.length > 0) {
                        // Sắp xếp lại để tìm chương cuối cùng
                        novelData.chapters.sort((a, b) => a.orderIndex - b.orderIndex);
                        const lastChap = novelData.chapters[novelData.chapters.length - 1];
                        chapCount = novelData.chapters.length;
                        
                        const lastChapOriginalId = lastChap.id.replace("chap-", "");
                        
                        // Lấy NEXT của chương cuối cùng để bắt đầu tải
                        const lastChapRes = await fetch(`http://api.mottruyen.com/chapter/?chapter_id=${lastChapOriginalId}`, {
                            signal: AbortSignal.timeout(10000)
                        });
                        if (lastChapRes.ok) {
                            const lastChapData = await lastChapRes.json();
                            if (lastChapData && lastChapData.data && lastChapData.data.NEXT) {
                                currentChapId = lastChapData.data.NEXT;
                            } else {
                                // Truyện đã full thực sự, ko có NEXT
                                currentChapId = null;
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Lỗi khi khôi phục truyện cũ", err);
                // Fallback tải lại từ đầu
            }
        }
        
        // @ts-ignore
        global.mottruyenProgress[id] = { name: novelName, downloaded: chapCount, total: totalChap, status: "fetching" };

        while (currentChapId) {
            try {
                // Tăng delay lên 1000ms để chống ban IP
                await new Promise(r => setTimeout(r, 1000));
                
                const chapRes = await fetch(`http://api.mottruyen.com/chapter/?chapter_id=${currentChapId}`, {
                    signal: AbortSignal.timeout(15000)
                });
                if (!chapRes.ok) break;
                
                const chapData = await chapRes.json();
                
                if (chapData && chapData.success === 1 && chapData.data) {
                    const chapName = chapData.data.ENAME || `Chương ${chapCount + 1}`;
                    let chapContent = chapData.data.CONTENT || "";
                    chapContent = chapContent.replace(/<p>/g, "").replace(/<\/p>/g, "\n\n").replace(/&nbsp;/g, " ").replace(/<br\s*\/?>/g, "\n");
                    
                    novelData.chapters.push({
                        id: `chap-${currentChapId}`,
                        title: chapName,
                        content: chapContent.trim(),
                        orderIndex: chapCount
                    });
                    
                    chapCount++;
                    currentChapId = chapData.data.NEXT; 
                    
                    // @ts-ignore
                    if (global.mottruyenProgress[id]) {
                        // @ts-ignore
                        global.mottruyenProgress[id].downloaded = chapCount;
                    }
                } else {
                    break;
                }
            } catch (e) {
                console.error(`Lỗi khi tải chương ${currentChapId} của truyện ID ${id}`);
                break; 
            }
        }

        const safeName = novelName.replace(/[\\/*?:"<>|]/g, "");
        fs.writeFileSync(path.join(SAVE_DIR, `[${id}]_${safeName}.json`), JSON.stringify({
            novel: {
                id: novelData.id,
                title: novelData.title,
                author: novelData.author,
                coverUrl: novelData.coverUrl,
                description: novelData.description,
                sourceUrl: novelData.sourceUrl,
                createdAt: novelData.createdAt
            },
            chapters: novelData.chapters
        }, null, 2));
        
        // @ts-ignore
        if (global.mottruyenProgress[id]) {
            // @ts-ignore
            global.mottruyenProgress[id].status = "done";
        }
    } catch (err) {
        // @ts-ignore
        if (global.mottruyenProgress && global.mottruyenProgress[id]) {
            // @ts-ignore
            global.mottruyenProgress[id].status = "error";
        }
    }
};

export async function POST(req: Request) {
    try {
        const { startId, batchSize } = await req.json();
        
        // Cập nhật số luồng tải song song từ giao diện (nên khuyên user dùng 5-10)
        // @ts-ignore
        global.mottruyenConcurrency = batchSize > 0 ? batchSize : 5;

        if (!startId || !batchSize) {
            return NextResponse.json({ error: "Missing startId or batchSize" }, { status: 400 });
        }

        if (!fs.existsSync(SAVE_DIR)) {
            fs.mkdirSync(SAVE_DIR, { recursive: true });
        }
        
        // Nạp Index của Reading Room để check trùng lặp (Cache 1 phút)
        // @ts-ignore
        if (!global.rrIndexCache || Date.now() - global.rrIndexTime > 60000) {
            // @ts-ignore
            global.rrIndexCache = await getReadingRoomIndex();
            // @ts-ignore
            global.rrIndexTime = Date.now();
        }
        // @ts-ignore
        const rrIndex = global.rrIndexCache || [];

        const fetchStory = async (id: number) => {
            try {
                // 1. Lấy thông tin metadata của truyện
                const res = await fetch(`http://api.mottruyen.com/story/?story_id=${id}`, {
                    signal: AbortSignal.timeout(15000)
                });
                if (!res.ok) return { id, success: false };
                
                const data = await res.json();
                
                // Nếu api trả về success: 1 nghĩa là ID này tồn tại truyện
                if (data && data.success === 1 && data.data && data.data.CHAPTER && data.data.CHAPTER.length > 0) {
                    
                    const totalChap = parseInt(data.data.TOTALCHAPTER || "0");
                    const novelIdStr = `mottruyen-${id}`;
                    
                    // Kiểm tra xem bộ này đã có trong phòng đọc chưa
                    const existingInRR = rrIndex.find((n: any) => n.id === novelIdStr);
                    
                    if (existingInRR) {
                        // Nếu số chương trên phòng đọc >= số chương hiện tại trên API -> Bỏ qua, tránh tải trùng
                        if (existingInRR.chapterCount >= totalChap) {
                            return { id, success: false, reason: "Đã có đủ trên phòng đọc" };
                        }
                    }

                    // Thêm vào hàng đợi tải ngầm
                    // @ts-ignore
                    global.mottruyenQueue.push(() => downloadNovelTask(id, data, existingInRR));
                    
                    // Kích hoạt worker nếu chưa chạy
                    processQueue();
                    
                    return { id, success: true };
                }
                
                return { id, success: false };
            } catch (err) {
                return { id, success: false };
            }
        };

        // Chạy song song Batch Size bộ truyện
        const promises = [];
        for (let i = 0; i < batchSize; i++) {
            promises.push(fetchStory(startId + i));
        }

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;

        return NextResponse.json({ success: true, successCount, total: batchSize });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

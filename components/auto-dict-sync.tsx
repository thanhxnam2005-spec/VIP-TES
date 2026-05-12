"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DICT_GENRES, DICT_TYPES, type DictSource } from "@/lib/db";
import { appendToDictSource } from "@/lib/hooks/use-dict-entries";

const ALL_SOURCES: DictSource[] = [];
for (const g of DICT_GENRES) {
  for (const t of DICT_TYPES) {
    if (g === "core" && t !== "vietphrase" && t !== "phienam") continue;
    ALL_SOURCES.push(`${g}_${t}` as DictSource);
  }
}

export function AutoDictSync() {
  useEffect(() => {
    let mounted = true;

    const syncDicts = async () => {
      try {
        const lastSyncStr = localStorage.getItem("last_dict_sync");
        const now = Date.now();
        
        // Chỉ tự động sync 1 lần mỗi 12 tiếng để tránh lag server Supabase
        if (lastSyncStr) {
          const lastSync = parseInt(lastSyncStr, 10);
          if (now - lastSync < 12 * 60 * 60 * 1000) {
            return; // Đã sync gần đây
          }
        }

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        // Không bắt buộc đăng nhập để nhận từ điển chung, nhưng nếu có user thì tốt
        
        const sources = ALL_SOURCES.filter(s => s !== "core_vietphrase");
        const total = sources.length;
        const CONCURRENCY = 3; // Nhẹ nhàng hơn để không làm lag UI khi load trang

        for (let i = 0; i < total; i += CONCURRENCY) {
          if (!mounted) return;
          const batch = sources.slice(i, i + CONCURRENCY);
          
          const results = await Promise.allSettled(
            batch.map(async (source) => {
              const filename = `${source}.txt`;
              const { data: publicUrlData } = supabase.storage
                .from("dictionaries")
                .getPublicUrl(filename);
              
              const res = await fetch(publicUrlData.publicUrl);
              if (!res.ok) return { source, entries: [] };
              
              const text = await res.text();
              const clean = text.startsWith("\uFEFF") ? text.slice(1) : text;
              const entries = clean
                .split(/\r?\n/)
                .map((line) => {
                  const idx = line.indexOf("=");
                  if (idx < 1) return null;
                  return {
                    chinese: line.slice(0, idx).trim(),
                    vietnamese: line.slice(idx + 1).trim(),
                  };
                })
                .filter(
                  (e): e is { chinese: string; vietnamese: string } =>
                    !!e && !!e.chinese && !!e.vietnamese,
                );
              
              return { source, entries };
            })
          );
          
          for (const result of results) {
            if (result.status === "fulfilled" && result.value.entries.length > 0) {
              await appendToDictSource(result.value.source, result.value.entries);
            }
          }
          
          // Nghỉ một chút để nhường CPU cho UI
          await new Promise(r => setTimeout(r, 1000));
        }

        // Đánh dấu đã sync
        localStorage.setItem("last_dict_sync", now.toString());
        console.log("[AutoDictSync] Đã tải xong từ điển từ server.");
      } catch (err) {
        console.error("[AutoDictSync] Lỗi khi đồng bộ từ điển ngầm:", err);
      }
    };

    // Chờ 5 giây sau khi load trang xong mới bắt đầu tải ngầm để không làm chậm lúc khởi động
    const timeout = setTimeout(() => {
      syncDicts();
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  return null; // Không hiển thị giao diện
}

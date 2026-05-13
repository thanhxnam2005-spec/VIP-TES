"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BotIcon, CheckIcon, TrashIcon, RefreshCwIcon } from "lucide-react";
import { appendToDictSource } from "@/lib/hooks/use-dict-entries";
import type { DictSource } from "@/lib/db";

interface CommunityEntry {
  id: string;
  chinese: string;
  vietnamese: string;
  category: string;
  novel_genre: string;
  created_at: string;
}

export function CommunityDictionary({ isAdmin }: { isAdmin: boolean }) {
  const [entries, setEntries] = useState<CommunityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("community_dict_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err: any) {
      toast.error(`Lỗi tải từ điển cộng đồng: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleMergeAll = async () => {
    if (entries.length === 0) return;
    const toastId = toast.loading("Đang gộp từ mới vào từ điển hệ thống...");
    try {
      const grouped: Record<string, { chinese: string; vietnamese: string }[]> = {};
      
      for (const entry of entries) {
        let dictType = "names";
        if (entry.category === "thuật ngữ") dictType = "tuvung";
        if (entry.category === "context mapping") dictType = "ngucanh";
        
        const source = `${entry.novel_genre || "tienhiep"}_${dictType}` as DictSource;
        if (!grouped[source]) grouped[source] = [];
        grouped[source].push({ chinese: entry.chinese, vietnamese: entry.vietnamese });
      }

      let totalAdded = 0;
      for (const [source, list] of Object.entries(grouped)) {
        const added = await appendToDictSource(source as DictSource, list);
        totalAdded += added;
      }

      // Xóa các mục đã duyệt
      const ids = entries.map(e => e.id);
      const { error } = await supabase.from("community_dict_entries").delete().in("id", ids);
      if (error) throw error;

      toast.success(`Đã gộp ${totalAdded} từ mới và xóa khỏi hàng chờ!`, { id: toastId });
      setEntries([]);
    } catch (err: any) {
      toast.error(`Lỗi gộp từ điển: ${err.message}`, { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("community_dict_entries").delete().eq("id", id);
      if (error) throw error;
      setEntries(prev => prev.filter(e => e.id !== id));
      toast.success("Đã xóa từ vựng");
    } catch (err: any) {
      toast.error("Lỗi xóa từ vựng");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BotIcon className="size-4" />
              Từ Điển Cộng Đồng (Chờ duyệt)
            </CardTitle>
            <CardDescription>
              Các từ vựng mới do người dùng AI trích xuất đóng góp (Tính năng "Càng dịch càng hay")
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchEntries} disabled={loading}>
              <RefreshCwIcon className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={handleMergeAll} disabled={entries.length === 0}>
                <CheckIcon className="size-4 mr-2" />
                Duyệt & Gộp tất cả ({entries.length})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiếng Trung</TableHead>
                <TableHead>Tiếng Việt</TableHead>
                <TableHead>Phân loại</TableHead>
                <TableHead>Thể loại truyện</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.chinese}</TableCell>
                  <TableCell>{entry.vietnamese}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{entry.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{entry.novel_genre || "tienhiep"}</Badge>
                  </TableCell>
                  <TableCell>
                    {isAdmin && (
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(entry.id)} className="text-destructive">
                        <TrashIcon className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    Không có từ vựng nào đang chờ duyệt.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

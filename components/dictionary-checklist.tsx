"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2Icon, CircleIcon, ClipboardListIcon } from "lucide-react";
import { useGlobalNameEntries } from "@/lib/hooks/use-name-entries";
import { NAME_ENTRY_CATEGORIES } from "@/lib/db";

export function DictionaryChecklist() {
  const entries = useGlobalNameEntries();
  
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    NAME_ENTRY_CATEGORIES.forEach(cat => counts[cat] = 0);
    
    (entries || []).forEach(e => {
      if (counts[e.category] !== undefined) {
        counts[e.category]++;
      } else {
        counts["khác"]++;
      }
    });
    
    return counts;
  }, [entries]);

  const checklistItems = [
    { label: "Từ đơn", category: "Từ đơn", min: 50 },
    { label: "Từ đôi", category: "Từ đôi", min: 100 },
    { label: "Cụm hành động", category: "Cụm hành động", min: 30 },
    { label: "Cụm cảm xúc", category: "Cụm cảm xúc", min: 20 },
    { label: "Trạng từ", category: "Trạng từ", min: 20 },
    { label: "Từ nối", category: "Từ nối", min: 15 },
    { label: "Trợ từ", category: "Trợ từ", min: 10 },
    { label: "Thuật ngữ tu tiên", category: "Thuật ngữ tu tiên", min: 50 },
    { label: "Phiên âm tên", category: "Phiên âm tên", min: 100 },
    { label: "Pattern câu", category: "Pattern câu", min: 10 },
    { label: "Context mapping", category: "Context mapping", min: 5 },
    { label: "Âm thanh", category: "Âm thanh", min: 10 },
  ];

  const completedCount = checklistItems.filter(item => stats[item.category] >= item.min).length;
  const progress = (completedCount / checklistItems.length) * 100;

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardListIcon className="size-5 text-primary" />
            <CardTitle>Checklist xây dựng từ điển</CardTitle>
          </div>
          <Badge variant="outline" className="bg-background">
            {completedCount}/{checklistItems.length} hoàn thành
          </Badge>
        </div>
        <CardDescription>
          Theo dõi tiến độ hoàn thiện các bộ từ điển chuyên sâu để đạt chất lượng dịch tốt nhất.
        </CardDescription>
        <Progress value={progress} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {checklistItems.map((item, idx) => {
            const count = stats[item.category] || 0;
            const isDone = count >= item.min;
            
            return (
              <div 
                key={idx} 
                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                  isDone ? "bg-primary/10 border-primary/30" : "bg-background border-border"
                }`}
              >
                {isDone ? (
                  <CheckCircle2Icon className="size-4 text-primary shrink-0" />
                ) : (
                  <CircleIcon className="size-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{item.label}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {count}/{item.min} mục
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

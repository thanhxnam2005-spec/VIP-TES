"use client";

import { useScraperQueueStore } from "@/lib/stores/scraper-queue";
import { 
  PauseIcon, 
  PlayIcon, 
  XIcon, 
  Loader2Icon, 
  ChevronUpIcon, 
  ChevronDownIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  XCircleIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function ScraperOverlay() {
  const { 
    jobs,
    isOverlayMinimized,
    setMinimized,
    pauseJob,
    resumeJob,
    cancelJob,
    clearDone
  } = useScraperQueueStore();

  const activeJobs = Object.values(jobs);
  
  if (activeJobs.length === 0) return null;

  const allDone = activeJobs.every(j => j.status === "done" || j.status === "error");

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-[100] w-80 rounded-xl border bg-background shadow-2xl transition-all duration-300 flex flex-col",
        isOverlayMinimized ? "h-12" : "max-h-[80vh]"
      )}
    >
      {/* Header */}
      <div className="flex h-12 items-center justify-between px-4 border-b shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          {allDone ? (
            <CheckCircle2Icon className="size-4 text-green-500 shrink-0" />
          ) : (
            <Loader2Icon className="size-4 text-primary shrink-0 animate-spin" />
          )}
          <span className="text-xs font-semibold truncate">
            {allDone ? "Đã hoàn tất tất cả" : `Đang tải ${activeJobs.length} truyện...`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon-xs" 
            onClick={() => setMinimized(!isOverlayMinimized)}
          >
            {isOverlayMinimized ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
          </Button>
          {allDone && (
            <Button 
              variant="ghost" 
              size="icon-xs" 
              onClick={clearDone}
            >
              <XIcon className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      {!isOverlayMinimized && (
        <div className="p-3 space-y-3 overflow-y-auto overscroll-contain">
          {activeJobs.map(job => {
            const percentage = job.progress.total > 0 
              ? Math.round((job.progress.completed / job.progress.total) * 100) 
              : 0;
            const isFinished = job.status === "done";
            const isError = job.status === "error";
            const isPaused = job.status === "paused";

            return (
              <div key={job.id} className="rounded-lg border bg-muted/20 p-3 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold truncate pr-6">{job.title}</span>
                  <Button 
                    variant="ghost" 
                    size="icon-xs" 
                    className="absolute top-2 right-2 h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={() => cancelJob(job.id)}
                  >
                    <XIcon className="size-3" />
                  </Button>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{job.progress.completed} / {job.progress.total} chương</span>
                    <span className="font-medium text-foreground">{percentage}%</span>
                  </div>
                  <Progress value={percentage} className={cn("h-1.5", isError && "bg-destructive/20 [&>div]:bg-destructive")} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className={cn(
                      "text-[10px] truncate",
                      isError ? "text-destructive" : isFinished ? "text-green-500" : "text-muted-foreground"
                    )}>
                      {isError ? job.error : isFinished ? "Đã xong" : job.progress.current || "Đang kết nối..."}
                    </p>
                    {job.warnCount > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                        <AlertTriangleIcon className="size-2.5" />
                        <span>{job.warnCount} cảnh báo</span>
                      </div>
                    )}
                  </div>
                  
                  {!isFinished && !isError && (
                    <div className="shrink-0">
                      {isPaused ? (
                        <Button variant="outline" size="icon-xs" className="h-6 w-6" onClick={() => resumeJob(job.id)}>
                          <PlayIcon className="size-3" />
                        </Button>
                      ) : (
                        <Button variant="outline" size="icon-xs" className="h-6 w-6" onClick={() => pauseJob(job.id)}>
                          <PauseIcon className="size-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  XCircleIcon,
  LaptopIcon,
  SkipForwardIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function ScraperOverlay() {
  const { 
    jobs,
    isOverlayMinimized,
    fetchingInfo,
    setMinimized,
    pauseJob,
    resumeJob,
    skipChapterJob,
    cancelJob,
    clearDone
  } = useScraperQueueStore();

  const activeJobs = Object.values(jobs);
  
  if (activeJobs.length === 0 && !fetchingInfo.visible) return null;

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
          {fetchingInfo.visible ? (
            <Loader2Icon className="size-4 text-blue-500 shrink-0 animate-spin" />
          ) : allDone ? (
            <CheckCircle2Icon className="size-4 text-green-500 shrink-0" />
          ) : (
            <Loader2Icon className="size-4 text-primary shrink-0 animate-spin" />
          )}
          <span className="text-xs font-semibold truncate">
            {fetchingInfo.visible ? "Đang quét truyện mới..." : allDone ? "Đã hoàn tất tất cả" : `Đang tải ${activeJobs.length} truyện...`}
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
          {fetchingInfo.visible && (
            <div className="rounded-xl border p-3.5 space-y-3 relative transition-colors shadow-sm bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900/30">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold truncate pr-4 text-foreground/90">Đang quét danh sách chương...</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                  <span>{fetchingInfo.count} chương đã tìm thấy</span>
                </div>
                <Progress value={undefined} className="h-2 rounded-full [&>div]:bg-blue-500 bg-blue-500/20" />
              </div>
              <div className="flex items-start justify-between gap-3 min-h-[1.5rem]">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] leading-tight font-medium break-words text-blue-600 dark:text-blue-400">
                    Đang tìm kiếm thêm trang... {new URL(fetchingInfo.url).hostname}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeJobs.map(job => {
            const percentage = job.progress.total > 0 
              ? Math.round((job.progress.completed / job.progress.total) * 100) 
              : 0;
            const isFinished = job.status === "done";
            const isError = job.status === "error";
            const isPaused = job.status === "paused";

            return (
              <div key={job.id} className={cn(
                "rounded-xl border p-3.5 space-y-3 relative transition-colors shadow-sm",
                isFinished ? "bg-green-50/50 border-green-100 dark:bg-green-950/10 dark:border-green-900/30" : 
                isError ? "bg-red-50/50 border-red-100 dark:bg-red-950/10 dark:border-red-900/30" :
                "bg-muted/30 border-border"
              )}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold truncate pr-4 text-foreground/90">{job.title}</span>
                  <Button 
                    variant="ghost" 
                    size="icon-xs" 
                    className="absolute top-2 right-2 h-6 w-6 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => cancelJob(job.id)}
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                    <span>{job.progress.completed} / {job.progress.total} chương</span>
                    <span className={cn(
                      "tabular-nums",
                      isFinished ? "text-green-600" : isError ? "text-red-600" : "text-primary"
                    )}>{percentage}%</span>
                  </div>
                  <Progress value={percentage} className={cn(
                    "h-2 rounded-full",
                    isError ? "bg-destructive/20 [&>div]:bg-destructive" : 
                    isFinished ? "bg-green-500/20 [&>div]:bg-green-500" : 
                    "[&>div]:bg-primary bg-primary/10"
                  )} />
                </div>
                
                <div className="flex items-start justify-between gap-3 min-h-[1.5rem]">
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[10px] leading-tight font-medium break-words",
                      isError ? "text-destructive" : isFinished ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                    )}>
                      {isError ? (
                        job.error?.startsWith("STV_RESUME_REQUIRED") ? "Đợi thao tác từ bạn..." : job.error
                      ) : isFinished ? "Đã hoàn tất" : job.progress.current || "Đang khởi tạo..."}
                    </p>
                    {job.warnCount > 0 && !isFinished && !isError && (
                      <div className="flex items-center gap-1 mt-1 text-[9px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 w-fit px-1.5 py-0.5 rounded border border-amber-500/20">
                        <AlertTriangleIcon className="size-2.5" />
                        <span>{job.warnCount} CẢNH BÁO</span>
                      </div>
                    )}
                  </div>
                  
                  {!isFinished && (
                    <div className="shrink-0 flex items-center gap-1.5">
                      {isError ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[11px] font-bold gap-1.5 px-3 rounded-lg shadow-sm active:scale-95 transition-transform"
                            onClick={() => skipChapterJob(job.id)}
                          >
                            Bỏ qua
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-8 text-[11px] font-bold bg-green-600 hover:bg-green-700 text-white gap-1.5 px-3 rounded-lg shadow-sm active:scale-95 transition-transform"
                            onClick={() => resumeJob(job.id)}
                          >
                            <PlayIcon className="size-3" />
                            Tiếp tục
                          </Button>
                        </>
                      ) : isPaused ? (
                        <>
                          <Button variant="outline" title="Bỏ qua chương này" size="icon-xs" className="h-7 w-7 rounded-lg" onClick={() => skipChapterJob(job.id)}>
                            <SkipForwardIcon className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="outline" title="Tiếp tục" size="icon-xs" className="h-7 w-7 rounded-lg" onClick={() => resumeJob(job.id)}>
                            <PlayIcon className="size-3.5 text-primary" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" title="Bỏ qua chương này" size="icon-xs" className="h-7 w-7 rounded-lg" onClick={() => skipChapterJob(job.id)}>
                            <SkipForwardIcon className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="outline" title="Tạm dừng" size="icon-xs" className="h-7 w-7 rounded-lg" onClick={() => pauseJob(job.id)}>
                            <PauseIcon className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {isError && job.error?.startsWith("STV_RESUME_REQUIRED|") && (
                  <div className="mt-1 rounded-xl bg-blue-500/5 p-3 border border-blue-500/20 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-300">
                    {(() => {
                      const [, title, msg] = job.error.split("|");
                      return (
                        <>
                          <div className="flex gap-2">
                            <div className="size-4 shrink-0 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <LaptopIcon className="size-2.5 text-blue-600" />
                            </div>
                            <p className="text-[10px] leading-relaxed text-blue-800 dark:text-blue-300 font-medium">
                              {msg}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 rounded-lg bg-blue-500/10 px-2.5 py-2">
                            <span className="text-[9px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-tight">Vào đúng chương này trên STV:</span>
                            <span className="text-[10px] text-blue-900 dark:text-blue-100 font-bold truncate leading-tight">{title}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

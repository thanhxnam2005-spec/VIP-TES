"use client";

import { Button } from "@/components/ui/button";
import { useReaderPanel } from "@/lib/stores/reader-panel";
import { Loader2Icon, PauseIcon, PlayIcon } from "lucide-react";

export function ReaderControls() {
  const isPlaying = useReaderPanel((s) => s.isPlaying);
  const isPaused = useReaderPanel((s) => s.isPaused);
  const isLoading = useReaderPanel((s) => s.isLoading);
  const currentSentenceIndex = useReaderPanel((s) => s.currentSentenceIndex);
  const sentences = useReaderPanel((s) => s.sentences);
  const play = useReaderPanel((s) => s.play);
  const pause = useReaderPanel((s) => s.pause);
  const resume = useReaderPanel((s) => s.resume);
  const stop = useReaderPanel((s) => s.stop);

  const total = sentences.length;
  const current = total > 0 ? currentSentenceIndex + 1 : 0;

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      play();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={handlePlayPause}
        disabled={total === 0}
        className="flex-1"
      >
        {isLoading ? (
          <>
            <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
            Đang tải...
          </>
        ) : isPlaying ? (
          <>
            <PauseIcon className="mr-1.5 size-3.5" />
            Tạm dừng
          </>
        ) : (
          <>
            <PlayIcon className="mr-1.5 size-3.5" />
            {isPaused ? "Tiếp tục" : "Phát"}
          </>
        )}
      </Button>
      {(isPlaying || isPaused) && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={stop}
          title="Dừng và quay về đầu"
        >
          <span className="text-xs">✕</span>
        </Button>
      )}
      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
        {current} / {total}
      </span>
    </div>
  );
}

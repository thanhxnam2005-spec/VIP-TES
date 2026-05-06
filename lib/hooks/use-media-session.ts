import { useEffect, useMemo } from "react";
import { useReaderPanel } from "@/lib/stores/reader-panel";
import type { Sentence } from "@/lib/tts";

/** Average characters read per second at rate=1.0 (tuned for Vietnamese TTS). */
const CHARS_PER_SEC_BASE = 14;

/**
 * Compute the start-time (in seconds) for each sentence and the total duration,
 * using character count as a proxy for speaking time.
 */
function estimatePositions(
  sentences: Sentence[],
  rate: number,
): { positions: number[]; totalDuration: number } {
  const charsPerSec = CHARS_PER_SEC_BASE * Math.max(rate, 0.1);
  const positions: number[] = [];
  let cumulative = 0;
  for (const s of sentences) {
    positions.push(cumulative);
    cumulative += Math.max(s.text.length / charsPerSec, 0.3);
  }
  return { positions, totalDuration: cumulative };
}

/** Map a seek time (seconds) back to the closest sentence index. */
function timeToIndex(
  seekTime: number,
  sentences: Sentence[],
  rate: number,
): number {
  if (sentences.length === 0) return 0;
  const { positions } = estimatePositions(sentences, rate);
  for (let i = positions.length - 1; i >= 0; i--) {
    if ((positions[i] ?? 0) <= seekTime) return i;
  }
  return 0;
}

interface UseMediaSessionOptions {
  novelTitle: string;
  chapterTitle: string;
  chapterNumber: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

function trySetHandler(
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null,
) {
  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch {
    // Browser may not support this action
  }
}

/**
 * Integrates TTS playback with the browser Media Session API.
 *
 * - Populates lock-screen / notification-bar metadata (title, artist, album)
 * - Syncs playback state (playing / paused / none)
 * - Exposes a seekable progress bar via setPositionState where
 *   1 unit = 1 sentence, so the OS scrubber maps to chapter position
 * - Handles: play, pause, stop, previoustrack, nexttrack, seekto,
 *   seekforward, seekbackward
 */
export function useMediaSession({
  novelTitle,
  chapterTitle,
  chapterNumber,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: UseMediaSessionOptions) {
  const isOpen = useReaderPanel((s) => s.isOpen);
  const isPlaying = useReaderPanel((s) => s.isPlaying);
  const isPaused = useReaderPanel((s) => s.isPaused);
  const currentSentenceIndex = useReaderPanel((s) => s.currentSentenceIndex);
  const sentences = useReaderPanel((s) => s.sentences);
  const ttsRate = useReaderPanel((s) => s.ttsSettings.rate);

  const { positions, totalDuration } = useMemo(
    () => estimatePositions(sentences, ttsRate),
    [sentences, ttsRate],
  );

  // Update metadata whenever chapter or panel state changes
  useEffect(() => {
    if (!("mediaSession" in navigator) || !isOpen) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: chapterTitle,
      artist: novelTitle,
      album: `Chương ${chapterNumber}`,
    });
  }, [novelTitle, chapterTitle, chapterNumber, isOpen]);

  // Keep OS playback state indicator in sync
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying
      ? "playing"
      : isPaused
        ? "paused"
        : "none";
  }, [isPlaying, isPaused]);

  // Update the OS progress bar with real time estimates
  useEffect(() => {
    if (!("mediaSession" in navigator) || !isOpen || totalDuration === 0)
      return;
    if (!isPlaying && !isPaused) return;

    const position = positions[currentSentenceIndex] ?? 0;
    try {
      navigator.mediaSession.setPositionState({
        duration: totalDuration,
        position: Math.min(position, totalDuration),
        playbackRate: ttsRate,
      });
    } catch {
      // setPositionState requires active media — may throw when idle
    }
  }, [
    currentSentenceIndex,
    positions,
    totalDuration,
    ttsRate,
    isOpen,
    isPlaying,
    isPaused,
  ]);

  // Register transport + seek action handlers
  useEffect(() => {
    if (!("mediaSession" in navigator) || !isOpen) return;

    trySetHandler("play", () => {
      const s = useReaderPanel.getState();
      if (s.isPaused) s.resume();
      else if (!s.isPlaying) s.play();
    });

    trySetHandler("pause", () => useReaderPanel.getState().pause());
    trySetHandler("stop", () => useReaderPanel.getState().stop());

    // Seek to absolute time position from scrubber drag
    trySetHandler("seekto", (details) => {
      const { sentences: s, ttsSettings, jumpTo } = useReaderPanel.getState();
      if (details.seekTime != null && s.length > 0) {
        jumpTo(timeToIndex(details.seekTime, s, ttsSettings.rate));
      }
    });

    // Skip forward/backward by N seconds (default 10s)
    trySetHandler("seekforward", (details) => {
      const {
        sentences: s,
        currentSentenceIndex: idx,
        ttsSettings,
        jumpTo,
      } = useReaderPanel.getState();
      const { positions: pos, totalDuration: dur } = estimatePositions(
        s,
        ttsSettings.rate,
      );
      const currentTime = pos[idx] ?? 0;
      const targetTime = Math.min(
        currentTime + (details.seekOffset ?? 10),
        dur,
      );
      jumpTo(timeToIndex(targetTime, s, ttsSettings.rate));
    });

    trySetHandler("seekbackward", (details) => {
      const {
        sentences: s,
        currentSentenceIndex: idx,
        ttsSettings,
        jumpTo,
      } = useReaderPanel.getState();
      const { positions: pos } = estimatePositions(s, ttsSettings.rate);
      const currentTime = pos[idx] ?? 0;
      const targetTime = Math.max(currentTime - (details.seekOffset ?? 10), 0);
      jumpTo(timeToIndex(targetTime, s, ttsSettings.rate));
    });

    trySetHandler("previoustrack", hasPrev ? () => onPrev() : null);

    trySetHandler("nexttrack", hasNext ? () => onNext() : null);

    return () => {
      const actions: MediaSessionAction[] = [
        "play",
        "pause",
        "stop",
        "seekto",
        "seekforward",
        "seekbackward",
        "previoustrack",
        "nexttrack",
      ];
      for (const action of actions) trySetHandler(action, null);
    };
  }, [isOpen, hasPrev, hasNext, onPrev, onNext]);

  // Clear session when panel is closed
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!isOpen) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    }
  }, [isOpen]);
}

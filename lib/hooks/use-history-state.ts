"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface HistorySnapshot {
  title: string;
  content: string;
}

interface UseHistoryStateOptions {
  capacity?: number;
  debounceMs?: number;
}

interface HistoryState {
  entries: HistorySnapshot[];
  pointer: number;
}

const DEFAULT_CAPACITY = 50;
const DEFAULT_DEBOUNCE_MS = 500;

/**
 * Undo/redo hook that tracks `{ title, content }` snapshots.
 *
 * - `setTitle`/`setContent` update state immediately and push a debounced snapshot.
 * - `pushSnapshot(next)` is for AI operations: captures "before" state, then applies "after".
 * - `undo()`/`redo()` navigate the history stack.
 * - Session-only — no DB persistence.
 */
export function useHistoryState(
  initialTitle: string,
  initialContent: string,
  opts?: UseHistoryStateOptions,
) {
  const capacity = opts?.capacity ?? DEFAULT_CAPACITY;
  const debounceMs = opts?.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  // Core history state — kept in a single useState to ensure consistency
  const [history, setHistory] = useState<HistoryState>(() => ({
    entries: [{ title: initialTitle, content: initialContent }],
    pointer: 0,
  }));

  // Current display values
  const [title, setTitleState] = useState(initialTitle);
  const [content, setContentState] = useState(initialContent);

  // Track DB initialization
  const [dbKey, setDbKey] = useState("");
  const computedDbKey = `${initialTitle}\0${initialContent}`;
  if (computedDbKey !== "\0" && dbKey !== computedDbKey) {
    // First non-empty initial values from Dexie — reset history
    setDbKey(computedDbKey);
    setHistory({
      entries: [{ title: initialTitle, content: initialContent }],
      pointer: 0,
    });
    setTitleState(initialTitle);
    setContentState(initialContent);
  }

  // Refs for debounce closure (synced via effect)
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  useEffect(() => {
    titleRef.current = title;
    contentRef.current = content;
  });

  // Ref mirror of history for use in callbacks (avoids stale closures)
  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const canUndo = history.pointer > 0;
  const canRedo = history.pointer < history.entries.length - 1;

  // ─── Internal helpers ──────────────────────────────────────

  const pushEntryToHistory = useCallback(
    (prev: HistoryState, snap: HistorySnapshot): HistoryState => {
      const entries = [...prev.entries.slice(0, prev.pointer + 1), snap];
      let pointer = entries.length - 1;
      // Cap at capacity
      if (entries.length > capacity) {
        entries.splice(0, entries.length - capacity);
        pointer = entries.length - 1;
      }
      return { entries, pointer };
    },
    [capacity],
  );

  const getCurrentSnap = useCallback((): HistorySnapshot => {
    return { title: titleRef.current, content: contentRef.current };
  }, []);

  const isDirtyVsHistory = useCallback((): boolean => {
    const h = historyRef.current;
    const cur = h.entries[h.pointer];
    return titleRef.current !== cur.title || contentRef.current !== cur.content;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  // Push current state if it differs from history[pointer]
  const flushIfDirty = useCallback(() => {
    if (isDirtyVsHistory()) {
      const snap = getCurrentSnap();
      setHistory((prev) => pushEntryToHistory(prev, snap));
    }
  }, [isDirtyVsHistory, getCurrentSnap, pushEntryToHistory]);

  // ─── Debounced snapshot ────────────────────────────────────

  const schedulePush = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      flushIfDirty();
    }, debounceMs);
  }, [debounceMs, flushIfDirty, clearTimer]);

  const flush = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimer();
      flushIfDirty();
    }
  }, [flushIfDirty, clearTimer]);

  // ─── Public API ────────────────────────────────────────────

  const setTitle = useCallback(
    (v: string) => {
      setTitleState(v);
      schedulePush();
    },
    [schedulePush],
  );

  const setContent = useCallback(
    (v: string) => {
      setContentState(v);
      schedulePush();
    },
    [schedulePush],
  );

  const pushSnapshot = useCallback(
    (next: HistorySnapshot) => {
      clearTimer();
      setHistory((prev) => {
        // Push current state first if it differs (captures "before")
        let h = prev;
        const cur = h.entries[h.pointer];
        if (titleRef.current !== cur.title || contentRef.current !== cur.content) {
          h = pushEntryToHistory(h, { title: titleRef.current, content: contentRef.current });
        }
        // Push the new state
        return pushEntryToHistory(h, next);
      });
      setTitleState(next.title);
      setContentState(next.content);
    },
    [pushEntryToHistory, clearTimer],
  );

  const undo = useCallback(() => {
    // Flush pending typing so it becomes redo-able
    flush();
    setHistory((prev) => {
      if (prev.pointer <= 0) return prev;
      const newPointer = prev.pointer - 1;
      const snap = prev.entries[newPointer];
      setTitleState(snap.title);
      setContentState(snap.content);
      return { ...prev, pointer: newPointer };
    });
  }, [flush]);

  const redo = useCallback(() => {
    clearTimer();
    setHistory((prev) => {
      if (prev.pointer >= prev.entries.length - 1) return prev;
      const newPointer = prev.pointer + 1;
      const snap = prev.entries[newPointer];
      setTitleState(snap.title);
      setContentState(snap.content);
      return { ...prev, pointer: newPointer };
    });
  }, [clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    title,
    content,
    setTitle,
    setContent,
    pushSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

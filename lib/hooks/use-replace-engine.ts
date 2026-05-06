import { useCallback, useEffect, useRef } from "react";
import type { ReplaceRule } from "@/lib/replace-engine";
import type {
  ReplaceWorkerRequest,
  ReplaceWorkerResponse,
} from "@/lib/workers/replace-engine.types";

interface PendingCallback {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  onProgress?: (
    itemId: string,
    output: string,
    matchCount: number,
  ) => void;
}

/**
 * Hook that provides find/replace/batch methods backed by a Web Worker.
 * Worker is lazily instantiated on first call and cleaned up on unmount.
 */
export function useReplaceEngine() {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef(new Map<string, PendingCallback>());

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      const w = new Worker(
        new URL(
          "@/lib/workers/replace-engine.worker.ts",
          import.meta.url,
        ),
        { type: "module" },
      );
      w.onmessage = (event: MessageEvent<ReplaceWorkerResponse>) => {
        const msg = event.data;
        const cb = callbacksRef.current.get(msg.id);
        if (!cb) return;

        switch (msg.type) {
          case "find-result":
            callbacksRef.current.delete(msg.id);
            cb.resolve({ matches: msg.matches, count: msg.count });
            break;
          case "replace-result":
            callbacksRef.current.delete(msg.id);
            cb.resolve({ output: msg.output, matchCount: msg.matchCount });
            break;
          case "batch-progress":
            cb.onProgress?.(msg.itemId, msg.output, msg.matchCount);
            break;
          case "batch-complete":
            callbacksRef.current.delete(msg.id);
            cb.resolve(undefined);
            break;
          case "error":
            callbacksRef.current.delete(msg.id);
            cb.reject(new Error(msg.message));
            break;
        }
      };
      workerRef.current = w;
    }
    return workerRef.current;
  }, []);

  const send = useCallback(
    (msg: ReplaceWorkerRequest) => {
      getWorker().postMessage(msg);
    },
    [getWorker],
  );

  // Cleanup on unmount
  useEffect(() => {
    const worker = workerRef;
    const callbacks = callbacksRef;
    return () => {
      worker.current?.terminate();
      worker.current = null;
      callbacks.current.clear();
    };
  }, []);

  const find = useCallback(
    (
      text: string,
      pattern: string,
      opts?: { isRegex?: boolean; caseSensitive?: boolean },
    ): Promise<{
      matches: Array<{ index: number; length: number }>;
      count: number;
    }> => {
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        callbacksRef.current.set(id, {
          resolve: resolve as (v: unknown) => void,
          reject,
        });
        send({
          type: "find",
          id,
          text,
          pattern,
          isRegex: opts?.isRegex,
          caseSensitive: opts?.caseSensitive,
        });
      });
    },
    [send],
  );

  const replace = useCallback(
    (
      text: string,
      rules: ReplaceRule[],
    ): Promise<{ output: string; matchCount: number }> => {
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        callbacksRef.current.set(id, {
          resolve: resolve as (v: unknown) => void,
          reject,
        });
        send({ type: "replace", id, text, rules });
      });
    },
    [send],
  );

  const replaceBatch = useCallback(
    (
      items: Array<{ itemId: string; text: string }>,
      rules: ReplaceRule[],
      onProgress?: (
        itemId: string,
        output: string,
        matchCount: number,
      ) => void,
    ): Promise<void> => {
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        callbacksRef.current.set(id, {
          resolve: resolve as (v: unknown) => void,
          reject,
          onProgress,
        });
        send({ type: "replace-batch", id, items, rules });
      });
    },
    [send],
  );

  return { find, replace, replaceBatch };
}

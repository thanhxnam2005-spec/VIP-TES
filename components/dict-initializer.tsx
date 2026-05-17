"use client";

import { useEffect } from "react";
import { loadRawDictTexts } from "@/lib/hooks/use-dict-entries";
import {
  initQTEngineWithRawData,
  setDictLoadProgress,
  setDictLoadPhase,
  setDictLoadError,
} from "@/lib/hooks/use-qt-engine";

export function DictInitializer() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setDictLoadPhase("loading");

        // Load raw text from IDB cache (no parsing on main thread!)
        const rawTexts = await loadRawDictTexts((source, percent) => {
          if (!cancelled) setDictLoadProgress(source, percent);
        });

        if (cancelled) return;

        // Send raw text to worker — parsing happens off main thread
        setDictLoadPhase("initializing");
        await initQTEngineWithRawData(rawTexts);
      } catch (err) {
        console.error("Dict initialization failed:", err);
        if (!cancelled) {
          setDictLoadError(
            err instanceof Error ? err.message : "Lỗi không xác định",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}


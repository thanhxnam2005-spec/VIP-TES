import { useCallback, useRef, useSyncExternalStore } from "react";

/* ------------------------------------------------------------------ */
/*  SSR-safe localStorage hook with cross-tab sync                     */
/* ------------------------------------------------------------------ */

type SetStateAction<T> = T | ((prev: T) => T);

/**
 * Persist state in `localStorage` — SSR-safe, cross-tab synced.
 *
 * ```ts
 * const [theme, setTheme] = useLocalStorage("theme", "light");
 * setTheme("dark");
 * setTheme(prev => prev === "dark" ? "light" : "dark");
 * ```
 *
 * - Reads from `localStorage` on mount (falls back to `initialValue`)
 * - Writes on every state change
 * - Listens for `storage` events so other tabs stay in sync
 * - During SSR / prerender, always returns `initialValue`
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (action: SetStateAction<T>) => void] {
  const initialRef = useRef(initialValue);

  // Cache parsed result to return stable references and avoid infinite loops.
  // useSyncExternalStore compares snapshots by Object.is — JSON.parse always
  // produces a new reference, so we must return the same object when the raw
  // string hasn't changed.
  const cacheRef = useRef<{ raw: string | null; parsed: T }>({
    raw: null,
    parsed: initialValue,
  });

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key) onStoreChange();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    [key],
  );

  const getSnapshot = useCallback((): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === cacheRef.current.raw) return cacheRef.current.parsed;
      const parsed =
        raw !== null ? (JSON.parse(raw) as T) : initialRef.current;
      cacheRef.current = { raw, parsed };
      return parsed;
    } catch {
      return initialRef.current;
    }
  }, [key]);

  const getServerSnapshot = useCallback((): T => initialRef.current, []);

  const value = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setValue = useCallback(
    (action: SetStateAction<T>) => {
      try {
        const current = getSnapshot();
        const next =
          typeof action === "function"
            ? (action as (prev: T) => T)(current)
            : action;
        const raw = JSON.stringify(next);
        localStorage.setItem(key, raw);
        // Update cache immediately so getSnapshot returns the new value
        cacheRef.current = { raw, parsed: next };
        // Notify same-tab listeners (storage event only fires cross-tab)
        window.dispatchEvent(
          new StorageEvent("storage", { key, newValue: raw }),
        );
      } catch {
        /* quota exceeded — silently ignore */
      }
    },
    [key, getSnapshot],
  );

  return [value, setValue];
}

/**
 * Remove a key from localStorage and notify listeners.
 */
export function removeLocalStorage(key: string) {
  try {
    localStorage.removeItem(key);
    window.dispatchEvent(
      new StorageEvent("storage", { key, newValue: null }),
    );
  } catch {
    /* ignore */
  }
}

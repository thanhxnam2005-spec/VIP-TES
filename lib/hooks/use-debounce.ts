import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Returns a debounced version of the given value.
 * Updates only after `delay` ms of inactivity.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Returns a debounced version of the given callback.
 *
 * - `run(...args)` — schedule execution after `delay` ms of inactivity
 * - `flush()` — execute immediately if pending
 * - `cancel()` — cancel pending execution
 * - `isPending()` — whether a call is scheduled (ref-based, no re-render)
 *
 * The returned object is stable (same reference across renders).
 * The latest callback is always used (no stale closures).
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const argsRef = useRef<Args | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
      argsRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
      const args = argsRef.current;
      argsRef.current = null;
      if (args) callbackRef.current(...args);
    }
  }, []);

  const run = useCallback(
    (...args: Args) => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
      argsRef.current = args;
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        argsRef.current = null;
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  );

  const isPending = useCallback(() => timerRef.current !== undefined, []);

  useEffect(() => cancel, [cancel]);

  return { run, flush, cancel, isPending } as const;
}

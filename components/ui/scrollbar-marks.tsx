"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type RefObject } from "react";

export interface ScrollbarMark {
  /** Position 0–1 within the scrollbar track */
  position: number;
  /** Tailwind background color class */
  color: string;
}

/** Max marks rendered — beyond this we sample evenly to avoid DOM bloat */
const MAX_RENDERED_MARKS = 500;

/**
 * Renders colored marks on a narrow track beside the scrollbar.
 *
 * Two modes:
 * 1. **Pre-computed**: pass `marks` directly.
 * 2. **DOM-measured**: pass `scrollRef` + `selector`. Queries matching elements,
 *    reads `offsetTop`, and maps to scrollbar-track positions.
 *    Uses `requestIdleCallback` to avoid blocking the main thread.
 */
export function ScrollbarMarks({
  marks: manualMarks,
  scrollRef,
  contentRef,
  selector,
  defaultColor = "bg-yellow-400 dark:bg-yellow-500",
  className,
}: {
  marks?: ScrollbarMark[];
  scrollRef?: RefObject<HTMLElement | null>;
  contentRef?: RefObject<HTMLElement | null>;
  selector?: string;
  defaultColor?: string;
  className?: string;
}) {
  const [measuredMarks, setMeasuredMarks] = useState<ScrollbarMark[]>([]);
  const idleRef = useRef<number>(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el || !selector) return;

    const measure = () => {
      // Cancel any pending idle callback
      if (idleRef.current) cancelIdleCallback(idleRef.current);

      // Schedule measurement during idle time to avoid blocking UI
      idleRef.current = requestIdleCallback(
        () => {
          const scrollH = el.scrollHeight;
          const clientH = el.clientHeight;
          if (scrollH <= clientH) {
            setMeasuredMarks([]);
            return;
          }

          const maxScroll = scrollH - clientH;
          const thumbFraction = clientH / scrollH;
          const queryRoot = contentRef?.current ?? el;
          const elements = queryRoot.querySelectorAll(selector);
          console.log({ scrollH, clientH, maxScroll, thumbFraction });
          const next: ScrollbarMark[] = [];
          // Read all offsetTops in one batch (single forced layout)
          const entries: Array<{ top: number; color: string }> = [];
          elements.forEach((node) => {
            const htmlEl = node as HTMLElement;
            entries.push({
              top: htmlEl.offsetTop,
              color: htmlEl.dataset.markColor || defaultColor,
            });
          });

          // Compute positions (pure math, no DOM access)
          for (const entry of entries) {
            const scrollRatio = Math.min(entry.top / maxScroll, 1);
            const trackPos = scrollRatio * (1 - thumbFraction);
            next.push({ position: Math.min(trackPos, 1), color: entry.color });
          }

          setMeasuredMarks(next);
        },
        { timeout: 500 },
      );
    };

    measure();

    // Debounce ResizeObserver to avoid measuring on every frame during animation
    const ro = new ResizeObserver(() => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(measure, 150);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      if (idleRef.current) cancelIdleCallback(idleRef.current);
      clearTimeout(debounceRef.current);
    };
  }, [scrollRef, contentRef, selector, defaultColor]);

  const marks = manualMarks ?? measuredMarks;
  if (marks.length === 0) return null;

  // Sample marks if there are too many to avoid DOM bloat
  const rendered =
    marks.length > MAX_RENDERED_MARKS ? sampleMarks(marks) : marks;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 right-0 z-10 w-3",
        className,
      )}
    >
      {rendered.map((mark, i) => (
        <div
          key={i}
          className={cn(
            "absolute right-0.5 h-0.5 w-2.5 rounded-full opacity-50",
            mark.color,
          )}
          style={{ top: `${mark.position * 100}%` }}
        />
      ))}
    </div>
  );
}

/** Evenly sample marks down to MAX_RENDERED_MARKS */
function sampleMarks(marks: ScrollbarMark[]): ScrollbarMark[] {
  const step = marks.length / MAX_RENDERED_MARKS;
  const result: ScrollbarMark[] = [];
  for (let i = 0; i < MAX_RENDERED_MARKS; i++) {
    result.push(marks[Math.floor(i * step)]);
  }
  return result;
}

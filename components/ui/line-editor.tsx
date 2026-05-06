"use client";

import { cn } from "@/lib/utils";
import { stringToColor, tokenizeXml } from "@/lib/utils/string-to-color";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ScrollbarMarks } from "./scrollbar-marks";

interface HighlightRegistry {
  set(name: string, hl: InstanceType<typeof globalThis.Highlight>): void;
  delete(name: string): boolean;
  clear(): void;
  has(name: string): boolean;
}

const supportsHighlightAPI =
  typeof CSS !== "undefined" &&
  "highlights" in CSS &&
  typeof globalThis.Highlight === "function";

function getRegistry(): HighlightRegistry | null {
  return supportsHighlightAPI
    ? (CSS.highlights as unknown as HighlightRegistry)
    : null;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FindHighlight {
  index: number;
  length: number;
}

interface LineEditorProps {
  /** Current text value */
  value: string;
  /** Called when text changes */
  onChange: (value: string) => void;
  /** Make the editor read-only */
  readOnly?: boolean;
  /** Placeholder shown when value is empty */
  placeholder?: string;
  /** Additional class names merged onto the root container */
  className?: string;
  /** Font-size Tailwind classes for content (default: "text-sm leading-5") */
  contentFont?: string;
  /** Font-size Tailwind classes for gutter (default: "text-xs leading-5") */
  gutterFont?: string;
  /** Highlight ranges (char index + length) rendered as marks in the mirror */
  highlights?: FindHighlight[] | null;
  /** Colorize XML-like tags using hashed hue per tag name */
  xmlColors?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const LINE_CLS = "flex";
const GUTTER_BASE =
  "w-12 shrink-0 self-stretch border-r bg-muted/30 pr-2 text-right font-mono text-muted-foreground/60 select-none";
const CONTENT_BASE =
  "min-w-0 flex-1 whitespace-pre-wrap break-words px-3 font-mono";

/* ------------------------------------------------------------------ */
/*  Legacy fallbacks (browsers without CSS Highlight API)              */
/* ------------------------------------------------------------------ */

function renderXmlLineFallback(line: string, isDark: boolean): React.ReactNode {
  if (!line) return "\u00A0";
  const tokens = tokenizeXml(line);
  if (tokens.every((t) => t.type === "text")) return line || "\u00A0";
  const colorOpts = isDark ? { s: 80, l: 72 } : { s: 70, l: 42 };
  return tokens.map((token, i) => {
    if (token.type === "text") return token.value || null;
    return (
      <span
        key={i}
        style={{
          display: "contents",
          color: stringToColor(token.tagName, colorOpts),
        }}
      >
        {token.value}
      </span>
    );
  });
}

function renderHighlightedLineFallback(
  line: string,
  lineStart: number,
  highlights: FindHighlight[],
): React.ReactNode {
  const lineEnd = lineStart + line.length;
  const relevant = highlights.filter(
    (h) => h.index < lineEnd && h.index + h.length > lineStart,
  );
  if (relevant.length === 0) return line || "\u00A0";

  const fragments: React.ReactNode[] = [];
  let cursor = 0;

  for (const h of relevant) {
    const start = Math.max(0, h.index - lineStart);
    const end = Math.min(line.length, h.index + h.length - lineStart);
    if (start > cursor) fragments.push(line.slice(cursor, start));
    fragments.push(
      <mark
        key={`${h.index}-${h.length}`}
        className="rounded-sm bg-yellow-200/80 text-inherit dark:bg-yellow-500/40"
        data-mark
      >
        {line.slice(start, end)}
      </mark>,
    );
    cursor = end;
  }
  if (cursor < line.length) fragments.push(line.slice(cursor));
  return fragments.length > 0 ? fragments : "\u00A0";
}

const RenderedLines = memo(function RenderedLines({
  value,
  gutterCls,
  contentCls,
  highlights,
  xmlColors,
  isDark,
  useHighlightApi,
}: {
  value: string;
  gutterCls: string;
  contentCls: string;
  highlights?: FindHighlight[] | null;
  xmlColors?: boolean;
  isDark?: boolean;
  useHighlightApi: boolean;
}) {
  const lines = useMemo(() => value.split("\n"), [value]);

  // Line start offsets – needed for fallback rendering AND data-mark
  const lineOffsets = useMemo(() => {
    if (!highlights || highlights.length === 0) return null;
    const offsets: number[] = [];
    let offset = 0;
    for (const line of lines) {
      offsets.push(offset);
      offset += line.length + 1;
    }
    return offsets;
  }, [lines, highlights]);

  // Lines that contain a find highlight – for data-mark on the line <div>,
  // used by ScrollbarMarks to compute scrollbar tick positions.
  const markedLines = useMemo(() => {
    if (!highlights || highlights.length === 0 || !lineOffsets) return null;
    const set = new Set<number>();
    for (const h of highlights) {
      const hEnd = h.index + h.length;
      for (let i = 0; i < lines.length; i++) {
        const ls = lineOffsets[i];
        const le = ls + lines[i].length;
        if (h.index < le && hEnd > ls) set.add(i);
      }
    }
    return set;
  }, [highlights, lines, lineOffsets]);

  return (
    <>
      {lines.map((line, i) => {
        const hasSearch = highlights && highlights.length > 0 && lineOffsets;

        let content: React.ReactNode;

        if (useHighlightApi) {
          // Pure text – CSS Highlight API handles all coloring
          content = line || "\u00A0";
        } else if (hasSearch) {
          content = renderHighlightedLineFallback(
            line,
            lineOffsets[i],
            highlights,
          );
        } else if (xmlColors) {
          content = renderXmlLineFallback(line, isDark ?? false);
        } else {
          content = line || "\u00A0";
        }

        return (
          <div
            key={i}
            className={LINE_CLS}
            {...(markedLines?.has(i) ? { "data-mark": "" } : undefined)}
          >
            <span className={gutterCls}>{i + 1}</span>
            <span className={contentCls} data-line-content>
              {content}
            </span>
          </div>
        );
      })}
    </>
  );
});

function useCSSHighlights(
  containerRef: React.RefObject<HTMLElement | null>,
  value: string,
  opts: {
    xmlColors?: boolean;
    isDark?: boolean;
    findHighlights?: FindHighlight[] | null;
  },
) {
  const { xmlColors, isDark, findHighlights } = opts;
  const registeredRef = useRef<string[]>([]);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useLayoutEffect(() => {
    const registry = getRegistry();
    if (!registry || !containerRef.current) return;

    // ---- clean previous registrations ----
    for (const name of registeredRef.current) {
      registry.delete(name);
    }
    registeredRef.current = [];

    const lines = value.split("\n");
    const contentSpans = containerRef.current.querySelectorAll(
      "[data-line-content]",
    );

    const names: string[] = [];
    const rules: string[] = [];

    // Helper: retrieve the single plain text node of a content span
    function getTextNode(span: Element, lineIdx: number): Text | null {
      const node = span.firstChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) return null;
      if ((node.textContent?.length ?? 0) !== lines[lineIdx].length)
        return null;
      return node as Text;
    }

    // ---- 1. XML tag coloring ----
    if (xmlColors) {
      const tagRanges = new Map<string, Range[]>();

      contentSpans.forEach((span, i) => {
        const line = lines[i];
        if (!line) return;
        const textNode = getTextNode(span, i);
        if (!textNode) return;

        const tokens = tokenizeXml(line);
        let offset = 0;

        for (const token of tokens) {
          if (token.type !== "text" && token.tagName) {
            try {
              const range = new Range();
              range.setStart(textNode, offset);
              range.setEnd(textNode, offset + token.value.length);
              let arr = tagRanges.get(token.tagName);
              if (!arr) {
                arr = [];
                tagRanges.set(token.tagName, arr);
              }
              arr.push(range);
            } catch {
              // offset out of bounds – skip
            }
          }
          offset += token.value.length;
        }
      });

      const colorOpts = isDark ? { s: 80, l: 72 } : { s: 70, l: 42 };

      for (const [tagName, ranges] of tagRanges) {
        const safeName = `xml-${tagName.replace(/[^a-zA-Z0-9]/g, "_")}`;
        try {
          registry.set(safeName, new globalThis.Highlight(...ranges));
          names.push(safeName);
          rules.push(
            `::highlight(${safeName}) { color: ${stringToColor(tagName, colorOpts)}; }`,
          );
        } catch {
          // skip
        }
      }
    }

    // ---- 2. Find-match highlighting ----
    if (findHighlights && findHighlights.length > 0) {
      const lineStarts: number[] = [];
      let off = 0;
      for (const line of lines) {
        lineStarts.push(off);
        off += line.length + 1;
      }

      const findRanges: Range[] = [];

      for (const h of findHighlights) {
        const hEnd = h.index + h.length;

        for (let i = 0; i < lines.length; i++) {
          const ls = lineStarts[i];
          const le = ls + lines[i].length;
          if (h.index >= le || hEnd <= ls) continue;

          const textNode = getTextNode(contentSpans[i], i);
          if (!textNode) continue;

          const start = Math.max(0, h.index - ls);
          const end = Math.min(lines[i].length, hEnd - ls);

          try {
            const range = new Range();
            range.setStart(textNode, start);
            range.setEnd(textNode, end);
            findRanges.push(range);
          } catch {
            // skip
          }
        }
      }

      if (findRanges.length > 0) {
        try {
          registry.set("find-match", new globalThis.Highlight(...findRanges));
          names.push("find-match");

          const bg = isDark
            ? "rgba(234, 179, 8, 0.4)"
            : "rgba(250, 204, 21, 0.8)";
          rules.push(`::highlight(find-match) { background-color: ${bg}; }`);
        } catch {
          // skip
        }
      }
    }

    registeredRef.current = names;

    // ---- inject / update <style> for ::highlight() rules ----
    if (!styleRef.current) {
      styleRef.current = document.createElement("style");
      styleRef.current.setAttribute("data-line-editor-highlights", "");
      document.head.appendChild(styleRef.current);
    }
    styleRef.current.textContent = rules.join("\n");
  }, [containerRef, value, xmlColors, isDark, findHighlights]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const registry = getRegistry();
      if (registry) {
        for (const name of registeredRef.current) {
          registry.delete(name);
        }
      }
      registeredRef.current = [];
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, []);
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function LineEditor({
  value,
  onChange,
  readOnly = false,
  placeholder,
  className,
  contentFont = "text-sm leading-5",
  gutterFont = "text-xs leading-5",
  highlights,
  xmlColors,
}: LineEditorProps) {
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const readOnlyContainerRef = useRef<HTMLDivElement | null>(null);
  const deferredValue = useDeferredValue(value);

  /* ---- dark mode detection ---- */
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false,
  );
  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  /* ---- derived values ---- */
  const gutterCls = cn(GUTTER_BASE, gutterFont);
  const contentCls = cn(CONTENT_BASE, contentFont);

  /* ---- CSS Custom Highlight API (XML + find) ---- */
  const highlightContainerRef = readOnly ? readOnlyContainerRef : mirrorRef;
  const highlightValue = readOnly ? value : deferredValue;

  useCSSHighlights(highlightContainerRef, highlightValue, {
    xmlColors,
    isDark,
    findHighlights: highlights,
  });

  /* ---- sync mirror padding with textarea scrollbar width ---- */
  useEffect(() => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!textarea || !mirror || readOnly) return;

    const sync = () => {
      const sw = textarea.offsetWidth - textarea.clientWidth;
      mirror.style.paddingRight = `${sw}px`;
    };
    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(textarea);
    return () => ro.disconnect();
  }, [readOnly]);

  /* ---- scroll sync ---- */
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    if (mirrorRef.current)
      mirrorRef.current.style.transform = `translateY(${-e.currentTarget.scrollTop}px)`;
  }, []);

  useLayoutEffect(() => {
    if (mirrorRef.current && textareaRef.current && !readOnly)
      mirrorRef.current.style.transform = `translateY(${-textareaRef.current.scrollTop}px)`;
  });

  /* ---- read-only mode ---- */
  if (readOnly) {
    return (
      <div
        ref={readOnlyContainerRef}
        className={cn(
          "overflow-y-auto rounded-md border min-h-[120px]",
          className,
        )}
      >
        <RenderedLines
          value={value}
          gutterCls={gutterCls}
          contentCls={contentCls}
          highlights={highlights}
          xmlColors={xmlColors}
          isDark={isDark}
          useHighlightApi={supportsHighlightAPI}
        />
      </div>
    );
  }

  /* ---- editable mode ---- */
  return (
    <div
      className={cn("relative overflow-hidden rounded-md border", className)}
    >
      {/* Mirror — visible rendered lines with inline gutter */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div ref={mirrorRef}>
          <RenderedLines
            value={deferredValue}
            gutterCls={gutterCls}
            contentCls={contentCls}
            highlights={highlights}
            xmlColors={xmlColors}
            isDark={isDark}
            useHighlightApi={supportsHighlightAPI}
          />
        </div>
      </div>

      {/* Textarea — transparent text, captures input & scrolling */}
      <textarea
        ref={textareaRef}
        className={cn(
          "relative z-10 h-full w-full resize-none border-0 bg-transparent pl-[3.75rem] pr-3 font-mono text-transparent caret-foreground outline-none selection:bg-primary/20",
          contentFont,
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        spellCheck={false}
        readOnly={readOnly}
      />

      {/* ScrollbarMarks uses data-mark on line divs (not inline <mark>) */}
      {highlights && highlights.length > 0 && (
        <ScrollbarMarks
          scrollRef={textareaRef}
          contentRef={mirrorRef}
          selector="[data-mark]"
        />
      )}
    </div>
  );
}

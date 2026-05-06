export interface ChapterPreset {
  label: string;
  pattern: RegExp;
}

export const CHAPTER_PRESETS: Record<string, ChapterPreset> = {
  vietnamese: {
    label: "Chương xx: ...",
    pattern: /^Chương\s+\d+\s*[:\-\s].*/gm,
  },
  english: {
    label: "Chapter xx: ...",
    pattern: /^Chapter\s+\d+\s*[:\-\s].*/gim,
  },
  chinese: {
    label: "第xx章...",
    pattern: /^第[\d一二三四五六七八九十百千万]+章.*/gm,
  },
  numbered: {
    label: "1. Title / 1: Title",
    pattern: /^\d+\s*[.:\-]\s*.+/gm,
  },
};

/**
 * Token budget management for analysis.
 *
 * Heuristic: ~4 chars per token for English, ~1.5 chars for CJK.
 * These are rough estimates — good enough for budget decisions.
 */

const CJK_RANGE = /[\u4e00-\u9fff\u3400-\u4dbf\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff]/g;

export function estimateTokens(text: string): number {
  const cjkChars = text.match(CJK_RANGE)?.length ?? 0;
  const nonCjkChars = text.length - cjkChars;
  return Math.ceil(cjkChars / 1.5 + nonCjkChars / 4);
}

// ─── Analysis Depth ─────────────────────────────────────────

export type AnalysisDepth = "quick" | "standard" | "deep";

export interface TokenBudget {
  /** Max tokens per chapter input (truncate if exceeded) */
  maxChapterTokens: number;
  /** Max tokens to batch into a single API call */
  batchTargetTokens: number;
  /** Max total tokens for aggregation prompt */
  maxAggregationTokens: number;
  /** Max character mentions to keep per character */
  maxMentionsPerCharacter: number;
  /** Max characters to profile (by mention frequency) */
  maxCharactersToProfile: number;
  /** For quick: sample every Nth chapter instead of all */
  chapterSampleRate: number;
}

const BUDGETS: Record<AnalysisDepth, TokenBudget> = {
  quick: {
    maxChapterTokens: 2000,
    batchTargetTokens: 6000,
    maxAggregationTokens: 8000,
    maxMentionsPerCharacter: 3,
    maxCharactersToProfile: 15,
    chapterSampleRate: 3, // analyze 1 of every 3 chapters
  },
  standard: {
    maxChapterTokens: 6000,
    batchTargetTokens: 8000,
    maxAggregationTokens: 16000,
    maxMentionsPerCharacter: 8,
    maxCharactersToProfile: 30,
    chapterSampleRate: 1, // all chapters
  },
  deep: {
    maxChapterTokens: 12000,
    batchTargetTokens: 12000,
    maxAggregationTokens: 32000,
    maxMentionsPerCharacter: 20,
    maxCharactersToProfile: 50,
    chapterSampleRate: 1,
  },
};

export function getBudget(depth: AnalysisDepth): TokenBudget {
  return BUDGETS[depth];
}

// ─── Text Processing ────────────────────────────────────────

/**
 * Truncate text to fit a token budget.
 * Keeps the first portion and last portion, with a marker in the middle.
 */
export function truncateToTokenBudget(
  text: string,
  maxTokens: number,
): string {
  const tokens = estimateTokens(text);
  if (tokens <= maxTokens) return text;

  // Keep 60% from the start, 30% from the end, 10% for the gap marker
  const charBudget = maxTokens * 3.5; // rough inverse of estimateTokens
  const headChars = Math.floor(charBudget * 0.6);
  const tailChars = Math.floor(charBudget * 0.3);

  const head = text.slice(0, headChars);
  const tail = text.slice(-tailChars);

  const skippedTokens = tokens - maxTokens;
  return `${head}\n\n[... ~${skippedTokens} tokens of content omitted for brevity ...]\n\n${tail}`;
}

/**
 * Select which chapters to analyze based on sampling rate.
 * Always includes first chapter, last chapter, and evenly spaced samples.
 */
export function sampleChapters<T>(
  chapters: T[],
  sampleRate: number,
): { item: T; originalIndex: number }[] {
  if (sampleRate <= 1 || chapters.length <= 5) {
    return chapters.map((item, i) => ({ item, originalIndex: i }));
  }

  const selected = new Set<number>();
  selected.add(0); // first
  selected.add(chapters.length - 1); // last

  // Evenly spaced samples
  for (let i = 0; i < chapters.length; i += sampleRate) {
    selected.add(i);
  }

  return Array.from(selected)
    .sort((a, b) => a - b)
    .map((i) => ({ item: chapters[i], originalIndex: i }));
}

// ─── Batching ───────────────────────────────────────────────

export interface BatchItem {
  chapterIndex: number;
  title: string;
  content: string;
  tokens: number;
}

/**
 * Group chapters into batches that fit within a token budget.
 * Each batch becomes a single API call analyzing multiple short chapters.
 */
export function batchChapters(
  items: BatchItem[],
  batchTargetTokens: number,
): BatchItem[][] {
  const batches: BatchItem[][] = [];
  let currentBatch: BatchItem[] = [];
  let currentTokens = 0;

  for (const item of items) {
    // If a single chapter exceeds the budget, it gets its own batch
    if (item.tokens > batchTargetTokens) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentTokens = 0;
      }
      batches.push([item]);
      continue;
    }

    if (currentTokens + item.tokens > batchTargetTokens && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentTokens = 0;
    }

    currentBatch.push(item);
    currentTokens += item.tokens;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

// ─── Recursive Summarization ────────────────────────────────

/**
 * Group summaries into chunks that fit the aggregation budget.
 * Returns groups that each need a separate aggregation call,
 * whose results then get merged in a final call.
 */
export function groupSummariesForAggregation(
  summaries: { title: string; summary: string }[],
  maxTokens: number,
): { title: string; summary: string }[][] {
  const groups: { title: string; summary: string }[][] = [];
  let current: { title: string; summary: string }[] = [];
  let currentTokens = 0;

  for (const s of summaries) {
    const tokens = estimateTokens(`### ${s.title}\n${s.summary}`);
    if (currentTokens + tokens > maxTokens && current.length > 0) {
      groups.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(s);
    currentTokens += tokens;
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}

/**
 * Cap character mentions to reduce input size for profiling.
 * Keeps first N and last mention for each character,
 * prioritizes characters by mention frequency.
 */
export function capCharacterMentions(
  characterMap: Map<string, string[]>,
  maxMentions: number,
  maxCharacters: number,
): Map<string, string[]> {
  // Sort by mention count descending, keep top N
  const sorted = Array.from(characterMap.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, maxCharacters);

  const result = new Map<string, string[]>();
  for (const [key, mentions] of sorted) {
    if (mentions.length <= maxMentions) {
      result.set(key, mentions);
    } else {
      // Keep first (maxMentions-1) and last mention
      const kept = mentions.slice(0, maxMentions - 1);
      kept.push(mentions[mentions.length - 1]);
      result.set(key, kept);
    }
  }

  return result;
}

import type { LanguageModel } from "ai";
import { generateStructured } from "@/lib/ai/structured";
import {
  chapterAnalysisSchema,
  batchChapterAnalysisSchema,
} from "./schemas";
import { buildChapterPrompt, buildBatchChapterPrompt } from "./prompts";
import type { ChapterAnalysisResult } from "./types";
import { truncateToTokenBudget } from "./token-budget";

/**
 * Analyze a single chapter using structured output via tool calling.
 * Truncates content if it exceeds maxTokens.
 */
export async function analyzeChapter(
  model: LanguageModel,
  chapterTitle: string,
  chapterContent: string,
  signal?: AbortSignal,
  maxTokens?: number,
  systemPrompt?: string,
): Promise<ChapterAnalysisResult> {
  const content = maxTokens
    ? truncateToTokenBudget(chapterContent, maxTokens)
    : chapterContent;

  const result = await generateStructured({
    model,
    schema: chapterAnalysisSchema,
    system: systemPrompt,
    prompt: buildChapterPrompt(chapterTitle, content),
    abortSignal: signal,
  });

  return result.object;
}

/**
 * Analyze multiple chapters in a single API call.
 * Each chapter is truncated to maxTokensPerChapter before sending.
 * Returns results in the same order as input.
 */
export async function analyzeBatchChapters(
  model: LanguageModel,
  chapters: { title: string; content: string }[],
  signal?: AbortSignal,
  maxTokensPerChapter?: number,
  systemPrompt?: string,
): Promise<ChapterAnalysisResult[]> {
  const processed = chapters.map((ch) => ({
    title: ch.title,
    content: maxTokensPerChapter
      ? truncateToTokenBudget(ch.content, maxTokensPerChapter)
      : ch.content,
  }));

  const result = await generateStructured({
    model,
    schema: batchChapterAnalysisSchema,
    system: systemPrompt,
    prompt: buildBatchChapterPrompt(processed),
    abortSignal: signal,
  });

  return result.object.chapters;
}

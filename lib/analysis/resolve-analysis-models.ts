import { isWebGpuInferenceProviderId } from "@/lib/ai/api-inference";
import { resolveStep } from "@/lib/ai/resolve-step";
import type { AnalysisSettings, ChatSettings } from "@/lib/db";
import type { LanguageModel } from "ai";
import type { SkipPhases } from "./types";

export type AnalysisModelPhase = "chapters" | "aggregation" | "characters";

export interface ResolvedAnalysisModels {
  defaultModel: LanguageModel;
  stepModels: {
    chapters?: LanguageModel;
    aggregation?: LanguageModel;
    characters?: LanguageModel;
  };
}

export interface ResolveAnalysisModelsResult {
  models: ResolvedAnalysisModels | null;
  missingPhases: AnalysisModelPhase[];
  chatIsWebGpu: boolean;
}

function needsPhase(
  skipPhases: SkipPhases | undefined,
  phase: AnalysisModelPhase,
): boolean {
  return !skipPhases?.[phase];
}

/**
 * Resolve effective models for the analysis pipeline.
 *
 * Rules:
 * - Per-step model overrides are used when present.
 * - If chat default model is API-eligible, it becomes the default fallback.
 * - If chat default model is missing/ineligible (e.g., WebGPU), then every
 *   non-skipped phase must have its own model.
 */
export async function resolveAnalysisModels(opts: {
  analysisSettings: Pick<
    AnalysisSettings,
    "chapterModel" | "aggregationModel" | "characterModel"
  >;
  chatSettings?: Pick<ChatSettings, "providerId" | "modelId">;
  skipPhases?: SkipPhases;
}): Promise<ResolveAnalysisModelsResult> {
  const { analysisSettings, chatSettings, skipPhases } = opts;

  const wantChapters = needsPhase(skipPhases, "chapters");
  const wantAggregation = needsPhase(skipPhases, "aggregation");
  const wantCharacters = needsPhase(skipPhases, "characters");

  const [chapters, aggregation, characters] = await Promise.all([
    wantChapters ? resolveStep(analysisSettings.chapterModel) : undefined,
    wantAggregation
      ? resolveStep(analysisSettings.aggregationModel)
      : undefined,
    wantCharacters ? resolveStep(analysisSettings.characterModel) : undefined,
  ]);

  const stepModels = { chapters, aggregation, characters };

  const chatIsWebGpu = isWebGpuInferenceProviderId(chatSettings?.providerId);

  const chatDefaultModel =
    chatSettings?.providerId && chatSettings?.modelId
      ? await resolveStep({
          providerId: chatSettings.providerId,
          modelId: chatSettings.modelId,
        })
      : undefined;

  // If chat default is usable, the pipeline can fall back to it.
  if (chatDefaultModel) {
    return {
      models: { defaultModel: chatDefaultModel, stepModels },
      missingPhases: [],
      chatIsWebGpu,
    };
  }

  // Otherwise, every required phase must have its own model.
  const missingPhases: AnalysisModelPhase[] = [];
  if (wantChapters && !chapters) missingPhases.push("chapters");
  if (wantAggregation && !aggregation) missingPhases.push("aggregation");
  if (wantCharacters && !characters) missingPhases.push("characters");

  if (missingPhases.length > 0) {
    return { models: null, missingPhases, chatIsWebGpu };
  }

  const fallback = chapters ?? aggregation ?? characters;
  if (!fallback) {
    return { models: null, missingPhases: [], chatIsWebGpu };
  }

  return {
    models: { defaultModel: fallback, stepModels },
    missingPhases: [],
    chatIsWebGpu,
  };
}

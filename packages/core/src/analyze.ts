import { DEFAULT_MODEL, MODEL_PROFILES } from "./models";
import { estimateInputCosts } from "./costs";
import { applyOptimizations } from "./optimize";
import { detectSegments } from "./segments";
import { countTokensForModel } from "./tokenizers";
import { detectWaste } from "./waste";
import { clampPercent } from "./utils";
import type { AnalysisOptions, AnalysisResult } from "./types";

/**
 * Analyze prompt text for token use, segment structure, waste, and fixes.
 */
export function analyzePrompt(
  input: string,
  options: AnalysisOptions = {}
): AnalysisResult {
  const model = options.model ?? DEFAULT_MODEL;
  const compressionStyle = options.compressionStyle ?? "standard";
  const profile = MODEL_PROFILES[model];
  const totalTokens = countTokensForModel(input, model);
  const segments = detectSegments(input, model);
  const wasteItems = detectWaste(input, segments, model);
  const optimizedPrompt = applyOptimizations(input, wasteItems, compressionStyle);
  const optimizedTokens = countTokensForModel(optimizedPrompt, model);

  return {
    totalTokens,
    modelLimit: profile.modelLimit,
    utilizationPercent: clampPercent((totalTokens / profile.modelLimit) * 100),
    segments,
    wasteItems,
    estimatedSavings: Math.max(totalTokens - optimizedTokens, 0),
    costEstimates: estimateInputCosts(totalTokens),
    optimizedPrompt
  };
}

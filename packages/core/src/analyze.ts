import { DEFAULT_MODEL, MODEL_PROFILES } from "./models";
import { estimateInputCosts, MODEL_TO_PRICING_KEY, MODEL_PRICING } from "./costs";
import { applyOptimizations } from "./optimize";
import { compressPrompt } from "./compress";
import { detectSegments } from "./segments";
import { countTokensForModel } from "./tokenizers";
import { detectWaste } from "./waste";
import { clampPercent } from "./utils";
import type { AnalysisOptions, AnalysisResult } from "./types";

const BENCHMARK_STYLES = ["lite", "full", "ultra"] as const;

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
  const pricingKey = MODEL_TO_PRICING_KEY[model];
  const pricing = MODEL_PRICING[pricingKey];
  const styleBenchmarks = BENCHMARK_STYLES.map((style) => {
    const stylePrompt = compressPrompt(input, style);
    const tokens = countTokensForModel(stylePrompt, model);
    const savedTokens = Math.max(totalTokens - tokens, 0);

    return {
      style,
      tokens,
      savedTokens,
      savedPercent: totalTokens === 0 ? 0 : clampPercent((savedTokens / totalTokens) * 100),
      estimatedInputCost: pricing ? (tokens / 1_000_000) * pricing.inputPerMillion : 0,
      optimizedPrompt: stylePrompt
    };
  });

  return {
    totalTokens,
    modelLimit: profile.modelLimit,
    utilizationPercent: clampPercent((totalTokens / profile.modelLimit) * 100),
    segments,
    wasteItems,
    estimatedSavings: Math.max(totalTokens - optimizedTokens, 0),
    costEstimates: estimateInputCosts(totalTokens),
    styleBenchmarks,
    optimizedPrompt
  };
}

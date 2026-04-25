import type { ModelId } from "./types";

export interface ModelPricing {
  label: string;
  inputPerMillion: number;
  outputPerMillion: number;
  longContextInputPerMillion?: number;
  longContextOutputPerMillion?: number;
  longContextThreshold?: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4o": {
    label: "GPT-4o",
    inputPerMillion: 2.5,
    outputPerMillion: 10
  },
  "claude-sonnet-3-5": {
    label: "Claude Sonnet 3.5",
    inputPerMillion: 3,
    outputPerMillion: 15
  },
  "gemini-1-5-pro": {
    label: "Gemini 1.5 Pro",
    inputPerMillion: 1.25,
    outputPerMillion: 5,
    longContextInputPerMillion: 2.5,
    longContextOutputPerMillion: 10,
    longContextThreshold: 128_000
  }
};

export const MODEL_TO_PRICING_KEY: Record<ModelId, string> = {
  "gpt-4o": "gpt-4o",
  "claude-3-5": "claude-sonnet-3-5",
  "gemini-1-5": "gemini-1-5-pro",
  "llama-3": "gpt-4o"
};

function inputRateForTokens(pricing: ModelPricing, tokens: number): number {
  if (
    pricing.longContextThreshold !== undefined &&
    pricing.longContextInputPerMillion !== undefined &&
    tokens > pricing.longContextThreshold
  ) {
    return pricing.longContextInputPerMillion;
  }

  return pricing.inputPerMillion;
}

/**
 * Estimate prompt input cost for each supported hosted model.
 */
export function estimateInputCosts(tokens: number): Record<string, number> {
  return Object.fromEntries(
    Object.entries(MODEL_PRICING).map(([model, pricing]) => [
      model,
      (tokens / 1_000_000) * inputRateForTokens(pricing, tokens)
    ])
  );
}

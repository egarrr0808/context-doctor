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
  "gpt-5.5": {
    label: "GPT-5.5",
    inputPerMillion: 2,
    outputPerMillion: 8
  },
  "gpt-5.4": {
    label: "GPT-5.4",
    inputPerMillion: 1.5,
    outputPerMillion: 6
  },
  "gpt-4o": {
    label: "GPT-4o",
    inputPerMillion: 2.5,
    outputPerMillion: 10
  },
  "claude-opus-4.7": {
    label: "Claude Opus 4.7",
    inputPerMillion: 15,
    outputPerMillion: 75
  },
  "claude-sonnet-4.6": {
    label: "Claude Sonnet 4.6",
    inputPerMillion: 3,
    outputPerMillion: 15
  },
  "gemini-2.5-pro": {
    label: "Gemini 2.5 Pro",
    inputPerMillion: 1.25,
    outputPerMillion: 10,
    longContextInputPerMillion: 2.5,
    longContextOutputPerMillion: 10,
    longContextThreshold: 128_000
  },
  "kimi-k2.6": {
    label: "Kimi K2.6",
    inputPerMillion: 0.6,
    outputPerMillion: 2.5
  }
};

export const MODEL_TO_PRICING_KEY: Record<ModelId, string> = {
  "gpt-5.5": "gpt-5.5",
  "gpt-5.4": "gpt-5.4",
  "gpt-4o": "gpt-4o",
  "claude-opus-4.7": "claude-opus-4.7",
  "claude-sonnet-4.6": "claude-sonnet-4.6",
  "gemini-2.5-pro": "gemini-2.5-pro",
  "kimi-k2.6": "kimi-k2.6",
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

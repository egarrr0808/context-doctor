import type { ModelId } from "./types";

export interface ModelProfile {
  id: ModelId;
  label: string;
  modelLimit: number;
  tokenizer: "cl100k_base" | "o200k_base" | "anthropic";
}

export const MODEL_PROFILES: Record<ModelId, ModelProfile> = {
  "gpt-4o": {
    id: "gpt-4o",
    label: "GPT-4o",
    modelLimit: 128_000,
    tokenizer: "o200k_base"
  },
  "claude-3-5": {
    id: "claude-3-5",
    label: "Claude 3.5",
    modelLimit: 200_000,
    tokenizer: "anthropic"
  },
  "gemini-1-5": {
    id: "gemini-1-5",
    label: "Gemini 1.5",
    modelLimit: 1_000_000,
    tokenizer: "o200k_base"
  },
  "llama-3": {
    id: "llama-3",
    label: "Llama 3",
    modelLimit: 128_000,
    tokenizer: "cl100k_base"
  }
};

export const DEFAULT_MODEL: ModelId = "gpt-4o";

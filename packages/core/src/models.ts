import type { ModelId } from "./types";

export interface ModelProfile {
  id: ModelId;
  label: string;
  modelLimit: number;
  tokenizer: "cl100k_base" | "o200k_base" | "anthropic";
}

export const MODEL_PROFILES: Record<ModelId, ModelProfile> = {
  "gpt-5.5": {
    id: "gpt-5.5",
    label: "GPT-5.5",
    modelLimit: 400_000,
    tokenizer: "o200k_base"
  },
  "gpt-5.4": {
    id: "gpt-5.4",
    label: "GPT-5.4",
    modelLimit: 400_000,
    tokenizer: "o200k_base"
  },
  "gpt-4o": {
    id: "gpt-4o",
    label: "GPT-4o",
    modelLimit: 128_000,
    tokenizer: "o200k_base"
  },
  "claude-opus-4.7": {
    id: "claude-opus-4.7",
    label: "Claude Opus 4.7",
    modelLimit: 200_000,
    tokenizer: "anthropic"
  },
  "claude-sonnet-4.6": {
    id: "claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    modelLimit: 200_000,
    tokenizer: "anthropic"
  },
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    modelLimit: 1_000_000,
    tokenizer: "o200k_base"
  },
  "kimi-k2.6": {
    id: "kimi-k2.6",
    label: "Kimi K2.6",
    modelLimit: 256_000,
    tokenizer: "o200k_base"
  },
  "llama-3": {
    id: "llama-3",
    label: "Llama 3",
    modelLimit: 128_000,
    tokenizer: "cl100k_base"
  }
};

export const DEFAULT_MODEL: ModelId = "gpt-5.5";

export const MODEL_IDS = Object.keys(MODEL_PROFILES) as ModelId[];

export const MODEL_ALIASES: Record<string, ModelId> = {
  "gpt-5.5": "gpt-5.5",
  "chatgpt-5.5": "gpt-5.5",
  "chatgpt 5.5": "gpt-5.5",
  "5.5 chatgpt": "gpt-5.5",
  "gpt5.5": "gpt-5.5",
  "gpt-5.4": "gpt-5.4",
  "chatgpt-5.4": "gpt-5.4",
  "chatgpt 5.4": "gpt-5.4",
  "gpt5.4": "gpt-5.4",
  "gpt-4o": "gpt-4o",
  "4o": "gpt-4o",
  "claude-opus-4.7": "claude-opus-4.7",
  "claude 4.7": "claude-opus-4.7",
  "claude-4.7": "claude-opus-4.7",
  "opus-4.7": "claude-opus-4.7",
  "claude-sonnet-4.6": "claude-sonnet-4.6",
  "claude 4.6": "claude-sonnet-4.6",
  "claude-4.6": "claude-sonnet-4.6",
  "sonnet-4.6": "claude-sonnet-4.6",
  "gemini-2.5-pro": "gemini-2.5-pro",
  "gemini 2.5 pro": "gemini-2.5-pro",
  "gemini-2.5": "gemini-2.5-pro",
  "kimi-k2.6": "kimi-k2.6",
  "kimi 2.6": "kimi-k2.6",
  "k2.6": "kimi-k2.6",
  "llama-3": "llama-3"
};

/**
 * Map user-entered model names and aliases to a supported model profile.
 */
export function normalizeModelId(value: string): ModelId | undefined {
  const exact = value as ModelId;
  if (exact in MODEL_PROFILES) {
    return exact;
  }

  return MODEL_ALIASES[value.trim().toLowerCase()];
}

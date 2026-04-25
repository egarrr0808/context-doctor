import { countTokens as countAnthropicTokens } from "@anthropic-ai/tokenizer";
import { get_encoding, type Tiktoken } from "tiktoken";

import { DEFAULT_MODEL, MODEL_PROFILES } from "./models";
import type { ModelId } from "./types";

const encoders = new Map<"cl100k_base" | "o200k_base", Tiktoken>();

function getEncoder(name: "cl100k_base" | "o200k_base"): Tiktoken {
  const cached = encoders.get(name);
  if (cached) {
    return cached;
  }

  const encoder = get_encoding(name);
  encoders.set(name, encoder);
  return encoder;
}

process.once("exit", () => {
  for (const encoder of encoders.values()) {
    encoder.free();
  }
});

/**
 * Count tokens for text using tokenizer best aligned with selected model.
 */
export function countTokensForModel(
  text: string,
  model: ModelId = DEFAULT_MODEL
): number {
  const profile = MODEL_PROFILES[model];

  if (profile.tokenizer === "anthropic") {
    return countAnthropicTokens(text);
  }

  return getEncoder(profile.tokenizer).encode(text).length;
}

/**
 * Count tokens for text using explicit tokenizer family.
 */
export function countTokensForEncoding(
  text: string,
  encoding: "cl100k_base" | "o200k_base"
): number {
  return getEncoder(encoding).encode(text).length;
}

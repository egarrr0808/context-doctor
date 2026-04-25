export type ModelId =
  | "gpt-5.5"
  | "gpt-5.4"
  | "gpt-4o"
  | "claude-opus-4.7"
  | "claude-sonnet-4.6"
  | "gemini-2.5-pro"
  | "kimi-k2.6"
  | "llama-3";

export type SegmentType =
  | "system"
  | "user"
  | "assistant"
  | "document"
  | "context"
  | "tools"
  | "code"
  | "text";

export type WasteType =
  | "redundant-instruction"
  | "verbose-phrasing"
  | "duplicate-context"
  | "dead-whitespace"
  | "irrelevant-code-comment"
  | "system-prompt-antipattern"
  | "filler-language"
  | "long-list-boilerplate";

export type CompressionStyle =
  | "standard"
  | "concise"
  | "lite"
  | "caveman"
  | "full"
  | "ultra";

export interface LocationRange {
  start: number;
  end: number;
}

export interface Segment {
  id: string;
  label: string;
  type: SegmentType;
  location: LocationRange;
  content: string;
  tokenCount: number;
  utilizationPercent: number;
  duplicateOf?: string;
  issues: string[];
}

export interface WasteItem {
  wastType: WasteType;
  location: LocationRange;
  tokensBefore: number;
  tokensAfter: number;
  suggestion: string;
  confidence: "high" | "medium" | "low";
  preview: string;
}

export interface AnalysisOptions {
  model?: ModelId;
  compressionStyle?: CompressionStyle;
}

export interface AnalysisResult {
  totalTokens: number;
  modelLimit: number;
  utilizationPercent: number;
  segments: Segment[];
  wasteItems: WasteItem[];
  estimatedSavings: number;
  costEstimates: Record<string, number>;
  styleBenchmarks: CompressionBenchmark[];
  optimizedPrompt: string;
}

export interface CompressionBenchmark {
  style: CompressionStyle;
  tokens: number;
  savedTokens: number;
  savedPercent: number;
  estimatedInputCost: number;
  optimizedPrompt: string;
}

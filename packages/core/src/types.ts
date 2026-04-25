export type ModelId = "gpt-4o" | "claude-3-5" | "gemini-1-5" | "llama-3";

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

export type CompressionStyle = "standard" | "concise" | "caveman" | "ultra";

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
  optimizedPrompt: string;
}

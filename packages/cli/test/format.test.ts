import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "@context-doctor/core";

import { formatAnalysisMarkdown, formatAnalysisTable } from "../src/format";

const result: AnalysisResult = {
  totalTokens: 1200,
  modelLimit: 128000,
  utilizationPercent: 0.94,
  segments: [
    {
      id: "segment-1",
      label: "System 1",
      type: "system",
      location: { start: 0, end: 10 },
      content: "<system>x</system>",
      tokenCount: 200,
      utilizationPercent: 16.7,
      issues: []
    }
  ],
  wasteItems: [
    {
      wastType: "verbose-phrasing",
      location: { start: 0, end: 10 },
      tokensBefore: 10,
      tokensAfter: 4,
      suggestion: "must",
      confidence: "high" as const,
      preview: "please make sure that you"
    }
  ],
  costEstimates: {
    "gpt-5.5": 0.0024,
    "claude-opus-4.7": 0.018,
    "gemini-2.5-pro": 0.0015,
    "kimi-k2.6": 0.00072
  },
  styleBenchmarks: [
    {
      style: "lite",
      tokens: 1100,
      savedTokens: 100,
      savedPercent: 8.3,
      estimatedInputCost: 0.0022,
      optimizedPrompt: "lite"
    },
    {
      style: "full",
      tokens: 900,
      savedTokens: 300,
      savedPercent: 25,
      estimatedInputCost: 0.0018,
      optimizedPrompt: "full"
    },
    {
      style: "ultra",
      tokens: 800,
      savedTokens: 400,
      savedPercent: 33.3,
      estimatedInputCost: 0.0016,
      optimizedPrompt: "ultra"
    }
  ],
  estimatedSavings: 6,
  optimizedPrompt: "must"
};

describe("cli formatting", () => {
  it("renders table output", () => {
    const output = formatAnalysisTable(result);
    expect(output).toContain("Context Summary");
    expect(output).toContain("Cost Estimate");
    expect(output).toContain("Caveman Benchmarks");
    expect(output).toContain("Waste Items");
    expect(output).toContain("Run with --fix");
  });

  it("renders markdown output", () => {
    const output = formatAnalysisMarkdown(result);
    expect(output).toContain("# Context Doctor Report");
    expect(output).toContain("## Cost Estimate");
    expect(output).toContain("## Caveman Benchmarks");
    expect(output).toContain("| Segment | Tokens | % total | Status |");
  });
});

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
    "gpt-4o": 0.003,
    "claude-sonnet-3-5": 0.0036,
    "gemini-1-5-pro": 0.0015
  },
  estimatedSavings: 6,
  optimizedPrompt: "must"
};

describe("cli formatting", () => {
  it("renders table output", () => {
    const output = formatAnalysisTable(result);
    expect(output).toContain("Context Summary");
    expect(output).toContain("Cost Estimate");
    expect(output).toContain("Waste Items");
    expect(output).toContain("Run with --fix");
  });

  it("renders markdown output", () => {
    const output = formatAnalysisMarkdown(result);
    expect(output).toContain("# Context Doctor Report");
    expect(output).toContain("## Cost Estimate");
    expect(output).toContain("| Segment | Tokens | % total | Status |");
  });
});

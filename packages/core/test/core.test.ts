import { describe, expect, it } from "vitest";

import {
  analyzePrompt,
  applyOptimizations,
  compressPrompt,
  countTokensForEncoding,
  detectWaste
} from "../src/index";

const SAMPLE_PROMPT = `<system>
You are a helpful assistant.
Please make sure that you follow instructions exactly.
</system>

<user>
In order to summarize this file, be concise.
In order to summarize this file, be concise.
</user>

<document>
Roadmap roadmap roadmap roadmap roadmap roadmap roadmap roadmap roadmap roadmap.
</document>

<document>
Roadmap roadmap roadmap roadmap roadmap roadmap roadmap roadmap roadmap roadmap.
</document>

\n\n\n
\`\`\`ts
// this helper function is basically obvious and not needed in prompt context
const add = (a: number, b: number) => a + b;
\`\`\`
`;

describe("token counting", () => {
  it("counts known value for cl100k_base", () => {
    expect(countTokensForEncoding("hello world", "cl100k_base")).toBe(2);
  });

  it("counts known value for o200k_base", () => {
    expect(countTokensForEncoding("hello world", "o200k_base")).toBe(2);
  });

  it("includes cost estimates", () => {
    const result = analyzePrompt("hello world", { model: "gpt-4o" });
    expect(result.costEstimates["gpt-4o"]).toBeGreaterThan(0);
    expect(result.costEstimates["claude-sonnet-3-5"]).toBeGreaterThan(0);
    expect(result.costEstimates["gemini-1-5-pro"]).toBeGreaterThan(0);
  });
});

describe("waste detection", () => {
  it("finds at least five waste patterns", () => {
    const result = analyzePrompt(SAMPLE_PROMPT, { model: "gpt-4o" });
    const kinds = new Set(result.wasteItems.map((item) => item.wastType));
    expect([...kinds]).toEqual(
      expect.arrayContaining([
        "system-prompt-antipattern",
        "verbose-phrasing",
        "redundant-instruction",
        "duplicate-context",
        "dead-whitespace",
        "irrelevant-code-comment"
      ])
    );
  });

  it("returns optimization suggestions", () => {
    const waste = detectWaste(
      SAMPLE_PROMPT,
      analyzePrompt(SAMPLE_PROMPT, { model: "gpt-4o" }).segments,
      "gpt-4o"
    );

    expect(waste.every((item) => typeof item.suggestion === "string")).toBe(true);
  });
});

describe("compression", () => {
  it("saves more than ten percent on typical prompt", () => {
    const result = analyzePrompt(SAMPLE_PROMPT, { model: "gpt-4o" });
    expect(result.estimatedSavings / result.totalTokens).toBeGreaterThan(0.1);
  });

  it("applies optimizations", () => {
    const result = analyzePrompt(SAMPLE_PROMPT, { model: "gpt-4o" });
    const optimized = applyOptimizations(SAMPLE_PROMPT, result.wasteItems);
    expect(optimized.length).toBeLessThan(SAMPLE_PROMPT.length);
  });

  it("supports caveman-style deterministic compression", () => {
    const input = "Please make sure that you inspect the database configuration in order to explain the error.";
    const output = compressPrompt(input, "ultra");
    expect(output).toContain("DB config");
    expect(countTokensForEncoding(output, "o200k_base")).toBeLessThan(
      countTokensForEncoding(input, "o200k_base")
    );
  });
});

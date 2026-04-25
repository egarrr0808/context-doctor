import { countTokensForModel } from "./tokenizers";
import { normalizeWhitespace, overlaps, preview } from "./utils";
import type { ModelId, Segment, WasteItem, WasteType } from "./types";

function buildWasteItem(
  model: ModelId,
  wastType: WasteType,
  start: number,
  end: number,
  original: string,
  suggestion: string,
  confidence: WasteItem["confidence"]
): WasteItem {
  return {
    wastType,
    location: { start, end },
    tokensBefore: countTokensForModel(original, model),
    tokensAfter: countTokensForModel(suggestion, model),
    suggestion,
    confidence,
    preview: preview(original)
  };
}

const VERBOSE_PHRASES: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /\bplease make sure that you\b/gi,
    replacement: "you must"
  },
  {
    pattern:
      /\bit is important to note that\b/gi,
    replacement: "note:"
  },
  {
    pattern:
      /\bin order to\b/gi,
    replacement: "to"
  },
  {
    pattern: /\byou are a helpful assistant\b/gi,
    replacement: "Act as domain-specific assistant."
  },
  {
    pattern: /\bdue to the fact that\b/gi,
    replacement: "because"
  },
  {
    pattern: /\bfor the purpose of\b/gi,
    replacement: "to"
  },
  {
    pattern: /\btake into consideration\b/gi,
    replacement: "consider"
  }
];

const FILLER_PHRASES = [
  "basically",
  "actually",
  "simply",
  "just",
  "really",
  "kind of",
  "sort of",
  "if possible",
  "as you can see"
];

/**
 * Detect wasteful prompt patterns with replacement suggestions.
 */
export function detectWaste(
  input: string,
  segments: Segment[],
  model: ModelId
): WasteItem[] {
  const waste: WasteItem[] = [];
  const occupied: WasteItem[] = [];
  const codeRanges = segments
    .filter((segment) => segment.type === "code")
    .map((segment) => segment.location);

  const addItem = (item: WasteItem): void => {
    if (occupied.some((other) => overlaps(other.location, item.location))) {
      return;
    }
    occupied.push(item);
    waste.push(item);
  };

  const duplicateSegments = new Map<string, Segment>();
  for (const segment of segments) {
    const normalized = normalizeWhitespace(segment.content);
    const seen = duplicateSegments.get(normalized);
    if (seen) {
      addItem(
        buildWasteItem(
          model,
          "duplicate-context",
          segment.location.start,
          segment.location.end,
          segment.content,
          "",
          "high"
        )
      );
      continue;
    }
    duplicateSegments.set(normalized, segment);
  }

  const lineMatches = new Map<string, Array<{ line: string; start: number; end: number }>>();
  let cursor = 0;
  for (const line of input.split("\n")) {
    const start = cursor;
    const end = start + line.length;
    cursor = end + 1;
    const normalized = normalizeWhitespace(line);
    if (normalized.split(" ").length < 5 || normalized.startsWith("<document")) {
      continue;
    }
    const bucket = lineMatches.get(normalized) ?? [];
    bucket.push({ line, start, end });
    lineMatches.set(normalized, bucket);
  }

  for (const matches of lineMatches.values()) {
    if (matches.length < 2) {
      continue;
    }
    for (const match of matches.slice(1)) {
      addItem(
        buildWasteItem(
          model,
          "redundant-instruction",
          match.start,
          match.end,
          match.line,
          "",
          "high"
        )
      );
    }
  }

  for (const match of input.matchAll(/\n{3,}/g)) {
    const found = match[0];
    const start = match.index ?? 0;
    addItem(
      buildWasteItem(
        model,
        "dead-whitespace",
        start,
        start + found.length,
        found,
        "\n\n",
        "high"
      )
    );
  }

  for (const { pattern, replacement } of VERBOSE_PHRASES) {
    for (const match of input.matchAll(pattern)) {
      const found = match[0];
      const start = match.index ?? 0;
      addItem(
        buildWasteItem(
          model,
          found.toLowerCase().includes("helpful assistant")
            ? "system-prompt-antipattern"
            : "verbose-phrasing",
          start,
          start + found.length,
          found,
          replacement,
          found.toLowerCase().includes("helpful assistant") ? "medium" : "high"
        )
      );
    }
  }

  for (const phrase of FILLER_PHRASES) {
    const pattern = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b[,]?\\s*`, "gi");
    for (const match of input.matchAll(pattern)) {
      const found = match[0];
      const start = match.index ?? 0;
      const location = { start, end: start + found.length };
      if (codeRanges.some((range) => overlaps(range, location))) {
        continue;
      }
      addItem(
        buildWasteItem(
          model,
          "filler-language",
          start,
          location.end,
          found,
          "",
          "medium"
        )
      );
    }
  }

  for (const match of input.matchAll(/^(?:[-*]\s+(?:please|make sure|remember|note that|it is important).*\n){3,}/gim)) {
    const found = match[0];
    const start = match.index ?? 0;
    const suggestion = found
      .split("\n")
      .filter(Boolean)
      .map((line) =>
        line
          .replace(/^[-*]\s+/g, "- ")
          .replace(/\bplease\s+/gi, "")
          .replace(/\bmake sure (?:that )?/gi, "")
          .replace(/\bremember to\s+/gi, "")
          .replace(/\bit is important to\s+/gi, "")
      )
      .join("\n");

    addItem(
      buildWasteItem(
        model,
        "long-list-boilerplate",
        start,
        start + found.length,
        found,
        suggestion,
        "medium"
      )
    );
  }

  for (const segment of segments.filter((item) => item.type === "code")) {
    for (const match of segment.content.matchAll(/^\s*(\/\/|#)\s*(this|simply|basically|helper|obviously)\b.*$/gim)) {
      const found = match[0];
      const relativeStart = match.index ?? 0;
      addItem(
        buildWasteItem(
          model,
          "irrelevant-code-comment",
          segment.location.start + relativeStart,
          segment.location.start + relativeStart + found.length,
          found,
          "",
          "medium"
        )
      );
    }
  }

  return waste.sort((a, b) => a.location.start - b.location.start);
}

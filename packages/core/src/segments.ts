import { countTokensForModel } from "./tokenizers";
import { clampPercent, normalizeWhitespace } from "./utils";
import type { ModelId, Segment, SegmentType } from "./types";

interface RawSegment {
  label: string;
  type: SegmentType;
  start: number;
  end: number;
  content: string;
}

const BLOCK_PATTERNS: Array<{
  label: string;
  type: SegmentType;
  regex: RegExp;
}> = [
  { label: "System", type: "system", regex: /<system\b[^>]*>[\s\S]*?<\/system>/gi },
  { label: "User", type: "user", regex: /<user\b[^>]*>[\s\S]*?<\/user>/gi },
  {
    label: "Assistant",
    type: "assistant",
    regex: /<assistant\b[^>]*>[\s\S]*?<\/assistant>/gi
  },
  {
    label: "Document",
    type: "document",
    regex: /<document\b[^>]*>[\s\S]*?<\/document>/gi
  },
  {
    label: "Context",
    type: "context",
    regex: /<context\b[^>]*>[\s\S]*?<\/context>/gi
  },
  { label: "Tools", type: "tools", regex: /<tools\b[^>]*>[\s\S]*?<\/tools>/gi },
  { label: "Code", type: "code", regex: /```[\s\S]*?```/g }
];

function collectBlocks(input: string): RawSegment[] {
  const blocks: RawSegment[] = [];

  for (const pattern of BLOCK_PATTERNS) {
    for (const match of input.matchAll(pattern.regex)) {
      const found = match[0];
      const start = match.index ?? 0;
      blocks.push({
        label: pattern.label,
        type: pattern.type,
        start,
        end: start + found.length,
        content: found
      });
    }
  }

  blocks.sort((a, b) => a.start - b.start || b.end - a.end);

  const deduped: RawSegment[] = [];
  let currentEnd = -1;

  for (const block of blocks) {
    if (block.start < currentEnd) {
      continue;
    }
    currentEnd = block.end;
    deduped.push(block);
  }

  return deduped;
}

/**
 * Detect semantic prompt segments from raw input.
 */
export function detectSegments(input: string, model: ModelId): Segment[] {
  const rawSegments = collectBlocks(input);
  const segments: RawSegment[] = [];
  let cursor = 0;

  for (const raw of rawSegments) {
    if (raw.start > cursor) {
      const content = input.slice(cursor, raw.start);
      if (content.trim()) {
        segments.push({
          label: "Text",
          type: "text",
          start: cursor,
          end: raw.start,
          content
        });
      }
    }

    segments.push(raw);
    cursor = raw.end;
  }

  if (cursor < input.length) {
    const content = input.slice(cursor);
    if (content.trim()) {
      segments.push({
        label: "Text",
        type: "text",
        start: cursor,
        end: input.length,
        content
      });
    }
  }

  const seen = new Map<string, string>();
  const totalTokens = Math.max(countTokensForModel(input, model), 1);

  return segments.map((segment, index) => {
    const normalized = normalizeWhitespace(segment.content);
    const tokenCount = countTokensForModel(segment.content, model);
    const duplicateOf = seen.get(normalized);
    if (!duplicateOf) {
      seen.set(normalized, `segment-${index + 1}`);
    }

    return {
      id: `segment-${index + 1}`,
      label: `${segment.label} ${index + 1}`,
      type: segment.type,
      location: { start: segment.start, end: segment.end },
      content: segment.content,
      tokenCount,
      utilizationPercent: clampPercent((tokenCount / totalTokens) * 100),
      duplicateOf,
      issues: duplicateOf ? [`Duplicate of ${duplicateOf}`] : []
    };
  });
}

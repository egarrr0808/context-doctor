import { compressPrompt } from "./compress";
import { overlaps } from "./utils";
import type { CompressionStyle, WasteItem } from "./types";

/**
 * Apply non-overlapping waste suggestions to prompt text.
 */
export function applyOptimizations(
  input: string,
  wasteItems: WasteItem[],
  style: CompressionStyle = "standard"
): string {
  const accepted: WasteItem[] = [];

  for (const item of wasteItems.slice().sort((a, b) => a.location.start - b.location.start)) {
    if (!accepted.some((acceptedItem) => overlaps(acceptedItem.location, item.location))) {
      accepted.push(item);
    }
  }

  let cursor = 0;
  let output = "";

  for (const item of accepted) {
    output += input.slice(cursor, item.location.start);
    output += item.suggestion;
    cursor = item.location.end;
  }

  output += input.slice(cursor);

  return compressPrompt(output, style)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

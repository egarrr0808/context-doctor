import type { LocationRange } from "./types";

export function clampPercent(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function preview(value: string, max = 72): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

export function overlaps(a: LocationRange, b: LocationRange): boolean {
  return a.start < b.end && b.start < a.end;
}

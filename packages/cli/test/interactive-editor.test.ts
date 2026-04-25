import { describe, expect, it } from "vitest";

import { applyEditorInput, normalizeEditorInput } from "../src/interactive-editor";

describe("interactive editor", () => {
  it("normalizes pasted CRLF text", () => {
    expect(normalizeEditorInput("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("inserts newline on enter", () => {
    expect(applyEditorInput("abc", "", { return: true })).toBe("abc\n");
  });

  it("appends pasted multiline chunks", () => {
    expect(applyEditorInput("abc", "x\r\ny", {})).toBe("abcx\ny");
  });

  it("deletes one char on backspace", () => {
    expect(applyEditorInput("abc", "", { backspace: true })).toBe("ab");
  });
});

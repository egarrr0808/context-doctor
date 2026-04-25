export interface EditorKey {
  backspace?: boolean;
  delete?: boolean;
  return?: boolean;
  ctrl?: boolean;
  escape?: boolean;
}

export const INITIAL_PROMPT = `<system>
You are a helpful assistant.
</system>

<user>
Paste prompt here.
</user>
`;

/**
 * Normalize terminal input so pasted CRLF text becomes plain LF text.
 */
export function normalizeEditorInput(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Apply one terminal input event to the multiline editor buffer.
 */
export function applyEditorInput(value: string, input: string, key: EditorKey): string {
  if (key.backspace || key.delete) {
    return value.slice(0, -1);
  }

  if (key.return) {
    return `${value}\n`;
  }

  if (key.ctrl || key.escape) {
    return value;
  }

  return `${value}${normalizeEditorInput(input)}`;
}

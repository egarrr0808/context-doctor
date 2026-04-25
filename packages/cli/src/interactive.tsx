import React, { useEffect, useMemo, useState } from "react";
import { Box, render, Text, useApp, useInput } from "ink";

import { analyzePrompt, DEFAULT_MODEL, type ModelId } from "@context-doctor/core";
import { applyEditorInput, INITIAL_PROMPT } from "./interactive-editor";

const EDITOR_HEIGHT = 20;

function tailLines(value: string, count: number): string[] {
  const lines = value.split("\n");
  return lines.slice(Math.max(lines.length - count, 0));
}

function InteractiveApp(): React.JSX.Element {
  const [input, setInput] = useState(INITIAL_PROMPT);
  const [model] = useState<ModelId>(DEFAULT_MODEL);
  const [result, setResult] = useState(() => analyzePrompt(input, { model }));
  const { exit } = useApp();
  const editorLines = useMemo(() => tailLines(input, EDITOR_HEIGHT), [input]);

  useEffect(() => {
    setResult(analyzePrompt(input, { model }));
  }, [input, model]);

  useInput((chunk, key) => {
    if (key.ctrl && chunk === "c") {
      exit();
      return;
    }

    if (key.escape) {
      exit();
      return;
    }

    setInput((current) => applyEditorInput(current, chunk, key));
  });

  return (
    <Box flexDirection="column">
      <Text color="cyan">context-doctor interactive | paste/type left | enter newline | esc/ctrl+c exit</Text>
      <Box marginTop={1}>
        <Box width="60%" borderStyle="round" flexDirection="column" paddingX={1}>
          <Text color="green">Prompt editor</Text>
          {editorLines.map((line, index) => (
            <Text key={`${index}-${line}`}>{line.length > 0 ? line : " "}</Text>
          ))}
          <Text inverse>{` `}</Text>
        </Box>
        <Box width="40%" borderStyle="round" flexDirection="column" paddingX={1} marginLeft={1}>
          <Text color="yellow">Analysis</Text>
          <Text>tokens: {result.totalTokens}</Text>
          <Text>used: {result.utilizationPercent.toFixed(1)}%</Text>
          <Text>waste: {result.wasteItems.length}</Text>
          <Text>save: ~{result.estimatedSavings}</Text>
          <Text>segments: {result.segments.length}</Text>
          <Text>model: {model}</Text>
        </Box>
      </Box>
      <Text color="gray">Paste raw prompt blocks directly. Backspace deletes one char. View shows last {EDITOR_HEIGHT} lines.</Text>
    </Box>
  );
}

export function runInteractive(): void {
  render(<InteractiveApp />);
}

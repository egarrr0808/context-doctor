import React, { useEffect, useState } from "react";
import { Box, render, Text, useApp } from "ink";
import TextInput from "ink-text-input";

import { analyzePrompt, DEFAULT_MODEL, type ModelId } from "@context-doctor/core";

function InteractiveApp(): React.JSX.Element {
  const [input, setInput] = useState("<system>\nYou are a helpful assistant.\n</system>\n\n<user>\nPaste prompt here.\n</user>\n");
  const [model] = useState<ModelId>(DEFAULT_MODEL);
  const [result, setResult] = useState(() => analyzePrompt(input, { model }));
  const { exit } = useApp();

  useEffect(() => {
    setResult(analyzePrompt(input, { model }));
  }, [input, model]);

  return (
    <Box flexDirection="column">
      <Text color="cyan">context-doctor interactive | esc or ctrl+c exit</Text>
      <Box marginTop={1}>
        <Box width="50%" borderStyle="round" flexDirection="column" paddingX={1}>
          <Text color="green">Prompt editor</Text>
          <TextInput value={input} onChange={setInput} onSubmit={() => undefined} />
        </Box>
        <Box width="50%" borderStyle="round" flexDirection="column" paddingX={1} marginLeft={1}>
          <Text color="yellow">Analysis</Text>
          <Text>tokens: {result.totalTokens}</Text>
          <Text>used: {result.utilizationPercent.toFixed(1)}%</Text>
          <Text>waste: {result.wasteItems.length}</Text>
          <Text>save: ~{result.estimatedSavings}</Text>
          <Text>segments: {result.segments.length}</Text>
        </Box>
      </Box>
      <Text color="gray">Type live. TUI updates real time.</Text>
      <Text color="gray" inverse={false}>
        Press enter no-op. Ctrl+C exit.
      </Text>
      <Text color="gray" dimColor>
        Model fixed: {model}
      </Text>
      <Text color="gray" dimColor>
        If terminal sends escape badly, use Ctrl+C.
      </Text>
      <Text color="gray" dimColor>
        <TextInput value="" onChange={(value) => (value === "\u001b" ? exit() : undefined)} />
      </Text>
    </Box>
  );
}

export function runInteractive(): void {
  render(<InteractiveApp />);
}

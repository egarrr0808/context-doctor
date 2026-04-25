![demo](./assets/demo.gif)

context-doctor tells you exactly where your LLM context is being wasted — and fixes it.

# context-doctor

[![npm](https://img.shields.io/npm/v/context-doctor.svg)](https://www.npmjs.com/package/context-doctor)
[![npm install](https://img.shields.io/badge/install-npm%20install%20--global%20context--doctor-CB3837?logo=npm)](https://www.npmjs.com/package/context-doctor)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/egarrr0808.context-doctor-vscode)](https://marketplace.visualstudio.com/items?itemName=egarrr0808.context-doctor-vscode)
[![VS Code Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/egarrr0808.context-doctor-vscode)](https://marketplace.visualstudio.com/items?itemName=egarrr0808.context-doctor-vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![CI](https://github.com/egarrr0808/context-doctor/actions/workflows/ci.yml/badge.svg)](https://github.com/egarrr0808/context-doctor/actions/workflows/ci.yml)

**Stop wasting tokens. Understand your context.**

`context-doctor` is open source toolkit for prompt engineers, app teams, agent builders. It finds waste in LLM prompts, estimates token burn across models, suggests compressions, ships CLI + TS library + VS Code extension.

## Install

```bash
npm install -g context-doctor
npx context-doctor analyze prompt.md
code --install-extension egarrr0808.context-doctor-vscode
```

More package-manager and editor options: [Install guide](./docs/INSTALL.md).

Local source install:

```bash
./scripts/install.sh --local --completion bash
./scripts/install.sh --local --vscode
```

## Features

- Segment-aware token analysis for `system`, `user`, `assistant`, XML blocks, code fences, free text.
- Waste detection for repeated instructions, filler phrasing, duplicate context, whitespace bloat, weak system prompts, noisy code comments.
- Auto-optimization pipeline with estimated savings, fixed prompt output, watch mode, compare mode, shell completions, interactive TUI, VS Code diagnostics.
- Compression styles: `standard`, `concise`, `caveman`, `ultra`.
- Cost estimates for GPT-4o, Claude Sonnet 3.5, and Gemini 1.5 Pro.

## Quick usage

```bash
context-doctor analyze prompt.txt --model gpt-4o
```

```text
Context Summary
Total tokens         4821
Model limit          128000
Used                 3.8%
Estimated savings    611 tokens

Run with --fix to auto-apply 8 optimizations saving ~611 tokens
```

Explain commands:

```bash
context-doctor explain
```

Automate repo checks:

```bash
context-doctor init
```

This creates `.context-doctorrc.json`, enables VS Code auto-analysis for the workspace, and installs a Git pre-commit hook that checks staged `.md`, `.txt`, and `.prompt` files.

```bash
context-doctor analyze prompt.txt --format markdown --fix
```

```markdown
# Context Doctor Report
- Total tokens: 4821
- Model limit: 128000
- Utilization: 3.8%
- Estimated savings: 611
```

```bash
context-doctor compare prompt-before.txt prompt-after.txt --model claude-3-5
```

```json
{
  "model": "claude-3-5",
  "before": 9288,
  "after": 7310,
  "delta": -1978,
  "savings": 1978
}
```

```bash
context-doctor optimize CLAUDE.md -o CLAUDE.compact.md --model claude-3-5 --style ultra
```

```text
Wrote optimized prompt to CLAUDE.compact.md. Saved ~1289 tokens.
```

## Supported models

| Model | Tokenizer | Context window |
| --- | --- | ---: |
| GPT-4o | `o200k_base` | 128,000 |
| Claude 3.5 | `@anthropic-ai/tokenizer` | 200,000 |
| Gemini 1.5 | `o200k_base` estimator | 1,000,000 |
| Llama 3 | `cl100k_base` estimator | 128,000 |

## How It Works

1. `context-doctor` reads a prompt, markdown file, memory file, or stdin.
2. It tokenizes text using the selected model profile.
3. It splits text into segments such as system, user, assistant, XML docs, code blocks, and plain text.
4. It flags waste: repeated instructions, duplicate context, filler language, whitespace, generic system prompts, noisy comments.
5. It estimates token savings and input cost.
6. It can print an optimized prompt or write it to a new file.

Use `--style concise` for normal cleanup, `--style caveman` for agent memory, and `--style ultra` when token budget matters more than human prose.

## Cost Estimator

`context-doctor` estimates input cost per call from prompt tokens. Prices are stored in core so CLI, library, VS Code, and MCP return the same numbers.

```bash
context-doctor analyze prompt.txt --model gpt-4o
```

```text
Cost Estimate
┌──────────────────────┬──────────────────────┐
│ Model                │ Estimated input cost │
├──────────────────────┼──────────────────────┤
│ gpt-4o               │ $0.001205            │
│ claude-sonnet-3-5    │ $0.001446            │
│ gemini-1-5-pro       │ $0.000603            │
└──────────────────────┴──────────────────────┘
```

Library output includes:

```ts
result.costEstimates["gpt-4o"];
result.costEstimates["claude-sonnet-3-5"];
result.costEstimates["gemini-1-5-pro"];
```

## GitHub Action

The repo includes [context-check.yml](./.github/workflows/context-check.yml), which analyzes changed `.md`, `.txt`, and `.prompt` files in pull requests, comments with token totals and savings, and fails if tokens grow by more than 20% versus the base branch.

Copy-paste minimal workflow:

```yaml
name: Context Check

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  context-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: node packages/cli/dist/index.js analyze README.md
```

## MCP Integration

Run the MCP server:

```bash
npx @context-doctor/mcp
```

Claude Code config:

```json
{
  "mcpServers": {
    "context-doctor": {
      "command": "npx",
      "args": ["@context-doctor/mcp"]
    }
  }
}
```

Cursor config:

```json
{
  "mcpServers": {
    "context-doctor": {
      "command": "npx",
      "args": ["@context-doctor/mcp"]
    }
  }
}
```

Tools exposed:

- `analyze`: returns token count, costs, segments, waste, optimized prompt.
- `optimize`: returns optimized prompt plus savings summary.

## Why context-doctor?

- Find waste fast before prompts hit cost, latency, truncation walls.
- Build own integrations with clean strict TypeScript core API.
- Keep flow inside editor, terminal, CI.

## Caveman-style Compression

`--style caveman` and `--style ultra` apply local deterministic compression inspired by the Caveman plugin pattern: remove filler, shorten common technical words, keep technical signal, preserve fenced code. Use these styles for agent memory files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor rules, Windsurf rules, Cline rules, and Copilot instructions.

See [Integrations](./docs/INTEGRATIONS.md).

## Monorepo

```text
context-doctor/
├── packages/core
├── packages/cli
├── packages/vscode
├── README.md
├── package.json
└── turbo.json
```

## Library example

```ts
import { analyzePrompt } from "@context-doctor/core";

const result = analyzePrompt(rawPrompt, { model: "gpt-4o" });

console.log(result.totalTokens);
console.log(result.estimatedSavings);
console.log(result.optimizedPrompt);
```

## VS Code extension

Features:

- Status bar token count with savings percent.
- Dashboard with summary cards, cost table, segments, waste, and one-click fixes.
- Sidebar tree view for model, style, segments, and waste items.
- Inline waste decorations with hover suggestions.
- CodeLens over large segments.
- Commands for analyze, optimize, compare with clipboard, model switch, style switch.

## Development

```bash
npm install
npm run build
npm test
```

## Contributing

1. Fork repo.
2. Create branch.
3. Add tests for behavior change.
4. Run `npm test`.
5. Open PR with prompt sample + before/after token diff.

## License

MIT

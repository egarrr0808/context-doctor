# Integrations

## Codex

Use `context-doctor` before committing large prompt or memory files:

```bash
context-doctor analyze AGENTS.md --style caveman
context-doctor optimize AGENTS.md -o AGENTS.optimized.md --style ultra
```

## Claude Code

Pair with Caveman-style memory compression:

```bash
context-doctor analyze CLAUDE.md --model claude-3-5 --style caveman
context-doctor optimize CLAUDE.md -o CLAUDE.compact.md --model claude-3-5 --style ultra
```

The `caveman` and `ultra` styles are deterministic, local, and inspired by the Caveman plugin pattern: remove filler, shorten common technical words, preserve technical signal, keep code fences intact.

## Gemini CLI

```bash
context-doctor analyze GEMINI.md --model gemini-1-5 --style concise
```

## Cursor, Windsurf, Cline

Run on rule files before adding them to editor context:

```bash
context-doctor analyze .cursor/rules/*.md --style concise
context-doctor analyze .windsurf/rules/*.md --style caveman
context-doctor analyze .clinerules/*.md --style concise
```

## GitHub Copilot

```bash
context-doctor analyze .github/copilot-instructions.md --style concise
```

## Pre-commit Hook

```bash
#!/usr/bin/env bash
set -euo pipefail

for file in AGENTS.md CLAUDE.md GEMINI.md .github/copilot-instructions.md; do
  [ -f "$file" ] || continue
  context-doctor analyze "$file" --format json > /tmp/context-doctor.json
done
```

## CI Budget Check

```bash
tokens=$(context-doctor analyze prompt.md --format json | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s).totalTokens))')
test "$tokens" -lt 50000
```

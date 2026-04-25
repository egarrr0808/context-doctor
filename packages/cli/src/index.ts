#!/usr/bin/env node
import { access, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  analyzePrompt,
  DEFAULT_MODEL,
  MODEL_IDS,
  MODEL_PROFILES,
  normalizeModelId,
  type AnalysisResult,
  type CompressionStyle,
  type ModelId
} from "@context-doctor/core";
import chokidar from "chokidar";
import { Command } from "commander";

import { formatAnalysisMarkdown, formatAnalysisTable } from "./format";
import { readInput } from "./io";

const program = new Command();

type OutputFormat = "table" | "json" | "markdown";
const OUTPUT_FORMATS = new Set<OutputFormat>(["table", "json", "markdown"]);
const COMPRESSION_STYLES = new Set<CompressionStyle>(["standard", "concise", "caveman", "ultra"]);

function printResult(result: AnalysisResult, format: OutputFormat): void {
  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (format === "markdown") {
    console.log(formatAnalysisMarkdown(result));
    return;
  }

  console.log(formatAnalysisTable(result));
}

async function runAnalysis(
  file: string,
  model: ModelId,
  format: OutputFormat,
  style: CompressionStyle,
  fix = false
): Promise<void> {
  const input = await readInput(file);
  const result = analyzePrompt(input, { model, compressionStyle: style });
  printResult(result, format);

  if (fix) {
    console.log("\n--- optimized prompt ---\n");
    console.log(result.optimizedPrompt);
  }
}

function parseModel(model: string): ModelId {
  const normalized = normalizeModelId(model);
  if (normalized) {
    return normalized;
  }
  throw new Error(`Unknown model "${model}". Use: ${MODEL_IDS.join(", ")}`);
}

function parseFormat(format: string): OutputFormat {
  if (OUTPUT_FORMATS.has(format as OutputFormat)) {
    return format as OutputFormat;
  }
  throw new Error(`Unknown format "${format}". Use: table, json, markdown`);
}

function parseStyle(style: string): CompressionStyle {
  if (COMPRESSION_STYLES.has(style as CompressionStyle)) {
    return style as CompressionStyle;
  }
  throw new Error(`Unknown style "${style}". Use: standard, concise, caveman, ultra`);
}

function completionScript(shell: string): string {
  const commands = "analyze compare optimize interactive init doctor completion explain";
  const options = "--model --format --fix --watch --style --output --help --version";

  if (shell === "fish") {
    return [
      `complete -c context-doctor -f -a "${commands}"`,
      `complete -c context-doctor -l model -a "${MODEL_IDS.join(" ")}"`,
      `complete -c context-doctor -l format -a "table json markdown"`,
      `complete -c context-doctor -l style -a "standard concise caveman ultra"`
    ].join("\n");
  }

  if (shell === "powershell" || shell === "pwsh") {
    return `Register-ArgumentCompleter -Native -CommandName context-doctor -ScriptBlock {
  param($wordToComplete)
  "${commands} ${options} ${MODEL_IDS.join(" ")} table json markdown standard concise caveman ultra".Split(" ") |
    Where-Object { $_ -like "$wordToComplete*" } |
    ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, "ParameterValue", $_) }
}`;
  }

  return `_context_doctor() {
  COMPREPLY=($(compgen -W "${commands} ${options} ${MODEL_IDS.join(" ")} table json markdown standard concise caveman ultra" -- "\${COMP_WORDS[COMP_CWORD]}"))
}
complete -F _context_doctor context-doctor`;
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false
  );
}

async function writeIfMissing(path: string, contents: string): Promise<boolean> {
  if (await exists(path)) {
    return false;
  }
  await writeFile(path, contents, "utf8");
  return true;
}

async function installPreCommitHook(root: string): Promise<"created" | "updated" | "skipped"> {
  const gitDir = join(root, ".git");
  if (!(await exists(gitDir))) {
    return "skipped";
  }

  const hooksDir = join(gitDir, "hooks");
  const hookPath = join(hooksDir, "pre-commit");
  await mkdir(hooksDir, { recursive: true });

  const block = `
# context-doctor start
if command -v context-doctor >/dev/null 2>&1; then
  files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(md|txt|prompt)$' || true)
  for file in $files; do
    [ -f "$file" ] || continue
    context-doctor analyze "$file" --format table
  done
fi
# context-doctor end
`;

  if (!(await exists(hookPath))) {
    await writeFile(hookPath, `#!/usr/bin/env bash\nset -euo pipefail\n${block}`, "utf8");
    await chmod(hookPath, 0o755);
    return "created";
  }

  const current = await readFile(hookPath, "utf8");
  if (current.includes("# context-doctor start")) {
    return "skipped";
  }

  await writeFile(hookPath, `${current.trimEnd()}\n${block}`, "utf8");
  await chmod(hookPath, 0o755);
  return "updated";
}

program.name("context-doctor").description("Analyze and optimize LLM context windows.");

program.addHelpText(
  "after",
  `

Examples:
  $ context-doctor analyze prompt.md
  $ context-doctor analyze CLAUDE.md --style caveman --fix
  $ context-doctor optimize prompt.md -o prompt.compact.md --style ultra
  $ context-doctor compare before.prompt after.prompt
  $ context-doctor explain
`
);

program
  .command("analyze")
  .argument("<file>", "file path or - for stdin")
  .option("--model <model>", "target model", DEFAULT_MODEL)
  .option("--format <format>", "table|json|markdown", "table")
  .option("--style <style>", "standard|concise|caveman|ultra", "standard")
  .option("--fix", "print optimized prompt")
  .option("--watch", "watch file for changes")
  .action(async (file, options) => {
    const model = parseModel(options.model);
    const format = parseFormat(options.format);
    const style = parseStyle(options.style);
    await runAnalysis(file, model, format, style, Boolean(options.fix));

    if (options.watch && file !== "-") {
      const watcher = chokidar.watch(file, { ignoreInitial: true });
      watcher.on("change", async () => {
        console.clear();
        await runAnalysis(file, model, format, style, Boolean(options.fix));
      });
    }
  });

program
  .command("compare")
  .argument("<file1>")
  .argument("<file2>")
  .option("--model <model>", "target model", DEFAULT_MODEL)
  .action(async (file1, file2, options) => {
    const model = parseModel(options.model);
    const [left, right] = await Promise.all([readInput(file1), readInput(file2)]);
    const leftResult = analyzePrompt(left, { model });
    const rightResult = analyzePrompt(right, { model });
    console.log(
      JSON.stringify(
        {
          model,
          before: leftResult.totalTokens,
          after: rightResult.totalTokens,
          delta: rightResult.totalTokens - leftResult.totalTokens,
          savings: Math.max(leftResult.totalTokens - rightResult.totalTokens, 0)
        },
        null,
        2
      )
    );
  });

program
  .command("optimize")
  .argument("<file>")
  .requiredOption("-o, --output <output>", "output file")
  .option("--model <model>", "target model", DEFAULT_MODEL)
  .option("--style <style>", "standard|concise|caveman|ultra", "concise")
  .action(async (file, options) => {
    const model = parseModel(options.model);
    const style = parseStyle(options.style);
    const input = await readInput(file);
    const result = analyzePrompt(input, { model, compressionStyle: style });
    await writeFile(options.output, result.optimizedPrompt, "utf8");
    console.log(`Wrote optimized prompt to ${options.output}. Saved ~${result.estimatedSavings} tokens.`);
  });

program.command("interactive").action(async () => {
  const { runInteractive } = await import("./interactive.js");
  runInteractive();
});

program
  .command("explain")
  .description("Explain what context-doctor measures and what commands to use")
  .action(() => {
    console.log(`context-doctor reads prompt/context files and estimates:

1. Tokens
   How much context window is used. Big token count means more cost, slower runs, higher truncation risk.

2. Segments
   It splits text into system/user/assistant/XML/code/text blocks so you can see where tokens go.

3. Waste
   It flags repeated instructions, duplicate docs, filler, dead whitespace, weak system prompts, noisy code comments.

4. Savings
   It estimates tokens removed if fixes are applied. Use --fix to preview optimized text.

5. Cost
   It estimates input cost across supported OpenAI, Anthropic, Google, Moonshot, and local model profiles.

Main commands:
  context-doctor analyze <file>              show readable report
  context-doctor analyze <file> --fix        show report + optimized prompt
  context-doctor optimize <file> -o <out>    write optimized file
  context-doctor compare <old> <new>         show token diff
  context-doctor interactive                 live terminal UI

Compression styles:
  standard   safe phrase cleanup
  concise    stronger cleanup for normal prompts
  caveman    terse technical memory style
  ultra      maximum deterministic compression
`);
  });

program
  .command("init")
  .description("Set up automatic context checks in the current repo")
  .option("--no-git-hook", "skip Git pre-commit hook")
  .option("--no-vscode", "skip VS Code workspace settings")
  .action(async (options) => {
    const root = process.cwd();
    const configCreated = await writeIfMissing(
      join(root, ".context-doctorrc.json"),
      JSON.stringify(
        {
          model: DEFAULT_MODEL,
          style: "concise",
          include: ["**/*.md", "**/*.txt", "**/*.prompt"],
          failOnGrowthPercent: 20
        },
        null,
        2
      )
    );

    let vscodeCreated = false;
    if (options.vscode) {
      const vscodeDir = join(root, ".vscode");
      await mkdir(vscodeDir, { recursive: true });
      vscodeCreated = await writeIfMissing(
        join(vscodeDir, "settings.json"),
        JSON.stringify(
          {
            "contextDoctor.defaultModel": DEFAULT_MODEL,
            "contextDoctor.compressionStyle": "concise",
            "contextDoctor.autoAnalyze": true
          },
          null,
          2
        )
      );
    }

    const hookStatus = options.gitHook ? await installPreCommitHook(root) : "skipped";

    console.log(`context-doctor init complete
config: ${configCreated ? "created" : "exists"}
vscode settings: ${vscodeCreated ? "created" : options.vscode ? "exists" : "skipped"}
git hook: ${hookStatus}

Automatic flow:
- VS Code analyzes open files.
- Git pre-commit checks staged .md/.txt/.prompt files.
- GitHub Action checks PR changes.
`);
  });

program
  .command("completion")
  .argument("<shell>", "bash|zsh|fish|powershell")
  .description("Print shell completion script")
  .action((shell) => {
    console.log(completionScript(shell));
  });

program
  .command("doctor")
  .description("Check local install and runtime health")
  .action(async () => {
    const checks = [
      ["node", process.version],
      ["platform", `${process.platform}/${process.arch}`],
      ["core", String(analyzePrompt("hello world").totalTokens > 0)],
      ["cwd writable", await access(process.cwd()).then(() => "true", () => "false")]
    ];

    console.log(JSON.stringify(Object.fromEntries(checks), null, 2));
  });

program.parseAsync(process.argv);

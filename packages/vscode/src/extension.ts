import * as vscode from "vscode";
import {
  analyzePrompt,
  DEFAULT_MODEL,
  MODEL_IDS,
  MODEL_PRICING,
  MODEL_PROFILES,
  type AnalysisResult,
  type CompressionStyle,
  type ModelId,
  type WasteItem
} from "@context-doctor/core";

type AnalysisNode =
  | { kind: "model"; label: string; description: string }
  | { kind: "style"; label: string; description: string }
  | { kind: "segment"; label: string; description: string }
  | { kind: "waste"; label: string; description: string; waste: WasteItem };

class ContextDoctorProvider
  implements vscode.TreeDataProvider<AnalysisNode>
{
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    AnalysisNode | null | undefined
  >();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
  private currentResult: AnalysisResult | undefined;
  private model: ModelId = DEFAULT_MODEL;
  private compressionStyle: CompressionStyle = "concise";
  private dashboard: vscode.WebviewPanel | undefined;
  private warningDecoration: vscode.TextEditorDecorationType;
  private criticalDecoration: vscode.TextEditorDecorationType;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.warningDecoration = vscode.window.createTextEditorDecorationType({
      textDecoration: "underline wavy #f59e0b"
    });
    this.criticalDecoration = vscode.window.createTextEditorDecorationType({
      textDecoration: "underline wavy #ef4444"
    });
  }

  setModel(model: ModelId): void {
    this.model = model;
    void this.refresh();
  }

  setStyle(style: CompressionStyle): void {
    this.compressionStyle = style;
    void this.refresh();
  }

  async refresh(editor = vscode.window.activeTextEditor): Promise<void> {
    if (!editor) {
      return;
    }

    this.currentResult = analyzePrompt(editor.document.getText(), {
      model: this.model,
      compressionStyle: this.compressionStyle
    });
    this.renderDecorations(editor);
    this.renderStatusBar();
    this.renderDashboard();
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  async showDashboard(editor = vscode.window.activeTextEditor): Promise<void> {
    if (!editor) {
      void vscode.window.showWarningMessage("Open a prompt, markdown, text, or code file first.");
      return;
    }

    await this.refresh(editor);

    if (!this.dashboard) {
      this.dashboard = vscode.window.createWebviewPanel(
        "contextDoctor.dashboard",
        "Context Doctor",
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );

      this.dashboard.onDidDispose(() => {
        this.dashboard = undefined;
      });

      this.dashboard.webview.onDidReceiveMessage(async (message: { command: string }) => {
        if (message.command === "optimize") {
          await vscode.commands.executeCommand("contextDoctor.optimizeCurrentFile");
        }
        if (message.command === "model") {
          await vscode.commands.executeCommand("contextDoctor.selectModel");
        }
        if (message.command === "style") {
          await vscode.commands.executeCommand("contextDoctor.selectCompressionStyle");
        }
        if (message.command === "refresh") {
          await this.refresh();
        }
      });
    }

    this.dashboard.reveal(vscode.ViewColumn.Beside);
    this.renderDashboard();
  }

  private renderStatusBar(): void {
    if (!this.currentResult) {
      return;
    }

    const savingsPercent =
      this.currentResult.totalTokens === 0
        ? 0
        : (this.currentResult.estimatedSavings / this.currentResult.totalTokens) * 100;
    statusBarItem.text = `Context: ${this.currentResult.totalTokens} tokens | save ${savingsPercent.toFixed(0)}%`;
    statusBarItem.tooltip = "Open Context Doctor dashboard";
    statusBarItem.show();
  }

  private renderDashboard(): void {
    if (!this.dashboard || !this.currentResult) {
      return;
    }

    const result = this.currentResult;
    const savingsPercent =
      result.totalTokens === 0 ? 0 : (result.estimatedSavings / result.totalTokens) * 100;
    const largestSegment = result.segments.slice().sort((a, b) => b.tokenCount - a.tokenCount)[0];
    const cheapest = Object.entries(result.costEstimates).sort(([, a], [, b]) => a - b)[0];

    const costRows = Object.entries(result.costEstimates)
      .map(
        ([model, cost]) =>
          `<tr><td>${escapeHtml(MODEL_PRICING[model]?.label ?? model)}</td><td>$${cost.toFixed(6)}</td></tr>`
      )
      .join("");
    const segmentRows = result.segments
      .map(
        (segment) =>
          `<tr><td>${escapeHtml(segment.label)}</td><td>${segment.tokenCount}</td><td>${segment.utilizationPercent.toFixed(1)}%</td></tr>`
      )
      .join("");
    const wasteRows = result.wasteItems.length
      ? result.wasteItems
          .map(
            (item) =>
              `<tr><td>${escapeHtml(item.wastType)}</td><td>${item.tokensBefore - item.tokensAfter}</td><td>${escapeHtml(item.preview)}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="3">No obvious waste found.</td></tr>`;

    this.dashboard.webview.html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      color-scheme: light dark;
      --fg: var(--vscode-foreground);
      --muted: var(--vscode-descriptionForeground);
      --bg: var(--vscode-editor-background);
      --panel: var(--vscode-sideBar-background);
      --border: var(--vscode-panel-border);
      --accent: var(--vscode-button-background);
      --accent-fg: var(--vscode-button-foreground);
      --warn: var(--vscode-editorWarning-foreground);
    }
    body {
      margin: 0;
      padding: 20px;
      color: var(--fg);
      background: var(--bg);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    h1 { margin: 0 0 6px; font-size: 22px; }
    h2 { margin: 22px 0 10px; font-size: 15px; }
    .muted { color: var(--muted); }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    button {
      border: 0;
      border-radius: 4px;
      padding: 7px 10px;
      color: var(--accent-fg);
      background: var(--accent);
      cursor: pointer;
      font: inherit;
    }
    button.secondary {
      color: var(--fg);
      background: transparent;
      border: 1px solid var(--border);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
    }
    .card {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 6px;
      padding: 12px;
    }
    .label { color: var(--muted); font-size: 12px; }
    .value { font-size: 24px; margin-top: 4px; font-weight: 700; }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      overflow: hidden;
    }
    th, td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }
    th { color: var(--muted); font-weight: 600; background: var(--panel); }
    .callout {
      margin-top: 14px;
      border-left: 3px solid var(--warn);
      padding: 10px 12px;
      background: var(--panel);
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Context Doctor</h1>
      <div class="muted">Model ${escapeHtml(MODEL_PROFILES[this.model].label)} | Style ${escapeHtml(this.compressionStyle)}</div>
    </div>
    <div class="actions">
      <button data-command="optimize">Apply fixes</button>
      <button class="secondary" data-command="model">Model</button>
      <button class="secondary" data-command="style">Style</button>
      <button class="secondary" data-command="refresh">Refresh</button>
    </div>
  </header>

  <section class="grid">
    <div class="card"><div class="label">Tokens</div><div class="value">${result.totalTokens}</div></div>
    <div class="card"><div class="label">Context used</div><div class="value">${result.utilizationPercent.toFixed(1)}%</div></div>
    <div class="card"><div class="label">Savings</div><div class="value">${result.estimatedSavings}</div><div class="muted">${savingsPercent.toFixed(1)}%</div></div>
    <div class="card"><div class="label">Waste items</div><div class="value">${result.wasteItems.length}</div></div>
  </section>

  <div class="callout">
    Largest segment: ${largestSegment ? `${escapeHtml(largestSegment.label)} (${largestSegment.tokenCount} tokens)` : "none"}.
    Cheapest listed model: ${cheapest ? `${escapeHtml(MODEL_PRICING[cheapest[0]]?.label ?? cheapest[0])} ($${cheapest[1].toFixed(6)})` : "none"}.
  </div>

  <h2>Cost</h2>
  <table><thead><tr><th>Model</th><th>Input cost</th></tr></thead><tbody>${costRows}</tbody></table>

  <h2>Segments</h2>
  <table><thead><tr><th>Segment</th><th>Tokens</th><th>% total</th></tr></thead><tbody>${segmentRows}</tbody></table>

  <h2>Waste</h2>
  <table><thead><tr><th>Type</th><th>Saved tokens</th><th>Preview</th></tr></thead><tbody>${wasteRows}</tbody></table>

  <script>
    const vscode = acquireVsCodeApi();
    document.querySelectorAll("button[data-command]").forEach((button) => {
      button.addEventListener("click", () => vscode.postMessage({ command: button.dataset.command }));
    });
  </script>
</body>
</html>`;
  }

  private renderDecorations(editor: vscode.TextEditor): void {
    if (!this.currentResult) {
      return;
    }

    const warning: vscode.DecorationOptions[] = [];
    const critical: vscode.DecorationOptions[] = [];

    for (const item of this.currentResult.wasteItems) {
      const range = new vscode.Range(
        editor.document.positionAt(item.location.start),
        editor.document.positionAt(item.location.end)
      );

      const entry = {
        range,
        hoverMessage: `${item.wastType}: ${item.suggestion || "Delete segment"}`
      };

      if (item.tokensBefore - item.tokensAfter > 20) {
        critical.push(entry);
      } else {
        warning.push(entry);
      }
    }

    editor.setDecorations(this.warningDecoration, warning);
    editor.setDecorations(this.criticalDecoration, critical);
  }

  getTreeItem(element: AnalysisNode): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label);
    item.description = element.description;

    if (element.kind === "model") {
      item.command = { command: "contextDoctor.selectModel", title: "Select Model" };
      item.contextValue = "model";
    }

    if (element.kind === "style") {
      item.command = {
        command: "contextDoctor.selectCompressionStyle",
        title: "Select Compression Style"
      };
      item.contextValue = "style";
    }

    if (element.kind === "waste") {
      item.command = {
        command: "contextDoctor.applyWasteFix",
        title: "Apply Waste Fix",
        arguments: [element.waste]
      };
      item.contextValue = "waste";
    }

    return item;
  }

  getChildren(): AnalysisNode[] {
    if (!this.currentResult) {
      return [
        { kind: "model", label: `Model: ${MODEL_PROFILES[this.model].label}`, description: "Click to change" },
        {
          kind: "style",
          label: `Style: ${this.compressionStyle}`,
          description: "Click to change"
        }
      ];
    }

    return [
      { kind: "model", label: `Model: ${MODEL_PROFILES[this.model].label}`, description: "Click to change" },
      {
        kind: "style",
        label: `Style: ${this.compressionStyle}`,
        description: "Click to change"
      },
      ...this.currentResult.segments.map((segment) => ({
        kind: "segment" as const,
        label: `${segment.label}`,
        description: `${segment.tokenCount} tokens`
      })),
      ...this.currentResult.wasteItems.map((waste) => ({
        kind: "waste" as const,
        label: `${waste.wastType}`,
        description: `save ~${waste.tokensBefore - waste.tokensAfter} tokens`,
        waste
      }))
    ];
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    if (!this.currentResult) {
      return [];
    }

    return this.currentResult.segments
      .filter((segment) => segment.tokenCount > 30)
      .map((segment) => {
        const range = new vscode.Range(
          document.positionAt(segment.location.start),
          document.positionAt(segment.location.start)
        );

        return new vscode.CodeLens(range, {
          command: "contextDoctor.optimizeCurrentFile",
          title: `⚠ ${segment.tokenCount} tokens — click to compress`
        });
      });
  }
}

const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

export function activate(context: vscode.ExtensionContext): void {
  const provider = new ContextDoctorProvider(context);
  const codeLensProvider: any = {
    provideCodeLenses: (
      document: vscode.TextDocument,
      token: vscode.CancellationToken
    ) => provider.provideCodeLenses(document, token)
  };

  context.subscriptions.push(
    statusBarItem,
    vscode.window.registerTreeDataProvider("contextDoctor.sidebar", provider),
    vscode.languages.registerCodeLensProvider({ scheme: "*" }, codeLensProvider),
    vscode.commands.registerCommand("contextDoctor.openAnalysisPanel", () => provider.showDashboard()),
    vscode.commands.registerCommand("contextDoctor.analyzeCurrentFile", () => provider.showDashboard()),
    vscode.commands.registerCommand("contextDoctor.optimizeCurrentFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const styled = analyzePrompt(editor.document.getText(), {
        model: getConfiguredModel(),
        compressionStyle: getConfiguredStyle()
      });
      await editor.edit((edit) => {
        const last = editor.document.positionAt(editor.document.getText().length);
        edit.replace(new vscode.Range(new vscode.Position(0, 0), last), styled.optimizedPrompt);
      });
      await provider.refresh(editor);
      void vscode.window.showInformationMessage(
        `Context Doctor applied ${styled.wasteItems.length} fixes, saving ~${styled.estimatedSavings} tokens.`
      );
    }),
    vscode.commands.registerCommand("contextDoctor.compareWithClipboard", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const clipboard = await vscode.env.clipboard.readText();
      const current = analyzePrompt(editor.document.getText(), { model: getConfiguredModel() });
      const other = analyzePrompt(clipboard, { model: getConfiguredModel() });
      void vscode.window.showInformationMessage(
        `Current ${current.totalTokens} tokens | Clipboard ${other.totalTokens} tokens | Delta ${other.totalTokens - current.totalTokens}`
      );
    }),
    vscode.commands.registerCommand("contextDoctor.selectModel", async () => {
      const picked = await vscode.window.showQuickPick(
        MODEL_IDS.map((id) => ({
          label: MODEL_PROFILES[id].label,
          description: `${id} • ${MODEL_PROFILES[id].modelLimit.toLocaleString()} ctx`,
          id
        }))
      );
      if (!picked) {
        return;
      }
      await vscode.workspace.getConfiguration("contextDoctor").update("defaultModel", picked.id, true);
      provider.setModel(picked.id);
    }),
    vscode.commands.registerCommand("contextDoctor.selectCompressionStyle", async () => {
      const picked = await vscode.window.showQuickPick(["standard", "concise", "caveman", "ultra"]);
      if (!picked) {
        return;
      }
      await vscode.workspace.getConfiguration("contextDoctor").update("compressionStyle", picked, true);
      provider.setStyle(picked as CompressionStyle);
    }),
    vscode.commands.registerCommand("contextDoctor.applyWasteFix", async (waste: WasteItem) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      await editor.edit((edit) => {
        const range = new vscode.Range(
          editor.document.positionAt(waste.location.start),
          editor.document.positionAt(waste.location.end)
        );
        edit.replace(range, waste.suggestion);
      });
      await provider.refresh(editor);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && vscode.workspace.getConfiguration("contextDoctor").get("autoAnalyze", true)) {
        void provider.refresh(editor);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (
        editor &&
        event.document === editor.document &&
        vscode.workspace.getConfiguration("contextDoctor").get("autoAnalyze", true)
      ) {
        void provider.refresh(editor);
      }
    })
  );

  statusBarItem.command = "contextDoctor.openAnalysisPanel";
  provider.setModel(getConfiguredModel());
  provider.setStyle(getConfiguredStyle());
  void provider.refresh();
}

function getConfiguredModel(): ModelId {
  return vscode.workspace
    .getConfiguration("contextDoctor")
    .get<ModelId>("defaultModel", DEFAULT_MODEL);
}

function getConfiguredStyle(): CompressionStyle {
  return vscode.workspace
    .getConfiguration("contextDoctor")
    .get<CompressionStyle>("compressionStyle", "concise");
}

export function deactivate(): void {
  statusBarItem.dispose();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

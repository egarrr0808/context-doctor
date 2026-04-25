import chalk from "chalk";
import Table from "cli-table3";

import type { AnalysisResult, Segment, WasteItem } from "@context-doctor/core";

function utilizationColor(utilizationPercent: number) {
  if (utilizationPercent > 90) {
    return chalk.red;
  }
  if (utilizationPercent >= 70) {
    return chalk.yellow;
  }
  return chalk.green;
}

function segmentStatus(segment: Segment): string {
  if (segment.utilizationPercent > 35) {
    return "critical";
  }
  if (segment.utilizationPercent > 15 || segment.duplicateOf) {
    return "warning";
  }
  return "ok";
}

export function formatSummary(result: AnalysisResult): string {
  const color = utilizationColor(result.utilizationPercent);
  const savingsPercent =
    result.totalTokens === 0 ? 0 : (result.estimatedSavings / result.totalTokens) * 100;
  const table = new Table({
    style: { head: [], border: [] },
    colWidths: [22, 24]
  });

  table.push(
    ["Total tokens", color(String(result.totalTokens))],
    ["Model limit", String(result.modelLimit)],
    ["Used", color(`${result.utilizationPercent.toFixed(1)}%`)],
    ["Estimated savings", chalk.cyan(`${result.estimatedSavings} tokens (${savingsPercent.toFixed(1)}%)`)]
  );

  return `${chalk.bold("Context Summary")}\n${table.toString()}`;
}

export function formatSegments(result: AnalysisResult): string {
  const table = new Table({
    head: ["Segment", "Tokens", "% total", "Status"],
    style: { head: ["cyan"] }
  });

  for (const segment of result.segments) {
    const status = segmentStatus(segment);
    const color =
      status === "critical" ? chalk.red : status === "warning" ? chalk.yellow : chalk.green;

    table.push([
      segment.label,
      String(segment.tokenCount),
      `${segment.utilizationPercent.toFixed(1)}%`,
      color(status)
    ]);
  }

  return `${chalk.bold("Segments")}\n${table.toString()}`;
}

function wasteLine(item: WasteItem): string {
  const saved = item.tokensBefore - item.tokensAfter;
  return `${chalk.yellow(item.wastType)} ${saved > 0 ? `(-${saved})` : ""} ${item.preview}`;
}

export function formatWaste(result: AnalysisResult): string {
  const lines = result.wasteItems.length > 0 ? result.wasteItems.map(wasteLine) : ["No obvious waste found."];
  const footer = `Run with --fix to auto-apply ${result.wasteItems.length} optimizations saving ~${result.estimatedSavings} tokens`;
  return `${chalk.bold("Waste Items")}\n${lines.join("\n")}\n\n${chalk.cyan(footer)}`;
}

export function formatCosts(result: AnalysisResult): string {
  const table = new Table({
    head: ["Model", "Estimated input cost"],
    style: { head: ["cyan"] }
  });

  for (const [model, cost] of Object.entries(result.costEstimates)) {
    table.push([model, `$${cost.toFixed(6)}`]);
  }

  return `${chalk.bold("Cost Estimate")}\n${table.toString()}`;
}

export function formatAnalysisTable(result: AnalysisResult): string {
  return [
    formatSummary(result),
    formatSegments(result),
    formatCosts(result),
    formatWaste(result),
    formatNextSteps(result)
  ].join("\n\n");
}

export function formatNextSteps(result: AnalysisResult): string {
  const worstSegment = result.segments
    .slice()
    .sort((a, b) => b.tokenCount - a.tokenCount)[0];
  const cheapest = Object.entries(result.costEstimates)
    .sort(([, a], [, b]) => a - b)[0];
  const lines = [
    worstSegment
      ? `Largest segment: ${worstSegment.label} (${worstSegment.tokenCount} tokens).`
      : "No segments detected.",
    cheapest
      ? `Cheapest listed model for this prompt: ${cheapest[0]} ($${cheapest[1].toFixed(6)} input).`
      : "No cost data available.",
    result.estimatedSavings > 0
      ? `Try: context-doctor analyze <file> --fix --style concise`
      : "Prompt already looks compact."
  ];

  return `${chalk.bold("What To Do Next")}\n${lines.join("\n")}`;
}

export function formatAnalysisMarkdown(result: AnalysisResult): string {
  const wasteLines = result.wasteItems
    .map(
      (item) =>
        `- \`${item.wastType}\` saves ~${item.tokensBefore - item.tokensAfter} tokens: ${item.preview}`
    )
    .join("\n");

  return [
    "# Context Doctor Report",
    "",
    `- Total tokens: ${result.totalTokens}`,
    `- Model limit: ${result.modelLimit}`,
    `- Utilization: ${result.utilizationPercent.toFixed(1)}%`,
    `- Estimated savings: ${result.estimatedSavings}`,
    "",
    "## Cost Estimate",
    "",
    "| Model | Estimated input cost |",
    "| --- | ---: |",
    ...Object.entries(result.costEstimates).map(([model, cost]) => `| ${model} | $${cost.toFixed(6)} |`),
    "",
    "## Segments",
    "",
    "| Segment | Tokens | % total | Status |",
    "| --- | ---: | ---: | --- |",
    ...result.segments.map(
      (segment) =>
        `| ${segment.label} | ${segment.tokenCount} | ${segment.utilizationPercent.toFixed(1)}% | ${segmentStatus(segment)} |`
    ),
    "",
    "## Waste",
    "",
    wasteLines,
    "",
    "## What To Do Next",
    "",
    formatNextSteps(result).replace(/\u001b\[[0-9;]*m/g, "")
  ].join("\n");
}

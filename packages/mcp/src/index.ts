#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  analyzePrompt,
  DEFAULT_MODEL,
  MODEL_IDS,
  type CompressionStyle,
  type ModelId
} from "@context-doctor/core";
import { z } from "zod";

const modelSchema = z.enum(MODEL_IDS as [ModelId, ...ModelId[]]);
const styleSchema = z.enum(["standard", "concise", "caveman", "ultra"]);

const server = new McpServer({
  name: "context-doctor",
  version: "0.1.0"
});

server.registerTool(
  "analyze",
  {
    title: "Analyze LLM context",
    description: "Analyze prompt text for token count, cost estimates, segments, waste, and optimization savings.",
    inputSchema: {
      text: z.string().describe("Prompt or context text to analyze."),
      model: modelSchema.default(DEFAULT_MODEL).describe("Model tokenization profile."),
      compressionStyle: styleSchema.default("standard").describe("Optimization style used for savings estimate.")
    }
  },
  async ({ text, model, compressionStyle }) => {
    const result = analyzePrompt(text, {
      model: model as ModelId,
      compressionStyle: compressionStyle as CompressionStyle
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

server.registerTool(
  "optimize",
  {
    title: "Optimize LLM context",
    description: "Return an optimized prompt using context-doctor waste detection and compression styles.",
    inputSchema: {
      text: z.string().describe("Prompt or context text to optimize."),
      model: modelSchema.default(DEFAULT_MODEL).describe("Model tokenization profile."),
      compressionStyle: styleSchema.default("concise").describe("Optimization style to apply.")
    }
  },
  async ({ text, model, compressionStyle }) => {
    const result = analyzePrompt(text, {
      model: model as ModelId,
      compressionStyle: compressionStyle as CompressionStyle
    });

    return {
      content: [
        {
          type: "text",
          text: result.optimizedPrompt
        },
        {
          type: "text",
          text: JSON.stringify(
            {
              totalTokens: result.totalTokens,
              estimatedSavings: result.estimatedSavings,
              costEstimates: result.costEstimates,
              wasteItems: result.wasteItems.length
            },
            null,
            2
          )
        }
      ]
    };
  }
);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

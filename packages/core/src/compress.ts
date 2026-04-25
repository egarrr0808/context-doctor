import type { CompressionStyle } from "./types";

type Replacement = [RegExp, string];

const FILLER_REPLACEMENTS: Replacement[] = [
  [/\bplease make sure that you\b/gi, "you must"],
  [/\bit is important to note that\b/gi, "note:"],
  [/\bin order to\b/gi, "to"],
  [/\bat this point in time\b/gi, "now"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\bfor the purpose of\b/gi, "to"],
  [/\bwith regard to\b/gi, "about"],
  [/\bin the event that\b/gi, "if"],
  [/\bprior to\b/gi, "before"],
  [/\bsubsequent to\b/gi, "after"],
  [/\ba large number of\b/gi, "many"],
  [/\bthe vast majority of\b/gi, "most"],
  [/\bmake a decision\b/gi, "decide"],
  [/\bprovide an explanation\b/gi, "explain"],
  [/\bperform an analysis\b/gi, "analyze"],
  [/\btake into consideration\b/gi, "consider"],
  [/\butilize\b/gi, "use"],
  [/\bI would like you to\b/gi, ""],
  [/\bThe assistant should\b/gi, "Must"],
  [/\bDo not forget to\b/gi, "Must"],
  [/\bIt is necessary to\b/gi, "Must"],
  [/\bYour task is to\b/gi, "Task:"],
  [/\bThe goal is to\b/gi, "Goal:"],
  [/\bIf possible,\s*/gi, ""],
  [/\bBasically,\s*/gi, ""],
  [/\bActually,\s*/gi, ""],
  [/\bSimply\s+/gi, ""],
  [/\bJust\s+/gi, ""],
  [/\bReally\s+/gi, ""]
];

const TECH_REPLACEMENTS: Replacement[] = [
  [/\bconfiguration\b/gi, "config"],
  [/\bdatabase\b/gi, "DB"],
  [/\bauthentication\b/gi, "auth"],
  [/\bauthorization\b/gi, "authz"],
  [/\bimplementation\b/gi, "impl"],
  [/\bfunction\b/gi, "fn"],
  [/\bfunctions\b/gi, "fns"],
  [/\brequest\b/gi, "req"],
  [/\bresponse\b/gi, "res"],
  [/\bapplication\b/gi, "app"],
  [/\bapplications\b/gi, "apps"],
  [/\bcomponent\b/gi, "cmp"],
  [/\bcomponents\b/gi, "cmps"],
  [/\bshould be able to\b/gi, "can"],
  [/\bneeds to\b/gi, "must"],
  [/\bconnection\b/gi, "conn"],
  [/\breference\b/gi, "ref"],
  [/\breferences\b/gi, "refs"],
  [/\bobject\b/gi, "obj"],
  [/\bobjects\b/gi, "objs"],
  [/\bproperty\b/gi, "prop"],
  [/\bproperties\b/gi, "props"],
  [/\berror\b/gi, "err"],
  [/\bmessage\b/gi, "msg"]
];

const FULL_REPLACEMENTS: Replacement[] = [...FILLER_REPLACEMENTS, ...TECH_REPLACEMENTS];

const ULTRA_REPLACEMENTS: Replacement[] = [
  ...FULL_REPLACEMENTS,
  [/\bbecause\b/gi, "->"],
  [/\btherefore\b/gi, "->"],
  [/\bresults in\b/gi, "->"],
  [/\bleads to\b/gi, "->"],
  [/\bcauses\b/gi, "->"],
  [/\bmust ensure that\b/gi, "must"],
  [/\byou must\b/gi, "must"]
];

const STYLE_ALIASES: Record<CompressionStyle, CompressionStyle> = {
  standard: "standard",
  concise: "concise",
  lite: "lite",
  caveman: "full",
  full: "full",
  ultra: "ultra"
};

const CODE_FENCE = /```[\s\S]*?```/g;

function normalizeStyle(style: CompressionStyle): CompressionStyle {
  return STYLE_ALIASES[style];
}

function applyReplacements(input: string, replacements: Replacement[]): string {
  let output = input;

  for (const [pattern, replacement] of replacements) {
    output = output.replace(pattern, replacement);
  }

  return output;
}

function compressProse(input: string, style: CompressionStyle): string {
  const normalized = normalizeStyle(style);
  let output = input;

  if (normalized === "standard") {
    output = applyReplacements(output, FILLER_REPLACEMENTS.slice(0, 17));
  } else if (normalized === "concise" || normalized === "lite") {
    output = applyReplacements(output, FILLER_REPLACEMENTS);
  } else if (normalized === "full") {
    output = applyReplacements(output, FULL_REPLACEMENTS);
  } else if (normalized === "ultra") {
    output = applyReplacements(output, ULTRA_REPLACEMENTS);
  }

  if (normalized === "full" || normalized === "ultra") {
    output = output
      .replace(/\b(the|a|an)\s+/gi, "")
      .replace(/\bplease\b[,\s]*/gi, "")
      .replace(/\bI think that\s+/gi, "")
      .replace(/\bIt seems like\s+/gi, "")
      .replace(/\bof course\b[,\s]*/gi, "")
      .replace(/\bhappy to\b[,\s]*/gi, "")
      .replace(/\bcertainly\b[,\s]*/gi, "");
  }

  if (normalized === "ultra") {
    output = output
      .replace(/\s*->\s*/g, " -> ")
      .replace(/\band\b/gi, "")
      .replace(/\bthen\b/gi, "")
      .replace(/\bthat\b/gi, "")
      .replace(/\s{2,}/g, " ");
  }

  return output
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Deterministically compress prose while preserving fenced code blocks.
 */
export function compressPrompt(
  input: string,
  style: CompressionStyle = "standard"
): string {
  let output = "";
  let cursor = 0;

  for (const match of input.matchAll(CODE_FENCE)) {
    const block = match[0];
    const start = match.index ?? 0;
    output += compressProse(input.slice(cursor, start), style);
    output += block;
    cursor = start + block.length;
  }

  output += compressProse(input.slice(cursor), style);
  return output.trim();
}

/**
 * Return reusable Caveman prompting instructions for external tools.
 */
export function buildCavemanPrompt(style: "lite" | "full" | "ultra" = "full"): string {
  const common = [
    "Respond terse like smart caveman. All technical substance stay. Only fluff die.",
    "Drop filler, hedging, pleasantries.",
    "Keep technical terms exact.",
    "Code blocks unchanged.",
    "Errors quoted exact.",
    "Pattern: [thing] [action] [reason]. [next step]."
  ];

  const styleRule =
    style === "lite"
      ? "Lite: no filler/hedging. Keep full sentences. Professional but tight."
      : style === "ultra"
        ? "Ultra: abbreviate technical terms (DB/auth/config/req/res/fn/impl), strip conjunctions, use arrows for causality."
        : "Full: drop articles, fragments OK, short synonyms, classic caveman.";

  return [...common, styleRule].join("\n");
}

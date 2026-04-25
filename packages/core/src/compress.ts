import type { CompressionStyle } from "./types";

type Replacement = [RegExp, string];

const STANDARD_REPLACEMENTS: Replacement[] = [
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
  [/\butilize\b/gi, "use"]
];

const CONCISE_REPLACEMENTS: Replacement[] = [
  ...STANDARD_REPLACEMENTS,
  [/\bI would like you to\b/gi, ""],
  [/\bYou should\b/gi, "Must"],
  [/\bThe assistant should\b/gi, "Must"],
  [/\bDo not forget to\b/gi, "Must"],
  [/\bIt is necessary to\b/gi, "Must"],
  [/\bYour task is to\b/gi, "Task:"],
  [/\bThe goal is to\b/gi, "Goal:"],
  [/\bThe following\b/gi, "This"],
  [/\bIf possible,\s*/gi, ""],
  [/\bBasically,\s*/gi, ""],
  [/\bActually,\s*/gi, ""],
  [/\bSimply\s+/gi, ""],
  [/\bJust\s+/gi, ""],
  [/\bReally\s+/gi, ""]
];

const CAVEMAN_REPLACEMENTS: Replacement[] = [
  ...CONCISE_REPLACEMENTS,
  [/\bconfiguration\b/gi, "config"],
  [/\bdatabase\b/gi, "DB"],
  [/\bauthentication\b/gi, "auth"],
  [/\bauthorization\b/gi, "authz"],
  [/\bimplementation\b/gi, "impl"],
  [/\bfunction\b/gi, "fn"],
  [/\brequest\b/gi, "req"],
  [/\bresponse\b/gi, "res"],
  [/\bapplication\b/gi, "app"],
  [/\bcomponent\b/gi, "component"],
  [/\bbecause\b/gi, "because"],
  [/\btherefore\b/gi, "so"],
  [/\bshould be able to\b/gi, "can"],
  [/\bneeds to\b/gi, "must"]
];

const ULTRA_REPLACEMENTS: Replacement[] = [
  ...CAVEMAN_REPLACEMENTS,
  [/\bbecause\b/gi, "->"],
  [/\btherefore\b/gi, "->"],
  [/\bresults in\b/gi, "->"],
  [/\bleads to\b/gi, "->"],
  [/\bcauses\b/gi, "->"],
  [/\bnew reference\b/gi, "new ref"],
  [/\bobject\b/gi, "obj"],
  [/\bproperty\b/gi, "prop"],
  [/\berror\b/gi, "err"],
  [/\bmessage\b/gi, "msg"]
];

const STYLE_REPLACEMENTS: Record<CompressionStyle, Replacement[]> = {
  standard: STANDARD_REPLACEMENTS,
  concise: CONCISE_REPLACEMENTS,
  caveman: CAVEMAN_REPLACEMENTS,
  ultra: ULTRA_REPLACEMENTS
};

const CODE_FENCE = /```[\s\S]*?```/g;

function compressProse(input: string, style: CompressionStyle): string {
  let output = input;

  for (const [pattern, replacement] of STYLE_REPLACEMENTS[style]) {
    output = output.replace(pattern, replacement);
  }

  if (style === "caveman" || style === "ultra") {
    output = output
      .replace(/\b(the|a|an)\s+/gi, "")
      .replace(/\bplease\b[,\s]*/gi, "")
      .replace(/\bI think that\s+/gi, "")
      .replace(/\bIt seems like\s+/gi, "");
  }

  if (style === "ultra") {
    output = output
      .replace(/\s*->\s*/g, " -> ")
      .replace(/\bmust ensure that\b/gi, "must")
      .replace(/\byou must\b/gi, "must");
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

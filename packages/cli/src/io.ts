import { readFile } from "node:fs/promises";

export async function readInput(pathOrDash: string): Promise<string> {
  if (pathOrDash === "-") {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }
    return Buffer.concat(chunks).toString("utf8");
  }

  return readFile(pathOrDash, "utf8");
}

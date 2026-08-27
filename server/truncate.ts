import { MAX_MODEL_VISIBLE_TOOL_OUTPUT_CHARS } from "./limits.js";

export function truncateForModel(
  output: string,
  maxChars = MAX_MODEL_VISIBLE_TOOL_OUTPUT_CHARS,
): string {
  if (output.length <= maxChars) return output;
  const marker = "\n\n... output truncated for agent context ...\n\n";
  const budget = Math.max(maxChars - marker.length, 16);
  const head = Math.ceil(budget * 0.75);
  const tail = budget - head;
  return `${output.slice(0, head)}${marker}${output.slice(-tail)}`;
}

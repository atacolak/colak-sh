const MARKUP = /[*`#]+/g;
const TOOL_ECHO = /\bterminal[_ ]?exec\b[:\s]*[^\n]*/gi;
const TYPED_COMMAND =
  /(?:^|[\s.])((?:pwd|cd|ls|cat|head|tail|tree|find|grep|rg|wc|stat)(?:\s+\S+)*)\s*$/i;

export function extractTypedCommand(text: string): string | undefined {
  const match = text.match(TYPED_COMMAND);
  const command = match?.[1]?.trim();
  return command || undefined;
}

export function plainChatText(text: string): string {
  let next = text.replace(MARKUP, "").replace(TOOL_ECHO, "");
  const typed = extractTypedCommand(next);
  if (typed) {
    next = next.slice(0, next.lastIndexOf(typed)).replace(/[\s.]+$/, "");
  }
  return finishMutter(next);
}

export function finishMutter(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const closed = trimmed.replace(
    /\b(?:to|for|and|or|of|at|in|on|with|from|into|about|the|a|an)$/i,
    "",
  ).trim();
  if (!closed) return "";
  return /[.!?]$/.test(closed) ? `${closed} ` : `${closed}. `;
}

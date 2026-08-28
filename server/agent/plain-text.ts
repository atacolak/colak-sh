const MARKUP = /[*`#]+/g;
const TOOL_ECHO = /\bterminal[_ ]?exec\b[:\s]*[^\n]*/gi;
const TYPED_COMMAND =
  /(?:^|[\s.])((?:pwd|cd|ls|cat|head|tail|tree|find|grep|rg|wc|stat)(?:\s+\S+){0,5})\s*$/i;
const SHELL_ARG = /^(?:-[A-Za-z0-9._-]{1,8}|\.{1,2}|~?(?:\/[A-Za-z0-9._-]+)+|\/|[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*)$/;

export function extractTypedCommand(text: string): string | undefined {
  const match = text.match(TYPED_COMMAND);
  const command = match?.[1]?.trim();
  if (!command) return undefined;
  return looksLikeShell(command) ? command : undefined;
}

export function looksLikeShell(command: string): boolean {
  const tokens = command.trim().split(/\s+/);
  if (tokens.length === 0 || tokens.length > 6) return false;
  const name = tokens[0]?.toLowerCase() ?? "";
  if (!name) return false;
  if (tokens.length === 1) return name === "pwd" || name === "ls" || name === "tree";
  for (const token of tokens.slice(1)) {
    if (!SHELL_ARG.test(token) || (token.endsWith(".") && token !== "." && token !== "..")) return false;
  }
  if (
    (name === "find" || name === "grep" || name === "rg") &&
    !tokens.slice(1).some((token) => token === "." || token.includes("/") || token.startsWith("-"))
  ) {
    return false;
  }
  return true;
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

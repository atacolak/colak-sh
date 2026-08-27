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
  return next;
}

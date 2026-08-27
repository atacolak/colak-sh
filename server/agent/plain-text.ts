const MARKUP = /[*`#]+/g;
const TOOL_ECHO =
  /\bterminal[_ ]?exec\b[:\s]*[^\n]*/gi;

export function plainChatText(text: string): string {
  return text.replace(MARKUP, "").replace(TOOL_ECHO, "");
}

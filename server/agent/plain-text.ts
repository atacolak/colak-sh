const MARKUP = /[*`#_]+/g;

export function plainChatText(text: string): string {
  return text.replace(MARKUP, "");
}

export function breakSentences(text: string): string[] {
  return text
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

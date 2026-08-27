const ANSI_ESCAPE = new RegExp(
  [
    String.raw`\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])`,
    String.raw`\x1B\][^\x07]*(?:\x07|\x1B\\)`,
    String.raw`[\x00-\x08\x0B\x0C\x0E-\x1F]`,
  ].join("|"),
  "g",
);

export function normalizeTerminalCapture(
  raw: string,
  renderedPrompt: string,
): string {
  let text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(ANSI_ESCAPE, "");

  if (text.startsWith("\n")) {
    text = text.slice(1);
  }

  const prompt = renderedPrompt.replace(ANSI_ESCAPE, "").trimEnd();
  if (prompt && text.endsWith(prompt)) {
    text = text.slice(0, -prompt.length);
  } else {
    const lastNewline = text.lastIndexOf("\n");
    if (lastNewline >= 0) {
      const lastLine = text.slice(lastNewline + 1);
      if (lastLine.includes(prompt) || /\$ ?$/.test(lastLine)) {
        text = text.slice(0, lastNewline);
      }
    }
  }

  return text.replace(/\n+$/g, "");
}

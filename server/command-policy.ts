const ALLOWED = new Set([
  "pwd",
  "cd",
  "ls",
  "cat",
  "head",
  "tail",
  "tree",
  "find",
  "grep",
  "rg",
  "wc",
  "stat",
]);

const COMPOSITION = /[;&|<>`\n\r]|\$\(|&&|\|\|/;

export function assertAgentCommand(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) throw new Error("command must not be empty");
  if (trimmed.length > 500) throw new Error("command exceeds 500 characters");
  if (COMPOSITION.test(trimmed)) {
    throw new Error("agent commands cannot compose or redirect the shell");
  }
  const name = trimmed.split(/\s+/, 1)[0] ?? "";
  if (!ALLOWED.has(name)) {
    throw new Error(`agent cannot run ${name || "that command"}`);
  }
  return trimmed;
}

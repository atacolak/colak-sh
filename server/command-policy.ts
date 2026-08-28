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
const SHELL_ARG = /^(?:-[A-Za-z0-9._-]{1,8}|\.{1,2}|~?(?:\/[A-Za-z0-9._-]+)+|\/|[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*)$/;

export function assertAgentCommand(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) throw new Error("command must not be empty");
  if (trimmed.length > 500) throw new Error("command exceeds 500 characters");
  if (COMPOSITION.test(trimmed)) {
    throw new Error("agent commands cannot compose or redirect the shell");
  }
  const tokens = trimmed.split(/\s+/);
  const name = tokens[0] ?? "";
  if (!ALLOWED.has(name)) {
    throw new Error(`agent cannot run ${name || "that command"}`);
  }
  if (tokens.length > 6) {
    throw new Error("command has too many arguments");
  }
  for (const token of tokens.slice(1)) {
    if (!SHELL_ARG.test(token) || (token.endsWith(".") && token !== "." && token !== "..")) {
      throw new Error("agent commands cannot run english as a path");
    }
  }
  if (
    (name === "find" || name === "grep" || name === "rg") &&
    !tokens.slice(1).some((token) => token === "." || token.includes("/") || token.startsWith("-"))
  ) {
    throw new Error("search needs a real path");
  }
  return trimmed;
}

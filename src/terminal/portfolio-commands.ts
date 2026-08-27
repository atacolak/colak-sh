import { MarkdownRenderer } from "@wterm/markdown";
import { defineCommand, type Bash, type ResolvedCommandContext } from "just-bash";

const DIR_COLOR = "\x1b[1;34m";
const RESET = "\x1b[0m";

const VISITOR_COMMANDS = [
  ["ls", "list this directory. folders are bold"],
  ["cd", "change directory"],
  ["pwd", "print working directory"],
  ["cat", "read a file. markdown is styled"],
  ["head", "first lines of a file"],
  ["tail", "last lines of a file"],
  ["tree", "show a directory tree"],
  ["find", "find files by name"],
  ["grep", "search file contents"],
  ["rg", "search file contents"],
  ["stat", "file metadata"],
  ["clear", "clear the screen"],
  ["help", "this list"],
] as const;

export const HELP_TEXT = [
  "commands for this portfolio shell",
  "",
  ...VISITOR_COMMANDS.map(
    ([name, summary]) => `${name.padEnd(8)}${summary}`,
  ),
  "",
].join("\n");

export function registerPortfolioCommands(bash: Bash): void {
  bash.registerCommand(lsCommand);
  bash.registerCommand(catCommand);
  interceptShell(bash);
}

export async function annotateLsForModel(
  command: string,
  output: string,
  cwd: string,
  bash: Bash | null,
): Promise<string> {
  if (!bash || !/^\s*ls\b/.test(command)) return output;
  const flags = command.replace(/^\s*ls\b/, "");
  const targets = flags
    .split(/\s+/)
    .filter((part) => part && !part.startsWith("-"));
  const path = bash.fs.resolvePath(cwd, targets[0] ?? ".");
  let names: string[];
  try {
    names = await bash.fs.readdir(path);
  } catch {
    return output;
  }
  const folders: string[] = [];
  for (const name of names) {
    if (name.startsWith(".")) continue;
    try {
      if ((await bash.fs.stat(bash.fs.resolvePath(path, name))).isDirectory) {
        folders.push(name);
      }
    } catch {
      /* ignore */
    }
  }
  if (folders.length === 0) return output;
  return `${output}\nfolders: ${folders.join(", ")}`;
}

function interceptShell(bash: Bash): void {
  const original = bash.exec.bind(bash);
  bash.exec = (async (commandLine: string, options?) => {
    const trimmed = commandLine.replace(/^cd\s+"[^"]+"\s+&&\s+/, "").trim();
    if (trimmed === "help" || trimmed.startsWith("help ")) {
      return {
        stdout: HELP_TEXT,
        stderr: "",
        exitCode: 0,
        env: bash.getEnv(),
      };
    }
    if (trimmed === "clear") {
      return {
        stdout: "\x1b[3J\x1b[2J\x1b[H",
        stderr: "",
        exitCode: 0,
        env: bash.getEnv(),
      };
    }
    return original(commandLine, options);
  }) as Bash["exec"];
}

const lsCommand = defineCommand("ls", async (args, ctx) => {
  const flags = args.filter((arg) => arg.startsWith("-")).join("").replaceAll("-", "");
  const showAll = flags.includes("a") || flags.includes("A");
  const onePerLine = flags.includes("1");
  const targets = args.filter((arg) => !arg.startsWith("-"));
  const paths = targets.length > 0 ? targets : ["."];
  const blocks: string[] = [];

  for (const target of paths) {
    const resolved = ctx.fs.resolvePath(ctx.cwd, target);
    let stat;
    try {
      stat = await ctx.fs.stat(resolved);
    } catch {
      return {
        stdout: "",
        stderr: `ls: ${target}: No such file or directory\n`,
        exitCode: 1,
      };
    }
    if (stat.isFile) {
      blocks.push(target);
      continue;
    }
    const names = await listNames(ctx, resolved, showAll, onePerLine);
    blocks.push(onePerLine ? names.join("\n") : names.join("  "));
  }

  return { stdout: `${blocks.join("\n")}\n`, stderr: "", exitCode: 0 };
});

const catCommand = defineCommand("cat", async (args, ctx) => {
  const files = args.filter((arg) => !arg.startsWith("-"));
  if (files.length === 0) {
    return { stdout: "", stderr: "cat: missing file\n", exitCode: 1 };
  }

  const chunks: string[] = [];
  for (const file of files) {
    const resolved = ctx.fs.resolvePath(ctx.cwd, file);
    let text: string;
    try {
      text = await ctx.fs.readFile(resolved);
    } catch {
      return {
        stdout: "",
        stderr: `cat: ${file}: No such file or directory\n`,
        exitCode: 1,
      };
    }
    chunks.push(file.endsWith(".md") ? renderMarkdown(text) : text);
  }
  return { stdout: chunks.join(""), stderr: "", exitCode: 0 };
});

async function listNames(
  ctx: ResolvedCommandContext,
  path: string,
  showAll: boolean,
  plain: boolean,
): Promise<string[]> {
  const names = (await ctx.fs.readdir(path)).sort((a, b) => a.localeCompare(b));
  const visible = showAll ? names : names.filter((name) => !name.startsWith("."));
  const labeled: string[] = [];
  for (const name of visible) {
    if (plain) {
      labeled.push(name);
      continue;
    }
    const child = ctx.fs.resolvePath(path, name);
    let dir = false;
    try {
      dir = (await ctx.fs.stat(child)).isDirectory;
    } catch {
      dir = false;
    }
    labeled.push(dir ? `${DIR_COLOR}${name}${RESET}` : name);
  }
  return labeled;
}

function renderMarkdown(source: string): string {
  const renderer = new MarkdownRenderer({ width: 80 });
  return `${renderer.push(source)}${renderer.flush()}`;
}

import { BashShell } from "@wterm/just-bash";
import { wrapLineEditing } from "./line-edit";
import { OutputCapture } from "./OutputCapture";
import { normalizeTerminalCapture } from "./normalize-output";
import { registerPortfolioCommands } from "./portfolio-commands";

export type TerminalExecResult = {
  command: string;
  output: string;
  cwd: string;
};

export type SessionMode = "idle" | "agent";

const MAX_COMMAND_LENGTH = 500;
const DEFAULT_CHAR_DELAY_MS = 8;

export function renderPrompt(cwd: string): string {
  const display = cwd.replace(/^\/home\/ata/, "~") || "/";
  return `\x1b[1;32mata@colak\x1b[0m:\x1b[1;34m${display}\x1b[0m$ `;
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

export class SessionController {
  readonly shell: BashShell;
  private readonly capture = new OutputCapture();
  private sessionMode: SessionMode = "idle";
  private write: ((data: string) => void) | null = null;
  private attached = false;

  constructor(files: Record<string, string>) {
    this.shell = new BashShell({
      files,
      cwd: "/home/ata",
      env: {
        HOME: "/home/ata",
        USER: "ata",
        SHELL: "/bin/bash",
        TERM: "xterm-256color",
      },
      greeting: [],
      prompt: (cwd) => renderPrompt(cwd),
    });
  }

  get mode(): SessionMode {
    return this.sessionMode;
  }

  get cwd(): string {
    return this.shell.cwd;
  }

  setWrite(write: (data: string) => void): void {
    this.write = write;
    write(renderPrompt(this.cwd));
  }

  async attach(write: (data: string) => void): Promise<void> {
    this.write = write;
    if (this.attached) return;
    this.attached = true;
    await this.shell.attach((data: string) => {
      this.capture.push(data);
      this.write?.(data);
    });
    if (this.shell.bash) registerPortfolioCommands(this.shell.bash);
    wrapLineEditing(this.shell);
  }

  async handleHumanInput(data: string): Promise<void> {
    if (this.sessionMode !== "idle") return;
    await this.shell.handleInput(data);
  }

  async execAsAgent(
    command: string,
    charDelayMs: number = DEFAULT_CHAR_DELAY_MS,
  ): Promise<TerminalExecResult> {
    if (this.sessionMode !== "idle") {
      throw new Error("terminal is already executing an agent command");
    }
    if (!command.trim()) {
      throw new Error("command must not be empty");
    }
    if (command.length > MAX_COMMAND_LENGTH) {
      throw new Error("command exceeds 500 characters");
    }

    this.sessionMode = "agent";
    try {
      for (const ch of command) {
        await this.shell.handleInput(ch);
        await delay(charDelayMs);
      }
      this.capture.start();
      await this.shell.handleInput("\r");
      const raw = this.capture.stop();
      const cwd = this.shell.cwd;
      return {
        command,
        output: normalizeTerminalCapture(raw, renderPrompt(cwd)),
        cwd,
      };
    } finally {
      this.sessionMode = "idle";
    }
  }
}

import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import { runAgent } from "../agent/run-agent.js";
import type { HistoryTurn } from "../agent/history.js";
import { recentHistory } from "../agent/history.js";
import type { AppConfig } from "../config.js";
import type { UsageBudget } from "../budget.js";
import { clientMessageSchema } from "../protocol/schema.js";
import type { ClientMessage, ServerMessage } from "../protocol/types.js";
import { site } from "../site.js";
import {
  BUDGET_EXHAUSTED_MESSAGE,
  MAX_PROMPT_CHARS,
  MAX_PROMPTS_PER_SESSION,
  MAX_WS_FRAME_BYTES,
  SESSION_IDLE_TTL_MS,
  TERMINAL_RESULT_TIMEOUT_MS,
} from "../limits.js";
import { truncateForModel } from "../truncate.js";
import { PendingTerminalCalls } from "./pending-terminal-calls.js";

const INITIAL_PROMPT = site.prompts[0] ?? "";

export class Session {
  readonly pendingTerminalCalls = new PendingTerminalCalls();
  private promptActive = false;
  private prompts = 0;
  private history: HistoryTurn[] = [];
  private idleTimer: ReturnType<typeof setTimeout>;

  constructor(
    private readonly socket: WebSocket,
    private readonly ip: string,
    private readonly config: AppConfig,
    private readonly budget: UsageBudget,
  ) {
    socket.binaryType = "arraybuffer";
    this.idleTimer = setTimeout(() => this.socket.close(), SESSION_IDLE_TTL_MS);
  }

  send(message: ServerMessage): void {
    if (this.socket.readyState !== this.socket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }

  touch(): void {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.socket.close(), SESSION_IDLE_TTL_MS);
  }

  async handleRawMessage(data: unknown, isBinary: boolean): Promise<void> {
    this.touch();
    if (isBinary || typeof data !== "string") {
      this.send({ type: "error", message: "binary frames are not accepted" });
      this.socket.close();
      return;
    }
    if (Buffer.byteLength(data) > MAX_WS_FRAME_BYTES) {
      this.send({ type: "error", message: "message too large" });
      this.socket.close();
      return;
    }

    let parsed: ClientMessage;
    try {
      parsed = clientMessageSchema.parse(JSON.parse(data));
    } catch {
      this.send({ type: "error", message: "invalid message" });
      return;
    }

    if (parsed.type === "terminal_result") {
      this.pendingTerminalCalls.resolve({
        ...parsed,
        output: truncateForModel(parsed.output),
      });
      return;
    }

    await this.handlePrompt(parsed.requestId, parsed.text);
  }

  dispose(): void {
    clearTimeout(this.idleTimer);
    this.pendingTerminalCalls.rejectAll(new Error("socket closed"));
  }

  async execOnBrowser(
    requestId: string,
    command: string,
  ) {
    const callId = randomUUID();
    return this.pendingTerminalCalls.request(
      callId,
      command,
      (message: ServerMessage) => this.send(message),
      TERMINAL_RESULT_TIMEOUT_MS,
      requestId,
    );
  }

  private async handlePrompt(requestId: string, text: string): Promise<void> {
    if (this.promptActive) {
      this.send({
        type: "error",
        requestId,
        message: "a prompt is already active",
      });
      return;
    }
    if (text.length > MAX_PROMPT_CHARS) {
      this.send({
        type: "error",
        requestId,
        message: "prompt is too long",
      });
      return;
    }
    if (this.prompts >= MAX_PROMPTS_PER_SESSION) {
      this.send({
        type: "error",
        requestId,
        message: BUDGET_EXHAUSTED_MESSAGE,
      });
      return;
    }

    const admitted = this.budget.admit(this.ip);
    if (!admitted.ok) {
      this.send({
        type: "error",
        requestId,
        message: BUDGET_EXHAUSTED_MESSAGE,
      });
      return;
    }

    this.promptActive = true;
    this.prompts += 1;
    this.history.push({ role: "visitor", text });
    try {
      if (this.config.fakeAgent && text === INITIAL_PROMPT) {
        await this.runFakeAgent(requestId);
        this.history.push({
          role: "assistant",
          text: "mostly agent infrastructure and speech systems. i'll show you.",
        });
      } else if (this.config.fakeAgent) {
        this.send({
          type: "error",
          requestId,
          message: "real model is not connected",
        });
      } else {
        const result = await runAgent({
          prompt: text,
          history: recentHistory(this.history.slice(0, -1)),
          exec: (command) => this.execOnBrowser(requestId, command),
          send: (message) => this.send(message),
          requestId,
          config: this.config,
        });
        if (result.answer.trim()) {
          this.history.push({ role: "assistant", text: result.answer.trim() });
        }
        this.budget.debit(this.ip, { totalTokens: result.tokens }, result.missingUsage);
        if (result.missingUsage) {
          console.warn(
            JSON.stringify({
              event: "missing_usage",
              requestId,
              fallbackTokens: result.tokens,
            }),
          );
        }
      }
      this.send({ type: "done", requestId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "prompt failed";
      if (message !== "socket closed") {
        this.send({ type: "error", requestId, message });
      }
    } finally {
      this.promptActive = false;
      this.budget.release();
      this.history = recentHistory(this.history);
    }
  }

  private async runFakeAgent(requestId: string): Promise<void> {
    this.send({
      type: "assistant_delta",
      requestId,
      text: "mostly agent infrastructure and speech systems. i'll show you.",
    });
    await this.execOnBrowser(requestId, `cd ${site.home}/now`);
    await this.execOnBrowser(requestId, "cat current.md");
    this.send({
      type: "suggestions",
      requestId,
      items: [
        "show me speech-core",
        "what makes browser-ops unusual?",
        "show me something completely different",
      ],
    });
  }
}

import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import { clientMessageSchema } from "../protocol/schema.js";
import type { ClientMessage, ServerMessage } from "../protocol/types.js";
import { PendingTerminalCalls } from "./pending-terminal-calls.js";

const INITIAL_PROMPT = "what is ata working on lately?";
const MAX_FRAME_BYTES = 16 * 1024;

export class Session {
  readonly pendingTerminalCalls = new PendingTerminalCalls();
  private promptActive = false;

  constructor(private readonly socket: WebSocket) {
    socket.binaryType = "arraybuffer";
  }

  send(message: ServerMessage): void {
    if (this.socket.readyState !== this.socket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }

  async handleRawMessage(data: unknown, isBinary: boolean): Promise<void> {
    if (isBinary || typeof data !== "string") {
      this.send({ type: "error", message: "binary frames are not accepted" });
      this.socket.close();
      return;
    }
    if (Buffer.byteLength(data) > MAX_FRAME_BYTES) {
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
      this.pendingTerminalCalls.resolve(parsed);
      return;
    }

    await this.handlePrompt(parsed.requestId, parsed.text);
  }

  dispose(): void {
    this.pendingTerminalCalls.rejectAll(new Error("socket closed"));
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

    this.promptActive = true;
    try {
      if (process.env.FAKE_AGENT === "1" && text === INITIAL_PROMPT) {
        await this.runFakeAgent(requestId);
        return;
      }
      this.send({
        type: "error",
        requestId,
        message: "real model is not connected",
      });
    } finally {
      this.promptActive = false;
    }
  }

  private async runFakeAgent(requestId: string): Promise<void> {
    this.send({
      type: "assistant_delta",
      requestId,
      text: "mostly agent infrastructure and speech systems. i'll show you.",
    });

    await this.exec(requestId, "cd /home/ata/now");
    await this.exec(requestId, "cat current.md");

    this.send({
      type: "suggestions",
      requestId,
      items: [
        "show me speech-core",
        "what makes browser-ops unusual?",
        "show me something completely different",
      ],
    });
    this.send({ type: "done", requestId });
  }

  private async exec(requestId: string, command: string): Promise<void> {
    const callId = randomUUID();
    await this.pendingTerminalCalls.request(
      callId,
      command,
      (message: ServerMessage) => this.send(message),
      15_000,
      requestId,
    );
  }
}

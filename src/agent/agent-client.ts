import type { SessionController } from "../terminal/SessionController";
import type { ChatState } from "../chat/chat-state";
import type { ClientMessage, ServerMessage } from "../protocol/types";

export type AgentClientHandlers = {
  onState: (state: ChatState) => void;
  getController: () => SessionController | null;
};

export class AgentClient {
  private socket: WebSocket | null = null;
  private requestActive = false;
  private reconnecting = false;
  private outbound: ClientMessage[] = [];
  private state: ChatState = {
    messages: [],
    suggestions: [],
    active: false,
  };

  constructor(
    private readonly url: string,
    private readonly handlers: AgentClientHandlers,
  ) {
    this.connect();
  }

  sendPrompt(text: string): void {
    if (this.requestActive) return;
    const requestId = crypto.randomUUID();
    this.requestActive = true;
    this.setState({
      messages: [
        ...this.state.messages,
        { role: "visitor", text },
        { role: "assistant", text: "" },
      ],
      suggestions: [],
      active: true,
    });
    this.send({ type: "prompt", requestId, text });
  }

  private connect(): void {
    const socket = new WebSocket(this.url);
    this.socket = socket;
    socket.addEventListener("open", () => {
      this.flush();
    });
    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      this.handleServerMessage(JSON.parse(event.data) as ServerMessage);
    });
    socket.addEventListener("close", () => {
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.requestActive || this.reconnecting) return;
    this.reconnecting = true;
    window.setTimeout(() => {
      this.reconnecting = false;
      this.connect();
    }, 1000);
  }

  private send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return;
    }
    this.outbound.push(message);
  }

  private flush(): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    for (const message of this.outbound) {
      this.socket.send(JSON.stringify(message));
    }
    this.outbound = [];
  }

  private setState(next: ChatState): void {
    this.state = next;
    this.handlers.onState(next);
  }

  private handleServerMessage(message: ServerMessage): void {
    if (message.type === "assistant_delta") {
      const messages = [...this.state.messages];
      const last = messages.at(-1);
      if (last?.role === "assistant") {
        messages[messages.length - 1] = {
          role: "assistant",
          text: last.text + message.text,
        };
      } else {
        messages.push({ role: "assistant", text: message.text });
      }
      this.setState({ ...this.state, messages });
      return;
    }

    if (message.type === "terminal_exec") {
      void this.runTerminal(message.callId, message.command);
      return;
    }

    if (message.type === "suggestions") {
      this.setState({ ...this.state, suggestions: message.items });
      return;
    }

    if (message.type === "done") {
      this.requestActive = false;
      this.setState({ ...this.state, active: false });
      return;
    }

    if (message.type === "error") {
      this.requestActive = false;
      this.setState({
        ...this.state,
        active: false,
        messages: [
          ...this.state.messages,
          { role: "assistant", text: message.message },
        ],
      });
    }
  }

  private async waitForController(): Promise<SessionController | null> {
    const started = Date.now();
    while (Date.now() - started < 10_000) {
      const controller = this.handlers.getController();
      if (controller) return controller;
      const { promise, resolve } = Promise.withResolvers<void>();
      window.setTimeout(resolve, 20);
      await promise;
    }
    return this.handlers.getController();
  }

  private async runTerminal(callId: string, command: string): Promise<void> {
    const controller = await this.waitForController();
    if (!controller) {
      this.send({
        type: "terminal_result",
        callId,
        command,
        output: "terminal is not ready",
        cwd: "/home/ata",
      });
      return;
    }
    const result = await controller.execAsAgent(command);
    this.send({
      type: "terminal_result",
      callId,
      command: result.command,
      output: result.output,
      cwd: result.cwd,
    });
  }
}

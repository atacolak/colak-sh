import type {
  ServerMessage,
  TerminalResultMessage,
} from "../protocol/types.ts";

const DEFAULT_TIMEOUT_MS = 15_000;

type Waiter = {
  resolve: (message: TerminalResultMessage) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class PendingTerminalCalls {
  private readonly waiters = new Map<string, Waiter>();

  request(
    callId: string,
    command: string,
    send: (message: ServerMessage) => void,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
    requestId = "",
  ): Promise<TerminalResultMessage> {
    if (this.waiters.has(callId)) {
      throw new Error(`terminal call already active: ${callId}`);
    }

    const { promise, resolve, reject } =
      Promise.withResolvers<TerminalResultMessage>();
    const timer = setTimeout(() => {
      this.waiters.delete(callId);
      reject(new Error(`terminal call timed out: ${callId}`));
    }, timeoutMs);

    this.waiters.set(callId, { resolve, reject, timer });
    send({
      type: "terminal_exec",
      requestId,
      callId,
      command,
    });
    return promise;
  }

  resolve(message: TerminalResultMessage): boolean {
    const waiter = this.waiters.get(message.callId);
    if (!waiter) return false;
    this.waiters.delete(message.callId);
    clearTimeout(waiter.timer);
    waiter.resolve(message);
    return true;
  }

  rejectAll(reason: Error): void {
    for (const [callId, waiter] of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(reason);
      this.waiters.delete(callId);
    }
  }
}

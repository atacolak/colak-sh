import { afterEach, expect, it, vi } from "vitest";
import { AgentClient } from "../../src/agent/agent-client";

class FakeSocket {
  static instances: FakeSocket[] = [];
  readyState = 0;
  listeners = new Map<string, Array<(event: { data?: string }) => void>>();
  sent: string[] = [];
  closed = false;

  constructor(public url: string) {
    FakeSocket.instances.push(this);
    queueMicrotask(() => {
      this.readyState = 1;
      this.emit("open");
    });
  }

  addEventListener(type: string, fn: (event: { data?: string }) => void) {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
    this.emit("close");
  }

  emit(type: string, data?: string) {
    for (const fn of this.listeners.get(type) ?? []) fn({ data });
  }
}

const OriginalWebSocket = globalThis.WebSocket;

afterEach(() => {
  vi.unstubAllGlobals();
  FakeSocket.instances = [];
  globalThis.WebSocket = OriginalWebSocket;
});

it("ignores malformed server frames", async () => {
  vi.stubGlobal("WebSocket", FakeSocket);
  const states: Array<{ messages: Array<{ role: string }> }> = [];
  const client = new AgentClient("ws://example/ws", {
    onState: (state) => states.push(state),
    getController: () => null,
  });
  await Promise.resolve();
  const socket = FakeSocket.instances[0]!;
  expect(() => socket.emit("message", "{not-json")).not.toThrow();
  expect(() =>
    socket.emit("message", JSON.stringify({ type: "pty", requestId: "x" })),
  ).not.toThrow();
  client.close();
  expect(states.every((state) => state.messages.length === 0)).toBe(true);
});

it("does not reconnect after close", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", FakeSocket);
  const client = new AgentClient("ws://example/ws", {
    onState: () => {},
    getController: () => null,
  });
  await Promise.resolve();
  expect(FakeSocket.instances).toHaveLength(1);
  client.close();
  FakeSocket.instances[0]!.emit("close");
  await vi.advanceTimersByTimeAsync(2000);
  expect(FakeSocket.instances).toHaveLength(1);
  vi.useRealTimers();
});

it("unsticks chips when the socket dies mid-prompt", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", FakeSocket);
  const states: Array<{
    active: boolean;
    messages: Array<{ role: string; text?: string }>;
  }> = [];
  const client = new AgentClient("ws://example/ws", {
    onState: (state) => states.push(state),
    getController: () => null,
  });
  await Promise.resolve();
  client.sendPrompt("what is ata working on lately?");
  expect(states.at(-1)?.active).toBe(true);
  FakeSocket.instances[0]!.close();
  expect(states.at(-1)?.active).toBe(false);
  expect(states.at(-1)?.messages.at(-1)?.text).toMatch(/connection dropped/);
  await vi.advanceTimersByTimeAsync(1000);
  expect(FakeSocket.instances).toHaveLength(2);
  client.close();
  vi.useRealTimers();
});

it("renders terminal_exec as a tool box between speech", async () => {
  vi.stubGlobal("WebSocket", FakeSocket);
  const states: Array<{
    messages: Array<{ role: string; text?: string; command?: string }>;
  }> = [];
  const client = new AgentClient("ws://example/ws", {
    onState: (state) => states.push(state),
    getController: () => null,
  });
  await Promise.resolve();
  client.sendPrompt("what is ata working on lately?");
  const socket = FakeSocket.instances[0]!;
  socket.emit(
    "message",
    JSON.stringify({
      type: "assistant_delta",
      requestId: "req-1",
      text: "peeking at now.",
    }),
  );
  socket.emit(
    "message",
    JSON.stringify({
      type: "terminal_exec",
      requestId: "req-1",
      callId: "c1",
      command: "ls /home/ata/now",
    }),
  );
  socket.emit(
    "message",
    JSON.stringify({
      type: "assistant_delta",
      requestId: "req-1",
      text: "two live threads.",
    }),
  );
  const last = states.at(-1)?.messages ?? [];
  expect(last.map((message) => message.role)).toEqual([
    "visitor",
    "assistant",
    "tool",
    "assistant",
  ]);
  expect(last[2]).toMatchObject({
    role: "tool",
    name: "terminal_exec",
    command: "ls /home/ata/now",
  });
  expect(last[3]).toMatchObject({ role: "assistant", text: "two live threads." });
  client.close();
});

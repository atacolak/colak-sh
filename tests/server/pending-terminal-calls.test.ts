import { expect, it, vi } from "vitest";
import { PendingTerminalCalls } from "../../server/sessions/pending-terminal-calls";
import type { ServerMessage } from "../../server/protocol/types";

it("resolves a matching callId", async () => {
  const pending = new PendingTerminalCalls();
  const sent: ServerMessage[] = [];
  const result = pending.request("call-1", "pwd", (message) => {
    sent.push(message);
  });

  expect(sent[0]).toMatchObject({
    type: "terminal_exec",
    callId: "call-1",
    command: "pwd",
  });

  expect(
    pending.resolve({
      type: "terminal_result",
      callId: "call-1",
      command: "pwd",
      output: "/home/ata",
      cwd: "/home/ata",
    }),
  ).toBe(true);

  await expect(result).resolves.toMatchObject({
    callId: "call-1",
    output: "/home/ata",
  });
});

it("returns false for an unknown callId", () => {
  const pending = new PendingTerminalCalls();
  expect(
    pending.resolve({
      type: "terminal_result",
      callId: "missing",
      command: "pwd",
      output: "",
      cwd: "/home/ata",
    }),
  ).toBe(false);
});

it("rejects on timeout", async () => {
  vi.useFakeTimers();
  const pending = new PendingTerminalCalls();
  const result = pending.request("call-1", "pwd", () => {}, 15);
  const assertion = expect(result).rejects.toThrow(/timed out/i);
  await vi.advanceTimersByTimeAsync(15);
  await assertion;
  vi.useRealTimers();
});

it("rejectAll rejects every waiter", async () => {
  const pending = new PendingTerminalCalls();
  const first = pending.request("a", "pwd", () => {});
  const second = pending.request("b", "ls", () => {});
  pending.rejectAll(new Error("socket closed"));
  await expect(first).rejects.toThrow("socket closed");
  await expect(second).rejects.toThrow("socket closed");
});

it("throws when reusing an active callId", () => {
  const pending = new PendingTerminalCalls();
  void pending.request("call-1", "pwd", () => {});
  expect(() => pending.request("call-1", "ls", () => {})).toThrow();
});

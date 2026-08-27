import { expect, it } from "vitest";
import {
  clientMessageSchema,
  serverMessageSchema,
} from "../../server/protocol/schema";

it("accepts a prompt message", () => {
  const parsed = clientMessageSchema.parse({
    type: "prompt",
    requestId: "req-1",
    text: "what is ata working on lately?",
  });
  expect(parsed.type).toBe("prompt");
});

it("accepts a terminal_result message", () => {
  const parsed = clientMessageSchema.parse({
    type: "terminal_result",
    callId: "call-1",
    command: "pwd",
    output: "/home/ata",
    cwd: "/home/ata",
  });
  expect(parsed.type).toBe("terminal_result");
});

it("rejects a missing requestId", () => {
  expect(() =>
    clientMessageSchema.parse({
      type: "prompt",
      text: "hello",
    }),
  ).toThrow();
});

it("rejects a non-string command", () => {
  expect(() =>
    clientMessageSchema.parse({
      type: "terminal_result",
      callId: "call-1",
      command: 12,
      output: "",
      cwd: "/home/ata",
    }),
  ).toThrow();
});

it("rejects a command longer than 500 characters", () => {
  expect(() =>
    clientMessageSchema.parse({
      type: "terminal_result",
      callId: "call-1",
      command: "a".repeat(501),
      output: "",
      cwd: "/home/ata",
    }),
  ).toThrow();
  expect(() =>
    serverMessageSchema.parse({
      type: "terminal_exec",
      requestId: "req-1",
      callId: "call-1",
      command: "a".repeat(501),
    }),
  ).toThrow();
});

it("rejects more than three suggestions", () => {
  expect(() =>
    serverMessageSchema.parse({
      type: "suggestions",
      requestId: "req-1",
      items: ["a", "b", "c", "d"],
    }),
  ).toThrow();
});

it("rejects an unknown message type", () => {
  expect(() =>
    clientMessageSchema.parse({
      type: "shell_exec",
      requestId: "req-1",
      text: "pwd",
    }),
  ).toThrow();
  expect(() =>
    serverMessageSchema.parse({
      type: "pty",
      requestId: "req-1",
    }),
  ).toThrow();
});

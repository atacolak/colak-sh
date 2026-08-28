/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useTypewriter } from "../../src/chat/use-typewriter";
import type { ChatMessage } from "../../src/chat/chat-state";

it("reveals assistant text one character at a time", () => {
  vi.useFakeTimers();
  const messages: ChatMessage[] = [
    { role: "visitor", text: "hi" },
    { role: "assistant", text: "ab" },
  ];
  const { result } = renderHook(() => useTypewriter(messages));
  expect(result.current.at(-1)).toEqual({ role: "assistant", text: "" });
  act(() => {
    vi.advanceTimersByTime(9);
  });
  expect(result.current.at(-1)).toEqual({ role: "assistant", text: "a" });
  act(() => {
    vi.advanceTimersByTime(9);
  });
  expect(result.current.at(-1)).toEqual({ role: "assistant", text: "ab" });
  vi.useRealTimers();
});

it("typewrites mutters after a tool call", () => {
  vi.useFakeTimers();
  const first: ChatMessage[] = [
    { role: "assistant", text: "hi" },
    { role: "tool", name: "terminal_exec", command: "ls" },
    { role: "assistant", text: "ok" },
  ];
  const { result, rerender } = renderHook(
    ({ messages }: { messages: ChatMessage[] }) => useTypewriter(messages),
    { initialProps: { messages: first } },
  );
  act(() => {
    vi.advanceTimersByTime(9);
  });
  act(() => {
    vi.advanceTimersByTime(9);
  });
  expect(result.current[0]).toEqual({ role: "assistant", text: "hi" });
  rerender({
    messages: [
      { role: "assistant", text: "hi" },
      { role: "tool", name: "terminal_exec", command: "ls" },
      { role: "assistant", text: "xy" },
    ],
  });
  act(() => {
    vi.advanceTimersByTime(9);
  });
  expect(result.current[2]).toEqual({ role: "assistant", text: "x" });
  vi.useRealTimers();
});

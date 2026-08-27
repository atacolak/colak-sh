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
  const { result } = renderHook(() => useTypewriter(messages, true));
  expect((result.current.at(-1) as { text?: string } | undefined)?.text).toBe("");
  act(() => {
    vi.advanceTimersByTime(16);
  });
  expect((result.current.at(-1) as { text?: string } | undefined)?.text).toBe("a");
  act(() => {
    vi.advanceTimersByTime(16);
  });
  expect((result.current.at(-1) as { text?: string } | undefined)?.text).toBe("ab");
  vi.useRealTimers();
});

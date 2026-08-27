import { useEffect, useState } from "react";
import type { ChatMessage } from "./chat-state";

const CHAR_MS = 16;

export function useTypewriter(messages: ChatMessage[]): ChatMessage[] {
  const [shown, setShown] = useState<string[]>([]);

  useEffect(() => {
    const next = messages.map((message, index) => {
      if (message.role !== "assistant") return shown[index] ?? "";
      const current = shown[index] ?? "";
      return message.text.startsWith(current) ? current : "";
    });

    const pending = messages.findIndex((message, index) => {
      return message.role === "assistant" && next[index] !== message.text;
    });
    if (pending < 0) {
      if (next.length !== shown.length) setShown(next);
      return;
    }

    const message = messages[pending];
    if (message?.role !== "assistant") return;
    const current = next[pending] ?? "";
    const timer = globalThis.setTimeout(() => {
      const copy = [...next];
      copy[pending] = message.text.slice(0, current.length + 1);
      setShown(copy);
    }, CHAR_MS);
    return () => globalThis.clearTimeout(timer);
  }, [messages, shown]);

  return messages.map((message, index) => {
    if (message.role !== "assistant") return message;
    return { role: "assistant", text: shown[index] ?? "" };
  });
}

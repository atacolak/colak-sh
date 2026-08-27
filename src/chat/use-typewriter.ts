import { useEffect, useState } from "react";
import type { ChatMessage } from "./chat-state";

const CHAR_MS = 16;

export function useTypewriter(messages: ChatMessage[], active: boolean): ChatMessage[] {
  const latest = messages.at(-1);
  const target =
    latest?.role === "assistant" && active ? latest.text : null;
  const [shown, setShown] = useState("");

  useEffect(() => {
    if (target == null) {
      setShown("");
      return;
    }
    if (shown === target) return;
    if (!target.startsWith(shown)) {
      setShown(target);
      return;
    }
    const timer = globalThis.setTimeout(() => {
      setShown(target.slice(0, shown.length + 1));
    }, CHAR_MS);
    return () => globalThis.clearTimeout(timer);
  }, [shown, target]);

  if (target == null || shown === target) return messages;
  const copy = [...messages];
  copy[copy.length - 1] = { role: "assistant", text: shown };
  return copy;
}

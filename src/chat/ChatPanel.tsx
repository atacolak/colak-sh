import { useState, type FormEvent } from "react";
import { INITIAL_PROMPTS } from "./chat-state";
import { PromptChips } from "./PromptChips";

type ChatPanelProps = {
  onPrompt?: (text: string) => void;
};

export function ChatPanel({ onPrompt }: ChatPanelProps) {
  const [draft, setDraft] = useState("");

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    onPrompt?.(trimmed);
    setDraft("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(draft);
  }

  return (
    <aside className="chat-panel">
      <h1 className="chat-title">ask ata's machine</h1>
      <PromptChips items={INITIAL_PROMPTS} onSelect={submit} />
      <div className="chat-log" aria-live="polite" />
      <form className="chat-form" onSubmit={onSubmit}>
        <input
          className="chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="ask anything"
          aria-label="ask anything"
        />
      </form>
    </aside>
  );
}

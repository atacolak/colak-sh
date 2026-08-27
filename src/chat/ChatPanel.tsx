import { useState, type FormEvent } from "react";
import { INITIAL_PROMPTS, type ChatState } from "./chat-state";
import { PromptChips } from "./PromptChips";

type ChatPanelProps = {
  state: ChatState;
  onPrompt: (text: string) => void;
};

export function ChatPanel({ state, onPrompt }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const chips = state.suggestions.length > 0 ? state.suggestions : INITIAL_PROMPTS;

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || state.active) return;
    onPrompt(trimmed);
    setDraft("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(draft);
  }

  return (
    <aside className="chat-panel">
      <h1 className="chat-title">ask ata's machine</h1>
      <PromptChips items={chips} disabled={state.active} onSelect={submit} />
      <div className="chat-log" aria-live="polite">
        {state.messages
          .filter((message) => message.text.length > 0)
          .map((message, index) => (
            <p key={`${message.role}-${index}`} className={`chat-${message.role}`}>
              {message.text}
            </p>
          ))}
      </div>
      <form className="chat-form" onSubmit={onSubmit}>
        <input
          className="chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="ask anything"
          aria-label="ask anything"
          disabled={state.active}
        />
      </form>
    </aside>
  );
}

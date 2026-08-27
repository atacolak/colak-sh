import { useState, type FormEvent } from "react";
import { INITIAL_PROMPTS, type ChatMessage, type ChatState } from "./chat-state";
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
        {state.messages.filter(visible).map((message, index) => (
          <ChatLine key={`${message.role}-${index}`} message={message} />
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

function visible(message: ChatMessage): boolean {
  if (message.role === "tool") return true;
  return message.text.length > 0;
}

function ChatLine({ message }: { message: ChatMessage }) {
  if (message.role === "tool") {
    return (
      <div className="chat-tool" aria-label={`tool ${message.name}`}>
        <span className="chat-tool-name">{message.name}</span>
        <code className="chat-tool-command">{message.command}</code>
      </div>
    );
  }
  return <p className={`chat-${message.role}`}>{message.text}</p>;
}

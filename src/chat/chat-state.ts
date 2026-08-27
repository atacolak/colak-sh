export const INITIAL_PROMPTS = [
  "what is ata working on lately?",
  "show me something impressive",
  "what kind of engineer is ata?",
  "why should i talk to him?",
] as const;

export type ChatMessage =
  | { role: "visitor"; text: string }
  | { role: "assistant"; text: string }
  | { role: "tool"; name: "terminal_exec"; command: string };

export type ChatState = {
  messages: ChatMessage[];
  suggestions: string[];
  active: boolean;
};

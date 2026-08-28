import { site } from "../site";

export const INITIAL_PROMPTS = site.prompts;

export type ChatMessage =
  | { role: "visitor"; text: string }
  | { role: "assistant"; text: string }
  | { role: "tool"; name: "terminal_exec"; command: string };

export type ChatState = {
  messages: ChatMessage[];
  suggestions: string[];
  active: boolean;
};

import type { z } from "zod";
import type {
  clientMessageSchema,
  promptMessageSchema,
  serverMessageSchema,
  terminalResultMessageSchema,
} from "./schema.js";

export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;
export type PromptMessage = z.infer<typeof promptMessageSchema>;
export type TerminalResultMessage = z.infer<typeof terminalResultMessageSchema>;

import { z } from "zod";

const requestId = z.string().min(1);
const callId = z.string().min(1);
const command = z.string().min(1).max(500);

export const promptMessageSchema = z
  .object({
    type: z.literal("prompt"),
    requestId,
    text: z.string().min(1).max(1200),
  })
  .strict();

export const terminalResultMessageSchema = z
  .object({
    type: z.literal("terminal_result"),
    callId,
    command,
    output: z.string().max(12_000),
    cwd: z.string().min(1),
  })
  .strict();

export const clientMessageSchema = z.discriminatedUnion("type", [
  promptMessageSchema,
  terminalResultMessageSchema,
]);

export const assistantDeltaMessageSchema = z
  .object({
    type: z.literal("assistant_delta"),
    requestId,
    text: z.string(),
  })
  .strict();

export const terminalExecMessageSchema = z
  .object({
    type: z.literal("terminal_exec"),
    requestId,
    callId,
    command,
  })
  .strict();

export const suggestionsMessageSchema = z
  .object({
    type: z.literal("suggestions"),
    requestId,
    items: z.array(z.string().min(1)).max(3),
  })
  .strict();

export const doneMessageSchema = z
  .object({
    type: z.literal("done"),
    requestId,
  })
  .strict();

export const errorMessageSchema = z
  .object({
    type: z.literal("error"),
    requestId: z.string().min(1).optional(),
    message: z.string().min(1),
  })
  .strict();

export const serverMessageSchema = z.discriminatedUnion("type", [
  assistantDeltaMessageSchema,
  terminalExecMessageSchema,
  suggestionsMessageSchema,
  doneMessageSchema,
  errorMessageSchema,
]);

import { z } from "zod";

export const serverMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("assistant_delta"),
      requestId: z.string().min(1),
      text: z.string(),
    })
    .strict(),
  z
    .object({
      type: z.literal("terminal_exec"),
      requestId: z.string().min(1),
      callId: z.string().min(1),
      command: z.string().min(1).max(500),
    })
    .strict(),
  z
    .object({
      type: z.literal("suggestions"),
      requestId: z.string().min(1),
      items: z.array(z.string().min(1)).max(3),
    })
    .strict(),
  z
    .object({
      type: z.literal("done"),
      requestId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      requestId: z.string().min(1).optional(),
      message: z.string().min(1),
    })
    .strict(),
]);

export type ClientMessage =
  | { type: "prompt"; requestId: string; text: string }
  | {
      type: "terminal_result";
      callId: string;
      command: string;
      output: string;
      cwd: string;
    };

export type ServerMessage =
  | { type: "assistant_delta"; requestId: string; text: string }
  | {
      type: "terminal_exec";
      requestId: string;
      callId: string;
      command: string;
    }
  | { type: "suggestions"; requestId: string; items: string[] }
  | { type: "done"; requestId: string }
  | { type: "error"; requestId?: string; message: string };

export type TerminalResultMessage = Extract<
  ClientMessage,
  { type: "terminal_result" }
>;

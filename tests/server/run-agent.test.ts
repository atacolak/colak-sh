import { expect, it, vi } from "vitest";
import { runAgent } from "../../server/agent/run-agent";
import type { AppConfig } from "../../server/config";

const streamText = vi.fn();
const generateText = vi.fn();

vi.mock("ai", () => ({
  streamText: (...args: unknown[]) => streamText(...args),
  generateText: (...args: unknown[]) => generateText(...args),
  tool: (def: unknown) => def,
  stepCountIs: (n: number) => n,
}));

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: () => ({
    chatModel: () => "model",
  }),
}));

const config: AppConfig = {
  port: 8787,
  host: "127.0.0.1",
  fakeAgent: false,
  production: false,
  distDir: "dist",
  llmBaseUrl: "http://127.0.0.1:8317/v1",
  llmApiKey: "test",
  llmModel: "gemini-3.1-flash-lite(minimal)",
  budgetPath: "/tmp/budget.json",
  budgetSalt: "salt",
};

it("sends terminal_exec, continues, answers, then suggests", async () => {
  streamText.mockImplementation(
    (opts: {
      tools: {
        terminal_exec: {
          execute: (input: { command: string }) => Promise<unknown>;
        };
      };
    }) => {
      const toolResult = opts.tools.terminal_exec.execute({ command: "ls" });
      return {
        fullStream: (async function* () {
          yield { type: "text-delta", text: "peeking at now. " };
          yield { type: "tool-call", toolName: "terminal_exec" };
          await toolResult;
          yield { type: "text-delta", text: "speech-core is the live thread." };
        })(),
        text: Promise.resolve("speech-core is the live thread."),
        totalUsage: Promise.resolve({
          inputTokens: 20,
          outputTokens: 10,
          totalTokens: 30,
        }),
      };
    },
  );
  generateText.mockResolvedValue({
    text: JSON.stringify(["show me speech-core"]),
  });

  const sent: Array<{ type: string; text?: string }> = [];
  const exec = vi.fn(async (command: string) => ({
    type: "terminal_result" as const,
    callId: "c1",
    command,
    output: "about\nnow\nprojects",
    cwd: "/home/ata",
  }));

  const result = await runAgent({
    prompt: "what is ata working on lately?",
    history: [],
    exec,
    send: (message) => sent.push(message),
    requestId: "req-1",
    config,
  });

  expect(exec).toHaveBeenCalledWith("ls");
  expect(sent.filter((message) => message.type === "assistant_delta").map((m) => m.text)).toEqual([
    "peeking at now. ",
    "speech-core is the live thread. ",
  ]);
  expect(sent.some((message) => message.type === "suggestions")).toBe(true);
  expect(result.tokens).toBe(30);
  expect(result.missingUsage).toBe(false);
  expect(result.answer).toBe("peeking at now. speech-core is the live thread. ");
});

it("returns an error payload instead of throwing on a bad command", async () => {
  streamText.mockImplementation(
    (opts: {
      tools: {
        terminal_exec: {
          execute: (input: { command: string }) => Promise<unknown>;
        };
      };
    }) => {
      const toolResult = opts.tools.terminal_exec.execute({
        command: "ls\necho nope",
      });
      return {
        fullStream: (async function* () {
          const result = await toolResult;
          expect(result).toMatchObject({
            output: expect.stringMatching(/cannot compose|invalid command/i),
          });
          yield { type: "text-delta", text: "that command is illegal here." };
        })(),
        text: Promise.resolve("that command is illegal here."),
        totalUsage: Promise.resolve({
          inputTokens: 4,
          outputTokens: 2,
          totalTokens: 6,
        }),
      };
    },
  );
  generateText.mockResolvedValue({ text: "[]" });
  const exec = vi.fn();
  const result = await runAgent({
    prompt: "look around",
    history: [],
    exec,
    send: () => {},
    requestId: "req-2",
    config,
  });
  expect(exec).not.toHaveBeenCalled();
  expect(result.answer).toBe("that command is illegal here. ");
});

it("recovers a typed shell command as a real terminal_exec", async () => {
  streamText.mockImplementation(() => ({
    fullStream: (async function* () {
      yield {
        type: "text-delta",
        text: "i am listing the home directory. ls /home/ata",
      };
    })(),
    text: Promise.resolve("i am listing the home directory. ls /home/ata"),
    totalUsage: Promise.resolve({
      inputTokens: 8,
      outputTokens: 4,
      totalTokens: 12,
    }),
  }));
  generateText
    .mockResolvedValueOnce({ text: "ata's public home. start in now." })
    .mockResolvedValueOnce({ text: "[]" });
  const exec = vi.fn(async (command: string) => ({
    type: "terminal_result" as const,
    callId: "c2",
    command,
    output: "README.md\nnow/\n",
    cwd: "/home/ata",
  }));
  const sent: Array<{ type: string; text?: string }> = [];
  const result = await runAgent({
    prompt: "why should i talk to him?",
    history: [],
    exec,
    send: (message) => sent.push(message),
    requestId: "req-3",
    config,
  });
  expect(exec).toHaveBeenCalledWith("ls /home/ata");
  expect(result.answer).toContain("ata's public home. start in now.");
});

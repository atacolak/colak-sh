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
  llmModel: "gemini-3.1-flash-lite",
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
        textStream: (async function* () {
          await toolResult;
          yield "speech-core is the live thread.";
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

  const sent: Array<{ type: string }> = [];
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
  expect(sent.some((message) => message.type === "assistant_delta")).toBe(true);
  expect(sent.some((message) => message.type === "suggestions")).toBe(true);
  expect(result.tokens).toBe(30);
  expect(result.missingUsage).toBe(false);
});

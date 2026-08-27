import { generateText, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { countedTokens, type UsageLike } from "../budget.js";
import { assertAgentCommand } from "../command-policy.js";
import type { AppConfig } from "../config.js";
import {
  MAX_AGENT_STEPS,
  MAX_OUTPUT_TOKENS_PER_MODEL_STEP,
  MAX_SUGGESTION_OUTPUT_TOKENS,
  MAX_TERMINAL_CALLS,
  MODEL_REQUEST_TIMEOUT_MS,
} from "../limits.js";
import type { ServerMessage, TerminalResultMessage } from "../protocol/types.js";
import { truncateForModel } from "../truncate.js";
import { recentHistory, type HistoryTurn } from "./history.js";
import { createPortfolioModel } from "./model.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { filterSuggestions } from "./suggestions.js";

export type AgentRunResult = {
  tokens: number;
  missingUsage: boolean;
};

export async function runAgent(options: {
  prompt: string;
  history: HistoryTurn[];
  exec: (command: string) => Promise<TerminalResultMessage>;
  send: (message: ServerMessage) => void;
  requestId: string;
  config: AppConfig;
}): Promise<AgentRunResult> {
  const model = createPortfolioModel(options.config);
  let terminalCalls = 0;
  let missingUsage = false;

  const terminalExec = tool({
    description:
      "run a read-only command in the visitor's browser-local portfolio shell",
    inputSchema: z.object({
      command: z.string().min(1).max(500),
    }),
    execute: async ({ command }) => {
      const allowed = assertAgentCommand(command);
      if (terminalCalls >= MAX_TERMINAL_CALLS) {
        return {
          command: allowed,
          output: "terminal call budget exhausted",
          cwd: "",
        };
      }
      terminalCalls += 1;
      const result = await options.exec(allowed);
      return {
        command: result.command,
        output: truncateForModel(result.output),
        cwd: result.cwd,
      };
    },
  });

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    MODEL_REQUEST_TIMEOUT_MS,
  );
  try {
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: toMessages(options.history, options.prompt),
      tools: { terminal_exec: terminalExec },
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
      maxOutputTokens: MAX_OUTPUT_TOKENS_PER_MODEL_STEP,
      abortSignal: controller.signal,
      timeout: MODEL_REQUEST_TIMEOUT_MS,
    });

    for await (const delta of result.textStream) {
      if (delta) {
        options.send({
          type: "assistant_delta",
          requestId: options.requestId,
          text: delta,
        });
      }
    }

    const usage = await result.totalUsage;
    if (
      usage?.inputTokens == null &&
      usage?.outputTokens == null &&
      usage?.totalTokens == null
    ) {
      missingUsage = true;
    }

    const suggestions = await suggestNext(
      model,
      options.prompt,
      await result.text,
    );
    options.send({
      type: "suggestions",
      requestId: options.requestId,
      items: suggestions,
    });
    return {
      tokens: countedTokens(usage as UsageLike | undefined),
      missingUsage,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function suggestNext(
  model: ReturnType<typeof createPortfolioModel>,
  prompt: string,
  answer: string,
): Promise<string[]> {
  try {
    const result = await generateText({
      model,
      maxOutputTokens: MAX_SUGGESTION_OUTPUT_TOKENS,
      prompt: `visitor asked: ${prompt}\nyou answered: ${answer}\nreturn JSON array of 0-3 specific next questions. no generic filler.`,
    });
    return filterSuggestions(JSON.parse(result.text) as unknown);
  } catch {
    return [];
  }
}

function toMessages(history: HistoryTurn[], prompt: string) {
  return [
    ...recentHistory(history).map((turn) => ({
      role: turn.role === "visitor" ? ("user" as const) : ("assistant" as const),
      content: turn.text,
    })),
    { role: "user" as const, content: prompt },
  ];
}

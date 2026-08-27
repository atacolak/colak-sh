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
import { plainChatText } from "./plain-text.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { filterSuggestions } from "./suggestions.js";

export type AgentRunResult = {
  tokens: number;
  missingUsage: boolean;
  answer: string;
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
  let spoken = "";

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
      prepareStep: ({ stepNumber, steps }) => {
        if (stepNumber === 0) {
          return {
            system: `${SYSTEM_PROMPT}\n\nthis is the first glance. mutter one or two sentences about what you will open, then call terminal_exec. do not answer from memory.`,
          };
        }
        const last = steps.at(-1);
        const used = last?.toolCalls?.some((call) => call.toolName === "terminal_exec");
        if (used) {
          return {
            system: `${SYSTEM_PROMPT}\n\na tool just returned. mutter what you found in one or two sentences. then either call terminal_exec again or stop. do not recap earlier answers. do not restate the visitor's previous questions.`,
          };
        }
        return undefined;
      },
    });

    for await (const part of result.fullStream) {
      if (part.type === "text-delta" && part.text) {
        const text = plainChatText(part.text);
        if (!text) continue;
        spoken += text;
        options.send({
          type: "assistant_delta",
          requestId: options.requestId,
          text,
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

    const answer = plainChatText(spoken || (await result.text));
    const suggestions = await suggestNext(model, options.prompt, answer);
    options.send({
      type: "suggestions",
      requestId: options.requestId,
      items: suggestions,
    });
    return {
      tokens: countedTokens(usage as UsageLike | undefined),
      missingUsage,
      answer,
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
      prompt: `visitor asked: ${prompt}\nyou answered: ${answer}\nreturn JSON array of 0-3 specific next questions. no generic filler. lowercase. no markdown.`,
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

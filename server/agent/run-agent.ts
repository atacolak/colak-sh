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
import { extractTypedCommand, finishMutter, plainChatText } from "./plain-text.js";
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

  const runTerminal = async (command: string) => {
    let allowed: string;
    try {
      allowed = assertAgentCommand(command);
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid command";
      return {
        command,
        output: `${message}. one simple line: pwd cd ls cat head tail tree find grep rg wc stat. stay in /home/ata.`,
        cwd: "/home/ata",
      };
    }
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
  };

  const terminalExec = tool({
    description:
      "run a read-only command in the visitor's browser-local portfolio shell",
    inputSchema: z.object({
      command: z.string().min(1).max(500),
    }),
    execute: async ({ command }) => runTerminal(command),
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
      prepareStep: ({ stepNumber }) => {
        if (stepNumber === 0) {
          return { toolChoice: "required" as const };
        }
        return { toolChoice: "auto" as const };
      },
    });

    let sawToolCall = false;
    let pendingTyped: string | undefined;
    let mutter = "";
    const flushMutter = () => {
      const text = finishMutter(plainChatText(mutter));
      mutter = "";
      if (!text) return;
      spoken += text;
      options.send({
        type: "assistant_delta",
        requestId: options.requestId,
        text,
      });
    };
    for await (const part of result.fullStream) {
      if (part.type === "tool-call") {
        sawToolCall = true;
        flushMutter();
      }
      if (part.type === "text-delta" && part.text) {
        mutter += part.text;
        pendingTyped = extractTypedCommand(mutter) ?? pendingTyped;
      }
    }
    flushMutter();

    if (!sawToolCall && pendingTyped) {
      spoken = plainChatText(spoken);
      const recovered = await runTerminal(pendingTyped);
      const follow = await generateText({
        model,
        maxOutputTokens: MAX_OUTPUT_TOKENS_PER_MODEL_STEP,
        prompt: `${SYSTEM_PROMPT}\n\nvisitor asked: ${options.prompt}\nyou ran: ${recovered.command}\noutput:\n${recovered.output}\nanswer now in one or two lowercase sentences. do not type commands.`,
      });
      const followText = plainChatText(follow.text);
      if (followText) {
        spoken += followText;
        options.send({
          type: "assistant_delta",
          requestId: options.requestId,
          text: followText,
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

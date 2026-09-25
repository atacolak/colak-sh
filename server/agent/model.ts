import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AppConfig } from "../config.js";

export function createPortfolioModel(config: AppConfig, modelId = config.llmModel) {
  const provider = createOpenAICompatible({
    name: "cpa",
    baseURL: config.llmBaseUrl,
    apiKey: config.llmApiKey,
  });
  return provider.chatModel(modelId);
}

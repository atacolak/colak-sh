import { realpathSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  DEFAULT_FALLBACK_MODELS,
  DEFAULT_PORTFOLIO_MODEL,
  assertPortfolioModel,
} from "./model-lock.js";

export type AppConfig = {
  port: number;
  host: string;
  fakeAgent: boolean;
  production: boolean;
  distDir: string;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  llmFallbacks: string[];
  budgetPath: string;
  budgetSalt: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const fakeAgent = env.FAKE_AGENT === "1";
  const production = env.NODE_ENV === "production";
  const llmBaseUrl = env.LLM_BASE_URL ?? "http://127.0.0.1:8317/v1";
  const llmApiKey = env.LLM_API_KEY ?? "";
  const llmModel = fakeAgent
    ? (env.LLM_MODEL ?? DEFAULT_PORTFOLIO_MODEL)
    : assertPortfolioModel(env.LLM_MODEL ?? DEFAULT_PORTFOLIO_MODEL);
  const llmFallbacks = fakeAgent
    ? []
    : parseFallbackModels(env.LLM_FALLBACK_MODELS, llmModel);
  if (!fakeAgent && (!llmBaseUrl || !llmApiKey || !llmModel)) {
    throw new Error("LLM_BASE_URL, LLM_API_KEY, and LLM_MODEL are required");
  }
  return {
    port: Number(env.PORT ?? 8787),
    host: env.HOST ?? "127.0.0.1",
    fakeAgent,
    production,
    distDir: env.DIST_DIR ?? "dist",
    llmBaseUrl,
    llmApiKey,
    llmModel,
    llmFallbacks,
    budgetPath: env.BUDGET_PATH ?? "data/usage-budget.json",
    budgetSalt: env.BUDGET_SALT ?? "colak-sh-budget",
  };
}

export function parseFallbackModels(
  raw: string | undefined,
  primary: string,
): string[] {
  const source = raw ?? DEFAULT_FALLBACK_MODELS.join(",");
  const seen = new Set<string>([primary]);
  const out: string[] = [];
  for (const piece of source.split(",")) {
    const id = piece.trim();
    if (!id || seen.has(id)) continue;
    seen.add(assertPortfolioModel(id));
    out.push(id);
  }
  return out;
}

export function modelChain(config: AppConfig): string[] {
  return [config.llmModel, ...config.llmFallbacks];
}

export function liveCwd(): string {
  try {
    return realpathSync("/proc/self/cwd");
  } catch {
    return process.cwd();
  }
}

export function resolveDistDir(
  distDir: string,
  cwd: string = liveCwd(),
): string {
  return isAbsolute(distDir) ? distDir : resolve(cwd, distDir);
}

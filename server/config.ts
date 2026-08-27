export type AppConfig = {
  port: number;
  host: string;
  fakeAgent: boolean;
  production: boolean;
  distDir: string;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  budgetPath: string;
  budgetSalt: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const fakeAgent = env.FAKE_AGENT === "1";
  const production = env.NODE_ENV === "production";
  const llmBaseUrl = env.LLM_BASE_URL ?? "http://127.0.0.1:8317/v1";
  const llmApiKey = env.LLM_API_KEY ?? "";
  const llmModel = env.LLM_MODEL ?? "gemini-3.1-flash-lite(minimal)";
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
    budgetPath: env.BUDGET_PATH ?? "data/usage-budget.json",
    budgetSalt: env.BUDGET_SALT ?? "colak-sh-budget",
  };
}

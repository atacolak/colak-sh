export const PORTFOLIO_MODEL_PATTERN =
  /^gemini-3\.(?:8-flash(?:-high)?|7-flash(?:-high)?|5-flash-lite|1-flash-lite)(?:\([^)]+\))?$/;

export const DEFAULT_PORTFOLIO_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_FALLBACK_MODELS = ["gemini-3.1-flash-lite"];

export function isPortfolioModel(model: string): boolean {
  return PORTFOLIO_MODEL_PATTERN.test(model.trim());
}

export function assertPortfolioModel(model: string): string {
  const trimmed = model.trim();
  if (!isPortfolioModel(trimmed)) {
    throw new Error(
      "LLM_MODEL must be gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-3.8-flash, or gemini-3.7-flash",
    );
  }
  return trimmed;
}

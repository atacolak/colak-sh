export const PORTFOLIO_MODEL_PATTERN =
  /^gemini-3\.(?:8-flash(?:-high)?|7-flash(?:-high)?|1-flash-lite)(?:\([^)]+\))?$/;

export const DEFAULT_PORTFOLIO_MODEL = "gemini-3.8-flash-high";
export const DEFAULT_FALLBACK_MODELS = [
  "gemini-3.7-flash-high",
  "gemini-3.1-flash-lite",
];

export function isPortfolioModel(model: string): boolean {
  return PORTFOLIO_MODEL_PATTERN.test(model.trim());
}

export function assertPortfolioModel(model: string): string {
  const trimmed = model.trim();
  if (!isPortfolioModel(trimmed)) {
    throw new Error(
      "LLM_MODEL must be gemini-3.8-flash, gemini-3.7-flash, or gemini-3.1-flash-lite",
    );
  }
  return trimmed;
}

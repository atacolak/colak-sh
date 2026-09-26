import { expect, it } from "vitest";
import { loadConfig } from "../../server/config";
import { isPortfolioModel } from "../../server/model-lock";

it("allows 3.5 flash-lite, 3.1 flash-lite, and the older flash family plus suffixes", () => {
  expect(isPortfolioModel("gemini-3.5-flash-lite")).toBe(true);
  expect(isPortfolioModel("gemini-3.5-flash-lite(minimal)")).toBe(true);
  expect(isPortfolioModel("gemini-3.1-flash-lite")).toBe(true);
  expect(isPortfolioModel("gemini-3.1-flash-lite(minimal)")).toBe(true);
  expect(isPortfolioModel("gemini-3.8-flash-high")).toBe(true);
  expect(isPortfolioModel("gemini-3.8-flash")).toBe(true);
  expect(isPortfolioModel("gemini-3.7-flash-high")).toBe(true);
});

it("rejects every other gemini id", () => {
  expect(isPortfolioModel("gemini-3.1-flash-lite-preview")).toBe(false);
  expect(isPortfolioModel("gemini-3.1-pro-preview")).toBe(false);
  expect(isPortfolioModel("gemini-3-flash")).toBe(false);
  expect(isPortfolioModel("claude-sonnet-4-6")).toBe(false);
});

it("refuses to boot a live agent on another model", () => {
  expect(() =>
    loadConfig({
      LLM_BASE_URL: "http://127.0.0.1:8317/v1",
      LLM_API_KEY: "k",
      LLM_MODEL: "gemini-3.1-pro-preview",
    }),
  ).toThrow(/gemini-3\.5-flash-lite/);
});

it("defaults live fallbacks to 3.1 flash-lite", () => {
  const config = loadConfig({
    LLM_BASE_URL: "http://127.0.0.1:8317/v1",
    LLM_API_KEY: "k",
    LLM_MODEL: "gemini-3.5-flash-lite(minimal)",
  });
  expect(config.llmModel).toBe("gemini-3.5-flash-lite(minimal)");
  expect(config.llmFallbacks).toEqual(["gemini-3.1-flash-lite"]);
});

it("still boots the fake agent without a model lock", () => {
  const config = loadConfig({ FAKE_AGENT: "1", LLM_MODEL: "nope" });
  expect(config.fakeAgent).toBe(true);
  expect(config.llmModel).toBe("nope");
  expect(config.llmFallbacks).toEqual([]);
});

import { expect, it } from "vitest";
import { modelChain, parseFallbackModels, resolveDistDir } from "../../server/config";

it("keeps an absolute dist dir", () => {
  expect(resolveDistDir("/exhibit/dist", "/old/cwd")).toBe("/exhibit/dist");
});

it("joins a relative dist dir onto the live cwd, not a stale string", () => {
  expect(resolveDistDir("dist", "/home/sf/workspace/colak-sh")).toBe(
    "/home/sf/workspace/colak-sh/dist",
  );
});

it("drops the primary from the fallback list", () => {
  expect(
    parseFallbackModels(
      "gemini-3.5-flash-lite,gemini-3.1-flash-lite",
      "gemini-3.5-flash-lite",
    ),
  ).toEqual(["gemini-3.1-flash-lite"]);
});

it("builds the live model chain primary-first", () => {
  expect(
    modelChain({
      port: 1,
      host: "127.0.0.1",
      fakeAgent: false,
      production: true,
      distDir: "dist",
      llmBaseUrl: "http://127.0.0.1:8318/v1",
      llmApiKey: "k",
      llmModel: "gemini-3.5-flash-lite",
      llmFallbacks: ["gemini-3.1-flash-lite"],
      budgetPath: "x",
      budgetSalt: "s",
    }),
  ).toEqual(["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]);
});

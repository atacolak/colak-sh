import { expect, it } from "vitest";
import { isPortfolioModel, pathModel, rejectedModel } from "../../scripts/flash-lite-gate.mjs";

it("extracts gemini path models", () => {
  expect(pathModel("/v1beta/models/gemini-3.1-pro-preview:generateContent")).toBe(
    "gemini-3.1-pro-preview",
  );
  expect(pathModel("/v1/models/gemini-3.8-flash-high:generateContent")).toBe(
    "gemini-3.8-flash-high",
  );
});

it("rejects non-portfolio chat models and allows the flash chain", () => {
  expect(
    rejectedModel("POST", "/v1/chat/completions", {
      model: "gemini-3.1-pro-preview",
    }),
  ).toBe("gemini-3.1-pro-preview");
  expect(
    rejectedModel("POST", "/v1/chat/completions", {
      model: "gemini-3.8-flash-high",
    }),
  ).toBeUndefined();
  expect(
    rejectedModel("POST", "/v1/chat/completions", {
      model: "gemini-3.7-flash-high",
    }),
  ).toBeUndefined();
  expect(
    rejectedModel("POST", "/v1/chat/completions", {
      model: "gemini-3.5-flash-lite(minimal)",
    }),
  ).toBeUndefined();
  expect(
    rejectedModel("POST", "/v1/chat/completions", {
      model: "gemini-3.1-flash-lite(minimal)",
    }),
  ).toBeUndefined();
  expect(isPortfolioModel("gemini-3.5-flash-lite-preview")).toBe(false);
  expect(isPortfolioModel("gemini-3.1-flash-lite-preview")).toBe(false);
});

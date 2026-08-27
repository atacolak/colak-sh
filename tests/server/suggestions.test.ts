import { expect, it } from "vitest";
import { filterSuggestions } from "../../server/agent/suggestions";

it("keeps specific questions and drops generic filler", () => {
  expect(
    filterSuggestions([
      "show me speech-core",
      "tell me more",
      "what else?",
      "show me speech-core",
      "what does barge-in actually do?",
      "continue",
      "x".repeat(91),
      "show me something unrelated to speech",
    ]),
  ).toEqual([
    "show me speech-core",
    "what does barge-in actually do?",
    "show me something unrelated to speech",
  ]);
});

it("returns empty on malformed input", () => {
  expect(filterSuggestions("nope")).toEqual([]);
});

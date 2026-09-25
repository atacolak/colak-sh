import { expect, it } from "vitest";
import {
  FALLBACK_SUGGESTIONS,
  SUGGESTION_COUNT,
  filterSuggestions,
} from "../../server/agent/suggestions";

it("keeps specific ata questions and drops generic filler", () => {
  expect(
    filterSuggestions([
      "show me speech-core",
      "tell me more",
      "what else?",
      "show me speech-core",
      "what does barge-in actually do in speech-core?",
      "continue",
      "x".repeat(91),
      "how do you manage consistency in partition-tolerant distributed systems?",
      "why does ata isolate speech-out?",
    ]),
  ).toEqual([
    "show me speech-core",
    "what does barge-in actually do in speech-core?",
    "why does ata isolate speech-out?",
  ]);
});

it("always returns three chips, padding from fallbacks", () => {
  expect(filterSuggestions(["show me speech-core"])).toEqual([
    "show me speech-core",
    ...FALLBACK_SUGGESTIONS.filter((item) => item !== "show me speech-core").slice(
      0,
      SUGGESTION_COUNT - 1,
    ),
  ]);
  expect(filterSuggestions("nope")).toEqual(FALLBACK_SUGGESTIONS);
  expect(filterSuggestions([])).toHaveLength(SUGGESTION_COUNT);
});

it("keeps named live-thread projects", () => {
  expect(
    filterSuggestions([
      "show me actor-village",
      "what is talker for?",
      "open mardi-gras",
    ]),
  ).toEqual([
    "show me actor-village",
    "what is talker for?",
    "open mardi-gras",
  ]);
});

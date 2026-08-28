import { expect, it } from "vitest";
import { filterSuggestions } from "../../server/agent/suggestions";

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

it("returns empty on malformed input", () => {
  expect(filterSuggestions("nope")).toEqual([]);
});

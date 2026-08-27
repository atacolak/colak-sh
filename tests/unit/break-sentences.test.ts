import { expect, it } from "vitest";
import { breakSentences } from "../../src/chat/break-sentences";

it("puts the next sentence on a new line after a period", () => {
  expect(breakSentences("one. two. three")).toEqual(["one.", "two.", "three"]);
});

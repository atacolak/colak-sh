import { expect, it } from "vitest";
import { truncateForModel } from "../../server/truncate";

it("leaves short output intact", () => {
  expect(truncateForModel("hello")).toBe("hello");
});

it("truncates oversized terminal output for the model", () => {
  const output = "a".repeat(9000);
  const truncated = truncateForModel(output, 200);
  expect(truncated.length).toBeLessThanOrEqual(200);
  expect(truncated).toContain("output truncated for agent context");
  expect(truncated.startsWith("a")).toBe(true);
  expect(truncated.endsWith("a")).toBe(true);
});

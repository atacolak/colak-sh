import { expect, it } from "vitest";
import { portfolioVersion } from "../../src/app/version";

it("exports the v0 portfolio version", () => {
  expect(portfolioVersion).toBe("v0");
});

import { expect, it } from "vitest";
import { assertAgentCommand } from "../../server/command-policy";
import { site } from "../../server/site";

it("allows read-only portfolio navigation", () => {
  expect(assertAgentCommand("ls")).toBe("ls");
  expect(assertAgentCommand(`cd ${site.home}/projects`)).toBe(
    `cd ${site.home}/projects`,
  );
  expect(assertAgentCommand("cat README.md")).toBe("cat README.md");
  expect(assertAgentCommand("rg latency .")).toBe("rg latency .");
});

it("rejects composition, english, and unsafe commands", () => {
  expect(() => assertAgentCommand("while true; do :; done")).toThrow();
  expect(() => assertAgentCommand("cat README.md | something")).toThrow();
  expect(() => assertAgentCommand("rm -rf /")).toThrow();
  expect(() => assertAgentCommand("curl https://example.com")).toThrow();
  expect(() => assertAgentCommand("cat x && cat y")).toThrow();
  expect(() =>
    assertAgentCommand(
      "find none here, as he remains staunchly skeptical",
    ),
  ).toThrow();
});

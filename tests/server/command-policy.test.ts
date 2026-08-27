import { expect, it } from "vitest";
import { assertAgentCommand } from "../../server/command-policy";

it("allows read-only portfolio navigation", () => {
  expect(assertAgentCommand("ls")).toBe("ls");
  expect(assertAgentCommand("cd /home/ata/projects")).toBe(
    "cd /home/ata/projects",
  );
  expect(assertAgentCommand("cat README.md")).toBe("cat README.md");
  expect(assertAgentCommand("rg latency .")).toBe("rg latency .");
});

it("rejects composition and unsafe commands", () => {
  expect(() => assertAgentCommand("while true; do :; done")).toThrow();
  expect(() => assertAgentCommand("cat README.md | something")).toThrow();
  expect(() => assertAgentCommand("rm -rf /")).toThrow();
  expect(() => assertAgentCommand("curl https://example.com")).toThrow();
  expect(() => assertAgentCommand("cat x && cat y")).toThrow();
});

import { expect, it } from "vitest";
import { site } from "../../src/site";
import { normalizeTerminalCapture } from "../../src/terminal/normalize-output";

const prompt = `${site.user}@${site.promptHost}:${site.home}$ `;

it("strips ANSI escape sequences", () => {
  const raw = "\x1b[31mhello\x1b[0m\r\n" + prompt;
  expect(normalizeTerminalCapture(raw, prompt)).toBe("hello");
});

it("converts CRLF to LF", () => {
  const raw = "one\r\ntwo\r\n" + prompt;
  expect(normalizeTerminalCapture(raw, prompt)).toBe("one\ntwo");
});

it("removes exactly one leading newline produced by enter", () => {
  const raw = `\r\n${site.home}\r\n` + prompt;
  expect(normalizeTerminalCapture(raw, prompt)).toBe(site.home);
});

it("removes the final rendered prompt from captured output", () => {
  const nested = `${site.user}@${site.promptHost}:${site.home}/now$ `;
  const raw = "\r\ncurrent.md\r\n" + nested;
  expect(normalizeTerminalCapture(raw, nested)).toBe("current.md");
});

it("preserves meaningful command output", () => {
  const raw = "\r\n# now\r\n\r\nlate 2026. two live threads.\r\n" + prompt;
  expect(normalizeTerminalCapture(raw, prompt)).toBe(
    "# now\n\nlate 2026. two live threads.",
  );
});

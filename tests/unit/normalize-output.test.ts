import { expect, it } from "vitest";
import { normalizeTerminalCapture } from "../../src/terminal/normalize-output";

const prompt = "ata@colak:/home/ata$ ";

it("strips ANSI escape sequences", () => {
  const raw = "\x1b[31mhello\x1b[0m\r\n" + prompt;
  expect(normalizeTerminalCapture(raw, prompt)).toBe("hello");
});

it("converts CRLF to LF", () => {
  const raw = "one\r\ntwo\r\n" + prompt;
  expect(normalizeTerminalCapture(raw, prompt)).toBe("one\ntwo");
});

it("removes exactly one leading newline produced by enter", () => {
  const raw = "\r\n/home/ata\r\n" + prompt;
  expect(normalizeTerminalCapture(raw, prompt)).toBe("/home/ata");
});

it("removes the final rendered prompt from captured output", () => {
  const raw = "\r\ncurrent.md\r\n" + "ata@colak:/home/ata/now$ ";
  expect(
    normalizeTerminalCapture(raw, "ata@colak:/home/ata/now$ "),
  ).toBe("current.md");
});

it("preserves meaningful command output", () => {
  const raw =
    "\r\n# now\r\n\r\nlate 2026. two live threads.\r\n" + prompt;
  expect(normalizeTerminalCapture(raw, prompt)).toBe(
    "# now\n\nlate 2026. two live threads.",
  );
});

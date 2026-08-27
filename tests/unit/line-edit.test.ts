import { expect, it } from "vitest";
import {
  currentWord,
  deleteWord,
  forwardDelete,
  moveWord,
} from "../../src/terminal/line-edit";
import type { LineEditor } from "../../src/terminal/line-edit";

function editor(line: string, cursor: number, writes: string[]): LineEditor {
  return {
    _line: line,
    _cursor: cursor,
    _write: (data: string) => {
      writes.push(data);
    },
    _prompt: () => "$ ",
    _cwd: "/home/ata",
    handleInput: async () => {},
  };
}

it("deletes the character in front of the cursor", () => {
  const writes: string[] = [];
  const next = editor("abcd", 1, writes);
  forwardDelete(next);
  expect(next._line).toBe("acd");
  expect(next._cursor).toBe(1);
  expect(writes.join("")).toContain("cd");
});

it("deletes the previous word", () => {
  const writes: string[] = [];
  const next = editor("ls /home/ata", 12, writes);
  deleteWord(next);
  expect(next._line).toBe("ls ");
  expect(next._cursor).toBe(3);
});

it("moves one word left and right", () => {
  const writes: string[] = [];
  const next = editor("ls /home/ata", 12, writes);
  moveWord(next, -1);
  expect(next._cursor).toBe(3);
  moveWord(next, 1);
  expect(next._cursor).toBe(12);
});

it("treats a blank line as having no tab prefix", () => {
  expect(currentWord("")).toBe("");
  expect(currentWord("ls ")).toBe("");
  expect(currentWord("ls /ho")).toBe("/ho");
});

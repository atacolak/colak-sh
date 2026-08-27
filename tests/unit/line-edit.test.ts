import { expect, it } from "vitest";
import { deleteWord, forwardDelete } from "../../src/terminal/line-edit";

it("deletes the character in front of the cursor", () => {
  const writes: string[] = [];
  const editor = {
    _line: "abcd",
    _cursor: 1,
    _write: (data: string) => writes.push(data),
    handleInput: async () => {},
  };
  forwardDelete(editor);
  expect(editor._line).toBe("acd");
  expect(editor._cursor).toBe(1);
  expect(writes.join("")).toContain("cd");
});

it("deletes the previous word", () => {
  const writes: string[] = [];
  const editor = {
    _line: "ls /home/ata",
    _cursor: 12,
    _write: (data: string) => writes.push(data),
    handleInput: async () => {},
  };
  deleteWord(editor);
  expect(editor._line).toBe("ls ");
  expect(editor._cursor).toBe(3);
});

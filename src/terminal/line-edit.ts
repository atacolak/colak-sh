import type { BashShell } from "@wterm/just-bash";

type LineEditor = {
  _line: string;
  _cursor: number;
  _write: ((data: string) => void) | null;
  handleInput: (data: string) => Promise<void>;
};

export function wrapLineEditing(shell: BashShell): void {
  const editor = shell as unknown as LineEditor;
  const original = editor.handleInput.bind(shell);

  editor.handleInput = async (data: string) => {
    if (data === "\x1b[3~") {
      forwardDelete(editor);
      return;
    }
    if (data === "\x1b\x7f" || data === "\x1b\b" || data === "\x1b\x1b[3~") {
      deleteWord(editor);
      return;
    }
    await original(data);
  };
}

export function forwardDelete(editor: LineEditor): void {
  if (!editor._write || editor._cursor >= editor._line.length) return;
  const tail = editor._line.slice(editor._cursor + 1);
  editor._line = editor._line.slice(0, editor._cursor) + tail;
  editor._write(tail + "\x1b[K");
  if (tail.length > 0) editor._write(`\x1b[${tail.length}D`);
}

export function deleteWord(editor: LineEditor): void {
  if (!editor._write || editor._cursor === 0) return;
  let index = editor._cursor;
  while (index > 0 && editor._line[index - 1] === " ") index -= 1;
  while (index > 0 && editor._line[index - 1] !== " ") index -= 1;
  const removed = editor._cursor - index;
  const tail = editor._line.slice(editor._cursor);
  editor._line = editor._line.slice(0, index) + tail;
  editor._cursor = index;
  editor._write(`\x1b[${removed}D${tail}\x1b[K`);
  if (tail.length > 0) editor._write(`\x1b[${tail.length}D`);
}

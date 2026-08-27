import type { BashShell } from "@wterm/just-bash";

export type LineEditor = {
  _line: string;
  _cursor: number;
  _write: ((data: string) => void) | null;
  handleInput: (data: string) => Promise<void>;
};

export function wrapLineEditing(shell: BashShell): void {
  const editor = shell as unknown as LineEditor;
  const original = editor.handleInput.bind(shell);

  editor.handleInput = async (data: string) => {
    if (data === "\x1b[3~" || data === "\x04") {
      forwardDelete(editor);
      return;
    }
    if (
      data === "\x1b\x7f" ||
      data === "\x1b\b" ||
      data === "\x1b\x1b[3~" ||
      data === "\x17"
    ) {
      deleteWord(editor);
      return;
    }
    if (data === "\x0b") {
      killToEnd(editor);
      return;
    }
    if (
      data === "\x1b\x1b[D" ||
      data === "\x1bb" ||
      data === "\x1b[1;5D" ||
      data === "\x1b[1;3D"
    ) {
      moveWord(editor, -1);
      return;
    }
    if (
      data === "\x1b\x1b[C" ||
      data === "\x1bf" ||
      data === "\x1b[1;5C" ||
      data === "\x1b[1;3C"
    ) {
      moveWord(editor, 1);
      return;
    }
    if (data === "\x1b[H" || data === "\x1b[1~" || data === "\x1bOH") {
      moveHome(editor);
      return;
    }
    if (data === "\x1b[F" || data === "\x1b[4~" || data === "\x1bOF") {
      moveEnd(editor);
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
  const index = previousWord(editor._line, editor._cursor);
  const removed = editor._cursor - index;
  const tail = editor._line.slice(editor._cursor);
  editor._line = editor._line.slice(0, index) + tail;
  editor._cursor = index;
  editor._write(`\x1b[${removed}D${tail}\x1b[K`);
  if (tail.length > 0) editor._write(`\x1b[${tail.length}D`);
}

export function killToEnd(editor: LineEditor): void {
  if (!editor._write || editor._cursor >= editor._line.length) return;
  editor._line = editor._line.slice(0, editor._cursor);
  editor._write("\x1b[K");
}

export function moveWord(editor: LineEditor, direction: -1 | 1): void {
  if (!editor._write) return;
  const next =
    direction < 0
      ? previousWord(editor._line, editor._cursor)
      : nextWord(editor._line, editor._cursor);
  moveCursor(editor, next);
}

export function moveHome(editor: LineEditor): void {
  moveCursor(editor, 0);
}

export function moveEnd(editor: LineEditor): void {
  moveCursor(editor, editor._line.length);
}

function moveCursor(editor: LineEditor, next: number): void {
  if (!editor._write) return;
  const current = editor._cursor;
  if (next === current) return;
  if (next < current) editor._write(`\x1b[${current - next}D`);
  else editor._write(`\x1b[${next - current}C`);
  editor._cursor = next;
}

function previousWord(line: string, cursor: number): number {
  let index = cursor;
  while (index > 0 && line[index - 1] === " ") index -= 1;
  while (index > 0 && line[index - 1] !== " ") index -= 1;
  return index;
}

function nextWord(line: string, cursor: number): number {
  let index = cursor;
  while (index < line.length && line[index] !== " ") index += 1;
  while (index < line.length && line[index] === " ") index += 1;
  return index;
}

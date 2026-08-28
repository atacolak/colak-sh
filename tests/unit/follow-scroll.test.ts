import { expect, it, vi } from "vitest";
import { followWrite, isStuckToBottom } from "../../src/terminal/follow-scroll";

it("pins scrollTop only when already near the bottom", () => {
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    fn(0);
    return 0;
  });
  const writes: string[] = [];
  const el = {
    scrollTop: 368,
    scrollHeight: 400,
    clientHeight: 32,
  } as HTMLElement;
  const sink = followWrite((data) => writes.push(data), () => el);
  sink("hello\n");
  expect(writes).toEqual(["hello\n"]);
  expect(el.scrollTop).toBe(400);
  vi.unstubAllGlobals();
});

it("does not steal scroll when the visitor has moved up", () => {
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    fn(0);
    return 0;
  });
  const el = {
    scrollTop: 10,
    scrollHeight: 400,
    clientHeight: 32,
  } as HTMLElement;
  const sink = followWrite(() => {}, () => el);
  sink("hello\n");
  expect(el.scrollTop).toBe(10);
  expect(isStuckToBottom(el)).toBe(false);
  vi.unstubAllGlobals();
});

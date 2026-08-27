import { expect, it, vi } from "vitest";
import { followWrite } from "../../src/terminal/follow-scroll";

it("pins scrollTop to scrollHeight after a write", () => {
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    fn(0);
    return 0;
  });
  const writes: string[] = [];
  const el = { scrollTop: 0, scrollHeight: 400 } as HTMLElement;
  const sink = followWrite((data) => writes.push(data), () => el);
  sink("hello\n");
  expect(writes).toEqual(["hello\n"]);
  expect(el.scrollTop).toBe(400);
  vi.unstubAllGlobals();
});

/** @vitest-environment jsdom */

import { expect, it, vi } from "vitest";
import { preserveTerminalScroll } from "../../src/terminal/preserve-scroll";

function scroller(scrollTop: number): HTMLDivElement {
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollHeight", { value: 800 });
  Object.defineProperty(el, "clientHeight", { value: 200 });
  el.scrollTop = scrollTop;
  document.body.appendChild(el);
  return el;
}

function raf() {
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    fn(0);
    return 0;
  });
}

it("puts the terminal back after alt steals focus and the scroller jumps", () => {
  raf();
  const el = scroller(500);
  const stop = preserveTerminalScroll(el);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt", bubbles: true }));
  el.scrollTop = 0;
  el.dispatchEvent(new Event("scroll"));
  el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  expect(el.scrollTop).toBe(500);
  stop();
  el.remove();
  vi.unstubAllGlobals();
});

it("leaves a normal click-focus alone", () => {
  raf();
  const el = scroller(500);
  const stop = preserveTerminalScroll(el);
  el.scrollTop = 0;
  el.dispatchEvent(new Event("scroll"));
  el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  expect(el.scrollTop).toBe(0);
  stop();
  el.remove();
  vi.unstubAllGlobals();
});

it("does not keep restoring after the listener is removed", () => {
  raf();
  const el = scroller(360);
  const stop = preserveTerminalScroll(el);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt", bubbles: true }));
  stop();
  el.scrollTop = 0;
  el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  expect(el.scrollTop).toBe(0);
  el.remove();
  vi.unstubAllGlobals();
});

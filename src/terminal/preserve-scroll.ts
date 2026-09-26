const FOCUS_STEALERS = new Set(["Alt", "Meta", "Escape"]);

export function preserveTerminalScroll(el: HTMLElement): () => void {
  let top = el.scrollTop;
  let left = el.scrollLeft;
  let winX = window.scrollX;
  let winY = window.scrollY;
  let frozen = false;
  let restoring = false;

  const save = () => {
    if (restoring || frozen) return;
    top = el.scrollTop;
    left = el.scrollLeft;
    winX = window.scrollX;
    winY = window.scrollY;
  };

  const restore = () => {
    if (!frozen && !restoring) return;
    frozen = false;
    restoring = true;
    el.scrollTop = top;
    el.scrollLeft = left;
    if (window.scrollX !== winX || window.scrollY !== winY) {
      window.scrollTo(winX, winY);
    }
    requestAnimationFrame(() => {
      el.scrollTop = top;
      el.scrollLeft = left;
      if (window.scrollX !== winX || window.scrollY !== winY) {
        window.scrollTo(winX, winY);
      }
      restoring = false;
    });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!FOCUS_STEALERS.has(event.key)) return;
    save();
    frozen = true;
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (FOCUS_STEALERS.has(event.key)) restore();
  };

  const onFocusIn = () => {
    if (frozen) restore();
  };

  el.addEventListener("scroll", save, { passive: true });
  el.addEventListener("focusout", save);
  el.addEventListener("focusin", onFocusIn);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", save);

  return () => {
    el.removeEventListener("scroll", save);
    el.removeEventListener("focusout", save);
    el.removeEventListener("focusin", onFocusIn);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("blur", save);
  };
}

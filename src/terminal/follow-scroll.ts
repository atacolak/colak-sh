const STICK_PX = 32;

export function isStuckToBottom(
  el: { scrollTop: number; scrollHeight: number; clientHeight: number },
  threshold = STICK_PX,
): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

export function followWrite(
  write: (data: string) => void,
  element: () => HTMLElement | null | undefined,
): (data: string) => void {
  return (data: string) => {
    const el = element();
    const stick = !el || isStuckToBottom(el);
    write(data);
    if (!stick || !el) return;
    const pin = () => {
      el.scrollTop = el.scrollHeight;
    };
    pin();
    requestAnimationFrame(pin);
  };
}

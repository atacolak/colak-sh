export function followWrite(
  write: (data: string) => void,
  element: () => HTMLElement | null | undefined,
): (data: string) => void {
  return (data: string) => {
    write(data);
    const pin = () => {
      const el = element();
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    };
    pin();
    requestAnimationFrame(pin);
  };
}

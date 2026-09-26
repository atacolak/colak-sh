import { useCallback, useEffect, useRef, type MouseEvent } from "react";
import { Terminal, useTerminal } from "@wterm/react";
import "@wterm/react/css";
import { loadPortfolioFiles } from "../content/portfolio-files";
import { followWrite } from "./follow-scroll";
import { preserveTerminalScroll } from "./preserve-scroll";
import { setWrapColumns } from "./portfolio-commands";
import { SessionController } from "./SessionController";

type TerminalPaneProps = {
  onController: (controller: SessionController) => void;
};

export function TerminalPane({ onController }: TerminalPaneProps) {
  const { ref, write, focus } = useTerminal();
  const controllerRef = useRef<SessionController | null>(null);
  const attachRef = useRef<Promise<SessionController> | null>(null);
  const stopPreserve = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      stopPreserve.current?.();
      stopPreserve.current = null;
    },
    [],
  );
  const sink = useCallback(
    (data: string) => {
      followWrite(write, () => ref.current?.instance?.element)(data);
    },
    [ref, write],
  );

  const handleReady = useCallback(() => {
    if (!controllerRef.current) {
      const controller = new SessionController(loadPortfolioFiles());
      controllerRef.current = controller;
      attachRef.current = controller.attach(sink).then(() => controller);
    } else {
      controllerRef.current.setWrite(sink);
    }
    const term = ref.current?.instance?.element;
    if (term) {
      stopPreserve.current?.();
      stopPreserve.current = preserveTerminalScroll(term);
    }
    void (attachRef.current ?? Promise.resolve(controllerRef.current)).then(
      (controller) => {
        onController(controller);
        window.setTimeout(() => {
          if (controllerRef.current !== controller) return;
          const cols = ref.current?.instance?.cols;
          if (cols) controller.setColumns(cols);
          else void controller.bootOpening();
        }, 80);
      },
    );
  }, [onController, sink, ref]);

  const handleData = useCallback((data: string) => {
    void controllerRef.current?.handleHumanInput(data);
  }, []);

  const handleResize = useCallback((cols: number) => {
    setWrapColumns(cols);
    controllerRef.current?.setColumns(cols);
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const target = event.target;
      if (target instanceof Element) {
        const link = target.closest("a.term-link");
        if (link instanceof HTMLAnchorElement && link.href) {
          event.preventDefault();
          event.stopPropagation();
          window.open(link.href, "_blank", "noopener,noreferrer");
          return;
        }
      }
      focus();
    },
    [focus],
  );

  return (
    <section className="terminal-pane" onClickCapture={handleClick}>
      <Terminal
        ref={ref}
        autoResize
        onReady={handleReady}
        onResize={handleResize}
        onData={handleData}
      />
    </section>
  );
}

import { useCallback, useRef, type MouseEvent } from "react";
import { Terminal, useTerminal } from "@wterm/react";
import "@wterm/react/css";
import { loadPortfolioFiles } from "../content/portfolio-files";
import { followWrite } from "./follow-scroll";
import { SessionController } from "./SessionController";

type TerminalPaneProps = {
  onController: (controller: SessionController) => void;
};

export function TerminalPane({ onController }: TerminalPaneProps) {
  const { ref, write, focus } = useTerminal();
  const controllerRef = useRef<SessionController | null>(null);
  const attachRef = useRef<Promise<SessionController> | null>(null);
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
    void (attachRef.current ?? Promise.resolve(controllerRef.current)).then(
      onController,
    );
  }, [onController, sink]);

  const handleData = useCallback((data: string) => {
    void controllerRef.current?.handleHumanInput(data);
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
        onData={handleData}
      />
    </section>
  );
}

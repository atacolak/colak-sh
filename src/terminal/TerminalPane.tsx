import { useCallback, useRef } from "react";
import { Terminal, useTerminal } from "@wterm/react";
import "@wterm/react/css";
import { loadPortfolioFiles } from "../content/portfolio-files";
import { SessionController } from "./SessionController";

export function TerminalPane() {
  const { ref, write, focus } = useTerminal();
  const controllerRef = useRef<SessionController | null>(null);
  const attachingRef = useRef(false);

  const handleReady = useCallback(() => {
    if (controllerRef.current || attachingRef.current) return;
    attachingRef.current = true;
    const controller = new SessionController(loadPortfolioFiles());
    controllerRef.current = controller;
    void controller.attach((data) => {
      write(data);
    });
  }, [write]);

  const handleData = useCallback((data: string) => {
    void controllerRef.current?.handleHumanInput(data);
  }, []);

  const handleClick = useCallback(() => {
    focus();
  }, [focus]);

  return (
    <section className="terminal-pane" onClick={handleClick}>
      <Terminal
        ref={ref}
        autoResize
        onReady={handleReady}
        onData={handleData}
      />
    </section>
  );
}

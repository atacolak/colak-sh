import { useCallback } from "react";
import { Terminal, useTerminal } from "@wterm/react";
import "@wterm/react/css";
import { loadPortfolioFiles } from "../content/portfolio-files";
import { SessionController } from "./SessionController";

type TerminalPaneProps = {
  onController: (controller: SessionController) => void;
};

let sharedController: SessionController | null = null;
let sharedAttach: Promise<SessionController> | null = null;

export function TerminalPane({ onController }: TerminalPaneProps) {
  const { ref, write, focus } = useTerminal();

  const handleReady = useCallback(() => {
    if (!sharedController) {
      sharedController = new SessionController(loadPortfolioFiles());
      sharedAttach = sharedController.attach(write).then(() => sharedController!);
    } else {
      sharedController.setWrite(write);
    }
    void (sharedAttach ?? Promise.resolve(sharedController)).then(onController);
  }, [onController, write]);

  const handleData = useCallback((data: string) => {
    void sharedController?.handleHumanInput(data);
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

import { useCallback, useRef } from "react";
import { useAgent } from "../agent/use-agent";
import { ChatPanel } from "../chat/ChatPanel";
import { TerminalPane } from "../terminal/TerminalPane";
import type { SessionController } from "../terminal/SessionController";
import "./app.css";

export function App() {
  const controllerRef = useRef<SessionController | null>(null);
  const { state, sendPrompt } = useAgent(() => controllerRef.current);
  const handleController = useCallback((controller: SessionController) => {
    controllerRef.current = controller;
  }, []);

  return (
    <div className="app-shell">
      <TerminalPane onController={handleController} />
      <ChatPanel state={state} onPrompt={sendPrompt} />
    </div>
  );
}

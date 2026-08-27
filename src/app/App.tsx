import { ChatPanel } from "../chat/ChatPanel";
import { TerminalPane } from "../terminal/TerminalPane";
import "./app.css";

export function App() {
  return (
    <div className="app-shell">
      <TerminalPane />
      <ChatPanel />
    </div>
  );
}

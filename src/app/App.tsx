import { useCallback, useEffect, useRef, useState } from "react";
import { useAgent } from "../agent/use-agent";
import { ChatPanel } from "../chat/ChatPanel";
import type { PortfolioImage } from "../content/github-readme";
import { TerminalPane } from "../terminal/TerminalPane";
import { onViewedImages } from "../terminal/portfolio-images";
import type { SessionController } from "../terminal/SessionController";
import "./app.css";

export function App() {
  const controllerRef = useRef<SessionController | null>(null);
  const { state, sendPrompt } = useAgent(() => controllerRef.current);
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const handleController = useCallback((controller: SessionController) => {
    controllerRef.current = controller;
  }, []);

  useEffect(() => onViewedImages(setImages), []);

  return (
    <div className="app-shell">
      <div className="exhibit">
        <TerminalPane onController={handleController} />
        {images.length > 0 ? (
          <aside className="exhibit-stills" aria-label="project stills">
            {images.map((image) => (
              <img key={image.src} src={image.src} alt={image.alt || ""} />
            ))}
          </aside>
        ) : null}
      </div>
      <ChatPanel state={state} onPrompt={sendPrompt} />
    </div>
  );
}

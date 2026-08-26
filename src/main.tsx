import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { portfolioVersion } from "./app/version";

const root = document.getElementById("root");
if (!root) {
  throw new Error("missing #root");
}

createRoot(root).render(
  <StrictMode>
    <div>{portfolioVersion}</div>
  </StrictMode>,
);

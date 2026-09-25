import { access } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import { resolveDistDir, type AppConfig } from "./config.js";
import { applySecurityHeaders } from "./headers.js";
import { clientIp, originAllowed } from "./identity.js";
import { MAX_WS_FRAME_BYTES } from "./limits.js";
import { Session } from "./sessions/session.js";
import { serveStatic } from "./static.js";
import type { UsageBudget } from "./budget.js";

export function createApp(config: AppConfig, budget: UsageBudget) {
  const sessions = new WeakMap<WebSocket, Session>();
  const server = createServer((req, res) => {
    void handleHttp(req, res, config);
  });
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: MAX_WS_FRAME_BYTES,
  });

  wss.on("connection", (socket, req) => {
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    if (!originAllowed(origin, config.production)) {
      socket.close(1008, "origin rejected");
      return;
    }
    const session = new Session(
      socket,
      clientIp(req, config.production),
      config,
      budget,
    );
    sessions.set(socket, session);
    socket.on("message", (data, isBinary) => {
      const raw = typeof data === "string" ? data : data.toString();
      void session.handleRawMessage(raw, isBinary);
    });
    socket.on("close", () => {
      session.dispose();
      sessions.delete(socket);
    });
  });

  return server;
}

async function handleHttp(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
): Promise<void> {
  const distRoot = resolveDistDir(config.distDir);
  if (req.url?.startsWith("/healthz")) {
    try {
      await access(join(distRoot, "index.html"));
      res.writeHead(
        200,
        applySecurityHeaders({ "content-type": "application/json" }),
      );
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(
        503,
        applySecurityHeaders({ "content-type": "application/json" }),
      );
      res.end(JSON.stringify({ ok: false, error: "exhibit missing" }));
    }
    return;
  }
  await serveStatic(req, res, distRoot);
}

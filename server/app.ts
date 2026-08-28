import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { AppConfig } from "./config.js";
import { applySecurityHeaders } from "./headers.js";
import { clientIp, originAllowed } from "./identity.js";
import { MAX_WS_FRAME_BYTES } from "./limits.js";
import { Session } from "./sessions/session.js";
import { serveStatic } from "./static.js";
import type { UsageBudget } from "./budget.js";
import { getCatalog } from "./github-catalog.js";

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
  if (req.url?.startsWith("/healthz")) {
    res.writeHead(
      200,
      applySecurityHeaders({ "content-type": "application/json" }),
    );
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.url?.split("?")[0] === "/catalog") {
    try {
      const catalog = await getCatalog();
      res.writeHead(
        200,
        applySecurityHeaders({
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=60",
        }),
      );
      res.end(
        JSON.stringify({
          files: catalog.files,
          items: catalog.items.map(({ name, path, blurb }) => ({
            name,
            path,
            blurb,
          })),
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "catalog failed";
      res.writeHead(
        502,
        applySecurityHeaders({ "content-type": "application/json" }),
      );
      res.end(JSON.stringify({ error: message }));
    }
    return;
  }
  await serveStatic(req, res, config.distDir);
}

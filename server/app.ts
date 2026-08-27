import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { Session } from "./sessions/session.js";

export function createApp() {
  const sessions = new WeakMap<WebSocket, Session>();
  const server = createServer((req, res) => {
    handleHttp(req, res);
  });
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 16 * 1024,
  });

  wss.on("connection", (socket) => {
    const session = new Session(socket);
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

function handleHttp(req: IncomingMessage, res: ServerResponse): void {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
}

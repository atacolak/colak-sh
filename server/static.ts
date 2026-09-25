import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, relative, resolve, sep } from "node:path";
import { resolveDistDir } from "./config.js";
import { applySecurityHeaders } from "./headers.js";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

export async function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  distDir: string,
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const requested = decodeURIComponent(url.pathname);
  if (requested.includes("\0")) {
    res.writeHead(400, applySecurityHeaders({ "content-type": "text/plain" }));
    res.end("bad path");
    return;
  }
  const root = resolveDistDir(distDir);
  const candidate = safeJoin(root, requested === "/" ? "/index.html" : requested);
  if (!candidate) {
    res.writeHead(400, applySecurityHeaders({ "content-type": "text/plain" }));
    res.end("bad path");
    return;
  }
  try {
    const info = await stat(candidate);
    if (info.isFile()) {
      sendFile(res, candidate, requested);
      return;
    }
  } catch {
    // spa fallback
  }
  if (looksLikeAsset(requested)) {
    res.writeHead(404, applySecurityHeaders({ "content-type": "text/plain" }));
    res.end("not found");
    return;
  }
  const index = join(root, "index.html");
  try {
    await access(index);
    sendFile(res, index, "/index.html");
  } catch {
    res.writeHead(404, applySecurityHeaders({ "content-type": "text/plain" }));
    res.end("not found");
  }
}

function sendFile(res: ServerResponse, file: string, pathname: string): void {
  const type = TYPES[extname(file)] ?? "application/octet-stream";
  const hashedAsset = pathname.startsWith("/assets/");
  res.writeHead(
    200,
    applySecurityHeaders({
      "content-type": type,
      "cache-control": hashedAsset
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    }),
  );
  createReadStream(file).pipe(res);
}

function looksLikeAsset(pathname: string): boolean {
  return pathname.startsWith("/assets/") || Boolean(extname(pathname));
}

function safeJoin(root: string, pathname: string): string | null {
  const resolved = resolve(root, `.${pathname}`);
  const rel = relative(root, resolved);
  if (rel.startsWith(`..${sep}`) || rel === ".." || rel.startsWith("..")) {
    return null;
  }
  return resolved;
}

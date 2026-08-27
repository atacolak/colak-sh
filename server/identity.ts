import type { IncomingMessage } from "node:http";

const DEV_ORIGINS = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);

export function clientIp(req: IncomingMessage, production: boolean): string {
  if (production) {
    const cf = header(req, "cf-connecting-ip");
    if (cf) return cf;
  }
  return req.socket.remoteAddress ?? "unknown";
}

export function originAllowed(
  origin: string | undefined,
  production: boolean,
): boolean {
  if (!origin) return !production;
  if (production) return origin === "https://colak.sh";
  return DEV_ORIGINS.has(origin);
}

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value) && value[0]) return value[0].trim() || undefined;
  return undefined;
}

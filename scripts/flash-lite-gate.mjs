#!/usr/bin/env node
import http from "node:http";
import https from "node:https";

const PORTFOLIO_MODEL = /^gemini-3\.(?:8-flash(?:-high)?|7-flash(?:-high)?|5-flash-lite|1-flash-lite)(?:\([^)]+\))?$/;
const LISTEN_HOST = process.env.GATE_LISTEN_HOST ?? "127.0.0.1";
const LISTEN_PORT = Number(process.env.GATE_LISTEN_PORT ?? 8318);
const UPSTREAM = new URL(process.env.GATE_UPSTREAM ?? "https://proxy.net.colak.sh");
const CLIENT_KEY = process.env.GATE_CLIENT_KEY ?? "";
const UPSTREAM_KEY = process.env.GATE_UPSTREAM_KEY ?? "";

function bearer(header) {
  if (!header) return "";
  const [scheme, token] = header.split(/\s+/, 2);
  if (!scheme || !token) return "";
  return scheme.toLowerCase() === "bearer" ? token.trim() : header.trim();
}

function requestKey(req) {
  return (
    bearer(req.headers.authorization) ||
    String(req.headers["x-api-key"] ?? "") ||
    String(req.headers["x-goog-api-key"] ?? "")
  );
}

export function pathModel(pathname) {
  const match = pathname.match(
    /\/models\/([^/:]+)(?::|$)/i,
  );
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export function isPortfolioModel(model) {
  return PORTFOLIO_MODEL.test(String(model ?? "").trim());
}

export function rejectedModel(method, pathname, body) {
  const fromPath = pathModel(pathname);
  if (fromPath && !isPortfolioModel(fromPath)) return fromPath;
  if (method === "GET" || method === "HEAD") return undefined;
  if (body && typeof body === "object" && "model" in body) {
    const model = String(body.model ?? "").trim();
    if (model && !isPortfolioModel(model)) return model;
  }
  return undefined;
}

export function upstreamClient(url = UPSTREAM) {
  const secure = url.protocol === "https:";
  return {
    transport: secure ? https : http,
    port: url.port || (secure ? "443" : "80"),
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function filterModels(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (Array.isArray(payload.data)) {
    return {
      ...payload,
      data: payload.data.filter((entry) =>
        isPortfolioModel(entry?.id ?? entry?.name ?? ""),
      ),
    };
  }
  return payload;
}

function proxy(req, res, body) {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const headers = { ...req.headers, host: UPSTREAM.host };
  delete headers.connection;
  headers.authorization = `Bearer ${UPSTREAM_KEY}`;
  const { transport, port } = upstreamClient();
  const upstreamReq = transport.request(
    {
      protocol: UPSTREAM.protocol,
      hostname: UPSTREAM.hostname,
      port,
      method: req.method,
      path: `${url.pathname}${url.search}`,
      headers,
    },
    (upstreamRes) => {
      const isModels =
        req.method === "GET" && url.pathname.replace(/\/$/, "") === "/v1/models";
      if (!isModels) {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
        return;
      }
      const chunks = [];
      upstreamRes.on("data", (chunk) => chunks.push(chunk));
      upstreamRes.on("end", () => {
        const raw = Buffer.concat(chunks);
        try {
          const filtered = Buffer.from(
            JSON.stringify(filterModels(JSON.parse(raw.toString("utf8")))),
          );
          const headersOut = { ...upstreamRes.headers };
          headersOut["content-length"] = String(filtered.length);
          delete headersOut["transfer-encoding"];
          res.writeHead(upstreamRes.statusCode ?? 200, headersOut);
          res.end(filtered);
        } catch {
          res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
          res.end(raw);
        }
      });
    },
  );
  upstreamReq.on("error", () => {
    if (!res.headersSent) sendJson(res, 502, { error: { message: "upstream down" } });
    else res.end();
  });
  if (body?.length) upstreamReq.write(body);
  upstreamReq.end();
}

const server = http.createServer(async (req, res) => {
  if (requestKey(req) !== CLIENT_KEY) {
    sendJson(res, 401, { error: { message: "invalid api key" } });
    return;
  }
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const raw = await readBody(req);
  let parsed;
  if (raw.length) {
    try {
      parsed = JSON.parse(raw.toString("utf8"));
    } catch {
      parsed = undefined;
    }
  }
  const denied = rejectedModel(req.method ?? "GET", url.pathname, parsed);
  if (denied) {
    sendJson(res, 403, {
      error: {
        message: "model not allowed",
        model: denied,
      },
    });
    return;
  }
  proxy(req, res, raw);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!CLIENT_KEY || !UPSTREAM_KEY) {
    throw new Error("GATE_CLIENT_KEY and GATE_UPSTREAM_KEY are required");
  }
  server.listen(LISTEN_PORT, LISTEN_HOST, () => {
    console.log(`flash-lite gate listening on http://${LISTEN_HOST}:${LISTEN_PORT}`);
  });
}

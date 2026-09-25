import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AddressInfo } from "node:net";
import { expect, it } from "vitest";
import { createApp } from "../../server/app";
import { UsageBudget } from "../../server/budget";
import type { AppConfig } from "../../server/config";

async function listen(distDir: string) {
  const dir = await mkdtemp(join(tmpdir(), "colak-static-"));
  const budget = await UsageBudget.load(join(dir, "usage.json"), "test");
  const config: AppConfig = {
    port: 0,
    host: "127.0.0.1",
    fakeAgent: true,
    production: false,
    distDir,
    llmBaseUrl: "http://127.0.0.1:8317/v1",
    llmApiKey: "x",
    llmModel: "gemini-3.1-flash-lite(minimal)",
    llmFallbacks: [],
    budgetPath: join(dir, "usage.json"),
    budgetSalt: "test",
  };
  const server = createApp(config, budget);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

it("serves the exhibit and healthz when index.html exists", async () => {
  const dist = await mkdtemp(join(tmpdir(), "colak-dist-"));
  await writeFile(join(dist, "index.html"), "<!doctype html><title>colak.sh</title>");
  const app = await listen(dist);
  try {
    const page = await fetch(`${app.url}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("colak.sh");
    const health = await fetch(`${app.url}/healthz`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true });
  } finally {
    await app.close();
  }
});

it("fails healthz and the exhibit when index.html is missing", async () => {
  const dist = await mkdtemp(join(tmpdir(), "colak-empty-"));
  await mkdir(join(dist, "assets"));
  const app = await listen(dist);
  try {
    const health = await fetch(`${app.url}/healthz`);
    expect(health.status).toBe(503);
    expect(await health.json()).toEqual({
      ok: false,
      error: "exhibit missing",
    });
    const page = await fetch(`${app.url}/`);
    expect(page.status).toBe(404);
    expect(await page.text()).toBe("not found");
  } finally {
    await app.close();
  }
});

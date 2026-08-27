import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { constants, gunzipSync, gzipSync } from "../../src/shims/node-zlib";

it("aliases node:zlib to the local browser shim in vite config", () => {
  const source = readFileSync(resolve("vite.config.ts"), "utf8");
  expect(source).toContain("node:zlib");
  expect(source).toContain("./src/shims/node-zlib");
});

it("exports only the zlib symbols imported by just-bash", () => {
  expect(constants.Z_BEST_COMPRESSION).toBe(9);
  expect(() => gunzipSync()).toThrow(/unavailable in this browser shell/);
  expect(() => gzipSync()).toThrow(/unavailable in this browser shell/);
});

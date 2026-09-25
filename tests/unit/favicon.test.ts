import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("declares the penrose favicon in the document head", () => {
  const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
  expect(html).toContain('rel="icon"');
  expect(html).toContain('href="/favicon.png"');
  expect(html).toContain('href="/favicon-32.png"');
  expect(html).toContain('rel="apple-touch-icon"');
  expect(existsSync(join(process.cwd(), "public/favicon.png"))).toBe(true);
  expect(existsSync(join(process.cwd(), "public/favicon-32.png"))).toBe(true);
  expect(existsSync(join(process.cwd(), "public/apple-touch-icon.png"))).toBe(
    true,
  );
});

import { expect, it } from "vitest";
import { SECURITY_HEADERS } from "../../server/headers";

it("lets wterm instantiate its inlined wasm module", () => {
  const csp = SECURITY_HEADERS["content-security-policy"];
  expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval'");
  expect(csp).toContain("font-src 'self' data:");
});

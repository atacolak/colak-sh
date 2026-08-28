import { expect, it } from "vitest";
import { clientIp, originAllowed } from "../../server/identity";
import { site } from "../../server/site";

it("uses CF-Connecting-IP only in production", () => {
  const req = {
    headers: { "cf-connecting-ip": "9.9.9.9" },
    socket: { remoteAddress: "10.0.0.2" },
  } as never;
  expect(clientIp(req, true)).toBe("9.9.9.9");
  expect(clientIp(req, false)).toBe("10.0.0.2");
});

it("allows the configured production origin", () => {
  expect(originAllowed(site.origin, true)).toBe(true);
  expect(originAllowed("https://evil.example", true)).toBe(false);
  expect(originAllowed("http://127.0.0.1:5173", false)).toBe(true);
  expect(originAllowed(site.origin, false)).toBe(true);
  expect(originAllowed("https://evil.example", false)).toBe(false);
});

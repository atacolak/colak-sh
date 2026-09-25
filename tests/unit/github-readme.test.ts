import { expect, it } from "vitest";
import {
  osc8,
  prepareMarkdown,
  projectBlurbFromMarkdown,
  rewriteRelativeUrls,
  wrapAnsi,
  wrapHanging,
  wrapWidth,
} from "../../src/content/github-readme";

const blob = "https://github.com/atacolak/browser-ops/blob/main";
const raw = "https://raw.githubusercontent.com/atacolak/browser-ops/main";

it("rewrites relative markdown links against blob and images against raw", () => {
  const out = rewriteRelativeUrls(
    "see [CHARTER.md](CHARTER.md)\n\n![knight](docs/knight.png)\n",
    blob,
    raw,
  );
  expect(out).toContain(`${blob}/CHARTER.md`);
  expect(out).toContain(`${raw}/docs/knight.png`);
});

it("strips figures and blurb metadata, and wraps markdown links as osc 8", () => {
  const src =
    "https://github.com/user-attachments/assets/b8ed1001-82c1-47d8-8013-7ea4aaf38911";
  const prepared = prepareMarkdown(
    `blurb: lease a cloak browser\norigin: https://github.com/atacolak/browser-ops\n# browser-ops\n<img alt="knight" src="${src}" />\n\nsee [Cloak](https://github.com/CloakLabs/cloakbrowser).\n`,
  );
  expect(prepared).not.toContain("<img");
  expect(prepared).not.toContain("blurb:");
  expect(prepared).not.toContain(src);
  expect(prepared).toContain(
    osc8("github.com/atacolak/browser-ops", "https://github.com/atacolak/browser-ops"),
  );
  expect(prepared).toContain(
    osc8("Cloak", "https://github.com/CloakLabs/cloakbrowser"),
  );
});

it("prefers blurb metadata and strips markdown", () => {
  expect(
    projectBlurbFromMarkdown(
      "blurb: lease a cloak browser, then drive one tab\n\n# browser-ops\n\nLease a [Cloak](https://github.com/CloakLabs/cloakbrowser) browser, then drive a specific tab over a unix socket. One Chrome process per named face.\n",
    ),
  ).toBe("lease a cloak browser, then drive one tab");
});

it("wraps on word boundaries without splitting tokens", () => {
  const wrapped = wrapAnsi(
    "one chrome process per named face. many tabs can share that process. each tab has at most one writer.",
    40,
  );
  expect(wrapped.split("\n").every((line) => line.length <= 40)).toBe(true);
  expect(wrapped).not.toMatch(/proce\nss/);
  expect(wrapped).toContain("process");
});

it("does not count osc 8 sequences toward wrap width", () => {
  const link = osc8("cloak", "https://github.com/CloakLabs/cloakbrowser");
  const wrapped = wrapAnsi(`lease a ${link} browser, then drive one tab.`, 28);
  expect(wrapped).toContain(link);
  expect(
    wrapped.split("\n").every((line) => visibleish(line) <= 28),
  ).toBe(true);
});

it("clamps wrap width to a sane live-column range", () => {
  expect(wrapWidth(12)).toBe(24);
  expect(wrapWidth(40)).toBe(40);
  expect(wrapWidth(120)).toBe(120);
  expect(wrapWidth(400)).toBe(240);
  expect(wrapWidth(undefined)).toBe(80);
});

it("hangs wrapped blurbs under the name instead of truncating", () => {
  const wrapped = wrapHanging(
    "speech-core.md",
    "realtime speech substrate with immutable turns and a separate mouth",
    40,
  );
  expect(wrapped).toContain("immutable");
  expect(wrapped).toContain("turns");
  expect(wrapped).toContain("mouth");
  expect(wrapped).not.toContain("…");
  expect(wrapped.split("\n").length).toBeGreaterThan(1);
  expect(
    wrapped.split("\n").every((line) => visibleish(line) <= 40),
  ).toBe(true);
  expect(wrapped.split("\n")[1]?.startsWith("                ")).toBe(true);
});

it("escapes underscores in x/github handles so markdown cannot eat them", () => {
  const prepared = prepareMarkdown("github: atacolak\nx: reward_hacker\n");
  expect(prepared).toContain("reward\\_hacker");
  expect(prepared).toContain("atacolak");
});

function visibleish(text: string): number {
  return text.replace(/\x1b(?:\]8;;[^\x07]*\x07|\[[0-9;]*m)/g, "").length;
}

import { expect, it } from "vitest";
import {
  osc8,
  prepareMarkdown,
  projectBlurbFromMarkdown,
  rewriteRelativeUrls,
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

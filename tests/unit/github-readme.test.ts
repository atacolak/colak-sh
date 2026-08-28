import { expect, it } from "vitest";
import {
  extractMarkdownImages,
  firstParagraph,
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

it("rewrites html images and keeps github attachment urls", () => {
  const src =
    "https://github.com/user-attachments/assets/b8ed1001-82c1-47d8-8013-7ea4aaf38911";
  const out = rewriteRelativeUrls(
    `<img width="720" alt="knight" src="${src}" />`,
    blob,
    raw,
  );
  expect(out).toContain(src);
  expect(extractMarkdownImages(out)).toEqual([{ src, alt: "knight" }]);
});

it("skips headings, origin lines, and html when picking a blurb", () => {
  expect(
    firstParagraph(
      "# speech-core\n\norigin: https://github.com/atacolak/speech-core\n\nreal-time speech substrate for human-agent interaction.\n",
    ),
  ).toBe("real-time speech substrate for human-agent interaction");
});

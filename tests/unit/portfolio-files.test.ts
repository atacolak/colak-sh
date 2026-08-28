import { expect, it } from "vitest";
import { site } from "../../src/site";
import {
  isPortfolioPath,
  loadPortfolioFiles,
  mapContentModules,
} from "../../src/content/portfolio-files";

it("maps repository content paths into the configured home", () => {
  const files = mapContentModules({
    [`/content${site.home}/README.md`]: "# home",
    [`/content${site.home}/now/current.md`]: "# now",
  });

  expect(files).toEqual({
    [`${site.home}/README.md`]: "# home",
    [`${site.home}/now/current.md`]: "# now",
  });
});

it("exposes the required absolute portfolio paths", () => {
  const files = loadPortfolioFiles();
  const required = [
    `${site.home}/README.md`,
    `${site.home}/now/current.md`,
    `${site.home}/projects/speech-core/README.md`,
    `${site.home}/projects/browser-ops/README.md`,
    `${site.home}/about/me.md`,
    `${site.home}/contact/README.md`,
  ];

  for (const path of required) {
    expect(files[path], path).toEqual(expect.any(String));
    expect(files[path]!.length).toBeGreaterThan(0);
  }

  expect(Object.keys(files).every((key) => isPortfolioPath(key))).toBe(true);
});

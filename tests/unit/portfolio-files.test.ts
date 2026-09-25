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
    [`/content${site.home}/now.md`]: "# now",
  });

  expect(files).toEqual({
    [`${site.home}/README.md`]: "# home",
    [`${site.home}/now.md`]: "# now",
  });
});

it("exposes the required absolute portfolio paths", () => {
  const files = loadPortfolioFiles();
  const required = [
    `${site.home}/README.md`,
    `${site.home}/now.md`,
    `${site.home}/me.md`,
    `${site.home}/contact.md`,
    `${site.home}/.pattern.md`,
    `${site.home}/projects/speech-core.md`,
    `${site.home}/projects/browser-ops.md`,
    `${site.home}/projects/oh-my-pi.md`,
    `${site.home}/projects/actor-village.md`,
    `${site.home}/projects/mardi-gras.md`,
    `${site.home}/projects/talker.md`,
  ];

  for (const path of required) {
    expect(files[path], path).toEqual(expect.any(String));
    expect(files[path]!.length).toBeGreaterThan(0);
  }

  expect(Object.keys(files).every((key) => isPortfolioPath(key))).toBe(true);
});

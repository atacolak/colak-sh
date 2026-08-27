import { expect, it } from "vitest";
import {
  loadPortfolioFiles,
  mapContentModules,
} from "../../src/content/portfolio-files";

it("maps repository content paths into /home/ata", () => {
  const files = mapContentModules({
    "/content/home/ata/README.md": "# ata",
    "/content/home/ata/now/current.md": "# now",
  });

  expect(files).toEqual({
    "/home/ata/README.md": "# ata",
    "/home/ata/now/current.md": "# now",
  });
});

it("exposes the required absolute portfolio paths", () => {
  const files = loadPortfolioFiles();
  const required = [
    "/home/ata/README.md",
    "/home/ata/now/current.md",
    "/home/ata/projects/speech-core/README.md",
    "/home/ata/projects/browser-ops/README.md",
    "/home/ata/about/me.md",
    "/home/ata/contact/README.md",
  ];

  for (const path of required) {
    expect(files[path], path).toEqual(expect.any(String));
    expect(files[path]!.length).toBeGreaterThan(0);
  }

  expect(Object.keys(files).every((key) => key.startsWith("/home/ata/"))).toBe(
    true,
  );
});

import { expect, it } from "vitest";
import { Bash } from "just-bash";
import { site } from "../../src/site";
import {
  annotateLsForModel,
  HELP_TEXT,
  registerPortfolioCommands,
} from "../../src/terminal/portfolio-commands";
import { getViewedImages } from "../../src/terminal/portfolio-images";

it("bolds directories without a trailing slash", async () => {
  const bash = new Bash({
    files: {
      [`${site.home}/README.md`]: "# ata\n",
      [`${site.home}/now/current.md`]: "# now\n",
    },
    cwd: site.home,
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec("ls");
  expect(result.stdout).toContain("\x1b[1;34mnow\x1b[0m");
  expect(result.stdout).toContain("README.md");
  expect(result.stdout).not.toContain("now/");
});

it("lists one name per line for tab completion", async () => {
  const bash = new Bash({
    files: {
      [`${site.home}/README.md`]: "# ata\n",
      [`${site.home}/now/current.md`]: "# now\n",
    },
    cwd: site.home,
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec(`ls -1a "${site.home}"`);
  expect(result.stdout.split("\n")).toEqual(
    expect.arrayContaining(["README.md", "now"]),
  );
  expect(result.stdout).not.toContain("\x1b");
});

it("prints a visitor-facing help list", async () => {
  const bash = new Bash({ cwd: site.home });
  registerPortfolioCommands(bash);
  const result = await bash.exec("help");
  expect(result.stdout).toBe(HELP_TEXT);
  expect(result.stdout).toContain("commands for this portfolio shell");
  expect(result.stdout).not.toContain("just-bash");
  expect(result.stdout).not.toContain("defined internally");
});

it("renders markdown through cat", async () => {
  const bash = new Bash({
    files: { [`${site.home}/README.md`]: "# ata\n\nhello **world**\n" },
    cwd: site.home,
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec("cat README.md");
  expect(result.stdout).toMatch(/\x1b\[/);
  expect(result.stdout).toContain("ata");
});

it("annotates folders for the model without changing visitor ls", async () => {
  const bash = new Bash({
    files: {
      [`${site.home}/README.md`]: "# ata\n",
      [`${site.home}/now/current.md`]: "# now\n",
    },
    cwd: site.home,
  });
  registerPortfolioCommands(bash);
  const annotated = await annotateLsForModel(
    `ls ${site.home}`,
    "README.md  now",
    site.home,
    bash,
  );
  expect(annotated).toContain("directories:");
  expect(annotated).toContain("now/");
  expect(annotated).toContain("files:");
  expect(annotated).toContain("README.md");
  expect(annotated).toContain("cat only files");
});

it("tells the visitor when cat hits a directory", async () => {
  const bash = new Bash({
    files: { [`${site.home}/about/me.md`]: "hi\n" },
    cwd: site.home,
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec("cat about");
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("is a directory");
});

it("lists projects as stacked one-liners", async () => {
  const bash = new Bash({
    files: {
      [`${site.home}/projects/speech-core.md`]:
        "blurb: realtime speech substrate. immutable turns\n\n# speech-core\n",
      [`${site.home}/projects/browser-ops.md`]:
        "blurb: lease a cloak browser, then drive one tab\n\n# browser-ops\n",
    },
    cwd: site.home,
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec("ls projects");
  const lines = result.stdout.trim().split("\n");
  expect(lines).toHaveLength(2);
  expect(result.stdout).toContain("speech-core.md");
  expect(result.stdout).toContain("realtime speech substrate");
  expect(result.stdout).toContain("browser-ops.md");
  expect(result.stdout).toContain("lease a cloak browser");
});

it("publishes github images from cat markdown", async () => {
  const src =
    "https://github.com/user-attachments/assets/b8ed1001-82c1-47d8-8013-7ea4aaf38911";
  const bash = new Bash({
    files: {
      [`${site.home}/projects/browser-ops.md`]:
        `blurb: lease a cloak browser\n# browser-ops\n<img alt="knight" src="${src}" />\n`,
    },
    cwd: site.home,
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec("cat projects/browser-ops.md");
  expect(getViewedImages()).toEqual([{ src, alt: "knight" }]);
  expect(result.stdout).not.toContain("<img");
  expect(result.stdout).not.toContain("blurb:");
  expect(result.stdout).not.toContain(src);
});

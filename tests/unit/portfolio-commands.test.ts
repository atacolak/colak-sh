import { expect, it } from "vitest";
import { Bash } from "just-bash";
import { osc8 } from "../../src/content/github-readme";
import { site } from "../../src/site";
import {
  annotateLsForModel,
  HELP_TEXT,
  registerPortfolioCommands,
  setWrapColumns,
} from "../../src/terminal/portfolio-commands";

it("bolds directories without a trailing slash", async () => {
  const bash = new Bash({
    files: {
      [`${site.home}/README.md`]: "# ata\n",
      [`${site.home}/now.md`]: "# now\n",
      [`${site.home}/projects/speech-core.md`]: "# speech-core\n",
    },
    cwd: site.home,
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec("ls");
  expect(result.stdout).toContain("\x1b[1;34mprojects\x1b[0m");
  expect(result.stdout).toContain("README.md");
  expect(result.stdout).toContain("now.md");
  expect(result.stdout).not.toContain("projects/");
});

it("dims hidden names in ls -a", async () => {
  const bash = new Bash({
    files: {
      [`${site.home}/README.md`]: "# ata\n",
      [`${site.home}/.pattern.md`]: "Look at the pattern\n",
    },
    cwd: site.home,
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec("ls -a");
  expect(result.stdout).toContain("\x1b[2m.pattern.md\x1b[0m");
  expect(result.stdout).toContain("README.md");
  const hidden = await bash.exec("ls");
  expect(hidden.stdout).not.toContain(".pattern.md");
});

it("lists one name per line for tab completion", async () => {
  const bash = new Bash({
    files: {
      [`${site.home}/README.md`]: "# ata\n",
      [`${site.home}/now.md`]: "# now\n",
    },
    cwd: site.home,
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec(`ls -1a "${site.home}"`);
  expect(result.stdout.split("\n")).toEqual(
    expect.arrayContaining(["README.md", "now.md"]),
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
      [`${site.home}/now.md`]: "# now\n",
      [`${site.home}/projects/speech-core.md`]:
        "blurb: realtime speech substrate. immutable turns\n\n# speech-core\n",
    },
    cwd: site.home,
  });
  registerPortfolioCommands(bash);
  const annotated = await annotateLsForModel(
    `ls ${site.home}`,
    "README.md  now.md  projects",
    site.home,
    bash,
  );
  expect(annotated).toContain("directories:");
  expect(annotated).toContain("projects/");
  expect(annotated).toContain("files:");
  expect(annotated).toContain("README.md");
  expect(annotated).toContain("cat only files");
});

it("annotates project listings for the model with blurbs", async () => {
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
  const annotated = await annotateLsForModel(
    `ls ${site.home}/projects`,
    "speech-core.md  browser-ops.md",
    site.home,
    bash,
  );
  expect(annotated).toContain("speech-core.md — realtime speech substrate");
  expect(annotated).toContain("browser-ops.md — lease a cloak browser");
  expect(annotated).toContain("a blurb is enough to name a project");
});

it("tells the visitor when cat hits a directory", async () => {
  const bash = new Bash({
    files: { [`${site.home}/projects/speech-core.md`]: "hi\n" },
    cwd: site.home,
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec("cat projects");
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

it("wraps project blurbs to the live width instead of truncating them", async () => {
  setWrapColumns(42);
  try {
    const bash = new Bash({
      files: {
        [`${site.home}/projects/speech-core.md`]:
          "blurb: realtime speech substrate with immutable turns and a separate mouth\n\n# speech-core\n",
      },
      cwd: site.home,
    });
    registerPortfolioCommands(bash);
    const result = await bash.exec("ls projects");
    expect(result.stdout).toContain("realtime speech substrate");
    expect(result.stdout).toContain("immutable turns");
    expect(result.stdout).toContain("separate mouth");
    expect(result.stdout).not.toContain("…");
    const visible = (line: string) =>
      line.replace(/\x1b(?:\]8;;[^\x07]*\x07|\[[0-9;]*m)/g, "").length;
    expect(result.stdout.split("\n").every((line) => visible(line) <= 42)).toBe(
      true,
    );
  } finally {
    setWrapColumns(80);
  }
});

it("strips figures and blurb metadata from cat markdown", async () => {
  const src =
    "https://github.com/user-attachments/assets/b8ed1001-82c1-47d8-8013-7ea4aaf38911";
  const bash = new Bash({
    files: {
      [`${site.home}/projects/browser-ops.md`]:
        `blurb: lease a cloak browser\n# browser-ops\n<img alt="knight" src="${src}" />\nsee [Cloak](https://github.com/CloakLabs/cloakbrowser).\n`,
    },
    cwd: site.home,
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec("cat projects/browser-ops.md");
  expect(result.stdout).not.toContain("<img");
  expect(result.stdout).not.toContain("blurb:");
  expect(result.stdout).not.toContain(src);
  expect(result.stdout).toContain(osc8("Cloak", "https://github.com/CloakLabs/cloakbrowser"));
});

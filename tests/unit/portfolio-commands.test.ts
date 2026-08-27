import { expect, it } from "vitest";
import { Bash } from "just-bash";
import {
  annotateLsForModel,
  HELP_TEXT,
  registerPortfolioCommands,
} from "../../src/terminal/portfolio-commands";

it("bolds directories without a trailing slash", async () => {
  const bash = new Bash({
    files: {
      "/home/ata/README.md": "# ata\n",
      "/home/ata/now/current.md": "# now\n",
    },
    cwd: "/home/ata",
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
      "/home/ata/README.md": "# ata\n",
      "/home/ata/now/current.md": "# now\n",
    },
    cwd: "/home/ata",
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec('ls -1a "/home/ata"');
  expect(result.stdout.split("\n")).toEqual(
    expect.arrayContaining(["README.md", "now"]),
  );
  expect(result.stdout).not.toContain("\x1b");
});

it("prints a visitor-facing help list", async () => {
  const bash = new Bash({ cwd: "/home/ata" });
  registerPortfolioCommands(bash);
  const result = await bash.exec("help");
  expect(result.stdout).toBe(HELP_TEXT);
  expect(result.stdout).toContain("commands for this portfolio shell");
  expect(result.stdout).not.toContain("just-bash");
  expect(result.stdout).not.toContain("defined internally");
});

it("renders markdown through cat", async () => {
  const bash = new Bash({
    files: { "/home/ata/README.md": "# ata\n\nhello **world**\n" },
    cwd: "/home/ata",
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec("cat README.md");
  expect(result.stdout).toMatch(/\x1b\[/);
  expect(result.stdout).toContain("ata");
});

it("annotates folders for the model without changing visitor ls", async () => {
  const bash = new Bash({
    files: {
      "/home/ata/README.md": "# ata\n",
      "/home/ata/now/current.md": "# now\n",
    },
    cwd: "/home/ata",
  });
  registerPortfolioCommands(bash);
  const annotated = await annotateLsForModel(
    "ls /home/ata",
    "README.md  now",
    "/home/ata",
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
    files: { "/home/ata/about/me.md": "hi\n" },
    cwd: "/home/ata",
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec("cat about");
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("is a directory");
});

it("lists projects as stacked one-liners", async () => {
  const bash = new Bash({
    files: {
      "/home/ata/projects/speech-core/README.md":
        "# speech-core\n\nreal-time speech substrate for human-agent interaction.\n",
      "/home/ata/projects/browser-ops/README.md":
        "# browser-ops\n\nlease a cloak browser, then drive a specific tab over a unix socket.\n",
    },
    cwd: "/home/ata",
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec("ls projects");
  const lines = result.stdout.trim().split("\n");
  expect(lines).toHaveLength(2);
  expect(result.stdout).toContain("speech-core");
  expect(result.stdout).toContain("real-time speech substrate");
  expect(result.stdout).toContain("browser-ops");
  expect(result.stdout).toContain("lease a cloak browser");
});

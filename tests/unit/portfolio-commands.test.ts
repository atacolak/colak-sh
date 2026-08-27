import { expect, it } from "vitest";
import { Bash } from "just-bash";
import { HELP_TEXT, registerPortfolioCommands } from "../../src/terminal/portfolio-commands";

it("marks directories with a trailing slash", async () => {
  const bash = new Bash({
    files: {
      "/home/ata/README.md": "# ata\n",
      "/home/ata/now/current.md": "# now\n",
    },
    cwd: "/home/ata",
  });
  registerPortfolioCommands(bash);
  const result = await bash.exec("ls");
  expect(result.stdout).toContain("now/");
  expect(result.stdout).toContain("README.md");
  expect(result.stdout).not.toMatch(/(^|\s)now(\s|$)/);
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

import { expect, it } from "vitest";
import { projectPamphlets, systemPrompt } from "../../server/agent/prompt";
import { site } from "../../server/site";

it("lists every project pamphlet for a broad what-is-he-working-on tour", () => {
  const files = projectPamphlets();
  expect(files.length).toBeGreaterThan(1);
  const prompt = systemPrompt();
  expect(prompt).toContain("your final answer MUST mention every one of those projects");
  expect(prompt).toContain(`cat ${site.home}/now.md`);
  expect(prompt).toContain(`ls ${site.home}/projects`);
  expect(prompt).toContain("do not cat every pamphlet");
  for (const file of files) {
    expect(prompt, file).toContain(file);
    expect(prompt, file).not.toContain(`cat ${site.home}/projects/${file}`);
  }
});

it("forbids invented paths and prose-as-shell", () => {
  const prompt = systemPrompt();
  expect(prompt).toContain("never name a file, folder, or path you have not already seen");
  expect(prompt).toContain("do not fabricate a file");
  expect(prompt).toContain("find, ls, cat, grep are tools, not english verbs");
});

it("does not mix zoomer slang into the voice", () => {
  expect(systemPrompt()).not.toContain("zoomer");
});

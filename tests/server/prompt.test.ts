import { expect, it } from "vitest";
import { projectPamphlets, systemPrompt } from "../../server/agent/prompt";
import { site } from "../../server/site";

it("lists every project pamphlet for a broad what-is-he-working-on tour", () => {
  const files = projectPamphlets();
  expect(files.length).toBeGreaterThan(1);
  const prompt = systemPrompt();
  expect(prompt).toContain("your final answer MUST mention every one of those projects");
  expect(prompt).toContain(`ls ${site.home}/projects`);
  for (const file of files) {
    expect(prompt, file).toContain(file);
    expect(prompt, file).toContain(`cat ${site.home}/projects/${file}`);
  }
});

import { expect, test } from "@playwright/test";
import { site } from "../../src/site";

test("fake agent drives the same browser-local terminal", async ({ page }) => {
  await page.goto("/");

  const terminal = page.getByRole("textbox", { name: "Terminal" });
  await expect(terminal).toBeVisible();
  await expect(terminal).toContainText(`${site.user}@${site.promptHost}`, {
    timeout: 15_000,
  });

  await page.getByRole("button", { name: site.prompts[0] }).click();

  await expect(page.locator(".chat-log")).toContainText(
    "mostly agent infrastructure and speech systems",
    { timeout: 15_000 },
  );

  await expect(terminal).toContainText(`cd ${site.home}/now`, {
    timeout: 15_000,
  });
  await expect(terminal).toContainText("cat current.md", { timeout: 15_000 });
  await expect(terminal).toContainText("two live threads", { timeout: 15_000 });

  const suggestions = page.locator(".prompt-chip");
  await expect(suggestions).toHaveCount(3);
  await expect(suggestions).toHaveText([
    "show me speech-core",
    "what makes browser-ops unusual?",
    "show me something completely different",
  ]);

  await terminal.click();
  await page.keyboard.press("ArrowUp");
  await expect(terminal).toContainText("cat current.md");
});

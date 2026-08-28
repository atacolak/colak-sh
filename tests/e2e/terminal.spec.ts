import { expect, test } from "@playwright/test";
import { site } from "../../src/site";

test("renders a terminal-first portfolio and accepts shell input", async ({
  page,
}) => {
  await page.goto("/");

  const terminal = page.getByRole("textbox", { name: "Terminal" });
  await expect(terminal).toBeVisible();
  await expect(page.getByText(site.chatTitle)).toBeVisible();
  await expect(
    page.getByRole("button", { name: site.prompts[0] }),
  ).toBeVisible();
  await expect(terminal).toContainText(`${site.user}@${site.promptHost}`, {
    timeout: 15_000,
  });

  await terminal.click();
  await page.keyboard.type("pwd");
  await page.keyboard.press("Enter");
  await expect(terminal).toContainText(site.home);

  await page.keyboard.type("ls");
  await page.keyboard.press("Enter");
  await expect(terminal).toContainText("about");
  await expect(terminal).toContainText("now");
  await expect(terminal).toContainText("projects");
});

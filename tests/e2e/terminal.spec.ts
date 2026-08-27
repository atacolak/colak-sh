import { expect, test } from "@playwright/test";

test("renders a terminal-first portfolio and accepts shell input", async ({
  page,
}) => {
  await page.goto("/");

  const terminal = page.getByRole("textbox", { name: "Terminal" });
  await expect(terminal).toBeVisible();
  await expect(page.getByText("ask ata's machine")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "what is ata working on lately?" }),
  ).toBeVisible();

  await terminal.click();
  await page.keyboard.type("pwd");
  await page.keyboard.press("Enter");
  await expect(terminal).toContainText("/home/ata");

  await page.keyboard.type("ls");
  await page.keyboard.press("Enter");
  await expect(terminal).toContainText("about");
  await expect(terminal).toContainText("now");
  await expect(terminal).toContainText("projects");
});

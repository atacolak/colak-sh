import { expect, it } from "vitest";
import { site } from "../../src/site";
import { SessionController } from "../../src/terminal/SessionController";

function createController() {
  const writes: string[] = [];
  const controller = new SessionController({
    [`${site.home}/README.md`]: "# ata\n",
    [`${site.home}/now.md`]: "# now\n",
    [`${site.home}/projects/speech-core.md`]: "# speech-core\n",
  });
  const write = (data: string) => {
    writes.push(data);
  };
  return {
    controller,
    writes,
    write,
    joinedWrites: () => writes.join(""),
  };
}

it("opens with cat README.md already executed", async () => {
  const { joinedWrites, write, controller } = createController();
  await controller.attach(write);
  await controller.bootOpening();
  expect(joinedWrites()).toContain("cat README.md");
  expect(joinedWrites()).toContain("ata");

  const remount: string[] = [];
  controller.setWrite((data) => remount.push(data));
  expect(remount.join("")).toContain("cat README.md");
});

it("shares cwd and history between human and agent input", async () => {
  const { controller, joinedWrites, write } = createController();
  await controller.attach(write);
  await controller.bootOpening();

  await controller.handleHumanInput(`cd ${site.home}/projects`);
  await controller.handleHumanInput("\r");
  expect(controller.cwd).toBe(`${site.home}/projects`);

  const result = await controller.execAsAgent("pwd", 0);
  expect(result.cwd).toBe(`${site.home}/projects`);
  expect(result.output).toContain(`${site.home}/projects`);

  await controller.handleHumanInput("\x1b[A");
  expect(joinedWrites()).toContain("pwd");
});

it("rejects empty and oversized agent commands", async () => {
  const { controller } = createController();
  await controller.attach(() => {});
  await controller.bootOpening();

  await expect(controller.execAsAgent("", 0)).rejects.toThrow();
  await expect(controller.execAsAgent("a".repeat(501), 0)).rejects.toThrow();
});

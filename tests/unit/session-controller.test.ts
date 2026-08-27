import { expect, it } from "vitest";
import { SessionController } from "../../src/terminal/SessionController";

function createController() {
  const writes: string[] = [];
  const controller = new SessionController({
    "/home/ata/README.md": "# ata\n",
    "/home/ata/now/current.md": "# now\n",
    "/home/ata/projects/speech-core/README.md": "# speech-core\n",
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

it("shares cwd and history between human and agent input", async () => {
  const { controller, joinedWrites, write } = createController();
  await controller.attach(write);

  await controller.handleHumanInput("cd /home/ata/projects");
  await controller.handleHumanInput("\r");
  expect(controller.cwd).toBe("/home/ata/projects");

  const result = await controller.execAsAgent("pwd", 0);
  expect(result.cwd).toBe("/home/ata/projects");
  expect(result.output).toContain("/home/ata/projects");

  await controller.handleHumanInput("\x1b[A");
  expect(joinedWrites()).toContain("pwd");
});

it("rejects empty and oversized agent commands", async () => {
  const { controller } = createController();
  await controller.attach(() => {});

  await expect(controller.execAsAgent("", 0)).rejects.toThrow();
  await expect(controller.execAsAgent("a".repeat(501), 0)).rejects.toThrow();
});

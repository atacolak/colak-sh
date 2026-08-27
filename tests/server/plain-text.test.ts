import { expect, it } from "vitest";
import { plainChatText } from "../../server/agent/plain-text";

it("strips markdown markup without eating words", () => {
  expect(plainChatText("**speech-core:** a substrate")).toBe("speech-core: a substrate");
  expect(plainChatText("`browser-ops`")).toBe("browser-ops");
  expect(plainChatText("hello ")).toBe("hello ");
});

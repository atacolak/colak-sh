import { expect, it } from "vitest";
import { plainChatText } from "../../server/agent/plain-text";

it("strips markdown markup without eating words", () => {
  expect(plainChatText("**speech-core:** a substrate")).toBe("speech-core: a substrate");
  expect(plainChatText("`browser-ops`")).toBe("browser-ops");
  expect(plainChatText("hello ")).toBe("hello ");
  expect(plainChatText("speech_core")).toBe("speech_core");
});

it("drops typed tool invocations from chat", () => {
  expect(plainChatText("peeking.\nterminal_exec ls /home/ata\nok")).toBe(
    "peeking.\n\nok",
  );
  expect(plainChatText("terminalexec ls -F /home/user/")).toBe("");
});

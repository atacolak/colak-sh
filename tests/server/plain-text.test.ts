import { expect, it } from "vitest";
import {
  extractTypedCommand,
  finishMutter,
  plainChatText,
} from "../../server/agent/plain-text";

it("strips markdown markup without eating words", () => {
  expect(plainChatText("**speech-core:** a substrate")).toBe("speech-core: a substrate. ");
  expect(plainChatText("`browser-ops`")).toBe("browser-ops. ");
  expect(plainChatText("hello ")).toBe("hello. ");
  expect(plainChatText("speech_core")).toBe("speech_core. ");
});

it("drops typed tool invocations from chat", () => {
  expect(plainChatText("peeking.\nterminal_exec ls /home/ata\nok")).toBe(
    "peeking. ok. ",
  );
  expect(plainChatText("terminalexec ls -F /home/user/")).toBe("");
});

it("extracts a typed shell command from chat", () => {
  expect(extractTypedCommand("i am listing files. ls /home/ata")).toBe("ls /home/ata");
  expect(plainChatText("i am listing files. ls /home/ata")).toBe("i am listing files. ");
});

it("closes a hanging mutter instead of leaving to", () => {
  expect(finishMutter("i am going to list the projects directory to")).toBe(
    "i am going to list the projects directory. ",
  );
  expect(plainChatText("i will peek at the readme for")).toBe(
    "i will peek at the readme. ",
  );
});

/** @vitest-environment jsdom */

import { expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ChatPanel } from "../../src/chat/ChatPanel";

it("opens with four chips and impressive last, then shows three follow-ups", () => {
  const opening = render(
    <ChatPanel
      state={{ messages: [], suggestions: [], active: false }}
      onPrompt={() => {}}
    />,
  );
  const first = [...opening.container.querySelectorAll(".prompt-chip")].map(
    (el) => el.textContent,
  );
  expect(first).toHaveLength(4);
  expect(first.at(-1)).toBe("show me something impressive");
  opening.unmount();

  const follow = render(
    <ChatPanel
      state={{
        messages: [],
        suggestions: [
          "show me actor-village",
          "show me speech-core",
          "what makes browser-ops unusual?",
        ],
        active: false,
      }}
      onPrompt={() => {}}
    />,
  );
  expect(follow.container.querySelectorAll(".prompt-chip")).toHaveLength(3);
  follow.unmount();
});

it("shows a three-dot wait while the agent is working", () => {
  const waiting = render(
    <ChatPanel
      state={{
        messages: [{ role: "visitor", text: "what is ata working on lately?" }],
        suggestions: [],
        active: true,
      }}
      onPrompt={() => {}}
    />,
  );
  const dots = waiting.container.querySelector(".chat-wait");
  expect(dots).not.toBeNull();
  expect(dots?.getAttribute("aria-label")).toBe("waiting");
  expect(dots?.querySelectorAll("span")).toHaveLength(3);
  waiting.unmount();

  const talking = render(
    <ChatPanel
      state={{
        messages: [
          { role: "visitor", text: "what is ata working on lately?" },
          { role: "assistant", text: "actor village is the live thread." },
        ],
        suggestions: [],
        active: false,
      }}
      onPrompt={() => {}}
    />,
  );
  expect(talking.container.querySelector(".chat-wait")).toBeNull();
});

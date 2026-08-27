import { expect, it } from "vitest";
import { recentHistory } from "../../server/agent/history";

it("keeps paired visitor and assistant turns", () => {
  const kept = recentHistory([
    { role: "visitor", text: "what is ata working on lately?" },
    { role: "assistant", text: "speech-core and browser-ops. looking in now." },
    { role: "visitor", text: "why should i talk to him?" },
  ]);
  expect(kept).toEqual([
    { role: "visitor", text: "what is ata working on lately?" },
    { role: "assistant", text: "speech-core and browser-ops. looking in now." },
    { role: "visitor", text: "why should i talk to him?" },
  ]);
});

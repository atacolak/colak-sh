import { MAX_HISTORY_CHARS, MAX_HISTORY_EXCHANGES } from "../limits.js";

export type HistoryTurn = {
  role: "visitor" | "assistant";
  text: string;
};

export function recentHistory(turns: HistoryTurn[]): HistoryTurn[] {
  const exchanges: HistoryTurn[][] = [];
  let current: HistoryTurn[] = [];
  for (const turn of turns) {
    if (turn.role === "visitor" && current.length > 0) {
      exchanges.push(current);
      current = [];
    }
    current.push(turn);
  }
  if (current.length > 0) exchanges.push(current);
  let kept = exchanges.slice(-MAX_HISTORY_EXCHANGES).flat();
  while (serialize(kept).length > MAX_HISTORY_CHARS && kept.length > 2) {
    kept = kept.slice(2);
  }
  return kept;
}

function serialize(turns: HistoryTurn[]): string {
  return turns.map((turn) => `${turn.role}:${turn.text}`).join("\n");
}

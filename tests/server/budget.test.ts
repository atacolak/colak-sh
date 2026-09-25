import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { UsageBudget } from "../../server/budget";
import {
  MAX_GLOBAL_CONCURRENT_MODEL_REQUESTS,
  MAX_GLOBAL_MODEL_TOKENS_PER_DAY,
  MAX_GLOBAL_PROMPTS_PER_DAY,
  MAX_MODEL_TOKENS_PER_IP_PER_DAY,
  MAX_PROMPTS_PER_IP_PER_DAY,
  MAX_PROMPTS_PER_IP_PER_WINDOW,
  MISSING_USAGE_FALLBACK_TOKENS,
} from "../../server/limits";

async function makeBudget(now: { ms: number }) {
  const dir = await mkdtemp(join(tmpdir(), "colak-budget-"));
  const path = join(dir, "usage-budget.json");
  return UsageBudget.load(path, "salt", () => now.ms);
}

it("caps prompts in the short IP window", async () => {
  const now = { ms: Date.parse("2026-08-27T00:00:00Z") };
  const budget = await makeBudget(now);
  for (let i = 0; i < MAX_PROMPTS_PER_IP_PER_WINDOW; i++) {
    expect(budget.admit("1.1.1.1").ok).toBe(true);
    budget.release();
  }
  expect(budget.admit("1.1.1.1")).toEqual({ ok: false, reason: "rate" });
  expect(budget.admit("2.2.2.2").ok).toBe(true);
});

it("caps daily prompts per IP", async () => {
  const now = { ms: Date.parse("2026-08-27T00:00:00Z") };
  const budget = await makeBudget(now);
  for (let i = 0; i < MAX_PROMPTS_PER_IP_PER_DAY; i++) {
    now.ms += 11 * 60_000;
    expect(budget.admit("1.1.1.1").ok).toBe(true);
    budget.release();
  }
  now.ms += 11 * 60_000;
  expect(budget.admit("1.1.1.1")).toEqual({ ok: false, reason: "budget" });
});

it("keeps the per-IP daily token ceiling", () => {
  expect(MAX_MODEL_TOKENS_PER_IP_PER_DAY).toBe(500_000);
});

it("caps per-IP and global tokens", async () => {
  const now = { ms: Date.parse("2026-08-27T00:00:00Z") };
  const budget = await makeBudget(now);
  expect(budget.admit("1.1.1.1").ok).toBe(true);
  budget.debit("1.1.1.1", { totalTokens: MAX_MODEL_TOKENS_PER_IP_PER_DAY }, false);
  budget.release();
  now.ms += 11 * 60_000;
  expect(budget.admit("1.1.1.1")).toEqual({ ok: false, reason: "budget" });

  const other = await makeBudget(now);
  expect(other.admit("9.9.9.9").ok).toBe(true);
  other.debit("9.9.9.9", { totalTokens: MAX_GLOBAL_MODEL_TOKENS_PER_DAY }, false);
  other.release();
  now.ms += 11 * 60_000;
  expect(other.admit("8.8.8.8")).toEqual({ ok: false, reason: "budget" });
});

it("resets at UTC midnight and reloads persisted state", async () => {
  const now = { ms: Date.parse("2026-08-27T23:50:00Z") };
  const dir = await mkdtemp(join(tmpdir(), "colak-budget-"));
  const path = join(dir, "usage-budget.json");
  const first = await UsageBudget.load(path, "salt", () => now.ms);
  expect(first.admit("1.1.1.1").ok).toBe(true);
  first.debit("1.1.1.1", { totalTokens: 12 }, false);
  first.release();
  await first.flush();
  const saved = JSON.parse(await readFile(path, "utf8")) as {
    globalPrompts: number;
    globalTokens: number;
  };
  expect(saved.globalPrompts).toBe(1);
  expect(saved.globalTokens).toBe(12);

  const reloaded = await UsageBudget.load(path, "salt", () => now.ms);
  expect(reloaded.snapshot().globalTokens).toBe(12);

  now.ms = Date.parse("2026-08-28T00:01:00Z");
  expect(reloaded.admit("1.1.1.1").ok).toBe(true);
  expect(reloaded.snapshot().date).toBe("2026-08-28");
  expect(reloaded.snapshot().globalPrompts).toBe(1);
});

it("debits fallback tokens when usage is missing", async () => {
  const now = { ms: Date.parse("2026-08-27T00:00:00Z") };
  const budget = await makeBudget(now);
  budget.admit("1.1.1.1");
  expect(budget.debit("1.1.1.1", undefined, true)).toBe(
    MISSING_USAGE_FALLBACK_TOKENS,
  );
});

it("caps concurrent model requests", async () => {
  const now = { ms: Date.parse("2026-08-27T00:00:00Z") };
  const budget = await makeBudget(now);
  for (let i = 0; i < MAX_GLOBAL_CONCURRENT_MODEL_REQUESTS; i++) {
    expect(budget.admit(`1.1.1.${i}`).ok).toBe(true);
  }
  expect(budget.admit("9.9.9.9")).toEqual({ ok: false, reason: "rate" });
});

it("keeps the global daily prompt ceiling", () => {
  expect(MAX_GLOBAL_PROMPTS_PER_DAY).toBe(1500);
});

it("does not reject flush when persist cannot write", async () => {
  const now = { ms: Date.parse("2026-08-27T00:00:00Z") };
  const dir = await mkdtemp(join(tmpdir(), "colak-budget-"));
  const blocker = join(dir, "not-a-dir");
  await writeFile(blocker, "nope");
  const budget = await UsageBudget.load(
    join(blocker, "usage-budget.json"),
    "salt",
    () => now.ms,
  );
  expect(budget.admit("1.1.1.1").ok).toBe(true);
  await expect(budget.flush()).resolves.toBeUndefined();
});

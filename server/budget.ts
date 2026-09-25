import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  IP_RATE_WINDOW_MS,
  MAX_GLOBAL_CONCURRENT_MODEL_REQUESTS,
  MAX_GLOBAL_MODEL_TOKENS_PER_DAY,
  MAX_GLOBAL_PROMPTS_PER_DAY,
  MAX_MODEL_TOKENS_PER_IP_PER_DAY,
  MAX_PROMPTS_PER_IP_PER_DAY,
  MAX_PROMPTS_PER_IP_PER_WINDOW,
  MISSING_USAGE_FALLBACK_TOKENS,
} from "./limits.js";

export type BudgetDecision =
  | { ok: true }
  | { ok: false; reason: "rate" | "budget" };

type IpBucket = {
  prompts: number;
  tokens: number;
  windowStartedAt: number;
  windowCount: number;
};

type BudgetState = {
  date: string;
  globalPrompts: number;
  globalTokens: number;
  ips: Record<string, IpBucket>;
};

export type UsageLike = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

const emptyState = (date: string): BudgetState => ({
  date,
  globalPrompts: 0,
  globalTokens: 0,
  ips: {},
});

export class UsageBudget {
  private state: BudgetState;
  private concurrent = 0;
  private writing: Promise<void> = Promise.resolve();

  constructor(
    private readonly path: string,
    private readonly salt: string,
    private readonly now: () => number = Date.now,
  ) {
    this.state = emptyState(utcDate(this.now()));
  }

  static async load(
    path: string,
    salt: string,
    now: () => number = Date.now,
  ): Promise<UsageBudget> {
    const budget = new UsageBudget(path, salt, now);
    try {
      const raw = JSON.parse(await readFile(path, "utf8")) as BudgetState;
      if (raw.date === utcDate(now())) budget.state = raw;
    } catch {
      budget.state = emptyState(utcDate(now()));
    }
    return budget;
  }

  hashIp(ip: string): string {
    return createHash("sha256").update(`${this.salt}:${ip}`).digest("hex");
  }

  admit(ip: string): BudgetDecision {
    this.roll();
    if (this.concurrent >= MAX_GLOBAL_CONCURRENT_MODEL_REQUESTS) {
      return { ok: false, reason: "rate" };
    }
    if (this.state.globalPrompts >= MAX_GLOBAL_PROMPTS_PER_DAY) {
      return { ok: false, reason: "budget" };
    }
    if (this.state.globalTokens >= MAX_GLOBAL_MODEL_TOKENS_PER_DAY) {
      return { ok: false, reason: "budget" };
    }
    const key = this.hashIp(ip);
    const bucket = this.ipBucket(key);
    if (bucket.prompts >= MAX_PROMPTS_PER_IP_PER_DAY) {
      return { ok: false, reason: "budget" };
    }
    if (bucket.tokens >= MAX_MODEL_TOKENS_PER_IP_PER_DAY) {
      return { ok: false, reason: "budget" };
    }
    const now = this.now();
    if (now - bucket.windowStartedAt >= IP_RATE_WINDOW_MS) {
      bucket.windowStartedAt = now;
      bucket.windowCount = 0;
    }
    if (bucket.windowCount >= MAX_PROMPTS_PER_IP_PER_WINDOW) {
      return { ok: false, reason: "rate" };
    }
    bucket.windowCount += 1;
    bucket.prompts += 1;
    this.state.globalPrompts += 1;
    this.concurrent += 1;
    this.persist();
    return { ok: true };
  }

  release(): void {
    this.concurrent = Math.max(0, this.concurrent - 1);
  }

  debit(ip: string, usage: UsageLike | undefined, missingUsage: boolean): number {
    this.roll();
    const tokens = missingUsage
      ? MISSING_USAGE_FALLBACK_TOKENS
      : countedTokens(usage);
    const key = this.hashIp(ip);
    const bucket = this.ipBucket(key);
    bucket.tokens += tokens;
    this.state.globalTokens += tokens;
    this.persist();
    return tokens;
  }

  snapshot(): BudgetState {
    this.roll();
    return structuredClone(this.state);
  }

  flush(): Promise<void> {
    return this.writing;
  }

  private ipBucket(key: string): IpBucket {
    const existing = this.state.ips[key];
    if (existing) return existing;
    const created: IpBucket = {
      prompts: 0,
      tokens: 0,
      windowStartedAt: this.now(),
      windowCount: 0,
    };
    this.state.ips[key] = created;
    return created;
  }

  private roll(): void {
    const today = utcDate(this.now());
    if (this.state.date !== today) this.state = emptyState(today);
  }

  private persist(): void {
    const snapshot = structuredClone(this.state);
    this.writing = this.writing
      .then(() => this.writeSnapshot(snapshot))
      .catch((error) => {
        console.error(
          JSON.stringify({
            event: "budget_persist_failed",
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      });
  }

  private async writeSnapshot(snapshot: BudgetState): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const payload = JSON.stringify(snapshot);
    const tmp = `${this.path}.${process.pid}.tmp`;
    try {
      await writeFile(tmp, payload);
      await rename(tmp, this.path);
    } catch (error) {
      await unlink(tmp).catch(() => undefined);
      const code = errorCode(error);
      if (code === "EBUSY" || code === "EXDEV") {
        await writeFile(this.path, payload);
        return;
      }
      throw error;
    }
  }
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

export function countedTokens(usage: UsageLike | undefined): number {
  if (!usage) return MISSING_USAGE_FALLBACK_TOKENS;
  if (typeof usage.totalTokens === "number") return usage.totalTokens;
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  if (input === 0 && output === 0) return MISSING_USAGE_FALLBACK_TOKENS;
  return input + output;
}

export function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

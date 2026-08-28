import { execFileSync } from "node:child_process";
import { rewriteRelativeUrls } from "./github-readme.js";
import { site } from "./site.js";

const TTL_MS = 15 * 60_000;

export type CatalogFile = {
  name: string;
  path: string;
  blurb: string;
  markdown: string;
};

type GithubRepo = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  pushed_at: string;
  default_branch: string;
  fork: boolean;
  archived: boolean;
  private: boolean;
};

type ContributionsSpec = {
  name: string;
  upstream: string;
  fork: string;
};

type Cache = {
  expires: number;
  files: Record<string, string>;
  items: CatalogFile[];
};

let cache: Cache | null = null;
let inflight: Promise<Cache> | null = null;

export async function getCatalog(): Promise<Cache> {
  if (cache && cache.expires > Date.now()) return cache;
  if (inflight) return inflight;
  inflight = refresh().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function refresh(): Promise<Cache> {
  const headers = githubHeaders();
  const config = site.github;
  const repos = (
    await gh<GithubRepo[]>(
      `/users/${config.user}/repos?per_page=100&type=owner&sort=pushed`,
      headers,
    )
  ).filter((repo) => includeRepo(repo, config.user, config.exclude ?? []));

  const contributionByName = new Map(
    (config.contributions ?? []).map((spec) => [spec.name, spec]),
  );
  const items: CatalogFile[] = [];

  for (const repo of repos.sort((a, b) => a.name.localeCompare(b.name))) {
    const spec = contributionByName.get(repo.name);
    items.push(
      spec
        ? await contributionFile(spec, repo, headers)
        : await repoFile(repo, headers),
    );
  }

  for (const spec of config.contributions ?? []) {
    if (items.some((item) => item.name === spec.name)) continue;
    items.push(await contributionFile(spec, null, headers));
  }

  const files = Object.fromEntries(
    items.map((item) => [item.path, item.markdown]),
  );
  cache = { expires: Date.now() + TTL_MS, files, items };
  return cache;
}

function includeRepo(repo: GithubRepo, user: string, exclude: string[]): boolean {
  if (repo.private || repo.archived) return false;
  if (repo.name === user) return false;
  return !exclude.includes(repo.name);
}

async function repoFile(
  repo: GithubRepo,
  headers: Record<string, string>,
): Promise<CatalogFile> {
  const readme = await readmeText(repo.full_name, headers);
  const blurb = clipBlurb(repo.description ?? repo.name);
  const branch = repo.default_branch || "main";
  return {
    name: repo.name,
    path: `${site.home}/projects/${repo.name}.md`,
    blurb,
    markdown: [
      `origin: ${repo.html_url}`,
      `language: ${repo.language ?? "n/a"}`,
      `updated: ${repo.pushed_at.slice(0, 10)}`,
      `blurb: ${blurb}`,
      "",
      rewriteRelativeUrls(
        readme,
        `${repo.html_url}/blob/${branch}`,
        `https://raw.githubusercontent.com/${repo.full_name}/${branch}`,
      ).replace(/\s+$/, ""),
      "",
    ].join("\n"),
  };
}

async function contributionFile(
  spec: ContributionsSpec,
  repo: GithubRepo | null,
  headers: Record<string, string>,
): Promise<CatalogFile> {
  const [open, merged] = await Promise.all([
    ghSearch(
      `repo:${spec.upstream} author:${site.github.user} is:pr is:open`,
      headers,
    ),
    ghSearch(
      `repo:${spec.upstream} author:${site.github.user} is:pr is:merged`,
      headers,
    ),
  ]);
  const blurb = clipBlurb(
    repo?.description ??
      "long-lived oh-my-pi fork. contributions, not a checkout",
  );
  return {
    name: spec.name,
    path: `${site.home}/projects/${spec.name}.md`,
    blurb,
    markdown: [
      `# ${spec.name}`,
      "",
      `origin: https://github.com/${spec.fork}`,
      `upstream: https://github.com/${spec.upstream}`,
      `blurb: ${blurb}`,
      "",
      "long-lived fork of can1357/oh-my-pi. daily runtime is composed from isolated cap/* branches. this file is the contribution surface, not a checkout of the tree.",
      "",
      "open:",
      ...formatPrs(open),
      "",
      "merged:",
      ...formatPrs(merged),
      "",
    ].join("\n"),
  };
}

function formatPrs(
  items: Array<{ number: number; title: string; html_url: string }>,
): string[] {
  if (items.length === 0) return ["- none"];
  return items.map(
    (item) => `- [#${item.number}](${item.html_url}) ${item.title}`,
  );
}

async function readmeText(
  fullName: string,
  headers: Record<string, string>,
): Promise<string> {
  const readme = await gh<{ content: string }>(
    `/repos/${fullName}/readme`,
    headers,
  );
  return Buffer.from(readme.content, "base64").toString("utf8");
}

async function gh<T>(path: string, headers: Record<string, string>): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    throw new Error(`${path} ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function ghSearch(
  query: string,
  headers: Record<string, string>,
): Promise<Array<{ number: number; title: string; html_url: string }>> {
  const res = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=100`,
    { headers },
  );
  if (!res.ok) {
    throw new Error(`search ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as {
    items: Array<{ number: number; title: string; html_url: string }>;
  };
  return body.items.sort((a, b) => b.number - a.number);
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "colak-sh-catalog",
    "x-github-api-version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN?.trim() || ghToken();
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

function ghToken(): string {
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function clipBlurb(text: string, max = 72): string {
  const cleaned = text.replace(/\s+/g, " ").trim().replace(/\.$/, "").toLowerCase();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, Math.max(1, max - 1)).replace(/\s+\S*$/, "")}…`;
}

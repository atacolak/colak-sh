import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rewriteRelativeUrls } from "../src/content/github-readme";

type RepoProject = { repo: string; kind?: "repo" };
type ContributionsProject = {
  kind: "contributions";
  name: string;
  upstream: string;
  fork: string;
};
type CatalogProject = RepoProject | ContributionsProject;

type Site = {
  home: string;
  github: {
    user: string;
    projects: CatalogProject[];
  };
};

type GithubRepo = {
  default_branch?: string;
  language?: string | null;
  pushed_at?: string;
};

type GithubReadme = {
  content: string;
};

type SearchItem = {
  number: number;
  title: string;
  html_url: string;
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(await readFile(join(root, "site.json"), "utf8")) as Site;
const outDir = join(root, "content", site.home.replace(/^\//, ""), "projects");

const token = process.env.GITHUB_TOKEN?.trim() || ghToken();
const headers: Record<string, string> = {
  accept: "application/vnd.github+json",
  "user-agent": "colak-sh-sync",
  "x-github-api-version": "2022-11-28",
};
if (token) headers.authorization = `Bearer ${token}`;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const project of site.github.projects) {
  if (project.kind === "contributions") {
    await writeFile(
      join(outDir, `${project.name}.md`),
      await contributionsMarkdown(project),
      "utf8",
    );
    continue;
  }
  await writeFile(
    join(outDir, `${project.repo}.md`),
    await repoMarkdown(project.repo),
    "utf8",
  );
}

async function repoMarkdown(name: string): Promise<string> {
  const repo = await gh<GithubRepo>(`/repos/${site.github.user}/${name}`);
  const readme = await gh<GithubReadme>(`/repos/${site.github.user}/${name}/readme`);
  const body = Buffer.from(readme.content, "base64").toString("utf8");
  const branch = repo.default_branch ?? "main";
  const blobBase = `https://github.com/${site.github.user}/${name}/blob/${branch}`;
  const rawBase = `https://raw.githubusercontent.com/${site.github.user}/${name}/${branch}`;
  const rewritten = rewriteRelativeUrls(body, blobBase, rawBase);
  return [
    `origin: https://github.com/${site.github.user}/${name}`,
    `language: ${repo.language ?? "n/a"}`,
    `updated: ${String(repo.pushed_at ?? "").slice(0, 10)}`,
    "",
    rewritten.replace(/\s+$/, ""),
    "",
  ].join("\n");
}

async function contributionsMarkdown(
  project: ContributionsProject,
): Promise<string> {
  const [open, merged] = await Promise.all([
    ghSearch(`repo:${project.upstream} author:${site.github.user} is:pr is:open`),
    ghSearch(
      `repo:${project.upstream} author:${site.github.user} is:pr is:merged`,
    ),
  ]);
  return [
    `# ${project.name}`,
    "",
    `origin: https://github.com/${project.fork}`,
    `upstream: https://github.com/${project.upstream}`,
    "",
    "long-lived fork of can1357/oh-my-pi. daily runtime is composed from isolated cap/* branches. this file is the contribution surface, not a checkout of the tree.",
    "",
    "open:",
    ...formatPrs(open),
    "",
    "merged:",
    ...formatPrs(merged),
    "",
  ].join("\n");
}

function formatPrs(items: SearchItem[]): string[] {
  if (items.length === 0) return ["- none"];
  return items.map(
    (item) => `- [#${item.number}](${item.html_url}) ${item.title}`,
  );
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    throw new Error(`${path} ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function ghSearch(query: string): Promise<SearchItem[]> {
  const items: SearchItem[] = [];
  let page = 1;
  while (page <= 5) {
    const res = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=100&page=${page}`,
      { headers },
    );
    if (!res.ok) {
      throw new Error(`search ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as { items: SearchItem[] };
    items.push(...body.items);
    if (body.items.length < 100) break;
    page += 1;
  }
  return items.sort((a, b) => b.number - a.number);
}

function ghToken(): string {
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

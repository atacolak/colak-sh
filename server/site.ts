import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Site = {
  title: string;
  host: string;
  origin: string;
  user: string;
  home: string;
  promptHost: string;
  chatTitle: string;
  openingCommand: string;
  socials: Array<{ label: string; href: string; icon: string }>;
  prompts: string[];
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const site: Site = JSON.parse(
  readFileSync(join(root, "site.json"), "utf8"),
) as Site;

export const homePrefix = `${site.home.replace(/\/+$/, "")}/`;
export const projectsDir = `${site.home.replace(/\/+$/, "")}/projects`;

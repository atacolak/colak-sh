import raw from "../site.json";

export type SocialLink = {
  label: string;
  href: string;
  icon: "twitter" | "github";
};

export type GithubContributions = {
  name: string;
  upstream: string;
  fork: string;
};

export type Site = {
  title: string;
  host: string;
  origin: string;
  user: string;
  home: string;
  promptHost: string;
  chatTitle: string;
  openingCommand: string;
  socials: SocialLink[];
  prompts: string[];
  github: {
    user: string;
    exclude: string[];
    contributions: GithubContributions[];
  };
};

export const site: Site = raw as Site;

export const homePrefix = `${site.home.replace(/\/+$/, "")}/`;
export const projectsDir = `${site.home.replace(/\/+$/, "")}/projects`;

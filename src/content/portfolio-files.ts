import { homePrefix, site } from "../site";

const contentRoot = `/content${site.home}`;

export function mapContentModules(
  modules: Record<string, string>,
): Record<string, string> {
  const prefix = new RegExp(`^${escapeRegExp(contentRoot)}`);
  return Object.fromEntries(
    Object.entries(modules).map(([path, value]) => [
      path.replace(prefix, site.home),
      value,
    ]),
  );
}

export function loadPortfolioFiles(): Record<string, string> {
  const modules = {
    ...import.meta.glob("/content/**/*.{md,txt,json}", {
      eager: true,
      query: "?raw",
      import: "default",
    }),
    ...import.meta.glob("/content/**/.*.md", {
      eager: true,
      query: "?raw",
      import: "default",
    }),
  } as Record<string, string>;

  return mapContentModules(modules);
}

export function isPortfolioPath(path: string): boolean {
  return path === site.home || path.startsWith(homePrefix);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

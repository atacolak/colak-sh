export type PortfolioImage = {
  src: string;
  alt: string;
};

const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|mailto:)/i;

export function rewriteRelativeUrls(
  markdown: string,
  blobBase: string,
  rawBase: string,
): string {
  const blob = blobBase.replace(/\/+$/, "");
  const raw = rawBase.replace(/\/+$/, "");
  return markdown
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, url) => {
      return `![${alt}](${resolve(url, raw)})`;
    })
    .replace(/<img\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>/gi, (_m, pre, url, post) => {
      return `<img${pre}src="${resolve(url, raw)}"${post}>`;
    })
    .replace(/(^|[^!])\[([^\]]*)\]\(([^)]+)\)/g, (m, prefix, text, url) => {
      if (prefix === "!") return m;
      return `${prefix}[${text}](${resolve(url, blob)})`;
    });
}

export function extractMarkdownImages(markdown: string): PortfolioImage[] {
  const seen = new Set<string>();
  const images: PortfolioImage[] = [];
  const add = (src: string, alt: string) => {
    const url = src.trim();
    if (!url || seen.has(url) || !isAllowedImageUrl(url)) return;
    seen.add(url);
    images.push({ src: url, alt: alt.trim() });
  };
  for (const match of markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
    add(match[2] ?? "", match[1] ?? "");
  }
  for (const match of markdown.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const tag = match[0];
    const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1] ?? "";
    add(match[1] ?? "", alt);
  }
  return images;
}

export function firstParagraph(markdown: string): string {
  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith("```") ||
      trimmed.startsWith("origin:") ||
      trimmed.startsWith("upstream:") ||
      trimmed.startsWith("language:") ||
      trimmed.startsWith("updated:") ||
      trimmed.startsWith("<") ||
      trimmed.startsWith("![") ||
      trimmed.startsWith("---") ||
      trimmed.startsWith("|") ||
      trimmed.startsWith(">") ||
      trimmed.startsWith("*")
    ) {
      continue;
    }
    return trimmed.replace(/\.$/, "");
  }
  return "";
}

export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    return (
      host === "github.com" ||
      host === "raw.githubusercontent.com" ||
      host === "user-images.githubusercontent.com" ||
      host === "private-user-images.githubusercontent.com" ||
      host === "camo.githubusercontent.com"
    );
  } catch {
    return false;
  }
}

function resolve(url: string, base: string): string {
  const trimmed = url.trim();
  if (!trimmed || ABSOLUTE.test(trimmed)) return trimmed;
  const path = trimmed.replace(/^\.\//, "").replace(/^\/+/, "");
  return `${base}/${path}`;
}

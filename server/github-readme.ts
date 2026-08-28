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
    .replace(
      /<img\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>/gi,
      (_m, pre, url, post) => {
        return `<img${pre}src="${resolve(url, raw)}"${post}>`;
      },
    )
    .replace(/(^|[^!])\[([^\]]*)\]\(([^)]+)\)/g, (m, prefix, text, url) => {
      if (prefix === "!") return m;
      return `${prefix}[${text}](${resolve(url, blob)})`;
    });
}

function resolve(url: string, base: string): string {
  const trimmed = url.trim();
  if (!trimmed || ABSOLUTE.test(trimmed)) return trimmed;
  const path = trimmed.replace(/^\.\//, "").replace(/^\/+/, "");
  return `${base}/${path}`;
}

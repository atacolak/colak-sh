const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|mailto:)/i;
const BEL = "\x07";

export function osc8(label: string, url: string): string {
  return `\x1b]8;;${url}${BEL}${label}\x1b]8;;${BEL}`;
}

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

export function prepareMarkdown(source: string): string {
  let text = source
    .replace(/^blurb:.*\n/gm, "")
    .replace(/^(origin|upstream):\s+(\S+)\s*$/gm, (_m, key: string, url: string) => {
      const href = url.replace(/^<|>$/g, "");
      if (/^https?:\/\//.test(href)) {
        return `${key}: [${href.replace(/^https?:\/\//, "")}](${href})`;
      }
      return `${key}: ${url}`;
    })
    .replace(/^(?:language|updated):.*\n/gm, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_m, label, url) =>
      osc8(label, url),
    )
    .replace(/^\n+/, "");
  return escapeHandleUnderscores(autolinkBareUrls(text));
}

function escapeHandleUnderscores(text: string): string {
  return text.replace(
    /^(github|x):\s+(\S+)\s*$/gm,
    (_m, key: string, name: string) => `${key}: ${name.replace(/_/g, "\\_")}`,
  );
}

export function linkifyHandles(text: string): string {
  return text
    .replace(/^(github):\s+([A-Za-z0-9-]+)\s*$/gm, (_m, key: string, name: string) =>
      `${key}: ${osc8(name, `https://github.com/${name}`)}`,
    )
    .replace(/^(x):\s+([A-Za-z0-9_]+)\s*$/gm, (_m, key: string, name: string) =>
      `${key}: ${osc8(name, `https://x.com/${name}`)}`,
    );
}

function autolinkBareUrls(text: string): string {
  return text.replace(/https?:\/\/[^\s<>()]+/g, (url, offset: number) => {
    const before = text.slice(Math.max(0, offset - 4), offset);
    if (before.endsWith("]8;;")) return url;
    const trimmed = url.replace(/[.,;:]+$/, "");
    return osc8(trimmed, trimmed);
  });
}

export function projectBlurbFromMarkdown(markdown: string): string {
  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("blurb:")) {
      return cleanBlurb(trimmed.slice("blurb:".length));
    }
  }
  return cleanBlurb(firstParagraph(markdown));
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
      trimmed.startsWith("blurb:") ||
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

export function cleanBlurb(text: string, max?: number): string {
  const cleaned = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "");
  if (max == null || cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, Math.max(1, max - 1)).replace(/\s+\S*$/, "")}…`;
}

export function wrapWidth(columns: number | string | undefined): number {
  const n = Number.parseInt(String(columns ?? 80), 10);
  if (!Number.isFinite(n)) return 80;
  return Math.max(24, Math.min(240, n));
}

export function wrapHanging(
  lead: string,
  rest: string,
  columns: number,
  leadWidth = visibleWidth(lead),
): string {
  const gap = 2;
  if (!rest) return wrapAnsi(lead, columns);
  if (leadWidth + gap + 8 > columns) {
    return wrapAnsi(`${lead}  ${rest}`, columns);
  }
  const indentWidth = leadWidth + gap;
  const body = wrapAnsi(rest, columns - indentWidth).split("\n");
  const pad = " ".repeat(gap);
  const hang = " ".repeat(indentWidth);
  return [
    `${lead}${pad}${body[0]}`,
    ...body.slice(1).map((line) => `${hang}${line}`),
  ].join("\n");
}

export function wrapAnsi(text: string, width: number): string {
  if (width < 8) return text;
  return text
    .split("\n")
    .map((line) => wrapAnsiLine(line, width))
    .join("\n");
}

function wrapAnsiLine(line: string, width: number): string {
  if (visibleWidth(line) <= width) return line;
  const rows: string[] = [];
  let row = "";
  let rowWidth = 0;
  let word = "";
  let wordWidth = 0;
  const flushWord = () => {
    if (!word) return;
    if (rowWidth > 0 && rowWidth + 1 + wordWidth > width) {
      rows.push(row);
      row = word;
      rowWidth = wordWidth;
    } else {
      if (rowWidth > 0) {
        row += " ";
        rowWidth += 1;
      }
      row += word;
      rowWidth += wordWidth;
    }
    word = "";
    wordWidth = 0;
  };
  for (const token of tokenizeAnsi(line)) {
    if (token.kind === "esc") {
      word += token.value;
      continue;
    }
    if (token.value === " ") {
      flushWord();
      continue;
    }
    if (wordWidth >= width) {
      flushWord();
    }
    word += token.value;
    wordWidth += 1;
    if (wordWidth >= width) flushWord();
  }
  flushWord();
  if (row) rows.push(row);
  return rows.join("\n");
}

function tokenizeAnsi(
  text: string,
): Array<{ kind: "esc" | "char"; value: string }> {
  const tokens: Array<{ kind: "esc" | "char"; value: string }> = [];
  const re = /\x1b(?:\]8;;[^\x07]*\x07|\[[0-9;]*m)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    for (const ch of text.slice(last, match.index)) {
      tokens.push({ kind: "char", value: ch });
    }
    tokens.push({ kind: "esc", value: match[0] });
    last = match.index + match[0].length;
  }
  for (const ch of text.slice(last)) {
    tokens.push({ kind: "char", value: ch });
  }
  return tokens;
}

function visibleWidth(text: string): number {
  return tokenizeAnsi(text).filter((token) => token.kind === "char").length;
}


function resolve(url: string, base: string): string {
  const trimmed = url.trim();
  if (!trimmed || ABSOLUTE.test(trimmed)) return trimmed;
  const path = trimmed.replace(/^\.\//, "").replace(/^\/+/, "");
  return `${base}/${path}`;
}

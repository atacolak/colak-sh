const GENERIC = [
  /^tell me more$/i,
  /^learn more$/i,
  /^what else\??$/i,
  /^continue$/i,
  /^explain further$/i,
];

export function filterSuggestions(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > 90) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    if (GENERIC.some((re) => re.test(trimmed))) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length === 3) break;
  }
  return out;
}

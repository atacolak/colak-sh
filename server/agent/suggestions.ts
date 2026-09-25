const GENERIC = [
  /^tell me more$/i,
  /^learn more$/i,
  /^what else\??$/i,
  /^continue$/i,
  /^explain further$/i,
];

const ABOUT_ATA =
  /\b(ata|him|his|he|speech-core|browser-ops|systemd-ops|voicecat|colak-sh|colak\.sh|oh-my-pi|portfolio|projects?|actor-village|talker|mardi-gras)\b/i;

export const SUGGESTION_COUNT = 3;

export const FALLBACK_SUGGESTIONS = [
  "show me actor-village",
  "show me speech-core",
  "what makes browser-ops unusual?",
];

export function filterSuggestions(items: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  if (Array.isArray(items)) {
    for (const item of items) {
      if (typeof item !== "string") continue;
      const trimmed = item.trim();
      if (!trimmed || trimmed.length > 90) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      if (GENERIC.some((re) => re.test(trimmed))) continue;
      if (!ABOUT_ATA.test(trimmed)) continue;
      seen.add(key);
      out.push(trimmed);
      if (out.length === SUGGESTION_COUNT) return out;
    }
  }
  for (const fallback of FALLBACK_SUGGESTIONS) {
    const key = fallback.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(fallback);
    if (out.length === SUGGESTION_COUNT) break;
  }
  return out;
}

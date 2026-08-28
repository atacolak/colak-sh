export const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://github.com https://raw.githubusercontent.com https://user-images.githubusercontent.com https://private-user-images.githubusercontent.com https://camo.githubusercontent.com; font-src 'self'; connect-src 'self' ws: wss:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
};

export function applySecurityHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  return { ...SECURITY_HEADERS, ...headers };
}

const UNAVAILABLE =
  "compression is unavailable in this browser shell (just-bash still statically imports node:zlib; see https://github.com/vercel-labs/just-bash/issues/81)";

export const constants = {
  Z_BEST_COMPRESSION: 9,
  Z_BEST_SPEED: 1,
  Z_DEFAULT_COMPRESSION: -1,
};

export function gunzipSync(): never {
  throw new Error(UNAVAILABLE);
}

export function gzipSync(): never {
  throw new Error(UNAVAILABLE);
}

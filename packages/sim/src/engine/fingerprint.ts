/**
 * A short, stable signature of a final `SimState` — M10's "run signature": printed on the
 * Mission Report so a classroom can check two students' runs are genuinely identical at a
 * glance, and what `validation/simVersion.test.ts`'s golden values and the play-vs-replay
 * equality tests both assert against, so neither test needs a debug-only hook into the app.
 *
 * `JSON.stringify` alone is not stable — object key order isn't guaranteed to survive a
 * refactor that reassigns a field in a different order, which would silently change every
 * fingerprint for no physical reason. `canonicalize` sorts keys recursively first.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/** FNV-1a, the same short dependency-free hash `engine/rng.ts`'s `seedStream` already uses —
 *  not for randomness here, just a stable short string from a long one. */
function fnv1a(text: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Two FNV-1a passes over disjoint strides of the canonical JSON, for a 16-hex-character
 *  signature instead of 8 — cheap insurance against collision on a long mission log, at
 *  negligible cost for a string that's at most a few hundred KB. */
export function runFingerprint(state: unknown): string {
  const json = JSON.stringify(canonicalize(state));
  const half = Math.ceil(json.length / 2);
  return fnv1a(json.slice(0, half)) + fnv1a(json.slice(half));
}

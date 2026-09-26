/**
 * Parses docs/DATA_SOURCES.md's own ☐/☑ Status column into `{ verified, verifiedBy? }` per
 * source ID. Pulled out of generate-source-verification.ts so that
 * apps/web/tests/sourceVerification.test.ts can call the exact same parser directly, rather
 * than re-implementing the regex and risking the two silently disagreeing.
 */
export interface VerificationEntry {
  readonly verified: boolean;
  readonly verifiedBy?: string;
}

// Matches any markdown table row of the two shapes docs/DATA_SOURCES.md uses (8 columns for
// "Documents", 5 for "Internal source IDs") — both end `| ... | Verified by | Status |`, so a
// non-greedy middle `.*` spans whichever column count precedes it, rather than hard-coding
// either table's shape. A header or separator row (no ☐/☑ in its last cell) never matches.
const ROW_PATTERN = /^\|\s*([A-Za-z0-9._-]+)\s*\|.*\|\s*([^|]*?)\s*\|\s*(☐|☑)\s*\|\s*$/;

export function parseSourceVerification(dataSourcesMd: string): Record<string, VerificationEntry> {
  const entries: Record<string, VerificationEntry> = {};

  for (const line of dataSourcesMd.split("\n")) {
    const m = ROW_PATTERN.exec(line);
    if (m === null) continue;
    const [, id, verifiedByRaw, glyph] = m;
    if (id === undefined || glyph === undefined) continue;
    const verifiedBy =
      verifiedByRaw === undefined || verifiedByRaw === "" || verifiedByRaw === "n/a" ? undefined : verifiedByRaw;
    entries[id] = verifiedBy === undefined ? { verified: glyph === "☑" } : { verified: glyph === "☑", verifiedBy };
  }

  return Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
}

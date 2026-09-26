/**
 * Exports docs/i18n/bn_review.csv — the M11 brief's own ask ("Export docs/i18n/bn_review.csv
 * plus an import script; a native reviewer will come later") for the five three-depth
 * template tables (logText/decisionText/onboardingText/goalText/gaugeHelp) whose Bangla side
 * was written this milestone as DRAFT, needsReview.
 *
 * One row per (module, level, key): the English original, the current Bangla text, and a
 * needsReview flag. Re-running this script is safe and expected — it's a merge, not an
 * overwrite: a row whose key still exists keeps whatever needsReview a reviewer already set
 * (TRUE stays TRUE, FALSE stays FALSE) rather than resetting every row to TRUE on every run.
 * Only a genuinely new key (added by a later milestone's own content) starts TRUE. The
 * `english`/`bangla` columns always come from the current en/bn JSON files, not the old CSV —
 * once `scripts/bn-review-import.ts` has written a reviewer's correction into the Bangla JSON,
 * the *next* export reflects it, and the CSV is never the place corrected text lives except in
 * transit.
 *
 * Usage:
 *   node scripts/bn-review-export.ts
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { toCsvRow, parseCsv } from "./csv.ts";

const MODULES = ["logText", "decisionText", "onboardingText", "goalText", "gaugeHelp"] as const;
const LEVELS = ["cadet", "specialist", "commander"] as const;
type Level = (typeof LEVELS)[number];

const I18N_DIR = fileURLToPath(new URL("../apps/web/src/i18n/", import.meta.url));
const CSV_PATH = fileURLToPath(new URL("../docs/i18n/bn_review.csv", import.meta.url));

const HEADER = ["module", "level", "key", "english", "bangla", "needsReview"] as const;

async function readJson(path: string): Promise<Record<Level, Record<string, string>>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<Level, Record<string, string>>;
}

async function main(): Promise<void> {
  // Prior needsReview flags, keyed "module\u0000level\u0000key" — carried forward so a
  // reviewer's FALSE (checked) or edited TRUE (flagged again) survives a re-export.
  const priorNeedsReview = new Map<string, string>();
  try {
    const existing = parseCsv(await readFile(CSV_PATH, "utf8"));
    for (const row of existing.slice(1)) {
      const [mod, level, key, , , needsReview] = row;
      if (mod === undefined || level === undefined || key === undefined || needsReview === undefined) continue;
      priorNeedsReview.set(`${mod}\u0000${level}\u0000${key}`, needsReview);
    }
  } catch {
    // No prior CSV — first export, everything starts TRUE.
  }

  const rows: string[][] = [[...HEADER]];

  for (const mod of MODULES) {
    const en = await readJson(`${I18N_DIR}en/${mod}.json`);
    const bn = await readJson(`${I18N_DIR}bn/${mod}.json`);

    for (const level of LEVELS) {
      const enTable = en[level];
      const bnTable = bn[level];
      for (const key of Object.keys(enTable).sort()) {
        const mapKey = `${mod}\u0000${level}\u0000${key}`;
        const needsReview = priorNeedsReview.get(mapKey) ?? "TRUE";
        rows.push([mod, level, key, enTable[key] ?? "", bnTable[key] ?? "", needsReview]);
      }
    }
  }

  await mkdir(fileURLToPath(new URL("../docs/i18n/", import.meta.url)), { recursive: true });
  const csv = rows.map((r) => toCsvRow(r)).join("");
  await writeFile(CSV_PATH, csv, "utf8");
  console.log(`Wrote ${CSV_PATH} (${rows.length - 1} rows)`);
}

await main();

/**
 * Imports docs/i18n/bn_review.csv back into apps/web/src/i18n/bn/*.json — the other half of
 * scripts/bn-review-export.ts's round trip.
 *
 * Only rows a reviewer has actually marked checked are applied: `needsReview` must read
 * exactly "FALSE" (case-insensitive) for that row's `bangla` cell to be written back. A row
 * still "TRUE" is left alone — the app keeps showing the M11 DRAFT text already in the JSON
 * until someone explicitly signs off on it, so a reviewer can safely leave 90% of the sheet
 * untouched and this script will not silently apply anything they never looked at.
 *
 * Usage:
 *   node scripts/bn-review-import.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./csv.ts";

const I18N_DIR = fileURLToPath(new URL("../apps/web/src/i18n/", import.meta.url));
const CSV_PATH = fileURLToPath(new URL("../docs/i18n/bn_review.csv", import.meta.url));

async function main(): Promise<void> {
  const rows = parseCsv(await readFile(CSV_PATH, "utf8"));
  const [header, ...body] = rows;
  if (header === undefined) {
    console.log("Empty CSV — nothing to import.");
    return;
  }

  const byModule = new Map<string, Record<string, Record<string, string>>>();
  let applied = 0;
  let skipped = 0;

  for (const row of body) {
    const [mod, level, key, , bangla, needsReview] = row;
    if (mod === undefined || level === undefined || key === undefined || bangla === undefined) continue;
    if ((needsReview ?? "TRUE").trim().toUpperCase() !== "FALSE") {
      skipped += 1;
      continue;
    }

    if (!byModule.has(mod)) {
      const path = `${I18N_DIR}bn/${mod}.json`;
      byModule.set(mod, JSON.parse(await readFile(path, "utf8")) as Record<string, Record<string, string>>);
    }
    const table = byModule.get(mod);
    const levelTable = table?.[level];
    if (levelTable === undefined || !(key in levelTable)) {
      console.warn(`Skipping unknown row: ${mod}/${level}/${key} (no matching key in bn/${mod}.json)`);
      continue;
    }
    if (levelTable[key] !== bangla) {
      levelTable[key] = bangla;
      applied += 1;
    }
  }

  for (const [mod, table] of byModule) {
    const path = `${I18N_DIR}bn/${mod}.json`;
    await writeFile(path, `${JSON.stringify(table, null, 2)}\n`, "utf8");
  }

  console.log(`Applied ${applied} reviewed correction(s) across ${byModule.size} file(s); ${skipped} row(s) still needsReview=TRUE, left unchanged.`);
  console.log("Re-run `node scripts/bn-review-export.ts` afterward to refresh the CSV's own english/bangla columns from the updated JSON.");
}

await main();

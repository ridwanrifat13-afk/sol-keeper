/**
 * Regenerates apps/web/src/data/sourceVerification.generated.json from docs/DATA_SOURCES.md's
 * own ☐/☑ Status column — the same file `packages/sim/src/validation/constants.test.ts`
 * already cross-checks every `SourceId` against.
 *
 * CLAUDE.md is explicit that only the lead developer may mark a row ☑, after checking the
 * page/table in the source document — this script never sets or changes that mark, it only
 * mirrors whatever is already written in docs/DATA_SOURCES.md into a form the Data Sources
 * screen (a browser bundle, with no filesystem access to docs/) can actually render. Re-run
 * this after editing docs/DATA_SOURCES.md's Status column; the committed JSON is generated
 * output, never hand-edited, the same discipline docs/BALANCE.md uses in the other direction
 * (code -> doc, not doc -> code, but "regenerate, don't hand-edit" either way).
 * apps/web/tests/sourceVerification.test.ts fails CI if this drifts from a fresh parse.
 *
 * Usage:
 *   node scripts/generate-source-verification.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseSourceVerification } from "./parseSourceVerification.ts";

const DATA_SOURCES_MD = fileURLToPath(new URL("../docs/DATA_SOURCES.md", import.meta.url));
const OUT_PATH = fileURLToPath(new URL("../apps/web/src/data/sourceVerification.generated.json", import.meta.url));

async function main(): Promise<void> {
  const text = await readFile(DATA_SOURCES_MD, "utf8");
  const entries = parseSourceVerification(text);
  const json = `${JSON.stringify(entries, null, 2)}\n`;
  await writeFile(OUT_PATH, json, "utf8");
  console.log(`Wrote ${OUT_PATH} (${Object.keys(entries).length} sources)`);
}

await main();

/**
 * M11: keeps apps/web/src/data/sourceVerification.generated.json honest against two things it
 * could silently drift from:
 *   - docs/DATA_SOURCES.md itself (someone edits the Status column and forgets to re-run
 *     scripts/generate-source-verification.ts);
 *   - @sol-keeper/sim's own SOURCE_IDS (a new source is added to the sim but never gets a row).
 *
 * Never asserts that any particular source *should* be verified — CLAUDE.md is explicit that
 * only the lead developer marks a row ☑, after checking the source document. This only checks
 * the mirror is faithful, not the mark itself.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SOURCE_IDS } from "@sol-keeper/sim";
import { parseSourceVerification } from "../../../scripts/parseSourceVerification.js";
import generatedJson from "../src/data/sourceVerification.generated.json" with { type: "json" };

const DATA_SOURCES_MD = fileURLToPath(new URL("../../../docs/DATA_SOURCES.md", import.meta.url));

describe("M11: Data Sources verification-status mirror", () => {
  it("the committed generated JSON matches a fresh parse of docs/DATA_SOURCES.md", () => {
    const text = readFileSync(DATA_SOURCES_MD, "utf8");
    const fresh = parseSourceVerification(text);
    expect(generatedJson, "stale — re-run `node scripts/generate-source-verification.ts`").toEqual(fresh);
  });

  it("every SourceId the simulation actually uses has an entry", () => {
    const missing = SOURCE_IDS.filter((id) => !(id in generatedJson));
    expect(missing).toEqual([]);
  });
});

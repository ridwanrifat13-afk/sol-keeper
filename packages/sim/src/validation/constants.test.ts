/**
 * Enforces brief rule 1 mechanically.
 *
 * Three guarantees:
 *   1. every constant names a source that exists in the SourceId union;
 *   2. every SourceId has a row in docs/DATA_SOURCES.md, so the registry and the code cannot
 *      drift apart (and if someone overwrites that file, this test says so loudly);
 *   3. every placeholder is enumerated here, so the milestone summary can list them and
 *      nobody has to trust a grep.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CONSTANTS } from "../data/constants.js";
import { SOURCE_IDS, walkConstants } from "../data/sources.js";

const DATA_SOURCES_MD = fileURLToPath(new URL("../../../../docs/DATA_SOURCES.md", import.meta.url));

const all = walkConstants(CONSTANTS);

describe("constants registry (brief rule 1)", () => {
  it("finds every constant in the tree", () => {
    expect(all.length).toBeGreaterThan(80);
  });

  it("every constant names a known source", () => {
    const known = new Set<string>(SOURCE_IDS);
    const orphans = all.filter((x) => !known.has(x.constant.source));
    expect(orphans.map((o) => `${o.path} -> ${o.constant.source}`)).toEqual([]);
  });

  it("every constant carries a unit and a confidence", () => {
    const missing = all.filter(
      (x) => x.constant.unit.trim() === "" || x.constant.confidence === undefined,
    );
    expect(missing.map((m) => m.path)).toEqual([]);
  });

  it("numeric constants sit inside their own stated min/max", () => {
    const outOfRange = all.filter((x) => {
      const { value, min, max } = x.constant;
      if (typeof value !== "number") return false;
      if (typeof min === "number" && value < min) return true;
      if (typeof max === "number" && value > max) return true;
      return false;
    });
    expect(outOfRange.map((o) => o.path)).toEqual([]);
  });

  it("every SourceId has a row in docs/DATA_SOURCES.md", () => {
    const registry = readFileSync(DATA_SOURCES_MD, "utf8");
    // Tolerant of column padding: the table may be hand-aligned or reformatted.
    const missing = SOURCE_IDS.filter(
      (id) => !new RegExp(`^\\|\\s*${id}\\s*\\|`, "m").test(registry),
    );
    expect(missing, `Missing rows in docs/DATA_SOURCES.md for: ${missing.join(", ")}`).toEqual([]);
  });

  it("placeholders are declared, not hidden", () => {
    const placeholders = all
      .filter((x) => x.constant.confidence === "placeholder")
      .map((x) => x.path)
      .sort();

    // Update this list deliberately when a placeholder is sourced or a new one is added.
    // As of the 2026-09 sourcing passes there are none left: the original six were cleared
    // in stages, the habitat oxygen set point last (derived from OCHMO-TB-003's stated
    // sea-level composition), and the unused fire-risk ppO2 constant was deleted outright
    // rather than sourced — see the note in data/constants.ts and the Data Sources screen
    // for why a fixed partial-pressure flammability threshold is the wrong quantity.
    //
    // An empty list is a claim worth defending, not a formality: if a future constant
    // lands as "placeholder" without being declared here, this test fails loudly.
    expect(placeholders).toEqual([]);
  });

  it("every placeholder carries a TODO explaining what is missing", () => {
    const untoldPlaceholders = all
      .filter((x) => x.constant.confidence === "placeholder")
      .filter((x) => !(x.constant.note ?? "").includes("TODO"))
      .map((x) => x.path);
    expect(untoldPlaceholders).toEqual([]);
  });

  it("tuned values are attributed to game design, not to NASA", () => {
    const misattributed = all
      .filter((x) => x.constant.confidence === "tuned")
      .filter((x) => x.constant.source !== "GAME-DESIGN")
      .map((x) => `${x.path} -> ${x.constant.source}`);
    expect(misattributed).toEqual([]);
  });
});

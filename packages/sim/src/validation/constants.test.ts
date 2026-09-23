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
    // The 2026-09 sourcing passes cleared every Phase 1 placeholder (see git history for
    // that empty list). M7 (Phase 2) reopened ten: the CO2 IDLH threshold, the acute
    // radiation syndrome thresholds, and one magnitude number per not-yet-sourced incident.
    // M7.5's addendum (docs/INCIDENT_MAGNITUDES.md) then closed three of those (depress-mir97,
    // o2tank-apollo13, coolant-ms22) with published/derived values, leaving seven. Each
    // remaining placeholder carries a TODO note naming exactly what the team needs to
    // supply; see docs/DATA_SOURCES.md for the matching "unverified" rows.
    expect(placeholders).toEqual([
      "incidents.duststorm2018ObscurationSpikeFraction",
      "incidents.scrubberIssFailureRateMultiplier",
      "incidents.spe1972DoseMultiplier",
      "physiology.co2ImmediatelyDangerousMmHg",
      "radiation.arsLethalMSv",
      "radiation.arsOnsetMSv",
      "radiation.arsSevereMSv",
    ]);
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

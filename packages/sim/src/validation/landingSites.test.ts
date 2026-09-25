/**
 * M9's landing-site catalog, checked the same way validation/constants.test.ts checks brief
 * rule 1 for the main constants tree — `LANDING_SITES` lives in its own file (data/
 * landingSites.ts), not inside `CONSTANTS`, so it needs its own pass through the same generic
 * `walkConstants` helper rather than being covered automatically.
 */
import { describe, expect, it } from "vitest";
import { LANDING_SITES, getLandingSite, landingSitesForBody } from "../data/landingSites.js";
import { SOURCE_IDS, walkConstants } from "../data/sources.js";
import type { LandingSiteId } from "../types.js";

const all = walkConstants(LANDING_SITES);

describe("landing site catalog (brief rule 1)", () => {
  it("covers all 6 sites from docs/LANDING_SITES.md", () => {
    const ids = Object.keys(LANDING_SITES).sort();
    expect(ids).toEqual([
      "MARS-ARCADIA",
      "MARS-GALE",
      "MARS-JEZERO",
      "MOON-CONNECTING-RIDGE",
      "MOON-EQUATORIAL",
      "MOON-MALAPERT",
    ]);
  });

  it("every numeric field names a known source", () => {
    const known = new Set<string>(SOURCE_IDS);
    const orphans = all.filter((x) => !known.has(x.constant.source));
    expect(orphans.map((o) => `${o.path} -> ${o.constant.source}`)).toEqual([]);
  });

  it("every numeric field carries a unit and a confidence", () => {
    const missing = all.filter(
      (x) => x.constant.unit.trim() === "" || x.constant.confidence === undefined,
    );
    expect(missing.map((m) => m.path)).toEqual([]);
  });

  it("every placeholder carries a TODO explaining what is missing", () => {
    const untoldPlaceholders = all
      .filter((x) => x.constant.confidence === "placeholder")
      .filter((x) => !(x.constant.note ?? "").includes("TODO"))
      .map((x) => x.path);
    expect(untoldPlaceholders).toEqual([]);
  });

  // Deliberately not asserting an exact placeholder count/list the way constants.test.ts
  // does for the main tree: this catalog is expected to gain real sources over time as the
  // team works through docs/LANDING_SITES.md's own "For the team" list, and a brittle exact
  // list here would just get out of sync. The count is reported instead, for the milestone
  // summary to read off directly.
  it("reports how many fields are still placeholder (informational)", () => {
    const placeholders = all.filter((x) => x.constant.confidence === "placeholder");
    console.log(`landingSites placeholders: ${placeholders.length} of ${all.length} fields`);
    expect(placeholders.length).toBeGreaterThan(0); // fails loudly the day this becomes stale
  });

  it("every site's body-appropriate dustExposure is honest (0 on every Moon site)", () => {
    for (const site of Object.values(LANDING_SITES)) {
      if (site.body === "moon") {
        expect(site.dustExposure.value, site.id).toBe(0);
      }
    }
  });

  it("getLandingSite throws on an unknown id rather than returning undefined", () => {
    expect(() => getLandingSite("NOT-A-SITE" as LandingSiteId)).toThrow(/Unknown landing site/);
  });

  it("landingSitesForBody only returns sites of that body, and covers every site", () => {
    const marsSites = landingSitesForBody("mars");
    const moonSites = landingSitesForBody("moon");
    expect(marsSites.every((s) => s.body === "mars")).toBe(true);
    expect(moonSites.every((s) => s.body === "moon")).toBe(true);
    expect(marsSites.length + moonSites.length).toBe(Object.keys(LANDING_SITES).length);
  });
});

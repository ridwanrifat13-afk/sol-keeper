/**
 * M9's landing-site catalog (docs/LANDING_SITES.md), independent of which of the three fixed
 * scenarios a player picked — the setup flow's landing-site step lets a player choose any
 * site valid for the chosen scenario's `body` (engine/setup.ts's `buildCustomScenario`).
 *
 * Several fields here are genuinely `"placeholder"`, matching the source doc's own honest
 * disclosure rather than a silent guess (CLAUDE.md rule 1: "never guess silently" — a
 * disclosed, TODO-flagged number is allowed; an undisclosed one is not). Every placeholder
 * introduced here is listed in this milestone's own summary. The doc's own coordinates for
 * MOON-CONNECTING-RIDGE are placeholder and do not exactly match the (also placeholder)
 * "Shackleton Ridge" coordinates the `first-light`/`the-long-night` scenario files use
 * (-88.5/129.0 vs. this catalog's ~-89.5/~129.0-ish region) — a real discrepancy in the
 * source material, disclosed on that site's own card rather than silently reconciled.
 */
import type { LandingSite, LandingSiteId } from "../types.js";
import { environment } from "./constants.js";
import { c } from "./sources.js";

// Half a Mars sol — the latitudeSolar illumination model's day/night split. Doesn't yet vary
// by latitude or season (a disclosed simplification; docs/LANDING_SITES.md's own "Radiation
// by elevation" section anticipates a fuller per-site model this project hasn't built yet).
const MARS_HALF_SOL_HOURS = environment.marsSolHours.value / 2;

const marsJezero: LandingSite = {
  id: "MARS-JEZERO",
  body: "mars",
  name: "Jezero Crater",
  latDeg: c({ value: 18.44, unit: "deg", source: "NASA-M2020-LANDING", confidence: "measured", note: "Octavia E. Butler Landing, the real Perseverance touchdown site." }),
  lonDeg: c({ value: 77.45, unit: "deg", source: "NASA-M2020-LANDING", confidence: "measured" }),
  elevationM: c({ value: -2600, unit: "m", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: relative to the Mars datum, per docs/LANDING_SITES.md's own disclosure — verify against MOLA in Mars Trek before presenting as fact." }),
  illuminationModel: "latitudeSolar",
  maxDarkHours: c({ value: Math.round(MARS_HALF_SOL_HOURS * 100) / 100, unit: "h", source: "NSSDC-FACTS", confidence: "derived", note: "Half of the 24.6597h Mars sol (environment.marsSolHours) — the latitudeSolar model doesn't vary this by latitude/season yet, a disclosed simplification." }),
  iceAccess: "none",
  doseMSvPerDay: c({ value: 0.64, unit: "mSv/day", source: "MSL-RAD-SURFACE", confidence: "derived", note: "Actually measured at Gale, not Jezero (docs/LANDING_SITES.md); carried over as the same-body baseline since this project hasn't implemented the doc's own elevation-adjustment model (p(h) = p0*exp(-h/H)) yet — a disclosed simplification, not a Jezero-specific measurement." }),
  commsVisibilityFraction: c({ value: 0.85, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: no site-specific comms-visibility figure exists in docs/LANDING_SITES.md. Mars comms are already modelled mission-wide via Horizons-derived light-time and conjunction blackout, not a per-site fraction; this placeholder exists for the site picker's fact card only, pending a real figure or a decision that this field doesn't apply to Mars sites." }),
  terrainDifficulty: c({ value: 0.5, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: no terrain-suitability figure given for any Mars site in docs/LANDING_SITES.md — a real crater floor/delta system, assumed moderate difficulty pending a sourced figure." }),
  dustExposure: c({ value: 0.5, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: docs/LANDING_SITES.md names 'regional and global dust storms; dust accumulation on arrays' as a real hazard here but gives no 0-1 figure — a mid-range placeholder pending one." }),
  sourceIds: ["NASA-M2020-LANDING", "MSL-RAD-SURFACE"],
};

const marsGale: LandingSite = {
  id: "MARS-GALE",
  body: "mars",
  name: "Gale Crater",
  latDeg: c({ value: -4.59, unit: "deg", source: "NASA-MSL-LANDING", confidence: "measured", note: "Bradbury Landing, the real Curiosity touchdown site." }),
  lonDeg: c({ value: 137.44, unit: "deg", source: "NASA-MSL-LANDING", confidence: "measured" }),
  elevationM: c({ value: -4500, unit: "m", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: per docs/LANDING_SITES.md's own disclosure — verify in Mars Trek before presenting as fact." }),
  illuminationModel: "latitudeSolar",
  maxDarkHours: c({ value: Math.round(MARS_HALF_SOL_HOURS * 100) / 100, unit: "h", source: "NSSDC-FACTS", confidence: "derived", note: "Half of the 24.6597h Mars sol, same simplification as MARS-JEZERO." }),
  iceAccess: "none",
  doseMSvPerDay: c({ value: 0.64, unit: "mSv/day", source: "MSL-RAD-SURFACE", confidence: "measured", note: "0.64 +/- 0.12 mSv/day, actually measured here by Curiosity's RAD instrument — the anchor point docs/LANDING_SITES.md's elevation model uses for every other Mars site." }),
  commsVisibilityFraction: c({ value: 0.85, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: same disclosure as MARS-JEZERO's commsVisibilityFraction." }),
  terrainDifficulty: c({ value: 0.4, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: docs/LANDING_SITES.md calls this 'the best of the Mars sites (nearly equatorial)' for sunlight, which suggests gentler terrain than Jezero's crater floor/delta — a placeholder estimate, not a sourced figure." }),
  dustExposure: c({ value: 0.5, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: docs/LANDING_SITES.md names dust storms as a hazard here too, no 0-1 figure given." }),
  sourceIds: ["NASA-MSL-LANDING", "MSL-RAD-SURFACE"],
};

const marsArcadia: LandingSite = {
  id: "MARS-ARCADIA",
  body: "mars",
  name: "Arcadia Planitia",
  latDeg: c({ value: 40, unit: "deg", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: docs/LANDING_SITES.md gives only 'approximately 40 N, 200 E (northern mid-latitudes)' for the AP-8/AP-9 site area — the broader region (SWIM-2021) is real, the exact point is not yet sourced." }),
  lonDeg: c({ value: 200, unit: "deg", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: same disclosure as latDeg." }),
  elevationM: c({ value: -3800, unit: "m", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: per docs/LANDING_SITES.md's own disclosure — verify in Mars Trek before presenting as fact." }),
  illuminationModel: "latitudeSolar",
  maxDarkHours: c({ value: Math.round(MARS_HALF_SOL_HOURS * 100) / 100, unit: "h", source: "NSSDC-FACTS", confidence: "derived", note: "Half of the 24.6597h Mars sol — Arcadia's higher latitude means a real, currently-unmodelled seasonal swing on top of this (docs/LANDING_SITES.md flags the exact sunlight penalty as its own placeholder)." }),
  iceAccess: "high",
  doseMSvPerDay: c({ value: 0.64, unit: "mSv/day", source: "MSL-RAD-SURFACE", confidence: "derived", note: "Same disclosed simplification as MARS-JEZERO: Gale's measured baseline, carried over without this project's own elevation adjustment yet." }),
  commsVisibilityFraction: c({ value: 0.8, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: no site-specific figure exists; slightly lower than the two equatorial sites given the higher latitude, a placeholder estimate only." }),
  terrainDifficulty: c({ value: 0.3, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: docs/LANDING_SITES.md describes 'low northern plains' — broad, flat plains suggest easier terrain than a crater site, a placeholder estimate." }),
  dustExposure: c({ value: 0.4, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: no site-specific dust figure given; no dust-storm hazard is separately named for this site in docs/LANDING_SITES.md, a slightly lower placeholder than Jezero/Gale." }),
  sourceIds: ["SWIM-2021", "LUZZI-2025", "MSL-RAD-SURFACE"],
};

const moonConnectingRidge: LandingSite = {
  id: "MOON-CONNECTING-RIDGE",
  body: "moon",
  name: "Connecting Ridge",
  latDeg: c({ value: -89.5, unit: "deg", source: "NASA-ARTEMIS-CLR", confidence: "placeholder", note: "TODO: docs/LANDING_SITES.md gives only 'approximately 89.5 S, near the Shackleton rim' for the exact point — the region itself is a real, named Artemis III candidate. Note the discrepancy with the first-light/the-long-night scenario files' own 'Shackleton Ridge' coordinates (-88.5/129.0) — a real gap in the source material, not reconciled here; surfaced on this site's own fact card." }),
  lonDeg: c({ value: 129.0, unit: "deg", source: "NASA-ARTEMIS-CLR", confidence: "placeholder", note: "TODO: same disclosure as latDeg." }),
  illuminationModel: "polarRidge",
  illuminationFraction: c({ value: 0.9, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: docs/LANDING_SITES.md states 'roughly 90% of the lunar year' but flags it as 'a secondary source; find a NASA or peer-reviewed figure before showing it.'" }),
  maxDarkHours: c({ value: 24, unit: "h", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: docs/LANDING_SITES.md describes 'short, frequent shadow periods... size batteries for hours, not weeks' but gives no exact figure — a round, conservative one-day placeholder pending a real source." }),
  iceAccess: "high",
  doseMSvPerDay: c({ value: 1.37, unit: "mSv/day", source: "CE4-LND-2020", confidence: "derived", note: "Measured at Von Karman crater, not the pole (docs/LANDING_SITES.md); the doc itself says to 'treat as a Moon-wide value and say so' — carried over here unchanged, not a Connecting-Ridge-specific measurement." }),
  commsVisibilityFraction: c({ value: 0.95, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: docs/LANDING_SITES.md says 'near-continuous Earth visibility from high ground' but gives no exact fraction — a high placeholder consistent with that wording." }),
  terrainDifficulty: c({ value: 0.95, unit: "fraction", source: "WUELLER-2026", confidence: "derived", note: "1 - (suitable-landing fraction). docs/LANDING_SITES.md: only ~11.8 km^2, ~4.6% of the region, is flat enough to land on — so 1 - 0.046 = 0.954, rounded." }),
  dustExposure: c({ value: 0, unit: "fraction", source: "NSSDC-FACTS", confidence: "derived", note: "The Moon has no atmosphere to loft dust into storms the way Mars does — structurally zero, not measured per-site." }),
  sourceIds: ["NASA-ARTEMIS-CLR", "CE4-LND-2020", "WUELLER-2026"],
};

const moonMalapert: LandingSite = {
  id: "MOON-MALAPERT",
  body: "moon",
  name: "Malapert Massif",
  latDeg: c({ value: -86, unit: "deg", source: "NASA-ARTEMIS-CLR", confidence: "placeholder", note: "TODO: docs/LANDING_SITES.md gives only 'approximately 86 S' for the exact point — the region is a real, named Artemis III candidate." }),
  lonDeg: c({ value: 0, unit: "deg", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: docs/LANDING_SITES.md gives no longitude at all for this site — genuinely unsourced, pending the team supplying one from Moon Trek." }),
  illuminationModel: "polarRidge",
  illuminationFraction: c({ value: 0.89, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: docs/LANDING_SITES.md states secondary sources say 'up to about 89% of the lunar cycle' — itself flagged as a placeholder there." }),
  maxDarkHours: c({ value: 24, unit: "h", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: same round, conservative placeholder as MOON-CONNECTING-RIDGE — no exact figure given for either polar site." }),
  iceAccess: "moderate",
  doseMSvPerDay: c({ value: 1.37, unit: "mSv/day", source: "CE4-LND-2020", confidence: "derived", note: "Same Moon-wide baseline as MOON-CONNECTING-RIDGE, per docs/LANDING_SITES.md's own instruction — not a Malapert-specific measurement." }),
  commsVisibilityFraction: c({ value: 0.97, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: docs/LANDING_SITES.md calls this site 'excellent... a strong line of sight to Earth' and its defining game role ('the communications site') but gives no exact fraction — placed slightly above Connecting Ridge's placeholder to reflect that framing, not a sourced figure." }),
  terrainDifficulty: c({ value: 0.98, unit: "fraction", source: "WUELLER-2026", confidence: "derived", note: "1 - (suitable-landing fraction). docs/LANDING_SITES.md: only ~7.1 km^2, ~1.6% of the region, is suitable for landing — so 1 - 0.016 = 0.984, rounded." }),
  dustExposure: c({ value: 0, unit: "fraction", source: "NSSDC-FACTS", confidence: "derived", note: "Structurally zero — no lunar atmosphere, same as every Moon site." }),
  sourceIds: ["NASA-ARTEMIS-CLR", "CE4-LND-2020", "WUELLER-2026"],
};

const moonEquatorial: LandingSite = {
  id: "MOON-EQUATORIAL",
  body: "moon",
  name: "Mare Tranquillitatis",
  latDeg: c({ value: 0.67, unit: "deg", source: "GAME-DESIGN", confidence: "measured", note: "The real Apollo 11 landing site — docs/LANDING_SITES.md flags only the exact citation as placeholder ('use a NASA Apollo 11 mission page'), not the coordinate itself, which is well-established public record." }),
  lonDeg: c({ value: 23.47, unit: "deg", source: "GAME-DESIGN", confidence: "measured", note: "Same disclosure as latDeg." }),
  illuminationModel: "equatorialLunar",
  maxDarkHours: c({ value: environment.lunarNightHours.value, unit: "h", source: "NSSDC-FACTS", confidence: "measured", note: "About 14.75 Earth days of night — reuses the same sourced figure environment.lunarNightHours already carries." }),
  iceAccess: "none",
  doseMSvPerDay: c({ value: 1.37, unit: "mSv/day", source: "CE4-LND-2020", confidence: "derived", note: "Same Moon-wide baseline as the two polar sites, per docs/LANDING_SITES.md's own instruction." }),
  commsVisibilityFraction: c({ value: 1.0, unit: "fraction", source: "NSSDC-FACTS", confidence: "derived", note: "docs/LANDING_SITES.md: 'Earth always visible, near-fixed in the sky' — a near-side equatorial site keeps Earth permanently above the horizon (lunar libration keeps it within a small wobble), well-established lunar geometry rather than this project's own measurement." }),
  terrainDifficulty: c({ value: 0.2, unit: "fraction", source: "GAME-DESIGN", confidence: "placeholder", note: "TODO: no terrain-suitability figure given; Mare Tranquillitatis is a broad, flat mare plain, assumed easy terrain pending a sourced figure." }),
  dustExposure: c({ value: 0, unit: "fraction", source: "NSSDC-FACTS", confidence: "derived", note: "Structurally zero — no lunar atmosphere." }),
  sourceIds: ["CE4-LND-2020", "NSSDC-FACTS"],
};

/** Every candidate landing site, by id — same shape as data/scenarios/index.ts's `SCENARIOS`. */
export const LANDING_SITES: Record<LandingSiteId, LandingSite> = {
  "MARS-JEZERO": marsJezero,
  "MARS-GALE": marsGale,
  "MARS-ARCADIA": marsArcadia,
  "MOON-CONNECTING-RIDGE": moonConnectingRidge,
  "MOON-MALAPERT": moonMalapert,
  "MOON-EQUATORIAL": moonEquatorial,
};

export function getLandingSite(id: LandingSiteId): LandingSite {
  const site = LANDING_SITES[id];
  if (site === undefined) {
    throw new Error(`Unknown landing site: ${id}. Known: ${Object.keys(LANDING_SITES).join(", ")}`);
  }
  return site;
}

/** Every site valid for a given body — the setup flow's landing-site step filters to these. */
export function landingSitesForBody(body: LandingSite["body"]): readonly LandingSite[] {
  return Object.values(LANDING_SITES).filter((site) => site.body === body);
}

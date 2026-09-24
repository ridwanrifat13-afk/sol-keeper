/**
 * Source registry for every number in the simulation (brief rule 1).
 *
 * `SourceId` mirrors the ID column of docs/DATA_SOURCES.md. It is a closed union on
 * purpose: a constant cannot be added without naming a source that exists, so a typo or an
 * invented citation fails `tsc` rather than shipping. When a new document is needed, add a
 * row to docs/DATA_SOURCES.md first, then add its ID here.
 */
export const SOURCE_IDS = [
  "BVAD-2022",
  "OCHMO-RAD",
  "OCHMO-TB047",
  "OCHMO-TB003",
  "ICES-2017",
  // Margins and contingency. Three specific documents, replacing the earlier vague
  // "NTRS-MARGINS" entry: Ames for margin by review milestone, GSFC for the
  // basic-plus-growth rule, THEMIS for contingency by maturity and historical growth.
  "NASA-AMES-STD8070",
  "GSFC-STD-1000H",
  "THEMIS-MARGINS",
  "NASA-WATER-2023",
  "MIT-MOXIE-2023",
  "FRONTIERS-2024",
  // The two MSL RAD numbers come from two different papers, so they are cited separately
  // rather than under one "MSL-RAD" label.
  "MSL-RAD-SURFACE",
  "MSL-RAD-CRUISE",
  "MSL-RAD-SUMMARY",
  "CE4-LND-2020",
  "NASA-FSP",
  "NASA-FSP-IAC2024",
  "NSSDC-FACTS",
  "STOICHIOMETRY",
  "GAME-DESIGN",
  // Per-system ESM hardware terms (mass, cooling, crew-time), supplied 2026-09 by the
  // research team to complete the partial ESM readout shipped in M4.
  "MIYAJIMA-LSS",
  "MIT-16851-WRS",
  "MOXIE-MASS-NASA",
  "SPACECRAFT-SUBSYS-NTRS",
  // Replaces the earlier "MARS-POWER-ASTRA" entry, which named a document nobody could
  // find and a figure (800 kg) that no located source stated. Rucker's study gives real
  // per-kilometre cable masses and a stated crew separation distance, so the power
  // distribution mass is now derived from quoted numbers rather than asserted.
  "RUCKER-2015-SURFACE-POWER",
  // Phase 2 (M7): physiology lethality thresholds and their anchors, from
  // docs/INCIDENTS_AND_THRESHOLDS.md, which already did the primary-source legwork.
  "NASA-SPACEBIO-1975",
  "NASA-NUTRITION-2015",
  "NASA-HYPOTHERMIA-2008",
  "NASA-ORION-FS",
  "NASA-SP-4030",
  // Named by docs/INCIDENTS_AND_THRESHOLDS.md but not yet a document this project has
  // opened and read (unlike OCHMO-TB003/TB047, which were): kept distinct from those so a
  // constant citing one is honest about not being independently verified yet.
  "OCHMO-TB004",
  "HRP-ARS",
  // M7.5: docs/INCIDENT_MAGNITUDES.md closed the three incident-magnitude placeholders above
  // with published/derived values. NASA-SMA-MIR-COLLISION and NASA-SHUTTLE-MIR are primary
  // NASA material; A13-CO2 and MS22-THERMAL are secondhand (crew debrief / news-agency
  // reporting of Roscosmos statements) rather than a primary document, disclosed via each
  // constant's own note rather than a separate confidence tier. NSF-MS22 is NASASpaceflight
  // reporting on the post-incident crewed thermal-abort criteria.
  "NASA-SMA-MIR-COLLISION",
  "NASA-SHUTTLE-MIR",
  "A13-CO2",
  "MS22-THERMAL",
  "NSF-MS22",
  // M7.6 Part D: docs/DECISION_AUDIT.md-adjacent residual costs for the last four incidents.
  // The three "-PENDING" placeholders that used to stand here (INC-SPE-1972-PENDING,
  // INC-SCRUBBER-ISS-PENDING, INC-DUSTSTORM2018-PENDING) are gone — each incident now cites
  // a real document below instead. NASA-MIR-FIRE-25YR is primary NASA material;
  // MIR-FIRE-LINENGER is a firsthand crew account (secondhand relative to a primary NASA
  // document, same "measured-reported" tier as A13-CO2/MS22-THERMAL above); AGU-KNIPP-2018
  // is a peer-reviewed primary source; ICES-2019-CDRA and JPL-DUSTSTORM2018-TAU are primary
  // NASA/NTRS/JPL material cited for a qualitative mechanism or a real-world severity
  // comparison rather than a directly game-scale-convertible number (each constant's own
  // note discloses exactly which); LORENZ-2020-INSIGHT-DUST is peer-reviewed.
  "NASA-MIR-FIRE-25YR",
  "MIR-FIRE-LINENGER",
  "AGU-KNIPP-2018",
  "ICES-2019-CDRA",
  "JPL-DUSTSTORM2018-TAU",
  "LORENZ-2020-INSIGHT-DUST",
] as const;

export type SourceId = (typeof SOURCE_IDS)[number];

/**
 * How much weight a number carries.
 * - `measured`   — stated directly by the cited document.
 * - `derived`    — arithmetic on measured values (the derivation goes in `note`).
 * - `tuned`      — chosen for playability; disclosed on the Data Sources screen.
 * - `placeholder`— not yet sourced. Must be listed in the milestone summary.
 */
export type Confidence = "measured" | "derived" | "tuned" | "placeholder";

export interface Constant<T = number> {
  readonly value: T;
  readonly unit: string;
  readonly min?: T;
  readonly max?: T;
  readonly source: SourceId;
  readonly url?: string;
  readonly confidence: Confidence;
  readonly note?: string;
}

/** Identity helper: gives inference on `value` while checking the shape at the literal. */
export const c = <T>(constant: Constant<T>): Constant<T> => constant;

/** Structural test for a Constant, used when walking the constants tree. */
export function isConstant(x: unknown): x is Constant<unknown> {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return "value" in o && typeof o["unit"] === "string" && typeof o["source"] === "string";
}

export interface WalkedConstant {
  readonly path: string;
  readonly constant: Constant<unknown>;
}

/** Depth-first walk of a constants tree, yielding every Constant with its dotted path. */
export function walkConstants(tree: unknown, prefix = ""): WalkedConstant[] {
  if (isConstant(tree)) return [{ path: prefix, constant: tree }];
  if (typeof tree !== "object" || tree === null) return [];
  const out: WalkedConstant[] = [];
  for (const [key, child] of Object.entries(tree)) {
    out.push(...walkConstants(child, prefix ? `${prefix}.${key}` : key));
  }
  return out;
}

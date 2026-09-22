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

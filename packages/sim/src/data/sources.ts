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
  "ICES-2017",
  "NTRS-MARGINS",
  "NASA-WATER-2023",
  "MIT-MOXIE-2023",
  "FRONTIERS-2024",
  "MSL-RAD",
  "CE4-LND-2020",
  "NASA-FSP",
  "NSSDC-FACTS",
  "NASA-STD-3001",
  "STOICHIOMETRY",
  "GAME-DESIGN",
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

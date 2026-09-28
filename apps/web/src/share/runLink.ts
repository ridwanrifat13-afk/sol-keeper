/**
 * M10.5: encode/decode a shareable run link (Phase 2 brief M10; design notes in
 * `docs/M10_PLAN.md`'s D1/D4).
 *
 * Two independent pieces, matching the brief's own wording ("URL encodes SIM_VERSION,
 * scenario, difficulty, crew size, site, power choice, seed; optionally the compressed input
 * log in the fragment for exact replay"):
 *
 * - The **query string** carries the mission's opening configuration in human-readable ids
 *   (D4 — "jezero-outpost" can't be silently re-pointed by a future enum reorder the way a
 *   packed index could). `encodeRunLinkQuery`/`decodeRunLinkQuery`.
 * - The **fragment** — never sent over HTTP by definition, so this is the one place a class
 *   roster's or a student's played-out decisions live — carries the input log as a compact
 *   byte-packed blob (user decision: a hand-rolled varint + base64url codec, no compression
 *   dependency; `binaryCodec.ts`). Its own enum tables (`SYSTEM_IDS`, `CREW_LOCATIONS`,
 *   `SURVIVAL_MODES`, `COMMS_PRIORITIES`, `KIND_TAGS`, and `@sol-keeper/sim`'s own
 *   `STATION_IDS`/`INCIDENT_CATALOG` order) ARE packed indices, unlike the query string's —
 *   safely so, because any change to the sim types/catalog they mirror requires a
 *   `SIM_VERSION` bump (CLAUDE.md's own bump rule), and `decodeRunLinkQuery` rejects a
 *   mismatched `v` before the fragment is ever touched. **The tables below must only ever be
 *   appended to, never reordered or have an entry removed** — the same discipline a wire
 *   format's own field tags need, kept here by comment instead of a schema compiler because
 *   nothing this small needs one.
 *
 * `missionStartIso` is deliberately never encoded: it never reaches `SimState` (its own doc
 * comment — "the simulation never parses or advances it"), so it cannot affect the
 * byte-identical-final-state guarantee this milestone chain is building toward, and the
 * brief's own M10 field list never names it. Every decoded link gets the same literal
 * `DEFAULT_MISSION_START_ISO`.
 */
import {
  buildCustomScenario,
  getLandingSite,
  getScenario,
  legacyDifficultyToMissionDifficulty,
  INCIDENT_CATALOG,
  SIM_VERSION,
  STATION_IDS,
  type CommsPriority,
  type Co2ScrubberMode,
  type CrewLocation,
  type LandingSiteId,
  type LegacyDifficulty,
  type MissionDifficulty,
  type Params,
  type PowerArchitecture,
  type RecordedInput,
  type RunInput,
  type Scenario,
  type ScenarioId,
  type ShieldingApproach,
  type SurvivalMode,
  type SystemId,
} from "@sol-keeper/sim";
import { ByteReader, fromBase64Url, toBase64Url, writeVarint } from "./binaryCodec.js";

/** A uint32 — matches what `createRngState` expects (`packages/sim`'s own `seedStream`
 *  coerces any JS number via `>>> 0` regardless, but a shareable link needs one canonical
 *  range to reject an out-of-range value against, rather than silently wrapping it).
 *  `store/setup.ts`'s own seed roll/clamp imports this rather than keeping a second copy. */
export const MAX_SEED = 0xffffffff;
export const MIN_CREW_SIZE = 2;
export const MAX_CREW_SIZE = 6;

const DEFAULT_MISSION_START_ISO = "2033-03-01";

// ---------------------------------------------------------------------------
// Query string: mission configuration, human-readable ids (D4)
// ---------------------------------------------------------------------------

export interface RunLinkConfig {
  readonly scenarioId: ScenarioId;
  readonly difficulty: MissionDifficulty;
  readonly crewSize: number;
  readonly landingSiteId: LandingSiteId;
  readonly powerArchitecture: PowerArchitecture;
  readonly shieldingApproach: ShieldingApproach;
  readonly seed: number;
}

const QUERY_KEYS = ["v", "sc", "d", "cs", "site", "power", "shield", "seed"] as const;

const SCENARIO_IDS: readonly ScenarioId[] = ["jezero-outpost", "first-light", "the-long-night"];
const DIFFICULTIES: readonly MissionDifficulty[] = ["training", "nominal", "flightRated"];
const LEGACY_DIFFICULTIES: readonly LegacyDifficulty[] = ["cadet", "standard", "commander"];
const LANDING_SITE_IDS: readonly LandingSiteId[] = [
  "MARS-JEZERO",
  "MARS-GALE",
  "MARS-ARCADIA",
  "MOON-CONNECTING-RIDGE",
  "MOON-MALAPERT",
  "MOON-EQUATORIAL",
];
const POWER_ARCHITECTURES: readonly PowerArchitecture[] = ["solarBattery", "fission", "hybrid"];
const SHIELDING_APPROACHES: readonly ShieldingApproach[] = ["hullOnly", "waterWall", "regolithBerm"];

function isOneOf<T extends string>(value: string, options: readonly T[]): value is T {
  return (options as readonly string[]).includes(value);
}

export function encodeRunLinkQuery(config: RunLinkConfig): string {
  const params = new URLSearchParams();
  params.set("v", String(SIM_VERSION));
  params.set("sc", config.scenarioId);
  params.set("d", config.difficulty);
  params.set("cs", String(config.crewSize));
  params.set("site", config.landingSiteId);
  params.set("power", config.powerArchitecture);
  params.set("shield", config.shieldingApproach);
  params.set("seed", String(config.seed));
  return params.toString();
}

export type DecodedConfig =
  /** No run-link query keys present at all — an ordinary fresh app load, not a shared link. */
  | { readonly kind: "none" }
  /** A run-link query is present but its `v` doesn't match this build's `SIM_VERSION`. The
   *  fragment is never even parsed in this case (see file header). */
  | { readonly kind: "versionMismatch"; readonly foundVersion: number }
  /** A run-link query is present but malformed, out of range, or internally inconsistent
   *  (brief rule spirit: "anything unrecognised shows a visible 'this link isn't valid'
   *  state rather than a partially-applied mission"). */
  | { readonly kind: "invalid"; readonly reason: string }
  | {
      readonly kind: "config";
      readonly config: RunLinkConfig;
      readonly params: Params;
      readonly scenario: Scenario;
    };

/**
 * Whitelists and range-checks every one of the 8 recognised keys (CLAUDE.md's `/api`
 * whitelisting rule doesn't bind a client-side URL directly, but finding #9 in
 * `docs/M10_PLAN.md` says its spirit does). A key this module doesn't recognise is ignored
 * rather than treated as fatal — a share sheet or analytics tool appending its own query
 * parameter should not brick a mission link — but every recognised key's *value* must decode
 * to a real union member or a value in range, or the whole link is `"invalid"`.
 */
export function decodeRunLinkQuery(search: string): DecodedConfig {
  const params = new URLSearchParams(search);
  if (!QUERY_KEYS.some((key) => params.has(key))) return { kind: "none" };

  const vRaw = params.get("v");
  const v = vRaw === null ? Number.NaN : Number(vRaw);
  if (!Number.isInteger(v)) return { kind: "invalid", reason: "missing or malformed version" };
  if (v !== SIM_VERSION) return { kind: "versionMismatch", foundVersion: v };

  const scRaw = params.get("sc");
  if (scRaw === null || !isOneOf(scRaw, SCENARIO_IDS)) {
    return { kind: "invalid", reason: "unknown scenario" };
  }
  const scenarioId = scRaw;

  const dRaw = params.get("d");
  let difficulty: MissionDifficulty;
  if (dRaw !== null && isOneOf(dRaw, DIFFICULTIES)) {
    difficulty = dRaw;
  } else if (dRaw !== null && isOneOf(dRaw, LEGACY_DIFFICULTIES)) {
    difficulty = legacyDifficultyToMissionDifficulty(dRaw);
  } else {
    return { kind: "invalid", reason: "unknown difficulty" };
  }

  const csRaw = params.get("cs");
  const crewSize = csRaw === null ? Number.NaN : Number(csRaw);
  if (!Number.isInteger(crewSize) || crewSize < MIN_CREW_SIZE || crewSize > MAX_CREW_SIZE) {
    return { kind: "invalid", reason: "crew size out of range" };
  }

  const siteRaw = params.get("site");
  if (siteRaw === null || !isOneOf(siteRaw, LANDING_SITE_IDS)) {
    return { kind: "invalid", reason: "unknown landing site" };
  }
  const landingSiteId = siteRaw;
  const scenarioBody = getScenario(scenarioId).body;
  if (getLandingSite(landingSiteId).body !== scenarioBody) {
    return { kind: "invalid", reason: "landing site does not match scenario body" };
  }

  const powerRaw = params.get("power");
  if (powerRaw === null || !isOneOf(powerRaw, POWER_ARCHITECTURES)) {
    return { kind: "invalid", reason: "unknown power architecture" };
  }
  const powerArchitecture = powerRaw;

  const shieldRaw = params.get("shield");
  if (shieldRaw === null || !isOneOf(shieldRaw, SHIELDING_APPROACHES)) {
    return { kind: "invalid", reason: "unknown shielding approach" };
  }
  const shieldingApproach = shieldRaw;

  const seedRaw = params.get("seed");
  const seed = seedRaw === null ? Number.NaN : Number(seedRaw);
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
    return { kind: "invalid", reason: "seed out of range" };
  }

  const config: RunLinkConfig = {
    scenarioId,
    difficulty,
    crewSize,
    landingSiteId,
    powerArchitecture,
    shieldingApproach,
    seed,
  };

  try {
    const scenario = buildCustomScenario(getScenario(scenarioId), {
      landingSiteId,
      crewSize,
      powerArchitecture,
      shieldingApproach,
    });
    const missionParams: Params = {
      scenarioId,
      seed,
      crewSize,
      missionStartIso: DEFAULT_MISSION_START_ISO,
      difficulty,
    };
    return { kind: "config", config, params: missionParams, scenario };
  } catch {
    // Defence in depth only — the body check above already rules out the one input
    // combination buildCustomScenario itself guards against.
    return { kind: "invalid", reason: "could not build scenario from config" };
  }
}

// ---------------------------------------------------------------------------
// Fragment: the played-out input log, packed (user decision: no compression dependency)
// ---------------------------------------------------------------------------

/** Wire tables for the fragment codec. Order is the wire format itself — append only. */
const KIND_TAGS: readonly RunInput["kind"][] = [
  "rations",
  "priority",
  "crewLocation",
  "station",
  "commsPriority",
  "incidentResponse",
  // Appended, not inserted (this table's own append-only rule, see file header) — player
  // request (M9.x), two new levers added well after every kind above them.
  "co2ScrubberMode",
  "cleanSolarArrays",
];
const SURVIVAL_MODES: readonly SurvivalMode[] = ["nominal", "mode1", "mode2"];
const CREW_LOCATIONS: readonly CrewLocation[] = ["habitat", "stormShelter", "eva"];
const COMMS_PRIORITIES: readonly CommsPriority[] = ["personal", "science"];
const CO2_SCRUBBER_MODES: readonly Co2ScrubberMode[] = ["full", "balanced", "eco"];
/** Not exported anywhere in `@sol-keeper/sim` (unlike `STATION_IDS`) — mirrors the
 *  `SystemId` union in `packages/sim/src/types.ts` exactly; a change to that union already
 *  requires touching `data/scenarios/*.ts` or `constants.ts`, both `SIM_VERSION` bump
 *  triggers, so this table's own order stays safe under the same umbrella described in the
 *  file header. */
const SYSTEM_IDS: readonly SystemId[] = [
  "lifeSupport",
  "co2Scrubber",
  "oxygenGenerator",
  "waterRecovery",
  "thermalControl",
  "powerDistribution",
  "moxie",
  "greenhouse",
  "comms",
];

function tableIndexOf<T>(table: readonly T[], value: T, label: string): number {
  const index = table.indexOf(value);
  if (index === -1) throw new Error(`unrecognised ${label} "${String(value)}"`);
  return index;
}

function tableAt<T>(table: readonly T[], index: number, label: string): T {
  const value = table[index];
  if (value === undefined) throw new Error(`unrecognised ${label} index ${index}`);
  return value;
}

/** `ActiveIncident.id` is always `${definitionId}-${triggeredAtHour}` (`engine/incidents.ts`'s
 *  `incidentsStage`) — recovered here rather than carried as a third wire field, since no
 *  catalog id is ever a prefix of another. */
function parseIncidentId(incidentId: string): { defIndex: number; triggeredAtHour: number } {
  for (let i = 0; i < INCIDENT_CATALOG.length; i++) {
    const def = INCIDENT_CATALOG[i]!;
    const prefix = `${def.id}-`;
    if (!incidentId.startsWith(prefix)) continue;
    const hour = Number(incidentId.slice(prefix.length));
    if (Number.isInteger(hour) && hour >= 0) return { defIndex: i, triggeredAtHour: hour };
  }
  throw new Error(`unrecognised incident id "${incidentId}"`);
}

function crewIndexOf(crewId: string): number {
  const match = /^crew-(\d+)$/.exec(crewId);
  if (match === null) throw new Error(`unrecognised crew id "${crewId}"`);
  return Number(match[1]) - 1;
}

function crewIdFromIndex(index: number): string {
  return `crew-${index + 1}`;
}

function writeRunInput(bytes: number[], input: RunInput): void {
  bytes.push(tableIndexOf(KIND_TAGS, input.kind, "input kind"));
  switch (input.kind) {
    case "rations":
      bytes.push(tableIndexOf(SURVIVAL_MODES, input.mode, "survival mode"));
      return;
    case "priority":
      bytes.push(tableIndexOf(SYSTEM_IDS, input.systemId, "system id"));
      bytes.push(input.direction === -1 ? 0 : 1);
      return;
    case "crewLocation":
      writeVarint(bytes, crewIndexOf(input.crewId));
      bytes.push(tableIndexOf(CREW_LOCATIONS, input.location, "crew location"));
      return;
    case "station":
      writeVarint(bytes, crewIndexOf(input.crewId));
      bytes.push(tableIndexOf(STATION_IDS, input.station, "station id"));
      return;
    case "commsPriority":
      bytes.push(tableIndexOf(COMMS_PRIORITIES, input.priority, "comms priority"));
      return;
    case "incidentResponse": {
      const { defIndex, triggeredAtHour } = parseIncidentId(input.incidentId);
      const def = INCIDENT_CATALOG[defIndex]!;
      const responseIndex = def.responses.findIndex((r) => r.id === input.responseId);
      if (responseIndex === -1) {
        throw new Error(`unrecognised response id "${input.responseId}" for "${def.id}"`);
      }
      writeVarint(bytes, defIndex);
      writeVarint(bytes, triggeredAtHour);
      writeVarint(bytes, responseIndex);
      return;
    }
    case "co2ScrubberMode":
      bytes.push(tableIndexOf(CO2_SCRUBBER_MODES, input.mode, "co2 scrubber mode"));
      return;
    case "cleanSolarArrays":
      return; // no payload — the kind byte alone is the whole input
  }
}

function readRunInput(reader: ByteReader): RunInput {
  const kind = tableAt(KIND_TAGS, reader.readByte(), "input kind");
  switch (kind) {
    case "rations":
      return { kind, mode: tableAt(SURVIVAL_MODES, reader.readByte(), "survival mode") };
    case "priority": {
      const systemId = tableAt(SYSTEM_IDS, reader.readByte(), "system id");
      const directionByte = reader.readByte();
      if (directionByte !== 0 && directionByte !== 1) throw new Error("malformed priority direction");
      return { kind, systemId, direction: directionByte === 0 ? -1 : 1 };
    }
    case "crewLocation": {
      const crewId = crewIdFromIndex(reader.readVarint());
      return { kind, crewId, location: tableAt(CREW_LOCATIONS, reader.readByte(), "crew location") };
    }
    case "station": {
      const crewId = crewIdFromIndex(reader.readVarint());
      const station = tableAt(STATION_IDS, reader.readByte(), "station id");
      return { kind, crewId, station };
    }
    case "commsPriority":
      return { kind, priority: tableAt(COMMS_PRIORITIES, reader.readByte(), "comms priority") };
    case "incidentResponse": {
      const defIndex = reader.readVarint();
      const def = INCIDENT_CATALOG[defIndex];
      if (def === undefined) throw new Error(`unrecognised incident definition index ${defIndex}`);
      const triggeredAtHour = reader.readVarint();
      const responseIndex = reader.readVarint();
      const response = def.responses[responseIndex];
      if (response === undefined) {
        throw new Error(`unrecognised response index ${responseIndex} for "${def.id}"`);
      }
      return { kind, incidentId: `${def.id}-${triggeredAtHour}`, responseId: response.id };
    }
    case "co2ScrubberMode":
      return { kind, mode: tableAt(CO2_SCRUBBER_MODES, reader.readByte(), "co2 scrubber mode") };
    case "cleanSolarArrays":
      return { kind };
  }
}

/** Wire format: varint(throughHour), varint(entry count), then per entry varint(deltaHour
 *  since the previous entry) + the kind-tagged payload above. `inputs` must already be in
 *  chronological order (the order `store/run.ts`'s `inputLog` is built in). */
export function encodeRunLinkFragment(inputs: readonly RecordedInput[], throughHour: number): string {
  const bytes: number[] = [];
  writeVarint(bytes, throughHour);
  writeVarint(bytes, inputs.length);

  let previousHour = 0;
  for (const recorded of inputs) {
    const delta = recorded.hour - previousHour;
    if (delta < 0) throw new Error("input log is not in chronological order");
    writeVarint(bytes, delta);
    previousHour = recorded.hour;
    writeRunInput(bytes, recorded.input);
  }
  return toBase64Url(bytes);
}

export type DecodedFragment =
  /** No `i=` key in the hash at all — a config-only link (M10.6's "config-only" mode). */
  | { readonly kind: "none" }
  | { readonly kind: "invalid"; readonly reason: string }
  | { readonly kind: "log"; readonly inputLog: RecordedInput[]; readonly throughHour: number };

export function decodeRunLinkFragment(hash: string): DecodedFragment {
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(clean);
  const raw = params.get("i");
  if (raw === null) return { kind: "none" };

  try {
    const reader = new ByteReader(fromBase64Url(raw));
    const throughHour = reader.readVarint();
    const count = reader.readVarint();

    const inputLog: RecordedInput[] = [];
    let hour = 0;
    for (let i = 0; i < count; i++) {
      hour += reader.readVarint();
      inputLog.push({ hour, input: readRunInput(reader) });
    }
    if (reader.remaining !== 0) return { kind: "invalid", reason: "trailing data after input log" };
    return { kind: "log", inputLog, throughHour };
  } catch (error) {
    return { kind: "invalid", reason: error instanceof Error ? error.message : "malformed input log" };
  }
}

// ---------------------------------------------------------------------------
// Full URL assembly (M10.7: "Create class link" / "Copy report link")
// ---------------------------------------------------------------------------

/**
 * Assembles the full shareable URL: the query string always, the fragment only when `replay`
 * is given (a class-mission link has none — nothing has been played yet). Takes `location` as
 * a plain `{ origin, pathname }` rather than reading `window.location` itself, the same
 * "confine window access to the caller" shape `share/bootRunLink.ts` uses — a UI component
 * builds the closure at render time but only actually reads `window.location` inside a click
 * handler, so this file stays usable from Vitest's plain Node environment.
 */
export function buildRunLinkUrl(
  location: { readonly origin: string; readonly pathname: string },
  config: RunLinkConfig,
  replay?: { readonly inputLog: readonly RecordedInput[]; readonly throughHour: number },
): string {
  const query = encodeRunLinkQuery(config);
  const fragment = replay === undefined ? "" : `#i=${encodeRunLinkFragment(replay.inputLog, replay.throughHour)}`;
  return `${location.origin}${location.pathname}?${query}${fragment}`;
}

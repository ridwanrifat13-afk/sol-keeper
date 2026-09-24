/**
 * The run store.
 *
 * One deliberate wrinkle: the simulation mutates `SimState` in place, because a 30-sol run
 * is 740 ticks and cloning the whole world every hour would be waste on the low-end phone
 * this has to run on. Zustand notifies subscribers whenever `set` is called, regardless of
 * whether object identity changed, so components select primitives out of the live state
 * and `version` exists purely to make each tick a distinct store update.
 *
 * Nothing here decides anything about the simulation. All the rules live in @sol-keeper/sim.
 */
import { create } from "zustand";
import {
  applyResponse,
  createRun,
  getScenario,
  tick as simTick,
  EventLogger,
  INCIDENT_CATALOG,
  Rng,
  type CrewLocation,
  type Params,
  type Scenario,
  type SimState,
  type StationId,
  type SurvivalMode,
  type SystemId,
  type TickContext,
} from "@sol-keeper/sim";
import { buildResourceSummary } from "../dial/resourceSummary.js";
import type { StatusLevel } from "../components/status.js";

const STATUS_RANK: Record<StatusLevel, number> = { nominal: 0, caution: 1, critical: 2 };

/** The worst of the six gauges' status ranks — used by auto-pause (M8.1) to notice a
 *  threshold crossing regardless of which resource caused it. The dial level passed to
 *  `buildResourceSummary` only affects its *text*, never the status itself, so any level
 *  works here; "specialist" is arbitrary. */
function worstStatusRank(state: SimState): number {
  const s = buildResourceSummary(state, "specialist");
  return Math.max(
    STATUS_RANK[s.oxygen.status.level],
    STATUS_RANK[s.co2.status.level],
    STATUS_RANK[s.water.status.level],
    STATUS_RANK[s.food.status.level],
    STATUS_RANK[s.battery.status.level],
    STATUS_RANK[s.cabin.status.level],
  );
}

/** Real milliseconds per simulated hour at each speed. */
export const SPEEDS = { paused: 0, slow: 1200, normal: 400, fast: 120 } as const;
export type Speed = keyof typeof SPEEDS;

const DEFAULT_PARAMS: Params = {
  scenarioId: "jezero-outpost",
  seed: 1,
  crewSize: 4,
  missionStartIso: "2033-03-01",
  difficulty: "nominal",
};

interface RunStore {
  params: Params;
  scenario: Scenario;
  state: SimState;
  /** Bumped on every store update so selectors re-read the mutated state. */
  version: number;
  speed: Speed;
  /** M8.1: "Sol Planning (paused, station by station)" vs. "run the sol" (brief's M8 core
   *  loop). Not yet gated on by anything — the "Run the sol" control that flips it lives in
   *  M8.4 Part A. Reset to "planning" automatically at the same 24-hour day boundary
   *  `packages/sim/src/engine/crewHours.ts` already uses for its own budget reset, so this
   *  never invents a second "day" concept. */
  phase: "planning" | "running";

  step: (hours?: number) => void;
  setSpeed: (speed: Speed) => void;
  setPhase: (phase: "planning" | "running") => void;
  reset: (params?: Partial<Params>) => void;
  setSurvivalMode: (mode: SurvivalMode) => void;
  setPriority: (id: SystemId, direction: -1 | 1) => void;
  /** M8.1: the player-driven counterpart to `tickWithBot`'s bot-driven incident resolution
   *  (packages/sim/src/engine/runWithBot.ts) — the exact seam that file's own doc comment
   *  names for M8. Builds the same ad hoc `TickContext` shape, but does not re-run `PIPELINE`
   *  or advance `state.hour`: the hour's tick already happened, this only answers a pending
   *  Decision Card. */
  resolveIncident: (incidentId: string, responseId: string) => void;
  /** Moves one crew member between habitat/storm shelter/EVA — the mechanism behind Incident
   *  Command's shelter-order and EVA go/no-go controls (M8.4 Part D). Already a real lever
   *  with zero sim changes: `radiationStage` (packages/sim/src/models/radiation.ts) reads
   *  every living member's `location` unconditionally every hour. */
  setCrewLocation: (crewId: string, location: CrewLocation) => void;
  /** Mission Command's crew-assignment control (M8.4 Part E). Mutates the `readonly
   *  primaryStation` field via the same cast-workaround `setPriority` below already uses on
   *  `SystemState.priority` — no sim-side type change needed. */
  assignStation: (crewId: string, station: StationId) => void;
}

export const useRun = create<RunStore>((set, get) => ({
  params: DEFAULT_PARAMS,
  scenario: getScenario(DEFAULT_PARAMS.scenarioId),
  state: createRun(DEFAULT_PARAMS),
  version: 0,
  speed: "paused",
  phase: "planning",

  step: (hours = 1) => {
    const { state, params, scenario } = get();
    let autoPaused = false;

    for (let i = 0; i < hours && state.status === "running"; i++) {
      const previousWorstRank = worstStatusRank(state);
      const previousDetectedIds = new Set(
        state.activeIncidents.filter((inc) => inc.detectedAtHour !== undefined).map((inc) => inc.id),
      );

      simTick(state, params, scenario);

      if (state.hour % 24 === 0) {
        set({ phase: "planning" });
      }

      const newlyDetected = state.activeIncidents.some(
        (inc) => inc.detectedAtHour !== undefined && !previousDetectedIds.has(inc.id),
      );
      if (newlyDetected || worstStatusRank(state) > previousWorstRank) {
        autoPaused = true;
        break;
      }
    }

    set((s) => ({
      version: s.version + 1,
      speed: autoPaused || state.status !== "running" ? "paused" : s.speed,
    }));
  },

  setSpeed: (speed) => {
    set({ speed });
  },

  setPhase: (phase) => {
    set({ phase });
  },

  reset: (overrides = {}) => {
    const params = { ...DEFAULT_PARAMS, ...overrides };
    set({
      params,
      scenario: getScenario(params.scenarioId),
      state: createRun(params),
      version: 0,
      speed: "paused",
      phase: "planning",
    });
  },

  setSurvivalMode: (mode) => {
    const { state, version } = get();
    state.food.mode = mode;
    set({ version: version + 1 });
  },

  /**
   * Moves a system up or down the load-shed order. Lower `priority` is shed last, so
   * "up" means a smaller number. Swaps with the neighbour rather than reindexing, which
   * keeps the ordering stable and the change legible to the player.
   */
  setPriority: (id, direction) => {
    const { state, version } = get();
    const ordered = Object.values(state.systems).sort((a, b) => a.priority - b.priority);
    const index = ordered.findIndex((s) => s.id === id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= ordered.length) return;

    const a = ordered[index];
    const b = ordered[target];
    if (a === undefined || b === undefined) return;

    const swap = a.priority;
    (state.systems[a.id] as { priority: number }).priority = b.priority;
    (state.systems[b.id] as { priority: number }).priority = swap;
    set({ version: version + 1 });
  },

  resolveIncident: (incidentId, responseId) => {
    const { state, params, scenario, version } = get();
    const incident = state.activeIncidents.find((i) => i.id === incidentId);
    if (incident === undefined) return;
    const definition = INCIDENT_CATALOG.find((d) => d.id === incident.definitionId);
    if (definition === undefined) return;

    const ctx: TickContext = {
      state,
      params,
      scenario,
      rng: new Rng(state.rng),
      log: new EventLogger(state.log, state.hour),
      dtHours: 1,
    };
    applyResponse(ctx, definition, incident, responseId);
    set({ version: version + 1 });
  },

  setCrewLocation: (crewId, location) => {
    const { state, version } = get();
    const member = state.crew.find((c) => c.id === crewId);
    if (member === undefined) return;
    member.location = location;
    set({ version: version + 1 });
  },

  assignStation: (crewId, station) => {
    const { state, version } = get();
    const member = state.crew.find((c) => c.id === crewId);
    if (member === undefined) return;
    (member as { primaryStation: StationId }).primaryStation = station;
    set({ version: version + 1 });
  },
}));

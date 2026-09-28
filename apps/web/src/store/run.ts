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
import { create, type StoreApi } from "zustand";
import {
  applyInput,
  createRun,
  getScenario,
  landingSitesForBody,
  tick as simTick,
  EventLogger,
  Rng,
  type CommsPriority,
  type Co2ScrubberMode,
  type CrewLocation,
  type Params,
  type RecordedInput,
  type RunInput,
  type Scenario,
  type SetupChoices,
  type SimState,
  type StationId,
  type SurvivalMode,
  type SystemId,
  type TickContext,
} from "@sol-keeper/sim";
import { buildResourceSummary } from "../dial/resourceSummary.js";
import type { StatusLevel } from "../components/status.js";
import type { RunLinkConfig } from "../share/runLink.js";
import { useDebugStats } from "./debugStats.js";

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

/** Real milliseconds per simulated hour at each speed — a genuine 1x/4x/16x ratio (the
 *  brief's own literal M8 core-loop labels, M8.5), not just the text saying so: "slow" is
 *  the 1x baseline, "normal" is exactly a quarter of its interval, "fast" exactly a
 *  sixteenth. */
export const SPEEDS = { paused: 0, slow: 1200, normal: 300, fast: 75 } as const;
export type Speed = keyof typeof SPEEDS;

const DEFAULT_PARAMS: Params = {
  scenarioId: "jezero-outpost",
  seed: 1,
  crewSize: 4,
  missionStartIso: "2033-03-01",
  difficulty: "nominal",
};

/** M10.6: the three setup choices `buildCustomScenario` bakes into numeric fields
 *  (`solarArrayAreaM2`, `shieldingGPerCm2`, …) and then discards the ids of — `scenario` alone
 *  can't answer "what site/power/shielding was this run built from," but a "Copy report
 *  link" (M10.7) needs exactly that alongside `params` to rebuild a `RunLinkConfig`. Omits
 *  `crewSize`: that already lives in `Params` and would just be a second copy here. */
export type RunSetupChoices = Omit<SetupChoices, "crewSize">;

/** The same fallback `store/setup.ts`'s own `resolveScenario` uses for a step a player never
 *  visited — matters here for every `reset()` caller that predates M9's setup wizard
 *  (`ScenarioSwitch`, `TimeControls`' Restart, every bare `reset()` in a test) and so has no
 *  real setup choices of its own to pass. */
function defaultSetupChoices(scenario: Scenario): RunSetupChoices {
  const site = landingSitesForBody(scenario.body)[0];
  if (site === undefined) throw new Error(`No landing site catalogued for body "${scenario.body}"`);
  return { landingSiteId: site.id, powerArchitecture: "solarBattery", shieldingApproach: "hullOnly" };
}

interface RunStore {
  params: Params;
  scenario: Scenario;
  state: SimState;
  /** Bumped on every store update so selectors re-read the mutated state. */
  version: number;
  speed: Speed;
  /** M8.1: "Sol Planning (paused, station by station)" vs. "run the sol" (brief's M8 core
   *  loop). Gates every station's planning-only controls (TimeControls' own speed/step
   *  buttons, PowerPriorities, rations, and this file's own setCommsPriority/setCrewLocation/
   *  assignStation — M8.4 Parts A-E) and the "Run the sol" control (TimeControls.tsx) flips
   *  it to "running". Reset to "planning" automatically at the same 24-hour day boundary
   *  `packages/sim/src/engine/crewHours.ts` already uses for its own budget reset, so this
   *  never invents a second "day" concept. */
  phase: "planning" | "running";
  /** M8.5: the just-completed sol's own hour window, set the instant `step()` crosses a day
   *  boundary (the same moment `phase` resets to "planning") — `views/SolSummary/
   *  SolSummaryView.tsx` reads this to show the brief's own "end-of-sol summary" overlay.
   *  `undefined` once dismissed (dismissSolSummary) or before any sol has ever ended. */
  justEndedSol: { startHour: number; endHour: number } | undefined;
  /** M10.4: every player decision so far, tagged with the `state.hour` it was made at — the
   *  input `@sol-keeper/sim`'s `replayRun` needs to reproduce this exact run byte-identically
   *  from nothing but `params`/`scenario` (M10's own done-when bar). Appended to, never
   *  mutated or reordered, by the same six actions below that used to mutate `state` with no
   *  record at all. */
  inputLog: RecordedInput[];
  /** M10.6: the setup choices `scenario` was built from — see `RunSetupChoices`'s own doc
   *  comment. Set by every `reset()` call alongside `scenario` itself, so the two can never
   *  silently disagree about which run they describe. */
  setupChoices: RunSetupChoices;

  step: (hours?: number) => void;
  setSpeed: (speed: Speed) => void;
  setPhase: (phase: "planning" | "running") => void;
  dismissSolSummary: () => void;
  /** `scenarioOverride` is M9's own setup flow's seam: `store/setup.ts`'s `commit()` builds a
   *  custom `Scenario` (`buildCustomScenario`) from a player's landing-site/crew-size/power/
   *  shielding choices and hands it straight through here, so `scenario` and `state` are
   *  built from the exact same object — never resolved twice and left free to disagree.
   *  Defaults to the base scenario `params.scenarioId` names, matching every pre-M9 caller. */
  reset: (
    params?: Partial<Params>,
    scenarioOverride?: Scenario,
    setupChoicesOverride?: RunSetupChoices,
  ) => void;
  setSurvivalMode: (mode: SurvivalMode) => void;
  /** Player request (M9.x): a real lever in nominal conditions, not just during an incident —
   *  see Co2ScrubberMode's own doc comment (@sol-keeper/sim) for the trade-off this controls. */
  setCo2ScrubberMode: (mode: Co2ScrubberMode) => void;
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
  /** Comms' downlink-priority control (M8.4 Part C) — a real, mutually exclusive trade-off
   *  `models/comms.ts`'s own `commsStage` reads every hour: the same comms uptime accrues
   *  either jezero-outpost's own science goal or crew morale, never both. */
  setCommsPriority: (priority: CommsPriority) => void;
}

/**
 * M10.4: the one call site every player-decision action below goes through — builds the same
 * ad hoc `TickContext` `resolveIncident` already built pre-M10.4 (a fresh `Rng` view over the
 * live `state.rng`, an `EventLogger` whose constructor recovers the right starting `seq` for
 * an hour `tick()` itself already wrote to, M10.3), hands it to `applyInput` so every one of
 * the six kinds mutates state and logs its own causal entry the same single way, and appends
 * `{ hour, input }` to `inputLog` so `replayRun` can reproduce this exact call later.
 */
function applyAndRecord(
  get: StoreApi<RunStore>["getState"],
  set: StoreApi<RunStore>["setState"],
  input: RunInput,
): void {
  const { state, params, scenario, version, inputLog } = get();
  const ctx: TickContext = {
    state,
    params,
    scenario,
    rng: new Rng(state.rng),
    log: new EventLogger(state.log, state.hour),
    dtHours: 1,
  };
  applyInput(ctx, input);
  set({ version: version + 1, inputLog: [...inputLog, { hour: state.hour, input }] });
}

export const useRun = create<RunStore>((set, get) => ({
  params: DEFAULT_PARAMS,
  scenario: getScenario(DEFAULT_PARAMS.scenarioId),
  state: createRun(DEFAULT_PARAMS),
  version: 0,
  speed: "paused",
  phase: "planning",
  justEndedSol: undefined,
  inputLog: [],
  setupChoices: defaultSetupChoices(getScenario(DEFAULT_PARAMS.scenarioId)),

  step: (hours = 1) => {
    const { state, params, scenario } = get();
    let autoPaused = false;
    let justEndedSol: { startHour: number; endHour: number } | undefined;

    for (let i = 0; i < hours && state.status === "running"; i++) {
      const previousWorstRank = worstStatusRank(state);
      const previousDetectedIds = new Set(
        state.activeIncidents.filter((inc) => inc.detectedAtHour !== undefined).map((inc) => inc.id),
      );

      // `?debug=1`'s own tick-time metric (M11) — timed here, the one place every real tick
      // actually goes through, rather than guessed from an overall frame rate that a paused
      // clock or a quiet hour would show as fine regardless.
      const tickStart = performance.now();
      simTick(state, params, scenario);
      useDebugStats.getState().recordTick(performance.now() - tickStart);

      // A day boundary always halts the clock immediately (Sol Planning locks it, M8.4 Part
      // A) — crossing more than one in a single step() call would otherwise be possible at
      // high speed and would silently skip reviewing the sol(s) in between.
      if (state.hour % 24 === 0) {
        justEndedSol = { startHour: state.hour - 24, endHour: state.hour };
        autoPaused = true;
        break;
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
      phase: justEndedSol !== undefined ? "planning" : s.phase,
      justEndedSol: justEndedSol ?? s.justEndedSol,
    }));
  },

  setSpeed: (speed) => {
    set({ speed });
  },

  setPhase: (phase) => {
    set({ phase });
  },

  dismissSolSummary: () => {
    set({ justEndedSol: undefined });
  },

  reset: (overrides = {}, scenarioOverride, setupChoicesOverride) => {
    const params = { ...DEFAULT_PARAMS, ...overrides };
    const scenario = scenarioOverride ?? getScenario(params.scenarioId);
    set({
      params,
      scenario,
      state: createRun(params, scenario),
      version: 0,
      speed: "paused",
      phase: "planning",
      justEndedSol: undefined,
      inputLog: [],
      setupChoices: setupChoicesOverride ?? defaultSetupChoices(scenario),
    });
  },


  setSurvivalMode: (mode) => {
    applyAndRecord(get, set, { kind: "rations", mode });
  },

  setCo2ScrubberMode: (mode) => {
    applyAndRecord(get, set, { kind: "co2ScrubberMode", mode });
  },

  /**
   * Moves a system up or down the load-shed order. Lower `priority` is shed last, so
   * "up" means a smaller number. Swaps with the neighbour rather than reindexing, which
   * keeps the ordering stable and the change legible to the player.
   */
  setPriority: (id, direction) => {
    applyAndRecord(get, set, { kind: "priority", systemId: id, direction });
  },

  resolveIncident: (incidentId, responseId) => {
    applyAndRecord(get, set, { kind: "incidentResponse", incidentId, responseId });
  },

  setCrewLocation: (crewId, location) => {
    applyAndRecord(get, set, { kind: "crewLocation", crewId, location });
  },

  assignStation: (crewId, station) => {
    applyAndRecord(get, set, { kind: "station", crewId, station });
  },

  setCommsPriority: (priority) => {
    applyAndRecord(get, set, { kind: "commsPriority", priority });
  },
}));

/** M10.7: "Copy report link" — every field a `RunLinkConfig` needs, straight from the live
 *  store. A plain field mapping, no resolution needed (unlike `store/setup.ts`'s own
 *  `buildClassLinkConfig`, which still has an unvisited-landing-site-step case to handle):
 *  post-M10.6, `setupChoices` is always already resolved by the time any run exists. */
export function runLinkConfigFromStore(store: Pick<RunStore, "params" | "setupChoices">): RunLinkConfig {
  return {
    scenarioId: store.params.scenarioId,
    difficulty: store.params.difficulty,
    crewSize: store.params.crewSize,
    landingSiteId: store.setupChoices.landingSiteId,
    powerArchitecture: store.setupChoices.powerArchitecture,
    shieldingApproach: store.setupChoices.shieldingApproach,
    seed: store.params.seed,
  };
}

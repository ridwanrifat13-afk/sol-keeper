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
  createRun,
  getScenario,
  tick as simTick,
  type Params,
  type Scenario,
  type SimState,
  type SurvivalMode,
  type SystemId,
} from "@sol-keeper/sim";

/** Real milliseconds per simulated hour at each speed. */
export const SPEEDS = { paused: 0, slow: 1200, normal: 400, fast: 120 } as const;
export type Speed = keyof typeof SPEEDS;

const DEFAULT_PARAMS: Params = {
  scenarioId: "jezero-outpost",
  seed: 1,
  crewSize: 4,
  missionStartIso: "2033-03-01",
  difficulty: "standard",
};

interface RunStore {
  params: Params;
  scenario: Scenario;
  state: SimState;
  /** Bumped on every store update so selectors re-read the mutated state. */
  version: number;
  speed: Speed;

  step: (hours?: number) => void;
  setSpeed: (speed: Speed) => void;
  reset: (params?: Partial<Params>) => void;
  setSurvivalMode: (mode: SurvivalMode) => void;
  setPriority: (id: SystemId, direction: -1 | 1) => void;
}

export const useRun = create<RunStore>((set, get) => ({
  params: DEFAULT_PARAMS,
  scenario: getScenario(DEFAULT_PARAMS.scenarioId),
  state: createRun(DEFAULT_PARAMS),
  version: 0,
  speed: "paused",

  step: (hours = 1) => {
    const { state, params, scenario, version } = get();
    for (let i = 0; i < hours && state.status === "running"; i++) {
      simTick(state, params, scenario);
    }
    set({ version: version + 1, ...(state.status !== "running" ? { speed: "paused" as const } : {}) });
  },

  setSpeed: (speed) => {
    set({ speed });
  },

  reset: (overrides = {}) => {
    const params = { ...DEFAULT_PARAMS, ...overrides };
    set({
      params,
      scenario: getScenario(params.scenarioId),
      state: createRun(params),
      version: 0,
      speed: "paused",
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
}));

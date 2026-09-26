/**
 * M9's mission setup wizard — a short-lived, in-progress flow, not a settings preference
 * (unlike store/dial.ts), so it deliberately does not persist across a reload.
 *
 * Every step now has real UI (M9.2a-d) — `commit()`'s own defaults
 * (`landingSitesForBody(scenario.body)[0]`, `"solarBattery"`, `"hullOnly"`) only matter if a
 * player never visits a given step at all, not because any step is still unbuilt.
 *
 * M10.2 adds a real, player-visible `seed` here — every mission before this shipped on
 * `store/run.ts`'s implicit `DEFAULT_PARAMS.seed = 1`, since nothing ever overrode it. A
 * fresh seed is rolled at store creation and again after every `commit()`, so a player who
 * never looks at Launch Packing's seed control still gets a genuine, different seed each
 * mission — the control (reroll + manual entry) only matters to someone who wants to record
 * or reproduce one specific run (M10.5's shareable link is the other consumer of this field).
 */
import { create } from "zustand";
import {
  buildCustomScenario,
  getScenario,
  landingSitesForBody,
  type LandingSiteId,
  type MissionDifficulty,
  type PowerArchitecture,
  type Scenario,
  type ScenarioId,
  type ShieldingApproach,
} from "@sol-keeper/sim";
import { useRun } from "./run.js";

/** The six choice steps (M9.2a/b/c) plus two review/flourish steps that read the choices
 *  made so far rather than setting one of their own: `transit` (M9.3's establishing shot,
 *  needs only `scenarioId`/`landingSiteId`, so it sits right after the site is chosen and
 *  before the power/shielding trade-offs) and `launchPacking` (M9.2d, the wizard's final
 *  review before launch). */
export const SETUP_STEPS = [
  "scenario",
  "difficulty",
  "crewSize",
  "landingSite",
  "transit",
  "power",
  "shielding",
  "launchPacking",
] as const;
export type SetupStepId = (typeof SETUP_STEPS)[number];

const MIN_CREW_SIZE = 2;
const MAX_CREW_SIZE = 6;

// A uint32, matching what `createRngState`/M10.5's URL codec both expect — the sim's own
// `seedStream` works with any JS number (it coerces via `>>> 0`), but a shareable link needs
// one canonical range so a decoded seed can be range-checked rather than silently wrapping.
const MAX_SEED = 0xffffffff;

/** M10.2: every mission needs a real, player-visible seed, not the historical implicit
 *  default (`store/run.ts`'s own `DEFAULT_PARAMS.seed = 1`, which every browser mission ran
 *  on until now, since no UI path ever overrode it). `crypto.getRandomValues` — this is
 *  decoration for a shareable link, not a simulation input, so rule 2's `Math.random` ban
 *  (which only binds `packages/sim`) doesn't apply, and `crypto` is a stronger source anyway. */
function rollSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

function clampSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 0;
  return Math.max(0, Math.min(MAX_SEED, Math.floor(seed)));
}

interface SetupStore {
  stepIndex: number;
  scenarioId: ScenarioId;
  difficulty: MissionDifficulty;
  crewSize: number;
  /** `undefined` means "use this scenario's own default site" — resolved at `commit()` time,
   *  not eagerly, so switching scenarios never has to guess whether a player-chosen site
   *  should be kept or cleared. */
  landingSiteId: LandingSiteId | undefined;
  powerArchitecture: PowerArchitecture;
  shieldingApproach: ShieldingApproach;
  /** M10.2: rolled fresh whenever the wizard opens (store creation) and again after every
   *  `commit()`, so leaving it untouched still gives each mission its own real seed instead
   *  of quietly repeating the previous one. */
  seed: number;

  setScenarioId: (id: ScenarioId) => void;
  setDifficulty: (difficulty: MissionDifficulty) => void;
  setCrewSize: (size: number) => void;
  setLandingSiteId: (id: LandingSiteId) => void;
  setPowerArchitecture: (architecture: PowerArchitecture) => void;
  setShieldingApproach: (approach: ShieldingApproach) => void;
  setSeed: (seed: number) => void;
  rerollSeed: () => void;
  next: () => void;
  back: () => void;
  /** Builds the custom scenario from every choice made so far (defaulting the rest) and
   *  hands it straight to `useRun`'s own `reset`, then resets this wizard for next time. */
  commit: () => void;
}

/** Layers the wizard's current choices onto their base scenario — the same logic `commit()`
 *  uses to actually start the mission, pulled out so `LaunchPackingStep` can preview the
 *  exact scenario the player is about to launch, without committing anything. */
export function resolveScenario(choices: {
  readonly scenarioId: ScenarioId;
  readonly landingSiteId: LandingSiteId | undefined;
  readonly crewSize: number;
  readonly powerArchitecture: PowerArchitecture;
  readonly shieldingApproach: ShieldingApproach;
}): Scenario {
  const base = getScenario(choices.scenarioId);
  const landingSiteId = choices.landingSiteId ?? landingSitesForBody(base.body)[0]?.id;
  if (landingSiteId === undefined) {
    throw new Error(`No landing site catalogued for body "${base.body}"`);
  }
  return buildCustomScenario(base, {
    landingSiteId,
    crewSize: choices.crewSize,
    powerArchitecture: choices.powerArchitecture,
    shieldingApproach: choices.shieldingApproach,
  });
}

const initialChoices = {
  stepIndex: 0,
  scenarioId: "jezero-outpost" as ScenarioId,
  difficulty: "nominal" as MissionDifficulty,
  crewSize: 4,
  landingSiteId: undefined as LandingSiteId | undefined,
  powerArchitecture: "solarBattery" as PowerArchitecture,
  shieldingApproach: "hullOnly" as ShieldingApproach,
};

export const useSetup = create<SetupStore>((set, get) => ({
  ...initialChoices,
  seed: rollSeed(),

  setScenarioId: (scenarioId) => {
    const current = get();
    const currentBody = getScenario(current.scenarioId).body;
    const nextBody = getScenario(scenarioId).body;
    // A chosen site only survives a scenario change if it's still valid for the new body —
    // otherwise commit() would silently fall back to a default anyway, so clearing it here
    // keeps the wizard's own state honest about what the player actually picked.
    set({ scenarioId, landingSiteId: currentBody === nextBody ? current.landingSiteId : undefined });
  },

  setDifficulty: (difficulty) => {
    set({ difficulty });
  },

  setCrewSize: (size) => {
    set({ crewSize: Math.max(MIN_CREW_SIZE, Math.min(MAX_CREW_SIZE, size)) });
  },

  setLandingSiteId: (landingSiteId) => {
    set({ landingSiteId });
  },

  setPowerArchitecture: (powerArchitecture) => {
    set({ powerArchitecture });
  },

  setShieldingApproach: (shieldingApproach) => {
    set({ shieldingApproach });
  },

  setSeed: (seed) => {
    set({ seed: clampSeed(seed) });
  },

  rerollSeed: () => {
    set({ seed: rollSeed() });
  },

  next: () => {
    const { stepIndex } = get();
    set({ stepIndex: Math.min(stepIndex + 1, SETUP_STEPS.length - 1) });
  },

  back: () => {
    const { stepIndex } = get();
    set({ stepIndex: Math.max(stepIndex - 1, 0) });
  },

  commit: () => {
    const choices = get();
    const scenario = resolveScenario(choices);
    useRun.getState().reset(
      { scenarioId: choices.scenarioId, crewSize: choices.crewSize, difficulty: choices.difficulty, seed: choices.seed },
      scenario,
    );
    set({ ...initialChoices, seed: rollSeed() });
  },
}));

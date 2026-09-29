/**
 * Player request: "apply visual effects on the habitat according to the mission logs sol by
 * sol." Three real, lasting incident consequences the sim already tracks, pulled into one
 * pure function so HabitatView.tsx's own render and its unit test read the exact same
 * derivation — the same "one place this computation lives" reasoning resourceSummary.ts's own
 * doc comment gives for the six resource gauges.
 *
 * Deliberately a plain function of `SimState`/`Scenario`, not a React hook: HabitatView's own
 * SSR unit test (habitat.test.tsx) already documents that Zustand v5's SSR path can't observe
 * a state mutation made after `reset()`, so anything that needs a real mutation reflected has
 * to be testable without going through a component render at all.
 */
import type { Scenario, SimState } from "@sol-keeper/sim";

export interface HabitatEffects {
  /** 0-1: fraction of the scenario's own rated solar array area permanently lost to a sealed
   *  module (power.arrayAreaLossM2, models/power.ts's own note on depress-mir97's residual
   *  cost). 0 if the scenario carries no array (a reactor-only Moon mission) to lose. */
  readonly arrayLossFraction: number;
  /** Whether fire-mir97 has ever appeared on this mission's log at all — read from the log's
   *  own stable `code` string (brief rule 4: never its, never-stored, prose), not a dedicated
   *  state flag this sim doesn't otherwise keep. */
  readonly hasFireHistory: boolean;
  /** Every system currently carrying a permanent, spares-short improvised-repair penalty
   *  (SystemState.efficiencyPenaltyFraction > 0, engine/incidents.ts M7.7 Part 2). */
  readonly improvisedRepairSystemCount: number;
}

export function habitatEffects(state: SimState, scenario: Scenario): HabitatEffects {
  const arrayLossFraction =
    scenario.initial.solarArrayAreaM2 > 0
      ? Math.min(1, state.power.arrayAreaLossM2 / scenario.initial.solarArrayAreaM2)
      : 0;

  const hasFireHistory = state.log.some((e) => e.code.startsWith("incident.fire-mir97."));

  const improvisedRepairSystemCount = Object.values(state.systems).filter(
    (s) => s !== undefined && s.efficiencyPenaltyFraction > 0,
  ).length;

  return { arrayLossFraction, hasFireHistory, improvisedRepairSystemCount };
}

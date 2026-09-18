/**
 * Communications — one-way light time and conjunction blackout.
 *
 * Nothing here changes a resource; it changes what the crew can ask for. At Mars the round
 * trip runs to tens of minutes, and for about two weeks every synodic period the Sun sits
 * between the planets and there is no link at all. That is the feature that teaches why an
 * outpost has to be able to decide things for itself.
 *
 * At M5 the live figure comes from /api/light-time (JPL Horizons). Until then the scenario
 * value stands, which is why `oneWayLightSeconds` is state rather than a constant.
 */
import { environment } from "../data/constants.js";
import type { TickContext } from "../engine/context.js";
import { hoursToDays } from "../units.js";

/** True while Earth and Mars are close enough to conjunction that the link is out. */
export function inConjunctionBlackout(missionDay: number, offsetDays: number): number | boolean {
  const period = environment.marsConjunctionPeriodDays.value;
  const blackout = environment.marsConjunctionBlackoutDays.value;
  const phase = (((missionDay + offsetDays) % period) + period) % period;
  return phase < blackout;
}

export function commsStage(ctx: TickContext): void {
  const { state, scenario, log } = ctx;
  if (scenario.body !== "mars") {
    state.comms.blackout = false;
    return;
  }

  const missionDay = hoursToDays(state.hour);
  // Offset so the scripted 30-sol scenario does not open inside a blackout.
  const wasBlackout = state.comms.blackout;
  state.comms.blackout = Boolean(inConjunctionBlackout(missionDay, 40));

  if (state.comms.blackout && !wasBlackout) {
    log.log({
      kind: "hazard",
      severity: "caution",
      code: "comms.blackoutStart",
      system: "comms",
      data: { durationDays: environment.marsConjunctionBlackoutDays.value },
    });
  } else if (!state.comms.blackout && wasBlackout) {
    log.log({
      kind: "milestone",
      severity: "info",
      code: "comms.blackoutEnd",
      system: "comms",
      data: { oneWayLightSeconds: Math.round(state.comms.oneWayLightSeconds) },
    });
  }
}

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
import { environment, science as scienceConstants } from "../data/constants.js";
import type { TickContext } from "../engine/context.js";
import { clamp } from "../units.js";
import { isSheltering } from "./crew.js";
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
  }

  // M7.7 §3: routine science downlink — one of the Station rules' own named science sources
  // ("science data return" living under Communications) — accrues whenever the link is
  // actually up, checked before the Mars-only blackout branch below so it applies to both
  // bodies (Moon comms are never blacked out, so this is unconditional there).
  // M7.6 Part D.10: spe-1972's own "halts science" residual cost — sheltering from a
  // radiation event means nobody is working the downlink that hour, regardless of body.
  // efficiencyPenaltyFraction is the same incident's "electronics take a degradation roll"
  // cost (comms is this sim's own stand-in for sensitive spacecraft electronics) — a
  // permanently reduced return on whatever uptime the link still gets, not a full outage.
  //
  // M8.4 Part C: the player's own downlink priority (SimState.comms.priority, set from the
  // Comms console during Sol Planning) decides which of the two competing real uses of that
  // same uptime this hour's bandwidth goes to — jezero-outpost's own science goal, or crew
  // morale (a real, documented psychosocial need for isolated-and-confined crews, NASA HRP —
  // science.personalMessageMoralePerHour's own note) — never both at once, and never neither
  // just because the player hasn't visited the Comms console (defaults to "science", today's
  // unconditional behaviour, so an unattended run is unaffected).
  const comms = state.systems.comms;
  const commsUp =
    comms !== undefined && comms.operational && comms.poweredThisHour && !state.comms.blackout && !isSheltering(state.crew);
  if (commsUp && comms !== undefined) {
    if (state.comms.priority === "science") {
      state.science.points +=
        scienceConstants.pointsPerCommsUptimeHour.value * (1 - comms.efficiencyPenaltyFraction) * ctx.dtHours;
    } else {
      for (const member of state.crew) {
        if (!member.alive) continue;
        member.moraleFraction = clamp(
          member.moraleFraction + scienceConstants.personalMessageMoralePerHour.value * ctx.dtHours,
          0,
          1,
        );
      }
    }
  }

  if (scenario.body !== "mars") return;

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

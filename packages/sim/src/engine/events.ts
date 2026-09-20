/**
 * Stage 9 — hazards and failures.
 *
 * Two sources of trouble:
 *   - **scripted** hazards from the scenario, which make a run teachable and repeatable;
 *   - **stochastic** failures drawn from the "failures" RNG stream, at a rate set by each
 *     system's TRL (engine/risk.ts).
 *
 * Every hazard logs a root event, and everything it triggers is logged inside that event's
 * cause scope, so the Black Box can walk from "crop tray died" back to "dust storm".
 */
import type { TickContext } from "../engine/context.js";
import type { EventId, HazardKind, ScriptedEvent, SystemId } from "../types.js";
import { failureRatePerHour } from "./risk.js";

/** Scenario hazards whose window covers the current hour. */
export function activeScriptedEvents(ctx: TickContext): ScriptedEvent[] {
  return ctx.scenario.scripted.filter(
    (e) => ctx.state.hour >= e.atHour && ctx.state.hour < e.atHour + e.durationHours,
  );
}

function startingThisHour(ctx: TickContext, event: ScriptedEvent): boolean {
  return ctx.state.hour === event.atHour;
}

function applyHazard(
  ctx: TickContext,
  hazard: HazardKind,
  magnitude: number,
  cause: EventId,
): void {
  const { state, log, rng } = ctx;

  switch (hazard) {
    case "dustStorm": {
      state.environment.stormActive = true;
      log.because(cause, () => {
        log.logEdge({
          kind: "hazard",
          severity: "warning",
          code: "hazard.dustStorm.obscuring",
          data: { obscuration: round(state.environment.dustObscurationFraction) },
        });
      });
      break;
    }

    case "solarParticleEvent": {
      state.radiation.solarParticleEventActive = true;
      log.because(cause, () => {
        // Crew who are not already sheltering take the brunt of it.
        for (const member of state.crew) {
          if (!member.alive || member.location === "stormShelter") continue;
          log.logEdge({
            kind: "crew",
            severity: "warning",
            code: "hazard.spe.crewExposed",
            data: { crew: member.name, location: member.location },
          });
        }
      });
      break;
    }

    case "pumpFailure": {
      // The RNG draw happens unconditionally, whether or not the chosen target exists in
      // this scenario, so a scripted pumpFailure still advances the "hazards" stream the
      // same way on every scenario — determinism does not depend on which systems a
      // scenario happens to carry.
      const target: SystemId = rng.stream("hazards").chance(0.5)
        ? "waterRecovery"
        : "thermalControl";
      const system = state.systems[target];
      if (system !== undefined && system.operational) {
        system.operational = false;
        log.because(cause, () => {
          log.log({
            kind: "fault",
            severity: "critical",
            code: "hazard.pumpFailure",
            system: target,
            data: { system: target, spares: system.spares },
          });
        });
      }
      break;
    }

    case "cropBlight": {
      log.because(cause, () => {
        for (const tray of state.food.trays) {
          const loss = magnitude * ctx.rng.stream("crops").range(0.5, 1);
          tray.healthFraction = Math.max(0, tray.healthFraction - loss);
          log.log({
            kind: "hazard",
            severity: "warning",
            code: "hazard.cropBlight",
            system: "greenhouse",
            data: { tray: tray.id, crop: tray.crop, healthFraction: round(tray.healthFraction) },
          });
        }
      });
      break;
    }

    case "commsBlackout": {
      state.comms.blackout = true;
      break;
    }
  }
}

export function hazardsAndFailuresStage(ctx: TickContext): void {
  const { state, log, rng } = ctx;

  // Clear per-hour hazard flags; anything still active re-asserts them below.
  state.environment.stormActive = false;
  state.radiation.solarParticleEventActive = false;

  for (const event of activeScriptedEvents(ctx)) {
    let cause: EventId;
    if (startingThisHour(ctx, event)) {
      cause = log.log({
        kind: "hazard",
        severity: "warning",
        code: `hazard.${event.hazard}.start`,
        data: {
          hazard: event.hazard,
          durationHours: event.durationHours,
          magnitude: event.magnitude ?? 1,
        },
      });
    } else {
      // Continuing hazards attach to the hour they began, keeping one chain per hazard.
      const started = state.log.find(
        (e) => e.hour === event.atHour && e.code === `hazard.${event.hazard}.start`,
      );
      cause =
        started?.id ??
        log.log({
          kind: "hazard",
          severity: "info",
          code: `hazard.${event.hazard}.ongoing`,
          data: { hazard: event.hazard },
        });
    }
    applyHazard(ctx, event.hazard, event.magnitude ?? 1, cause);
  }

  // Stochastic failures, scaled by TRL.
  const stream = rng.stream("failures");
  for (const system of Object.values(state.systems)) {
    if (!system.operational) {
      // A spare can be fitted, costing crew time we bill in a later milestone.
      if (system.spares > 0 && stream.chance(0.15)) {
        system.spares -= 1;
        system.operational = true;
        log.log({
          kind: "milestone",
          severity: "info",
          code: "system.repaired",
          system: system.id,
          data: { system: system.id, sparesRemaining: system.spares },
        });
      }
      continue;
    }

    if (stream.chance(failureRatePerHour(system.trl) * ctx.dtHours)) {
      system.operational = false;
      log.log({
        kind: "fault",
        severity: "critical",
        code: "system.failure",
        system: system.id,
        data: { system: system.id, trl: system.trl, spares: system.spares },
      });
    }
  }
}

const round = (x: number): number => Math.round(x * 1000) / 1000;

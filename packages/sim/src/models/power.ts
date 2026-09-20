/**
 * Stage 2 — power generation, storage, and priority allocation.
 *
 * This is the stage the whole game hangs on. When supply cannot meet demand, systems are
 * shed in reverse priority order and **every shed is logged with its cause**. That single
 * convention is what lets the Black Box (M3) explain a dead crop tray four days later, and
 * what feeds the Ripple Web (P1), without any extra instrumentation.
 */
import { power as powerConstants } from "../data/constants.js";
import type { TickContext } from "../engine/context.js";
import type { EventId, SystemId, SystemState } from "../types.js";
import { clamp, wattsToKw } from "../units.js";

/** Electrical output of the arrays this hour, in kW. */
export function solarGenerationKw(areaM2: number, irradianceWPerM2: number): number {
  return wattsToKw(areaM2 * irradianceWPerM2 * powerConstants.cellEfficiencyFraction.value);
}

/** Systems that want power this hour, most essential first. */
function demandList(ctx: TickContext): SystemState[] {
  return Object.values(ctx.state.systems)
    .filter((s) => s.operational)
    .sort((a, b) => a.priority - b.priority);
}

export function powerStage(ctx: TickContext): void {
  const { state, scenario, log } = ctx;
  const p = state.power;

  // --- generation -------------------------------------------------------
  const solarKw = solarGenerationKw(
    scenario.initial.solarArrayAreaM2,
    state.environment.irradianceWPerM2,
  );
  const fissionKw = (state.systems.powerDistribution?.operational ?? false)
    ? scenario.initial.fissionReactorKwe
    : 0;
  p.generationKw = solarKw + fissionKw;

  // --- demand -----------------------------------------------------------
  const wanted = demandList(ctx);
  p.demandKw = wanted.reduce((sum, s) => sum + s.nominalPowerKw, 0);
  p.shedSystems = [];
  for (const s of Object.values(state.systems)) s.poweredThisHour = false;

  // --- allocation -------------------------------------------------------
  // Draw from generation first, then from whatever the battery can legally give up.
  const usableBatteryKwh = Math.max(
    0,
    p.batteryEnergyKwh -
      p.batteryCapacityKwh * (1 - powerConstants.batteryDepthOfDischargeFraction.value),
  );
  let availableKwh = p.generationKw * ctx.dtHours + usableBatteryKwh;

  let servedKw = 0;
  const shed: SystemId[] = [];
  for (const system of wanted) {
    const needKwh = system.nominalPowerKw * ctx.dtHours;
    if (needKwh <= availableKwh) {
      availableKwh -= needKwh;
      system.poweredThisHour = true;
      servedKw += system.nominalPowerKw;
    } else {
      shed.push(system.id);
    }
  }
  p.servedKw = servedKw;
  p.shedSystems = shed;

  // --- battery bookkeeping ---------------------------------------------
  const surplusKwh = p.generationKw * ctx.dtHours - servedKw * ctx.dtHours;
  if (surplusKwh >= 0) {
    const stored = surplusKwh * powerConstants.batteryRoundTripEfficiencyFraction.value;
    p.batteryEnergyKwh = clamp(p.batteryEnergyKwh + stored, 0, p.batteryCapacityKwh);
  } else {
    p.batteryEnergyKwh = clamp(p.batteryEnergyKwh + surplusKwh, 0, p.batteryCapacityKwh);
  }

  // --- logging ----------------------------------------------------------
  // A brownout is logged when the *set* of shed systems changes, not once an hour. A 60-hour
  // dust storm shedding the same three systems is one decision the player has to answer for,
  // not sixty; shedding a fourth is a new one.
  if (shed.length > 0) {
    const brownout: EventId | undefined = log.logEdge({
      kind: "resource",
      severity: shed.length > 2 ? "critical" : "warning",
      code: "power.brownout",
      dedupeKey: shed.join(","),
      data: {
        shedCount: shed.length,
        demandKw: round(p.demandKw),
        servedKw: round(p.servedKw),
        generationKw: round(p.generationKw),
        batteryKwh: round(p.batteryEnergyKwh),
      },
    });
    // Each shed system is an effect of the brownout, so the debrief can walk down to it.
    // When the brownout is unchanged from last hour there is nothing new to attribute.
    if (brownout !== undefined) {
      // Looked up from `wanted` (systems that actually exist and wanted power this hour)
      // rather than re-indexed by id, since `state.systems` is a partial map and every id
      // in `shed` came from iterating it in the first place — this lookup can't miss.
      const byId = new Map(wanted.map((s) => [s.id, s] as const));
      log.because(brownout, () => {
        for (const id of shed) {
          const sys = byId.get(id);
          if (sys === undefined) continue;
          log.log({
            kind: "resource",
            severity: "warning",
            code: "power.systemShed",
            system: id,
            data: { system: id, powerKw: round(sys.nominalPowerKw) },
          });
        }
      });
    }
  }

  if (p.batteryEnergyKwh <= 0.01 && p.generationKw < p.demandKw) {
    log.logEdge({
      kind: "resource",
      severity: "critical",
      code: "power.batteryDepleted",
      data: { demandKw: round(p.demandKw), generationKw: round(p.generationKw) },
    });
  }
}

const round = (x: number): number => Math.round(x * 1000) / 1000;

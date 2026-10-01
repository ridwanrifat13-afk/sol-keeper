/**
 * M10.4: one input-application code path for every player decision (plan §D1).
 *
 * `store/run.ts` in `apps/web` mutates `SimState` directly for six decisions: five with no
 * log entry at all (`setSurvivalMode`, `setPriority`, `setCrewLocation`, `assignStation`,
 * `setCommsPriority`) and one, `resolveIncident`, that already goes through `applyResponse`.
 * That is a real gap against brief rule 4 — a mission report's decision timeline needs every
 * one of these on the causal log, not just incident responses — and a real risk against the
 * M10 done-when bar: two independent mutation sites (live play, replay) drift the moment
 * either one is touched and the other isn't.
 *
 * `applyInput` is that single site. `store/run.ts`'s mutators become thin wrappers that build
 * the same `TickContext` shape `resolveIncident` already builds and call this; `replayRun`
 * drives the same function from a recorded `RunInput` log to rebuild a run's exact final
 * state from nothing but `Params` + `Scenario` + the log — "replay reproduces play" by
 * construction, not by keeping two copies of five small mutations in sync by hand.
 */
import type {
  CommsPriority,
  Co2ScrubberMode,
  CrewLocation,
  Params,
  Scenario,
  SimState,
  StationId,
  SurvivalMode,
  SystemId,
  ThermalControlMode,
  WaterReclamationMode,
} from "../types.js";
import { management, power as powerConstants } from "../data/constants.js";
import type { TickContext } from "./context.js";
import { INCIDENT_CATALOG, applyCleaningEvaDose, applyResponse } from "./incidents.js";
import { EventLogger } from "./log.js";
import { Rng } from "./rng.js";
import { createInitialState } from "./state.js";
import { tick } from "./tick.js";

/**
 * Every kind of decision a player (or a replay of one) can make outside the tick pipeline
 * itself. Discriminated on `kind` so `applyInput` is an exhaustive switch — adding a seventh
 * player lever without a case here is a compile error, not a silent no-op.
 */
export type RunInput =
  | { readonly kind: "rations"; readonly mode: SurvivalMode }
  | { readonly kind: "priority"; readonly systemId: SystemId; readonly direction: -1 | 1 }
  | { readonly kind: "crewLocation"; readonly crewId: string; readonly location: CrewLocation }
  | { readonly kind: "station"; readonly crewId: string; readonly station: StationId }
  | { readonly kind: "commsPriority"; readonly priority: CommsPriority }
  | { readonly kind: "incidentResponse"; readonly incidentId: string; readonly responseId: string }
  | { readonly kind: "co2ScrubberMode"; readonly mode: Co2ScrubberMode }
  | { readonly kind: "cleanSolarArrays" }
  // Appended (player request, M9.x batch 2), not inserted — see share/runLink.ts's own
  // KIND_TAGS append-only rule for why order here matters just as much as it does there.
  | { readonly kind: "waterReclamationMode"; readonly mode: WaterReclamationMode }
  | { readonly kind: "thermalControlMode"; readonly mode: ThermalControlMode }
  | { readonly kind: "overtimeAuthorized"; readonly authorized: boolean }
  // Appended (player request), not inserted — see share/runLink.ts's own KIND_TAGS
  // append-only rule for why order here matters just as much as it does there.
  | { readonly kind: "scheduledMaintenance"; readonly systemId: SystemId }
  | { readonly kind: "printSpare"; readonly systemId: SystemId }
  | { readonly kind: "reorderRepairQueue"; readonly index: number; readonly direction: -1 | 1 };

/** One `RunInput` plus the `state.hour` it was applied at — what `store/run.ts`'s new
 *  `inputLog` records, and all `replayRun` needs to reproduce a run byte-identically: no
 *  RNG draws happen outside `tick()` and `incidentResponse`'s own `applyResponse` call, so
 *  the five other kinds are pure state mutations replayed exactly as they were made. */
export interface RecordedInput {
  readonly hour: number;
  readonly input: RunInput;
}

/**
 * Applies one player decision to `ctx.state`, in place, logging it (brief rule 4 — every
 * player decision belongs on the causal log, not just incident responses). Mirrors, and now
 * replaces, `store/run.ts`'s five previously-unlogged mutators plus its `resolveIncident`.
 *
 * A target that no longer exists (a dead crew member's id, a system this scenario never
 * built) is treated the same way `store/run.ts`'s own guards already did: silently ignored,
 * no log entry. That can only happen from state the input was never valid against in the
 * first place — live play never produces one, since the UI only offers valid targets — so it
 * is not a case a replay of real play needs to reproduce differently.
 */
export function applyInput(ctx: TickContext, input: RunInput): void {
  const { state, log } = ctx;

  switch (input.kind) {
    case "rations": {
      state.food.mode = input.mode;
      log.log({
        kind: "decision",
        severity: "info",
        code: "decision.rations.set",
        data: { mode: input.mode },
      });
      return;
    }

    case "priority": {
      const ordered = Object.values(state.systems).sort((a, b) => a.priority - b.priority);
      const index = ordered.findIndex((s) => s.id === input.systemId);
      const target = index + input.direction;
      if (index === -1 || target < 0 || target >= ordered.length) return;

      const a = ordered[index];
      const b = ordered[target];
      if (a === undefined || b === undefined) return;

      const swap = a.priority;
      (state.systems[a.id] as { priority: number }).priority = b.priority;
      (state.systems[b.id] as { priority: number }).priority = swap;
      log.log({
        kind: "decision",
        severity: "info",
        code: "decision.priority.changed",
        system: input.systemId,
        data: { direction: input.direction },
      });
      return;
    }

    case "crewLocation": {
      const member = state.crew.find((c) => c.id === input.crewId);
      if (member === undefined) return;
      member.location = input.location;
      log.log({
        kind: "decision",
        severity: "info",
        code: "decision.crewLocation.set",
        // The crew member's display name, not `input.crewId` — every other log entry
        // naming a crew member already stores `data.crew` as a name (e.g. `fire-mir97`'s
        // `crewInjured`), which is what `resolveField`'s generic fallback in
        // `apps/web/src/i18n/logText.ts` renders directly, unlabelled.
        data: { crew: member.name, location: input.location },
      });
      return;
    }

    case "station": {
      const member = state.crew.find((c) => c.id === input.crewId);
      if (member === undefined) return;
      (member as { primaryStation: StationId }).primaryStation = input.station;
      log.log({
        kind: "decision",
        severity: "info",
        code: "decision.station.assigned",
        data: { crew: member.name, station: input.station },
      });
      return;
    }

    case "commsPriority": {
      state.comms.priority = input.priority;
      log.log({
        kind: "decision",
        severity: "info",
        code: "decision.commsPriority.set",
        data: { priority: input.priority },
      });
      return;
    }

    case "incidentResponse": {
      const incident = state.activeIncidents.find((i) => i.id === input.incidentId);
      if (incident === undefined) return;
      const definition = INCIDENT_CATALOG.find((d) => d.id === incident.definitionId);
      if (definition === undefined) return;
      applyResponse(ctx, definition, incident, input.responseId);
      return;
    }

    case "co2ScrubberMode": {
      state.atmosphere.co2ScrubberMode = input.mode;
      log.log({
        kind: "decision",
        severity: "info",
        code: "decision.co2ScrubberMode.set",
        // Not `data: { mode }` — logText.ts's resolveField already hardcodes the bare "mode"
        // key to survivalModeLabel (decision.rations.set's own field), which would wrongly
        // try to render "full"/"balanced"/"eco" as a SurvivalMode. A distinct field name gets
        // its own resolveField case instead.
        data: { co2ScrubberMode: input.mode },
      });
      return;
    }

    case "cleanSolarArrays": {
      // Player request: "quiet sol" interactivity — a routine maintenance action available
      // any sol, not gated behind the one scripted dust-storm incident. Mars only: the Moon
      // has no atmosphere to carry dust (firstLight.ts's own doc comment already states this
      // for the storm incident; the same physical fact applies here).
      if (ctx.scenario.body !== "mars") return;

      const cost = powerConstants.routineArrayCleaningCrewHours.value;
      const remainingToday = Math.max(0, state.crewHours.budgetTodayHours - state.crewHours.spentTodayHours);
      if (remainingToday < cost) {
        log.log({
          kind: "decision",
          severity: "info",
          code: "decision.cleanSolarArrays.insufficientTime",
          data: { neededHours: cost, remainingHours: Math.round(remainingToday * 100) / 100 },
        });
        return;
      }

      state.crewHours.spentTodayHours += cost;
      const before = state.environment.dustObscurationFraction;
      // Cleans everything removable — the permanent floor a past storm may have left is,
      // definitionally, not removable (engine/incidents.ts's own duststorm-2018 note).
      state.environment.dustObscurationFraction = state.environment.dustObscurationFloorFraction;
      applyCleaningEvaDose(ctx, cost);
      log.log({
        kind: "decision",
        severity: "info",
        code: "decision.cleanSolarArrays.performed",
        data: {
          obscurationBeforePct: Math.round(before * 1000) / 10,
          obscurationAfterPct: Math.round(state.environment.dustObscurationFraction * 1000) / 10,
        },
      });
      return;
    }

    case "waterReclamationMode": {
      state.water.reclamationMode = input.mode;
      log.log({
        kind: "decision",
        severity: "info",
        code: "decision.waterReclamationMode.set",
        // Not `data: { mode }` — same reason co2ScrubberMode's own case gives: resolveField
        // already hardcodes the bare "mode" key to survivalModeLabel.
        data: { waterReclamationMode: input.mode },
      });
      return;
    }

    case "thermalControlMode": {
      state.thermal.controlMode = input.mode;
      log.log({
        kind: "decision",
        severity: "info",
        code: "decision.thermalControlMode.set",
        data: { thermalControlMode: input.mode },
      });
      return;
    }

    case "overtimeAuthorized": {
      state.crewHours.overtimeAuthorized = input.authorized;
      log.log({
        kind: "decision",
        severity: "info",
        code: "decision.overtimeAuthorized.set",
        data: { authorized: input.authorized ? 1 : 0 },
      });
      return;
    }

    case "scheduledMaintenance": {
      // Player request: "quiet sol" interactivity for the Habitat page — see
      // management.scheduledMaintenanceCrewHours's own doc comment for the real-data
      // grounding and the disclosed apportionment.
      const system = state.systems[input.systemId];
      if (system === undefined) return;

      const cost = management.scheduledMaintenanceCrewHours.value;
      const remainingToday = Math.max(0, state.crewHours.budgetTodayHours - state.crewHours.spentTodayHours);
      if (remainingToday < cost) {
        log.log({
          kind: "decision",
          severity: "info",
          code: "decision.scheduledMaintenance.insufficientTime",
          system: input.systemId,
          data: { neededHours: cost, remainingHours: Math.round(remainingToday * 100) / 100 },
        });
        return;
      }

      state.crewHours.spentTodayHours += cost;
      system.maintenanceCreditUntilHour = state.hour + management.scheduledMaintenanceWindowHours.value;
      log.log({
        kind: "decision",
        severity: "info",
        code: "decision.scheduledMaintenance.performed",
        system: input.systemId,
        data: { windowHours: management.scheduledMaintenanceWindowHours.value },
      });
      return;
    }

    case "printSpare": {
      // Player request: "repair/spares interactivity in Incident Command" — NASA AMF-inspired
      // (management.printSpareWallClockHours's own doc comment). Small crew-hours cost spent
      // up front; the spare itself only appears once real wall-clock time has passed
      // (resolved in engine/crewHours.ts alongside the repair queue).
      const system = state.systems[input.systemId];
      if (system === undefined) return;

      const cost = management.printSpareCrewHours.value;
      const remainingToday = Math.max(0, state.crewHours.budgetTodayHours - state.crewHours.spentTodayHours);
      if (remainingToday < cost) {
        log.log({
          kind: "decision",
          severity: "info",
          code: "decision.printSpare.insufficientTime",
          system: input.systemId,
          data: { neededHours: cost, remainingHours: Math.round(remainingToday * 100) / 100 },
        });
        return;
      }

      state.crewHours.spentTodayHours += cost;
      const readyAtHour = state.hour + management.printSpareWallClockHours.value;
      state.printQueue.push({
        id: `print-${input.systemId}-${state.hour}`,
        systemId: input.systemId,
        queuedAtHour: state.hour,
        readyAtHour,
      });
      log.log({
        kind: "decision",
        severity: "info",
        code: "decision.printSpare.started",
        system: input.systemId,
        data: { readyAtHour },
      });
      return;
    }

    case "reorderRepairQueue": {
      // Mirrors the "priority" case above exactly: swap with the neighbour, bounds-checked.
      const queue = state.crewHours.queue;
      const target = input.index + input.direction;
      if (input.index < 0 || input.index >= queue.length || target < 0 || target >= queue.length) return;

      const a = queue[input.index];
      const b = queue[target];
      if (a === undefined || b === undefined) return;

      queue[input.index] = b;
      queue[target] = a;
      log.log({
        kind: "decision",
        severity: "info",
        code: "decision.reorderRepairQueue.changed",
        data: { direction: input.direction },
      });
      return;
    }
  }
}

/** Every `RecordedInput` tagged for `hour`, applied through one shared `TickContext` — a
 *  fresh `Rng` view (stateless; the actual generator state lives in `state.rng` and is
 *  mutated in place regardless of how many `Rng` wrappers touch it, same as `tick()`'s own
 *  per-hour instance) and one `EventLogger` (its constructor already recovers the correct
 *  starting `seq` for an hour `tick()` itself wrote to, M10.3), so ids come out identical to
 *  live play applying the same inputs one call at a time. */
function applyInputsForHour(
  state: SimState,
  params: Params,
  scenario: Scenario,
  inputs: readonly RecordedInput[],
  hour: number,
): void {
  const forHour = inputs.filter((i) => i.hour === hour);
  if (forHour.length === 0) return;

  const ctx: TickContext = {
    state,
    params,
    scenario,
    rng: new Rng(state.rng),
    log: new EventLogger(state.log, hour),
    dtHours: 1,
  };
  for (const recorded of forHour) applyInput(ctx, recorded.input);
}

/**
 * Rebuilds a run from nothing but its opening `Params`/`Scenario` and its recorded decision
 * log — the mechanism the M10 done-when bar depends on ("two browsers opening the same link
 * produce byte-identical final states"). `inputs` is expected in the order they were made;
 * `hour` values need not be distinct or sorted beyond that.
 *
 * Each `RecordedInput` is tagged with the `state.hour` value it was applied at in the live
 * run, which is also exactly when it must be re-applied here: a decision made during Sol
 * Planning for hour H (before `tick()` advances H to H+1) is tagged H, and an incident
 * response made right after that same tick already ran (state.hour already H) is *also*
 * tagged H — `store/run.ts` reads `state.hour` at the moment of the call either way. Applying
 * every input tagged `state.hour` immediately on arrival at that hour — before ticking again —
 * reproduces both orderings without needing to know which of the six kinds is which.
 */
export function replayRun(
  params: Params,
  scenario: Scenario,
  inputs: readonly RecordedInput[],
  throughHour: number,
): SimState {
  const state = createInitialState(params, scenario);

  applyInputsForHour(state, params, scenario, inputs, state.hour);
  while (state.hour < throughHour && state.status === "running") {
    tick(state, params, scenario);
    applyInputsForHour(state, params, scenario, inputs, state.hour);
  }

  return state;
}

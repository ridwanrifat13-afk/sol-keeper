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
  CrewLocation,
  Params,
  Scenario,
  SimState,
  StationId,
  SurvivalMode,
  SystemId,
} from "../types.js";
import type { TickContext } from "./context.js";
import { INCIDENT_CATALOG, applyResponse } from "./incidents.js";
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
  | { readonly kind: "incidentResponse"; readonly incidentId: string; readonly responseId: string };

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

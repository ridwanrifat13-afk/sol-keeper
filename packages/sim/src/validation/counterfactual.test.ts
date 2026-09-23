/**
 * M7.6 Part C.5 (docs/PHASE2_BRIEF.md): for every incident and every response option it
 * declares, branch a fixed seed at the moment it triggers, take each option, and assert every
 * pair of resulting states is distinguishable. An option whose `effect` writes nothing a later
 * failure path or outcome criterion reads — the exact "cosmetic decision"
 * docs/DECISION_AUDIT.md's own Part A audit went looking for by reading the code — would tie
 * with another such option here instead of merely being asserted absent by inspection, and
 * stays caught permanently, in CI, against a regression.
 *
 * Two things this deliberately does NOT do, both found to matter empirically while writing it:
 *
 * - It does not run the *full pipeline* forward after branching, at any window length. First
 *   tried running the real `run()` for a bounded 72h window and found a false pass anyway:
 *   scrubber-iss's swapCartridge (fixes the scrubber immediately) and manualVenting (leaves it
 *   broken, vents CO2 once) converged to an identical state within that window, because the
 *   *unrelated* ordinary TRL-based repair mechanic (engine/events.ts's attemptRepair, ~87% per
 *   hourly attempt at co2Scrubber's TRL 8) fixed manualVenting's still-broken scrubber anyway,
 *   almost immediately — a real property of the simulation, not evidence the choice didn't
 *   matter, but one that erases the signal this test is trying to isolate no matter how short
 *   a full-pipeline window is chosen. Instead, only `def.ongoingEffect` — the specific
 *   incident's own physical process, exactly what `leavesOngoing` governs — is advanced for
 *   `SETTLE_HOURS`, deliberately excluding every other pipeline stage (ordinary repair,
 *   other incidents, power/thermal drift) that has nothing to do with which response was
 *   chosen for *this* incident.
 * - It strips each incident's own `chosenResponseId` from the compared state, and does not go
 *   through the real probabilistic `applyResponse`/`resolveResponseAttempt` roll. Leaving the
 *   response id in would make every branch trivially "different" by its own label alone,
 *   regardless of whether the response actually changed anything a player's outcome depends
 *   on — exactly the false negative this test exists to prevent. `forceApplyResponse` below
 *   instead replays exactly resolveResponseAttempt's own success branch (spares deduction,
 *   `effect`, resolution bookkeeping) deterministically; whether a response *can fail* is a
 *   different question, already covered by validation/incidents.test.ts and the balance
 *   harness.
 */
import { describe, expect, it } from "vitest";
import { createInitialState } from "../engine/state.js";
import { EventLogger } from "../engine/log.js";
import { Rng } from "../engine/rng.js";
import { INCIDENT_CATALOG, incidentsStage, shouldRunOngoingEffect } from "../engine/incidents.js";
import type { IncidentDefinition } from "../engine/incidents.js";
import { jezeroOutpost } from "../data/scenarios/index.js";
import type { ActiveIncident, Params, SimState } from "../types.js";
import type { TickContext } from "../engine/context.js";

const PARAMS: Params = {
  scenarioId: "jezero-outpost",
  seed: 1,
  crewSize: 4,
  missionStartIso: "2033-01-01",
  difficulty: "nominal",
};

const MAX_HOURS = 6000; // same bound validation/incidents.test.ts uses for the rare triggers
const SETTLE_HOURS = 10; // enough for a leavesOngoing divergence to move the compared state

/** Builds a `TickContext` bound to `state` at its current hour — the same shape
 *  validation/incidents.test.ts's own `tickOnce` builds. */
function ctxFor(state: SimState): TickContext {
  return {
    state,
    params: PARAMS,
    scenario: jezeroOutpost,
    rng: new Rng(state.rng),
    log: new EventLogger(state.log, state.hour),
    dtHours: 1,
  };
}

/** Mirrors validation/incidents.test.ts's own trigger helpers, generalised to any incident in
 *  the catalog: `componentRisk` incidents need enough hours for their own per-hour roll to
 *  land; `hazardStart` ones fire the instant their named log code appears, synthesized here
 *  since no other pipeline stage is running to produce it for real. */
function triggerIncident(def: IncidentDefinition): SimState {
  const state = createInitialState(PARAMS);
  if (def.trigger.kind === "hazardStart") {
    state.hour += 1;
    const ctx = ctxFor(state);
    ctx.log.log({ kind: "hazard", severity: "warning", code: def.trigger.hazardLogCode, data: {} });
    incidentsStage(ctx);
    if (state.activeIncidents.some((inc) => inc.definitionId === def.id)) return state;
    throw new Error(`"${def.id}" did not trigger off its own synthesized hazard-start log entry`);
  }
  for (let i = 0; i < MAX_HOURS; i++) {
    state.hour += 1;
    incidentsStage(ctxFor(state));
    if (state.activeIncidents.some((inc) => inc.definitionId === def.id)) return state;
  }
  throw new Error(`"${def.id}" never triggered in ${MAX_HOURS} hours on seed ${PARAMS.seed}`);
}

/** Exactly resolveResponseAttempt's own success branch (engine/incidents.ts) — spares
 *  deduction, `effect`, resolution bookkeeping — minus the probabilistic roll. See the file
 *  header for why this test needs a deterministic branch rather than the real gated path. */
function forceApplyResponse(ctx: TickContext, def: IncidentDefinition, incident: ActiveIncident, responseId: string): void {
  const response = def.responses.find((r) => r.id === responseId);
  if (response === undefined) throw new Error(`Unknown response "${responseId}" for "${def.id}"`);
  const { state } = ctx;
  if (response.sparesCost !== undefined && response.sparesCost > 0 && response.sparesFromSystem !== undefined) {
    const system = state.systems[response.sparesFromSystem];
    if (system !== undefined) system.spares = Math.max(0, system.spares - response.sparesCost);
  }
  incident.chosenResponseId = response.id;
  incident.resolvedAtHour = state.hour;
  response.effect(ctx, incident);
}

/** JSON of every field except `log`, `rng`, and each incident's own `chosenResponseId` — see
 *  the file header for why each is excluded. */
function comparableSnapshot(state: SimState): string {
  const clone = structuredClone(state) as unknown as Record<string, unknown>;
  delete clone["log"];
  delete clone["rng"];
  for (const incident of clone["activeIncidents"] as Record<string, unknown>[]) {
    delete incident["chosenResponseId"];
  }
  return JSON.stringify(clone);
}

describe("M7.6 Part C.5: every incident response is distinguishable from every other", () => {
  for (const def of INCIDENT_CATALOG) {
    it(`${def.id}: every response option's final state differs from every other's`, () => {
      const triggered = triggerIncident(def);
      const incidentId = triggered.activeIncidents.find((i) => i.definitionId === def.id)?.id;
      expect(incidentId).toBeDefined();
      if (incidentId === undefined) return;

      const snapshots = new Map<string, string>();
      for (const response of def.responses) {
        const branch = structuredClone(triggered);
        const incident = branch.activeIncidents.find((i) => i.id === incidentId);
        expect(incident).toBeDefined();
        if (incident === undefined) continue;

        forceApplyResponse(ctxFor(branch), def, incident, response.id);
        for (let h = 0; h < SETTLE_HOURS; h++) {
          branch.hour += 1;
          if (shouldRunOngoingEffect(def, incident)) {
            def.ongoingEffect?.(ctxFor(branch), incident);
          }
        }
        snapshots.set(response.id, comparableSnapshot(branch));
      }

      const ids = [...snapshots.keys()];
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = ids[i] as string;
          const b = ids[j] as string;
          expect(
            snapshots.get(a),
            `${def.id}: "${a}" and "${b}" produced an identical final state — one of them is cosmetic`,
          ).not.toBe(snapshots.get(b));
        }
      }
    });
  }
});

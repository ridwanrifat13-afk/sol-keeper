/**
 * M10.4: the done-when bar this milestone chain is building toward ("two browsers opening
 * the same link produce byte-identical final states") reduces to one claim about this
 * package alone — `replayRun` given a recorded `RunInput` log reproduces exactly what live
 * play produced, for every one of the six input kinds, not just the incident-response one
 * that already went through `applyResponse` before this milestone.
 *
 * "Live play" here means calling `applyInput` the same way `store/run.ts`'s refactored
 * mutators do: one `TickContext` built fresh per call from the live `state`, exactly
 * mirroring the pre-M10.4 `resolveIncident`'s own shape (apps/web's only prior caller of
 * this pattern) generalised to all six kinds.
 */
import { describe, expect, it } from "vitest";
import { getScenario } from "../data/scenarios/index.js";
import { createInitialState } from "../engine/state.js";
import { runFingerprint } from "../engine/fingerprint.js";
import { INCIDENT_CATALOG } from "../engine/incidents.js";
import { EventLogger } from "../engine/log.js";
import { applyInput, replayRun, type RecordedInput, type RunInput } from "../engine/replay.js";
import { Rng } from "../engine/rng.js";
import { tick } from "../engine/tick.js";
import type { Params, SimState } from "../types.js";
import type { TickContext } from "../engine/context.js";

// Seed 7 detects "depress-mir97" at hour 4 within a 400-hour window (checked empirically,
// same way validation/counterfactual.test.ts's own trigger search works) — picked so this
// test exercises a real `incidentResponse` input, not just the five that never touch RNG.
const PARAMS: Params = {
  scenarioId: "jezero-outpost",
  seed: 7,
  crewSize: 4,
  missionStartIso: "2033-03-01",
  difficulty: "nominal",
};
const HOURS = 400;

describe("M10.4: replayRun reproduces live play", () => {
  it("every RunInput kind, applied live and replayed from the recorded log, ends identically", () => {
    const scenario = getScenario(PARAMS.scenarioId);
    const state = createInitialState(PARAMS, scenario);
    const inputLog: RecordedInput[] = [];

    // Mirrors store/run.ts's refactored mutators: one fresh TickContext per call, built from
    // whatever `state.hour` is right now — the exact shape resolveIncident already used
    // pre-M10.4, generalised to every kind.
    function apply(input: RunInput): void {
      const ctx: TickContext = {
        state,
        params: PARAMS,
        scenario,
        rng: new Rng(state.rng),
        log: new EventLogger(state.log, state.hour),
        dtHours: 1,
      };
      applyInput(ctx, input);
      inputLog.push({ hour: state.hour, input });
    }

    // Sol Planning, hour 0, before the first tick: the four kinds that never touch RNG.
    apply({ kind: "commsPriority", priority: "personal" });
    apply({ kind: "crewLocation", crewId: "crew-2", location: "stormShelter" });
    apply({ kind: "station", crewId: "crew-1", station: "comms" });
    apply({ kind: "priority", systemId: "comms", direction: -1 });

    let respondedToIncident = false;
    for (let h = 0; h < HOURS && state.status === "running"; h++) {
      tick(state, PARAMS, scenario);

      if (h === 50) apply({ kind: "rations", mode: "mode1" });

      if (!respondedToIncident) {
        const incident = state.activeIncidents.find(
          (i) => i.detectedAtHour !== undefined && i.chosenResponseId === undefined,
        );
        if (incident !== undefined) {
          const def = INCIDENT_CATALOG.find((d) => d.id === incident.definitionId);
          const response = def?.responses[0];
          if (def !== undefined && response !== undefined) {
            apply({ kind: "incidentResponse", incidentId: incident.id, responseId: response.id });
            respondedToIncident = true;
          }
        }
      }
    }

    // A guard against the seed/window drifting under an unrelated future change and silently
    // dropping this test's only incidentResponse coverage rather than failing loudly.
    expect(respondedToIncident).toBe(true);

    const replayed = replayRun(PARAMS, scenario, inputLog, state.hour);

    expect(runFingerprint(replayed)).toBe(runFingerprint(state));
    expect(replayed).toEqual(state);
  });

  it("an empty input log replays a plain run identically to tick()", () => {
    const scenario = getScenario(PARAMS.scenarioId);
    const state = createInitialState(PARAMS, scenario);
    for (let h = 0; h < 200 && state.status === "running"; h++) tick(state, PARAMS, scenario);

    const replayed = replayRun(PARAMS, scenario, [], state.hour);

    expect(replayed).toEqual(state);
  });

  it("logs a causal decision entry for each of the five previously-unlogged mutations", () => {
    const scenario = getScenario(PARAMS.scenarioId);
    const state: SimState = createInitialState(PARAMS, scenario);
    const ctx: TickContext = {
      state,
      params: PARAMS,
      scenario,
      rng: new Rng(state.rng),
      log: new EventLogger(state.log, state.hour),
      dtHours: 1,
    };

    applyInput(ctx, { kind: "rations", mode: "mode1" });
    applyInput(ctx, { kind: "priority", systemId: "comms", direction: -1 });
    applyInput(ctx, { kind: "crewLocation", crewId: "crew-2", location: "stormShelter" });
    applyInput(ctx, { kind: "station", crewId: "crew-1", station: "comms" });
    applyInput(ctx, { kind: "commsPriority", priority: "personal" });

    expect(state.log.map((e) => e.code)).toEqual([
      "decision.rations.set",
      "decision.priority.changed",
      "decision.crewLocation.set",
      "decision.station.assigned",
      "decision.commsPriority.set",
    ]);
    expect(new Set(state.log.map((e) => e.id)).size).toBe(state.log.length);

    // M10.8: `data.crew` holds the crew member's display name, not the internal `crewId` —
    // the same convention every other log entry naming a crew member already follows
    // (e.g. fire-mir97's `crewInjured`), and what `apps/web/src/i18n/logText.ts`'s generic
    // fallback renders unlabelled.
    const crewLocationEntry = state.log.find((e) => e.code === "decision.crewLocation.set");
    const stationEntry = state.log.find((e) => e.code === "decision.station.assigned");
    expect(crewLocationEntry?.data["crew"]).toBe(state.crew[1]?.name);
    expect(stationEntry?.data["crew"]).toBe(state.crew[0]?.name);
  });
});

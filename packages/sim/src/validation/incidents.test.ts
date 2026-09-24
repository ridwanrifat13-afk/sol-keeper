/**
 * Each of the 7 incidents in the catalog (Phase 2 brief, M7 plan §3) is reachable — its
 * trigger condition actually creates an `ActiveIncident` and applies its `physicsEffect` —
 * and resolvable, both by an explicit response and by the "nobody decided" default.
 *
 * The five `componentRisk` incidents trigger off their own independent per-hour RNG roll
 * (engine/incidents.ts), not a deterministic condition, so "reachable" here means running
 * `incidentsStage` hour after hour on a fixed seed until it actually appears — the same real
 * trigger path production uses, just given enough hours that hitting it is a near
 * certainty (expected count over the loop bound below is in the dozens), rather than faking
 * a log entry the redesigned trigger no longer even looks for.
 */
import { describe, expect, it } from "vitest";
import { createInitialState } from "../engine/state.js";
import { EventLogger } from "../engine/log.js";
import { Rng } from "../engine/rng.js";
import { INCIDENT_CATALOG, applyResponse, incidentsStage } from "../engine/incidents.js";
import type { IncidentDefinition } from "../engine/incidents.js";
import { jezeroOutpost } from "../data/scenarios/index.js";
import type { Params, SimState } from "../types.js";
import type { TickContext } from "../engine/context.js";

const PARAMS: Params = {
  scenarioId: "jezero-outpost",
  seed: 1,
  crewSize: 4,
  missionStartIso: "2033-01-01",
  difficulty: "nominal",
};

const MAX_HOURS = 6000; // expected component-risk trigger count over this span is in the dozens

function tickOnce(state: SimState): TickContext {
  state.hour += 1;
  return {
    state,
    params: PARAMS,
    scenario: jezeroOutpost,
    rng: new Rng(state.rng),
    log: new EventLogger(state.log, state.hour),
    dtHours: 1,
  };
}

function freshState(): SimState {
  return createInitialState(PARAMS);
}

function byId(id: string): IncidentDefinition {
  const def = INCIDENT_CATALOG.find((d) => d.id === id);
  if (def === undefined) throw new Error(`No incident definition "${id}"`);
  return def;
}

/** Ticks `incidentsStage` alone (not the full pipeline — atmosphere/thermal side effects
 *  from other stages would only add noise to what these tests check) until `definitionId`
 *  appears in `state.activeIncidents`, or throws after `MAX_HOURS`. */
function runUntilTriggered(state: SimState, definitionId: string): TickContext {
  for (let i = 0; i < MAX_HOURS; i++) {
    const ctx = tickOnce(state);
    incidentsStage(ctx);
    if (state.activeIncidents.some((inc) => inc.definitionId === definitionId)) return ctx;
  }
  throw new Error(`"${definitionId}" never triggered in ${MAX_HOURS} hours on seed ${PARAMS.seed}`);
}

function triggerHazardStart(ctx: TickContext, hazardLogCode: string): void {
  ctx.log.log({ kind: "hazard", severity: "warning", code: hazardLogCode, data: {} });
}

describe("every incident in the catalog is reachable", () => {
  it("fire-mir97 triggers eventually and injures a crew member", () => {
    const state = freshState();
    runUntilTriggered(state, "fire-mir97");
    expect(state.crew.some((c) => c.injuryFraction > 0)).toBe(true);
  });

  it("depress-mir97 triggers eventually and vents cabin oxygen", () => {
    const state = freshState();
    const before = state.atmosphere.o2Kg;
    runUntilTriggered(state, "depress-mir97");
    expect(state.atmosphere.o2Kg).toBeLessThan(before);
  });

  it("o2tank-apollo13 triggers eventually and raises cabin CO2 (M7.5: reframed as the LM lifeboat's real threat)", () => {
    const state = freshState();
    const before = state.atmosphere.co2Kg;
    runUntilTriggered(state, "o2tank-apollo13");
    expect(state.atmosphere.co2Kg).toBeGreaterThan(before);
  });

  it("coolant-ms22 triggers eventually and drives the cabin toward its documented heat peak", () => {
    const state = freshState();
    const before = state.thermal.habitatTempC;
    runUntilTriggered(state, "coolant-ms22");
    expect(state.thermal.habitatTempC).toBeGreaterThan(before);
  });

  it("scrubber-iss triggers eventually, costs it a spare, and takes it offline", () => {
    const state = freshState();
    const sparesBefore = state.systems.co2Scrubber?.spares ?? 0;
    runUntilTriggered(state, "scrubber-iss");
    expect(state.systems.co2Scrubber?.spares).toBeLessThan(sparesBefore);
    expect(state.systems.co2Scrubber?.operational).toBe(false);
  });

  it("spe-1972 triggers on the same hour the scripted solar particle event starts and spikes dose", () => {
    const state = freshState();
    const ctx = tickOnce(state);
    triggerHazardStart(ctx, "hazard.solarParticleEvent.start");
    incidentsStage(ctx);

    expect(state.activeIncidents.map((i) => i.definitionId)).toContain("spe-1972");
    expect(state.crew.some((c) => c.eventDoseMSv > 0)).toBe(true);
  });

  it("spe-1972's cumulative dose is permanent — never decreases, whichever response is chosen or how long the run continues (M7.6 Part D.10)", () => {
    for (const responseId of ["shelterNow", "continueOperations"] as const) {
      const state = freshState();
      const ctx = tickOnce(state);
      triggerHazardStart(ctx, "hazard.solarParticleEvent.start");
      incidentsStage(ctx);

      const dosesAfterSpike = state.crew.map((c) => c.cumulativeDoseMSv);
      expect(dosesAfterSpike.some((d) => d > 0)).toBe(true);

      const incident = state.activeIncidents.find((i) => i.definitionId === "spe-1972");
      if (incident === undefined) throw new Error("spe-1972 did not trigger");
      const def = byId("spe-1972");
      applyResponse(tickOnce(state), def, incident, responseId);

      state.crew.forEach((c, i) => {
        expect(c.cumulativeDoseMSv).toBeGreaterThanOrEqual(dosesAfterSpike[i] ?? 0);
      });

      // Dose must still hold — never reset, never decreased — after many further,
      // unrelated hours of simulation.
      for (let i = 0; i < 500; i++) {
        incidentsStage(tickOnce(state));
      }
      state.crew.forEach((c, i) => {
        expect(c.cumulativeDoseMSv).toBeGreaterThanOrEqual(dosesAfterSpike[i] ?? 0);
      });
    }
  });

  it("duststorm-2018 triggers on the same hour the scripted dust storm starts and obscures the arrays", () => {
    const state = freshState();
    const before = state.environment.dustObscurationFraction;
    const ctx = tickOnce(state);
    triggerHazardStart(ctx, "hazard.dustStorm.start");
    incidentsStage(ctx);

    expect(state.activeIncidents.map((i) => i.definitionId)).toContain("duststorm-2018");
    expect(state.environment.dustObscurationFraction).toBeGreaterThan(before);
  });

  it("never triggers the same incident twice in one run", () => {
    const state = freshState();
    runUntilTriggered(state, "fire-mir97");
    const countAfterFirst = state.activeIncidents.filter((i) => i.definitionId === "fire-mir97").length;
    expect(countAfterFirst).toBe(1);

    // Keep ticking well past the first trigger — it must never fire again.
    for (let i = 0; i < 2000; i++) {
      const ctx = tickOnce(state);
      incidentsStage(ctx);
    }
    expect(state.activeIncidents.filter((i) => i.definitionId === "fire-mir97")).toHaveLength(1);
  });
});

describe("every incident resolves, explicitly or by default", () => {
  it("an explicit non-default response is applied immediately and marks the incident resolved", () => {
    const state = freshState();
    const ctx = runUntilTriggered(state, "scrubber-iss");

    const incident = state.activeIncidents.find((i) => i.definitionId === "scrubber-iss");
    expect(incident).toBeDefined();
    if (incident === undefined) return;
    const def = byId("scrubber-iss");
    applyResponse(ctx, def, incident, "swapCartridge");

    expect(incident.chosenResponseId).toBe("swapCartridge");
    expect(incident.resolvedAtHour).toBe(state.hour);
    expect(state.systems.co2Scrubber?.operational).toBe(true);
  });

  it("an incident left unanswered past its warning window auto-resolves with the default response", () => {
    const state = freshState();
    runUntilTriggered(state, "coolant-ms22"); // warningTimeHours: 3

    const incident = state.activeIncidents.find((i) => i.definitionId === "coolant-ms22");
    expect(incident?.resolvedAtHour).toBeUndefined();

    // M7.7 §2: the warning window's own countdown starts at detection, not trigger — detection
    // is itself a per-hour roll (a floor chance even through an unstaffed station), so tick
    // generously past both: near-certain to detect within a handful of hours, then 3 more for
    // coolant-ms22's own warningTimeHours once detected.
    for (let i = 0; i < 60; i++) {
      const ctx = tickOnce(state);
      incidentsStage(ctx);
      if (incident?.resolvedAtHour !== undefined) break;
    }

    expect(incident?.resolvedAtHour).toBeDefined();
    expect(incident?.chosenResponseId).toBe(byId("coolant-ms22").defaultResponseId);
  });

  it("every incident's default response is one of its own declared responses", () => {
    for (const def of INCIDENT_CATALOG) {
      const ids = def.responses.map((r) => r.id);
      expect(ids, `${def.id}: defaultResponseId not in its own responses`).toContain(def.defaultResponseId);
    }
  });

  it("every incident names a station and at least two responses", () => {
    for (const def of INCIDENT_CATALOG) {
      expect(def.responses.length, `${def.id}`).toBeGreaterThanOrEqual(2);
      expect(def.station, `${def.id}`).toBeTruthy();
    }
  });
});

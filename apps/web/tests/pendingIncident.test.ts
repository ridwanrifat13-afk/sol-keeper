import { describe, expect, it } from "vitest";
import { createInitialState } from "@sol-keeper/sim";
import { selectPendingIncident } from "../src/incidents/pendingIncident";

const PARAMS = {
  scenarioId: "jezero-outpost" as const,
  seed: 1,
  crewSize: 4,
  missionStartIso: "2033-01-01",
  difficulty: "nominal" as const,
};

describe("selectPendingIncident", () => {
  it("returns undefined when there are no active incidents", () => {
    const state = createInitialState(PARAMS);
    expect(selectPendingIncident(state)).toBeUndefined();
  });

  it("ignores an incident that has not yet been detected", () => {
    const state = createInitialState(PARAMS);
    state.activeIncidents.push({
      id: "a",
      definitionId: "spe-1972",
      triggeredAtHour: 1,
      cause: "1:0",
    });
    expect(selectPendingIncident(state)).toBeUndefined();
  });

  it("ignores an incident that already has a chosen response", () => {
    const state = createInitialState(PARAMS);
    state.activeIncidents.push({
      id: "a",
      definitionId: "spe-1972",
      triggeredAtHour: 1,
      cause: "1:0",
      detectedAtHour: 1,
      chosenResponseId: "continueOperations",
    });
    expect(selectPendingIncident(state)).toBeUndefined();
  });

  it("picks the earliest-triggered pending incident when more than one is waiting", () => {
    const state = createInitialState(PARAMS);
    state.activeIncidents.push(
      { id: "later", definitionId: "spe-1972", triggeredAtHour: 5, cause: "5:0", detectedAtHour: 5 },
      { id: "earlier", definitionId: "coolant-ms22", triggeredAtHour: 2, cause: "2:0", detectedAtHour: 2 },
    );
    expect(selectPendingIncident(state)?.incident.id).toBe("earlier");
  });

  it("resolves the matching IncidentDefinition from the catalog", () => {
    const state = createInitialState(PARAMS);
    state.activeIncidents.push({
      id: "a",
      definitionId: "fire-mir97",
      triggeredAtHour: 1,
      cause: "1:0",
      detectedAtHour: 1,
    });
    const pending = selectPendingIncident(state);
    expect(pending?.definition.id).toBe("fire-mir97");
    expect(pending?.definition.station).toBe("incidentCommand");
  });
});

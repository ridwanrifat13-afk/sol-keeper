/**
 * M10.8: `dial/decisionTimeline.ts` — every one of the five player-decision codes
 * `packages/sim`'s `applyInput` logs maps to the console that actually owns that control, and
 * every incident-response code maps to that incident's own `IncidentDefinition.station`.
 */
import { describe, expect, it } from "vitest";
import { INCIDENT_CATALOG, type LogEntry } from "@sol-keeper/sim";
import { decisionTimeline, stationForDecision } from "../src/dial/decisionTimeline.js";

function entry(code: string, overrides: Partial<LogEntry> = {}): LogEntry {
  return { id: "1:0", hour: 1, kind: "decision", severity: "info", code, data: {}, ...overrides };
}

describe("M10.8: stationForDecision", () => {
  const cases: [string, string][] = [
    ["decision.rations.set", "lifeSupport"],
    ["decision.priority.changed", "power"],
    ["decision.crewLocation.set", "incidentCommand"],
    ["decision.station.assigned", "missionCommand"],
    ["decision.commsPriority.set", "comms"],
  ];
  for (const [code, expectedStation] of cases) {
    it(`tags "${code}" as ${expectedStation}`, () => {
      expect(stationForDecision(entry(code))).toBe(expectedStation);
    });
  }

  it("tags every incident-response code with that incident's own IncidentDefinition.station", () => {
    for (const def of INCIDENT_CATALOG) {
      for (const suffix of ["resolved", "detected", "queued", "responseFailed", "responseImpossible"]) {
        expect(stationForDecision(entry(`incident.${def.id}.${suffix}`))).toBe(def.station);
      }
    }
  });

  it("returns undefined for a code neither table recognises", () => {
    expect(stationForDecision(entry("totally.unknown.code"))).toBeUndefined();
  });
});

describe("M10.8: decisionTimeline", () => {
  it("keeps only kind: \"decision\" entries, tagged, in log order", () => {
    const log: LogEntry[] = [
      entry("decision.rations.set", { id: "1:0", hour: 1 }),
      { id: "1:1", hour: 1, kind: "hazard", severity: "warning", code: "hazard.dustStorm.start", data: {} },
      entry("decision.commsPriority.set", { id: "2:0", hour: 2 }),
      entry(`incident.${INCIDENT_CATALOG[0]!.id}.resolved`, { id: "3:0", hour: 3 }),
    ];

    const result = decisionTimeline(log);
    expect(result.map((r) => r.entry.id)).toEqual(["1:0", "2:0", "3:0"]);
    expect(result.map((r) => r.station)).toEqual(["lifeSupport", "comms", INCIDENT_CATALOG[0]!.station]);
  });

  it("an empty log produces an empty timeline", () => {
    expect(decisionTimeline([])).toEqual([]);
  });
});

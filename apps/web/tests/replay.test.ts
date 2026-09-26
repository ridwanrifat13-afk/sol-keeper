/**
 * M10.9: `store/replay.ts`'s own driver — every one of the six `RunInput` kinds dispatches
 * through the matching `useRun` mutator (so it logs and records exactly as live play would),
 * hour-0 inputs apply immediately at `start()` rather than waiting for the first tick, and
 * `tickOnce()` stops exactly at `throughHour` or a mission ending early, whichever comes first.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { INCIDENT_CATALOG, type RecordedInput } from "@sol-keeper/sim";
import { useRun } from "../src/store/run.js";
import { useReplay } from "../src/store/replay.js";

beforeEach(() => {
  useRun.getState().reset();
  useReplay.getState().stop();
});

describe("M10.9: useReplay.start", () => {
  it("applies every input recorded for hour 0 immediately, before any tick", () => {
    const inputLog: RecordedInput[] = [
      { hour: 0, input: { kind: "rations", mode: "mode2" } },
      { hour: 0, input: { kind: "commsPriority", priority: "science" } },
    ];
    useReplay.getState().start(inputLog, 10);

    expect(useRun.getState().state.hour).toBe(0);
    expect(useRun.getState().state.food.mode).toBe("mode2");
    expect(useRun.getState().state.comms.priority).toBe("science");
    expect(useReplay.getState().active).toBe(true);
    expect(useReplay.getState().throughHour).toBe(10);
    expect(useReplay.getState().speed).toBe("normal");
    // Consumed already — tickOnce must never re-apply an hour-0 input a second time.
    expect(useReplay.getState().remaining).toEqual([]);
  });
});

describe("M10.9: useReplay.tickOnce", () => {
  it("advances one hour per call and applies each kind of RunInput at its recorded hour", () => {
    const member = useRun.getState().state.crew[0]!;
    const otherStation = member.primaryStation === "power" ? "comms" : "power";
    const inputLog: RecordedInput[] = [
      { hour: 3, input: { kind: "priority", systemId: "comms", direction: -1 } },
      { hour: 5, input: { kind: "crewLocation", crewId: member.id, location: "stormShelter" } },
      { hour: 7, input: { kind: "station", crewId: member.id, station: otherStation } },
    ];
    useReplay.getState().start(inputLog, 10);

    for (let i = 0; i < 3; i++) useReplay.getState().tickOnce();
    expect(useRun.getState().state.hour).toBe(3);
    expect(useRun.getState().state.crew[0]!.location).toBe("habitat"); // not yet hour 5

    for (let i = 0; i < 2; i++) useReplay.getState().tickOnce();
    expect(useRun.getState().state.hour).toBe(5);
    expect(useRun.getState().state.crew[0]!.location).toBe("stormShelter");

    for (let i = 0; i < 2; i++) useReplay.getState().tickOnce();
    expect(useRun.getState().state.hour).toBe(7);
    expect(useRun.getState().state.crew[0]!.primaryStation).toBe(otherStation);

    expect(useReplay.getState().active).toBe(true); // hasn't reached throughHour=10 yet
  });

  it("dispatches an incidentResponse input through resolveIncident", () => {
    const def = INCIDENT_CATALOG[0]!;
    const state = useRun.getState().state;
    state.activeIncidents.push({
      id: "test-incident-1",
      definitionId: def.id,
      triggeredAtHour: 0,
      cause: "0:0",
      detectedAtHour: 0,
    });
    const responseId = def.responses[0]!.id;

    useReplay.getState().start([{ hour: 0, input: { kind: "incidentResponse", incidentId: "test-incident-1", responseId } }], 5);

    const logCodes = useRun.getState().state.log.map((e) => e.code);
    expect(logCodes.some((c) => c === `incident.${def.id}.resolved` || c === `incident.${def.id}.responseFailed` || c === `incident.${def.id}.queued`)).toBe(true);
  });

  it("stops exactly at throughHour, leaving active false", () => {
    useReplay.getState().start([], 5);
    for (let i = 0; i < 5; i++) useReplay.getState().tickOnce();
    expect(useRun.getState().state.hour).toBe(5);
    expect(useReplay.getState().active).toBe(false);

    // A further call is a no-op — never overruns throughHour.
    useReplay.getState().tickOnce();
    expect(useRun.getState().state.hour).toBe(5);
  });

  it("is a no-op when not active", () => {
    useReplay.getState().stop();
    const before = useRun.getState().state.hour;
    useReplay.getState().tickOnce();
    expect(useRun.getState().state.hour).toBe(before);
  });
});

describe("M10.9: useReplay.setSpeed / stop", () => {
  it("setSpeed changes the stored speed", () => {
    useReplay.getState().start([], 5);
    useReplay.getState().setSpeed("fast");
    expect(useReplay.getState().speed).toBe("fast");
  });

  it("stop clears active and any remaining inputs", () => {
    useReplay.getState().start([{ hour: 3, input: { kind: "commsPriority", priority: "science" } }], 10);
    useReplay.getState().stop();
    expect(useReplay.getState().active).toBe(false);
    expect(useReplay.getState().remaining).toEqual([]);
  });
});

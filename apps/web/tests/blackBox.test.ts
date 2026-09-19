/**
 * Correctness tests for the Debrief's two honesty claims, run against a live simulation
 * rather than hand-built log fixtures — this is exactly the seam where a plausible-looking
 * synthetic entry could hide a mismatch with what the engine actually records.
 */
import { describe, expect, it } from "vitest";
import { createInitialState, getScenario, run, type Params } from "@sol-keeper/sim";
import { crewLossConditions, groupIncidents, majorIncidents } from "../src/dial/blackBox";

const params: Params = {
  scenarioId: "jezero-outpost",
  seed: 1,
  crewSize: 4,
  missionStartIso: "2033-03-01",
  difficulty: "standard",
};

function play(seed: number, hours: number) {
  const p = { ...params, seed };
  const scenario = getScenario(p.scenarioId);
  const state = createInitialState(p);
  return run(state, p, scenario, hours);
}

describe("majorIncidents", () => {
  it("is a strict subset of the log", () => {
    const state = play(1, 740);
    const incidents = majorIncidents(state.log);
    const ids = new Set(state.log.map((e) => e.id));
    expect(incidents.every((e) => ids.has(e.id))).toBe(true);
    expect(incidents.length).toBeLessThanOrEqual(state.log.length);
  });

  it("only ever includes entries that actually caused something", () => {
    const state = play(1, 740);
    const incidents = majorIncidents(state.log);
    for (const incident of incidents) {
      const effects = state.log.filter((e) => e.causedBy?.includes(incident.id) ?? false);
      expect(effects.length).toBeGreaterThan(0);
    }
  });

  it("excludes entries with no recorded effect, even severe ones", () => {
    const state = play(1, 740);
    const incidents = new Set(majorIncidents(state.log).map((e) => e.id));
    // system.failure is never itself wrapped in a because() scope in the current engine —
    // see engine/events.ts — so it must never appear here, however critical it looks.
    const failures = state.log.filter((e) => e.code === "system.failure");
    for (const f of failures) {
      expect(incidents.has(f.id)).toBe(false);
    }
  });

  it("power.brownout entries with a shed system are always incidents", () => {
    const state = play(1, 740);
    const incidents = new Set(majorIncidents(state.log).map((e) => e.id));
    const brownouts = state.log.filter((e) => e.code === "power.brownout");
    expect(brownouts.length).toBeGreaterThan(0);
    for (const b of brownouts) {
      expect(incidents.has(b.id)).toBe(true);
    }
  });

  it("finds at least one real incident over a full 30-sol run", () => {
    // The scenario scripts a dust storm, a pump failure and a crop blight (brief P0), so a
    // full run producing zero recorded incidents would mean the causal wiring silently broke.
    const state = play(1, 740);
    expect(majorIncidents(state.log).length).toBeGreaterThan(0);
  });
});

describe("groupIncidents", () => {
  it("collapses a real 30-sol run's brownout spam into far fewer rows than raw incidents", () => {
    // A dust storm's fluctuating shortfall re-triggers power.brownout every time the shed
    // set changes, which produced 85 separate incidents in one run before grouping — the
    // exact problem a screenshot of the debrief surfaced.
    const state = play(1, 740);
    const incidents = majorIncidents(state.log);
    const groups = groupIncidents(incidents, state.log);
    expect(groups.length).toBeLessThan(incidents.length);
  });

  it("keeps a lone incident as its own group of one", () => {
    const log = [entry({ id: "a", hour: 10, code: "hazard.pumpFailure.start", severity: "warning" })];
    const groups = groupIncidents(log, log);
    expect(groups).toEqual([
      { code: "hazard.pumpFailure.start", firstHour: 10, lastHour: 10, count: 1, sample: log[0], totalDirectEffects: 0 },
    ]);
  });

  it("merges consecutive entries of the same code and tracks the hour range", () => {
    const log = [
      entry({ id: "a", hour: 10, code: "power.brownout", severity: "warning" }),
      entry({ id: "b", hour: 11, code: "power.brownout", severity: "warning" }),
      entry({ id: "c", hour: 12, code: "power.brownout", severity: "warning" }),
    ];
    const groups = groupIncidents(log, log);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.count).toBe(3);
    expect(groups[0]!.firstHour).toBe(10);
    expect(groups[0]!.lastHour).toBe(12);
    expect(groups[0]!.sample).toBe(log[0]);
  });

  it("splits into a new group when a different code interrupts a run", () => {
    const log = [
      entry({ id: "a", hour: 10, code: "power.brownout", severity: "warning" }),
      entry({ id: "b", hour: 11, code: "hazard.pumpFailure.start", severity: "critical" }),
      entry({ id: "c", hour: 12, code: "power.brownout", severity: "warning" }),
    ];
    const groups = groupIncidents(log, log);
    expect(groups.map((g) => g.code)).toEqual([
      "power.brownout",
      "hazard.pumpFailure.start",
      "power.brownout",
    ]);
    expect(groups.every((g) => g.count === 1)).toBe(true);
  });

  it("preserves chronological order — grouping never reorders entries", () => {
    const state = play(1, 740);
    const incidents = majorIncidents(state.log);
    const groups = groupIncidents(incidents, state.log);
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i]!.firstHour).toBeGreaterThanOrEqual(groups[i - 1]!.firstHour);
    }
  });

  it("sums direct effects across every member of a group", () => {
    const log = [
      entry({ id: "a", hour: 10, code: "power.brownout", severity: "warning" }),
      entry({ id: "b", hour: 11, code: "power.brownout", severity: "warning" }),
      entry({
        id: "shed-a",
        hour: 10,
        code: "power.systemShed",
        severity: "warning",
        causedBy: ["a"],
      }),
      entry({
        id: "shed-b1",
        hour: 11,
        code: "power.systemShed",
        severity: "warning",
        causedBy: ["b"],
      }),
      entry({
        id: "shed-b2",
        hour: 11,
        code: "power.systemShed",
        severity: "warning",
        causedBy: ["b"],
      }),
    ];
    const incidents = [log[0]!, log[1]!];
    const groups = groupIncidents(incidents, log);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.totalDirectEffects).toBe(3);
  });
});

describe("crewLossConditions", () => {
  it("returns nothing outside the window, everything inside it", () => {
    const log = [
      entry({ id: "a", hour: 10, code: "crew.cold", severity: "warning", data: { crew: "Ayesha" } }),
      entry({ id: "b", hour: 95, code: "crew.cold", severity: "warning", data: { crew: "Ayesha" } }),
      entry({ id: "death", hour: 100, code: "crew.lost", severity: "critical", data: { crew: "Ayesha" } }),
    ];
    const groups = crewLossConditions(log[2]!, log, 72);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.code).toBe("crew.cold");
    expect(groups[0]!.firstHour).toBe(95);
  });

  it("excludes entries for a different crew member", () => {
    const log = [
      entry({ id: "a", hour: 90, code: "crew.cold", severity: "warning", data: { crew: "Diego" } }),
      entry({ id: "death", hour: 100, code: "crew.lost", severity: "critical", data: { crew: "Ayesha" } }),
    ];
    expect(crewLossConditions(log[1]!, log, 72)).toHaveLength(0);
  });

  it("includes mission-wide hazards regardless of which crew member they name", () => {
    const log = [
      entry({ id: "a", hour: 90, code: "thermal.freezeRisk", severity: "critical", data: {} }),
      entry({ id: "death", hour: 100, code: "crew.lost", severity: "critical", data: { crew: "Ayesha" } }),
    ];
    const groups = crewLossConditions(log[1]!, log, 72);
    expect(groups.map((g) => g.code)).toContain("thermal.freezeRisk");
  });

  it("excludes info/caution severity — only warning and critical count as conditions", () => {
    const log = [
      entry({ id: "a", hour: 90, code: "food.harvest", severity: "info", data: { crew: "Ayesha" } }),
      entry({ id: "death", hour: 100, code: "crew.lost", severity: "critical", data: { crew: "Ayesha" } }),
    ];
    expect(crewLossConditions(log[1]!, log, 72)).toHaveLength(0);
  });

  it("groups repeated entries of the same code and counts them", () => {
    const log = [
      entry({ id: "a", hour: 90, code: "crew.noWater", severity: "critical", data: { crew: "Ayesha" } }),
      entry({ id: "b", hour: 92, code: "crew.noWater", severity: "critical", data: { crew: "Ayesha" } }),
      entry({ id: "c", hour: 94, code: "crew.noWater", severity: "critical", data: { crew: "Ayesha" } }),
      entry({ id: "death", hour: 100, code: "crew.lost", severity: "critical", data: { crew: "Ayesha" } }),
    ];
    const groups = crewLossConditions(log[3]!, log, 72);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.count).toBe(3);
    expect(groups[0]!.firstHour).toBe(90);
    expect(groups[0]!.lastHour).toBe(94);
  });

  it("never includes the death entry itself", () => {
    const log = [
      entry({ id: "death", hour: 100, code: "crew.lost", severity: "critical", data: { crew: "Ayesha" } }),
    ];
    expect(crewLossConditions(log[0]!, log, 72)).toHaveLength(0);
  });
});

function entry(overrides: {
  id: string;
  hour: number;
  code: string;
  severity: "info" | "caution" | "warning" | "critical";
  data?: Record<string, number | string>;
  causedBy?: string[];
}) {
  return {
    id: overrides.id,
    hour: overrides.hour,
    kind: "crew" as const,
    severity: overrides.severity,
    code: overrides.code,
    data: overrides.data ?? {},
    ...(overrides.causedBy !== undefined ? { causedBy: overrides.causedBy } : {}),
  };
}

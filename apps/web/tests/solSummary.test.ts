/**
 * Correctness tests for the end-of-sol summary, run against a live simulation rather than
 * hand-built log fixtures — same reasoning as blackBox.test.ts: this is exactly the seam
 * where a plausible-looking synthetic entry could hide a mismatch with what the engine
 * actually records.
 */
import { describe, expect, it } from "vitest";
import { createInitialState, getScenario, prudentBot, runWithBot, STATION_IDS, type Params } from "@sol-keeper/sim";
import { solSummaryLines } from "../src/dial/solSummary";

const params: Params = {
  scenarioId: "jezero-outpost",
  seed: 1,
  crewSize: 4,
  missionStartIso: "2033-03-01",
  difficulty: "flightRated",
};

// flightRated for a busier log than nominal/training within a short run — see
// blackBox.test.ts's own note on why prudentBot, not a bare run(), is what reliably reaches
// enough real incidents to test grouping mechanics against.
function play(hours: number) {
  const scenario = getScenario(params.scenarioId);
  const state = createInitialState(params);
  return runWithBot(state, params, scenario, hours, prudentBot);
}

describe("solSummaryLines", () => {
  it("never returns more than 3 lines, one per station", () => {
    const state = play(740);
    for (let day = 24; day <= state.hour; day += 24) {
      const lines = solSummaryLines(state.log, day - 24, day);
      expect(lines.length).toBeLessThanOrEqual(3);
      expect(new Set(lines.map((l) => l.station)).size).toBe(lines.length);
      for (const line of lines) {
        expect(STATION_IDS).toContain(line.station);
      }
    }
  });

  it("only includes entries within the requested window", () => {
    const state = play(740);
    const lines = solSummaryLines(state.log, 100, 124);
    for (const line of lines) {
      expect(line.entry.hour).toBeGreaterThan(100);
      expect(line.entry.hour).toBeLessThanOrEqual(124);
    }
  });

  it("only includes entries that actually caused something (majorIncidents' own claim)", () => {
    const state = play(740);
    const lines = solSummaryLines(state.log, 0, state.hour);
    for (const line of lines) {
      const effects = state.log.filter((e) => e.causedBy?.includes(line.entry.id) ?? false);
      expect(effects.length).toBeGreaterThan(0);
    }
  });

  it("returns nothing for a window with no log activity", () => {
    const state = play(10);
    expect(solSummaryLines(state.log, 5000, 5024)).toHaveLength(0);
  });
});

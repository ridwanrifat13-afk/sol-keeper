/**
 * Correctness tests for decisionAlternatives (player request #6: "what could've been done
 * instead"), run against a live simulation rather than hand-built log fixtures — same reasoning
 * as blackBox.test.ts: this is exactly the seam where a synthetic entry could hide a mismatch
 * with what the engine actually recorded and actually declared as available responses.
 */
import { describe, expect, it } from "vitest";
import { createInitialState, getScenario, INCIDENT_CATALOG, prudentBot, runWithBot, type Params } from "@sol-keeper/sim";
import { decisionAlternatives } from "../src/dial/decisionAlternatives";

const params: Params = {
  scenarioId: "jezero-outpost",
  seed: 1,
  crewSize: 4,
  missionStartIso: "2033-03-01",
  difficulty: "nominal",
};

function play(seed: number, hours: number) {
  const p = { ...params, seed };
  const scenario = getScenario(p.scenarioId);
  const state = createInitialState(p);
  return runWithBot(state, p, scenario, hours, prudentBot);
}

describe("decisionAlternatives", () => {
  it("returns undefined for entries that aren't a resolved incident", () => {
    const state = play(1, 100);
    const nonResolved = state.log.find((e) => !/^incident\..+\.resolved$/.test(e.code));
    expect(nonResolved).toBeDefined();
    if (nonResolved === undefined) return;
    expect(decisionAlternatives(nonResolved, "specialist")).toBeUndefined();
  });

  it("for a resolved incident, lists only responses the definition actually declares, excluding the one chosen", () => {
    // A long, eventful run across several seeds so at least one incident actually resolves.
    for (let seed = 1; seed <= 12; seed++) {
      const state = play(seed, 740);
      const resolved = state.log.filter((e) => /^incident\..+\.resolved$/.test(e.code));
      if (resolved.length === 0) continue;

      const entry = resolved[0]!;
      const defId = /^incident\.(.+)\.resolved$/.exec(entry.code)![1];
      const definition = INCIDENT_CATALOG.find((d) => d.id === defId)!;
      const chosenId = entry.data["response"];

      const alternatives = decisionAlternatives(entry, "specialist");
      expect(alternatives).toBeDefined();
      if (alternatives === undefined) return;

      const expectedIds = definition.responses.filter((r) => r.id !== chosenId).map((r) => r.id).sort();
      expect(alternatives.map((a) => a.id).sort()).toEqual(expectedIds);
      expect(alternatives.some((a) => a.id === chosenId)).toBe(false);
      return;
    }
    throw new Error("no seed in range produced a resolved incident — widen the seed range");
  });

  it("every alternative's text and mechanism come from real i18n templates, never a raw key", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const state = play(seed, 740);
      const resolved = state.log.find((e) => /^incident\..+\.resolved$/.test(e.code));
      if (resolved === undefined) continue;

      const alternatives = decisionAlternatives(resolved, "cadet");
      expect(alternatives).toBeDefined();
      if (alternatives === undefined) return;
      for (const alt of alternatives) {
        expect(alt.text.startsWith("incident.")).toBe(false);
        if (alt.mechanism !== undefined) expect(alt.mechanism.startsWith("incident.")).toBe(false);
      }
      return;
    }
    throw new Error("no seed in range produced a resolved incident — widen the seed range");
  });
});

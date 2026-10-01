/**
 * M10.1: pins `SIM_VERSION`'s own promise — unlike determinism.test.ts (which only checks
 * that two runs made *right now* agree with each other), this checks a run made *right now*
 * against a value fixed at a point in time, so a change that moves every run's numbers the
 * same way (both runs still agreeing with each other) still gets caught here.
 *
 * A failure here means something in this package changed the numbers a run produces. If that
 * was intentional, bump SIM_VERSION (version.ts) and update the golden fingerprint below —
 * do not "fix" this test by simply accepting whatever the new fingerprint is without asking
 * why it changed, since a shared run link with the old SIM_VERSION now replays differently
 * than what was actually played.
 */
import { describe, expect, it } from "vitest";
import { getScenario } from "../data/scenarios/index.js";
import { createInitialState } from "../engine/state.js";
import { run } from "../engine/tick.js";
import { runFingerprint } from "../engine/fingerprint.js";
import { SIM_VERSION } from "../version.js";
import type { Params } from "../types.js";

function play(p: Params, hours: number) {
  const scenario = getScenario(p.scenarioId);
  const state = createInitialState(p);
  return run(state, p, scenario, hours);
}

describe(`SIM_VERSION ${SIM_VERSION} golden fingerprints`, () => {
  it("Jezero Outpost, seed 12345, nominal, 200 hours", () => {
    const state = play(
      { scenarioId: "jezero-outpost", seed: 12345, crewSize: 4, missionStartIso: "2033-03-01", difficulty: "nominal" },
      200,
    );
    expect(runFingerprint(state)).toBe("fca623b5e6129f83");
  });

  it("First Light, seed 777, flightRated, 400 hours", () => {
    const state = play(
      { scenarioId: "first-light", seed: 777, crewSize: 2, missionStartIso: "2033-03-01", difficulty: "flightRated" },
      400,
    );
    expect(runFingerprint(state)).toBe("471eee2b7033864a");
  });
});

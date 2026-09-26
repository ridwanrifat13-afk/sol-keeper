/**
 * M10.6: `RunStore.setupChoices` — the disclosed gap from `docs/M10_PLAN.md` ("RunStore
 * doesn't yet retain the landingSiteId/powerArchitecture/shieldingApproach a live run was
 * built from") that this milestone closes. Covers both ways it gets set: `useSetup`'s real
 * wizard `commit()`, and every `reset()` caller that predates it and so passes none of its own.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { landingSitesForBody } from "@sol-keeper/sim";
import { useRun } from "../src/store/run.js";
import { useSetup, resolveScenario } from "../src/store/setup.js";

beforeEach(() => {
  useRun.getState().reset();
});

describe("M10.6: setupChoices", () => {
  it("resolveScenario reports the setup choices it actually used, including a resolved default site", () => {
    const { scenario, setupChoices } = resolveScenario({
      scenarioId: "jezero-outpost",
      landingSiteId: undefined,
      crewSize: 4,
      powerArchitecture: "fission",
      shieldingApproach: "waterWall",
    });
    const expectedDefaultSite = landingSitesForBody(scenario.body)[0];
    expect(setupChoices).toEqual({
      landingSiteId: expectedDefaultSite?.id,
      powerArchitecture: "fission",
      shieldingApproach: "waterWall",
    });
  });

  it("useSetup's commit() carries its own choices into useRun's setupChoices", () => {
    useSetup.getState().setScenarioId("first-light");
    useSetup.getState().setLandingSiteId("MOON-MALAPERT");
    useSetup.getState().setPowerArchitecture("hybrid");
    useSetup.getState().setShieldingApproach("regolithBerm");
    useSetup.getState().commit();

    expect(useRun.getState().setupChoices).toEqual({
      landingSiteId: "MOON-MALAPERT",
      powerArchitecture: "hybrid",
      shieldingApproach: "regolithBerm",
    });
    expect(useRun.getState().params.scenarioId).toBe("first-light");
  });

  it("a bare reset() (every pre-M9 caller: ScenarioSwitch, Restart, a test with no args) still gets a real, valid setupChoices default", () => {
    useRun.getState().reset();
    const { scenario, setupChoices } = useRun.getState();
    const expectedDefaultSite = landingSitesForBody(scenario.body)[0];
    expect(setupChoices).toEqual({
      landingSiteId: expectedDefaultSite?.id,
      powerArchitecture: "solarBattery",
      shieldingApproach: "hullOnly",
    });
  });

  it("reset() with a scenario override but no explicit setupChoices still defaults sensibly for that scenario's own body", () => {
    useRun.getState().reset({ scenarioId: "the-long-night", crewSize: 4 });
    const { scenario, setupChoices } = useRun.getState();
    expect(scenario.body).toBe("moon");
    const expectedDefaultSite = landingSitesForBody("moon")[0];
    expect(setupChoices.landingSiteId).toBe(expectedDefaultSite?.id);
  });
});

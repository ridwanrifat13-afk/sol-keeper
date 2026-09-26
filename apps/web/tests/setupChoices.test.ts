/**
 * M10.6: `RunStore.setupChoices` — the disclosed gap from `docs/M10_PLAN.md` ("RunStore
 * doesn't yet retain the landingSiteId/powerArchitecture/shieldingApproach a live run was
 * built from") that this milestone closes. Covers both ways it gets set: `useSetup`'s real
 * wizard `commit()`, and every `reset()` caller that predates it and so passes none of its own.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { landingSitesForBody } from "@sol-keeper/sim";
import { useRun, runLinkConfigFromStore } from "../src/store/run.js";
import { useSetup, resolveScenario, buildClassLinkConfig } from "../src/store/setup.js";

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

describe("M10.7: buildClassLinkConfig (Create class link)", () => {
  it("assembles a full RunLinkConfig straight from the wizard's own choices", () => {
    const config = buildClassLinkConfig({
      scenarioId: "jezero-outpost",
      difficulty: "flightRated",
      landingSiteId: "MARS-GALE",
      crewSize: 5,
      powerArchitecture: "hybrid",
      shieldingApproach: "waterWall",
      seed: 999,
    });
    expect(config).toEqual({
      scenarioId: "jezero-outpost",
      difficulty: "flightRated",
      crewSize: 5,
      landingSiteId: "MARS-GALE",
      powerArchitecture: "hybrid",
      shieldingApproach: "waterWall",
      seed: 999,
    });
  });

  it("resolves an unvisited landing-site step to the same default resolveScenario/commit() would use — a class link can't disagree with what launching actually builds", () => {
    const config = buildClassLinkConfig({
      scenarioId: "first-light",
      difficulty: "nominal",
      landingSiteId: undefined,
      crewSize: 2,
      powerArchitecture: "solarBattery",
      shieldingApproach: "hullOnly",
      seed: 1,
    });
    const expectedDefaultSite = landingSitesForBody("moon")[0];
    expect(config.landingSiteId).toBe(expectedDefaultSite?.id);
  });
});

describe("M10.7: runLinkConfigFromStore (Copy report link)", () => {
  it("assembles a full RunLinkConfig straight from a live run's params + setupChoices", () => {
    useSetup.getState().setScenarioId("the-long-night");
    useSetup.getState().setDifficulty("training");
    useSetup.getState().setCrewSize(4);
    useSetup.getState().setLandingSiteId("MOON-EQUATORIAL");
    useSetup.getState().setPowerArchitecture("fission");
    useSetup.getState().setShieldingApproach("regolithBerm");
    useSetup.getState().setSeed(2024);
    useSetup.getState().commit();

    const config = runLinkConfigFromStore(useRun.getState());
    expect(config).toEqual({
      scenarioId: "the-long-night",
      difficulty: "training",
      crewSize: 4,
      landingSiteId: "MOON-EQUATORIAL",
      powerArchitecture: "fission",
      shieldingApproach: "regolithBerm",
      seed: 2024,
    });
  });

  it("agrees with buildClassLinkConfig for the exact same choices — a report link and a class link never disagree about the same mission", () => {
    const choices = {
      scenarioId: "jezero-outpost" as const,
      difficulty: "nominal" as const,
      landingSiteId: "MARS-ARCADIA" as const,
      crewSize: 4,
      powerArchitecture: "solarBattery" as const,
      shieldingApproach: "hullOnly" as const,
      seed: 55,
    };
    const classConfig = buildClassLinkConfig(choices);

    useSetup.getState().setScenarioId(choices.scenarioId);
    useSetup.getState().setDifficulty(choices.difficulty);
    useSetup.getState().setCrewSize(choices.crewSize);
    useSetup.getState().setLandingSiteId(choices.landingSiteId);
    useSetup.getState().setPowerArchitecture(choices.powerArchitecture);
    useSetup.getState().setShieldingApproach(choices.shieldingApproach);
    useSetup.getState().setSeed(choices.seed);
    useSetup.getState().commit();

    expect(runLinkConfigFromStore(useRun.getState())).toEqual(classConfig);
  });
});

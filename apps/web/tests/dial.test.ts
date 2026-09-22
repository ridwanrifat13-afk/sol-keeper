import { describe, expect, it } from "vitest";
import { createInitialState, getScenario, tick, type Params } from "@sol-keeper/sim";
import {
  presentBattery,
  presentCabin,
  presentCo2,
  presentDose,
  presentFood,
  presentOxygen,
  presentWater,
} from "../src/dial/present";
import { cropLabel, locationLabel, survivalModeLabel, systemLabel } from "../src/dial/labels";
import { statusWord } from "../src/dial/statusWords";
import { buildResourceSummary } from "../src/dial/resourceSummary";
import { DIAL_LEVELS } from "../src/dial/types";
import { useDial } from "../src/store/dial";

describe("dial/present — every level returns a usable Gauge input", () => {
  const presenters: Array<[string, () => { unit: string; decimals: number; detail: string; valueText?: string }]> = [];

  for (const level of DIAL_LEVELS) {
    for (const status of ["nominal", "caution", "critical"] as const) {
      presenters.push([`oxygen ${level}/${status}`, () => presentOxygen(level, status, 56)]);
      presenters.push([`co2 ${level}/${status}`, () => presentCo2(level, status, 3, "Nominal")]);
      presenters.push([`water ${level}/${status}`, () => presentWater(level, status, 10)]);
      presenters.push([`food ${level}/${status}`, () => presentFood(level, status, 20, 5)]);
      presenters.push([`battery ${level}/${status}`, () => presentBattery(level, status, 2, 1, 3)]);
      presenters.push([`cabin ${level}/${status}`, () => presentCabin(level, status, -20, true)]);
    }
  }

  it.each(presenters)("%s produces a non-empty detail and a finite decimals count", (_name, run) => {
    const text = run();
    expect(text.detail.length).toBeGreaterThan(0);
    expect(Number.isFinite(text.decimals)).toBe(true);
    expect(typeof text.unit).toBe("string");
  });

  it("only the cadet level replaces the numeric headline with a phrase", () => {
    expect(presentOxygen("cadet", "nominal", 56).valueText).toBeDefined();
    expect(presentOxygen("specialist", "nominal", 56).valueText).toBeUndefined();
    expect(presentOxygen("commander", "nominal", 56).valueText).toBeUndefined();
  });

  it("cadet phrasing changes with status, so a caution reads differently from nominal", () => {
    const nominal = presentWater("cadet", "nominal", 10).valueText;
    const critical = presentWater("cadet", "critical", 10).valueText;
    expect(nominal).not.toBe(critical);
  });

  it("commander is at least as precise as specialist (never fewer decimals)", () => {
    expect(presentOxygen("commander", "nominal", 56).decimals).toBeGreaterThanOrEqual(
      presentOxygen("specialist", "nominal", 56).decimals,
    );
    expect(presentCabin("commander", "nominal", -20, true).decimals).toBeGreaterThanOrEqual(
      presentCabin("specialist", "nominal", -20, true).decimals,
    );
  });
});

describe("dial/present — presentDose", () => {
  it("shows a rising fraction as the dose approaches the limit", () => {
    const low = presentDose("specialist", 10, 600);
    const high = presentDose("specialist", 590, 600);
    expect(low.detail).toContain("2%");
    expect(high.detail).toContain("98%");
  });

  it("cadet never prints the raw millisievert number", () => {
    const dose = presentDose("cadet", 590, 600);
    expect(dose.headline).not.toMatch(/\d/);
  });

  it("commander cites the standard by name", () => {
    expect(presentDose("commander", 300, 600).detail).toContain("NASA-STD-3001");
  });
});

describe("dial/labels", () => {
  it("every SystemId resolves to a non-empty label at every level", () => {
    const ids = [
      "powerDistribution",
      "lifeSupport",
      "co2Scrubber",
      "thermalControl",
      "oxygenGenerator",
      "waterRecovery",
      "moxie",
      "greenhouse",
      "comms",
    ] as const;
    for (const id of ids) {
      for (const level of DIAL_LEVELS) {
        expect(systemLabel(id, level).length).toBeGreaterThan(0);
      }
    }
  });

  it("cadet system labels never repeat the raw camelCase id", () => {
    expect(systemLabel("co2Scrubber", "cadet")).not.toMatch(/co2Scrubber/i);
    expect(systemLabel("thermalControl", "cadet")).not.toMatch(/thermalControl/i);
  });

  it("crew locations resolve at every level and cadet avoids the raw enum", () => {
    for (const loc of ["habitat", "stormShelter", "eva"] as const) {
      for (const level of DIAL_LEVELS) {
        expect(locationLabel(loc, level).length).toBeGreaterThan(0);
      }
    }
    expect(locationLabel("stormShelter", "cadet")).not.toMatch(/stormShelter/i);
  });

  it("survival modes resolve at every level", () => {
    for (const mode of ["nominal", "mode1", "mode2"] as const) {
      for (const level of DIAL_LEVELS) {
        expect(survivalModeLabel(mode, level).length).toBeGreaterThan(0);
      }
    }
  });

  it("crop labels keep the plain crop name even for cadet, plus an emoji", () => {
    expect(cropLabel("lettuce", "specialist")).toBe("lettuce");
    expect(cropLabel("lettuce", "cadet")).toContain("lettuce");
    expect(cropLabel("lettuce", "cadet")).not.toBe("lettuce");
  });
});

describe("dial/statusWords", () => {
  it("cadet gets plain words distinct from Nominal/Caution/Critical", () => {
    expect(statusWord("cadet", "nominal", "Nominal")).not.toBe("Nominal");
    expect(statusWord("cadet", "caution", "Caution")).not.toBe("Caution");
    expect(statusWord("cadet", "critical", "Critical")).not.toBe("Critical");
  });

  it("specialist and commander keep the fallback word unchanged", () => {
    expect(statusWord("specialist", "critical", "Critical")).toBe("Critical");
    expect(statusWord("commander", "critical", "Critical")).toBe("Critical");
  });
});

describe("dial/resourceSummary — the Reality Dial never changes what state a resource is in", () => {
  it("every status is identical across all three levels for the same simulation state", () => {
    const params: Params = {
      scenarioId: "jezero-outpost",
      seed: 7,
      crewSize: 4,
      missionStartIso: "2033-03-01",
      difficulty: "nominal",
    };
    const scenario = getScenario(params.scenarioId);
    const state = createInitialState(params);
    for (let i = 0; i < 300; i++) tick(state, params, scenario);

    const summaries = DIAL_LEVELS.map((level) => buildResourceSummary(state, level));
    const [first, ...rest] = summaries;

    for (const resource of ["oxygen", "co2", "water", "food", "battery", "cabin"] as const) {
      const statuses = rest.map((s) => s[resource].status.level);
      for (const s of statuses) {
        expect(s, `${resource} status differs between dial levels`).toBe(first![resource].status.level);
      }
    }
  });

  it("only the text differs between levels, never the fraction a bar would draw", () => {
    const params: Params = {
      scenarioId: "jezero-outpost",
      seed: 7,
      crewSize: 4,
      missionStartIso: "2033-03-01",
      difficulty: "nominal",
    };
    const state = createInitialState(params);
    const summaries = DIAL_LEVELS.map((level) => buildResourceSummary(state, level));

    for (const resource of ["oxygen", "co2", "water", "food", "battery", "cabin"] as const) {
      const fractions = new Set(summaries.map((s) => s[resource].fraction));
      expect(fractions.size).toBe(1);
    }
  });
});

describe("store/dial", () => {
  it("defaults to specialist", () => {
    expect(useDial.getState().level).toBe("specialist");
  });

  it("setLevel updates the store", () => {
    useDial.getState().setLevel("cadet");
    expect(useDial.getState().level).toBe("cadet");
    useDial.getState().setLevel("specialist");
  });
});

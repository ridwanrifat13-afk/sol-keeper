/**
 * engine/setup.ts's buildCustomScenario, plus the regression this refactor most needs: an
 * explicit-but-matching scenario override must produce byte-for-byte the same run as no
 * override at all (brief rule 2 — determinism must survive adding this seam).
 */
import { describe, expect, it } from "vitest";
import { buildCustomScenario, type SetupChoices } from "../engine/setup.js";
import { createInitialState } from "../engine/state.js";
import { createRun, runScenario } from "../index.js";
import { getScenario } from "../data/scenarios/index.js";
import { getLandingSite } from "../data/landingSites.js";
import { run } from "../engine/tick.js";
import type { Params } from "../types.js";

const params: Params = {
  scenarioId: "jezero-outpost",
  seed: 12345,
  crewSize: 4,
  missionStartIso: "2033-03-01",
  difficulty: "nominal",
};

const choices: SetupChoices = {
  landingSiteId: "MARS-GALE",
  crewSize: 4,
  powerArchitecture: "solarBattery",
  shieldingApproach: "hullOnly",
};

describe("buildCustomScenario", () => {
  it("replaces site, crewSize, and the power/shielding-affected initial fields", () => {
    const base = getScenario("jezero-outpost");
    const custom = buildCustomScenario(base, choices);
    const gale = getLandingSite("MARS-GALE");

    expect(custom.site).toEqual({ name: gale.name, latDeg: gale.latDeg.value, lonDeg: gale.lonDeg.value });
    expect(custom.crewSize).toBe(4);
    expect(custom.initial.fissionReactorKwe).toBe(0);
    expect(custom.initial.solarArrayAreaM2).toBeGreaterThan(0);
  });

  it("leaves hazard scripting and win conditions untouched", () => {
    const base = getScenario("jezero-outpost");
    const custom = buildCustomScenario(base, choices);
    expect(custom.id).toBe(base.id);
    expect(custom.primaryGoal).toEqual(base.primaryGoal);
    expect(custom.stretchGoal).toEqual(base.stretchGoal);
    expect(custom.durationHours).toBe(base.durationHours);
    expect(custom.systems).toEqual(base.systems);
    expect(custom.scripted).toEqual(base.scripted);
    expect(custom.briefingKey).toBe(base.briefingKey);
    expect(custom.scienceTargetPoints).toBe(base.scienceTargetPoints);
    expect(custom.body).toBe(base.body);
  });

  it("throws when the chosen site's body doesn't match the scenario's own body", () => {
    const base = getScenario("jezero-outpost"); // mars
    expect(() =>
      buildCustomScenario(base, { ...choices, landingSiteId: "MOON-EQUATORIAL" }),
    ).toThrow(/moon site.*mars|is a moon site, but scenario/);
  });

  it("hullOnly leaves the base scenario's own shieldingGPerCm2 and potableWaterKg unchanged", () => {
    const base = getScenario("jezero-outpost");
    const custom = buildCustomScenario(base, choices);
    expect(custom.initial.shieldingGPerCm2).toBe(base.initial.shieldingGPerCm2);
    expect(custom.initial.potableWaterKg).toBe(base.initial.potableWaterKg);
  });

  it("waterWall adds exactly 2000 kg of potable water, regolithBerm adds a shielding delta instead", () => {
    const base = getScenario("jezero-outpost");
    const withWaterWall = buildCustomScenario(base, { ...choices, shieldingApproach: "waterWall" });
    const withBerm = buildCustomScenario(base, { ...choices, shieldingApproach: "regolithBerm" });

    expect(withWaterWall.initial.potableWaterKg).toBe(base.initial.potableWaterKg + 2000);
    expect(withWaterWall.initial.shieldingGPerCm2).toBe(base.initial.shieldingGPerCm2);

    expect(withBerm.initial.potableWaterKg).toBe(base.initial.potableWaterKg);
    expect(withBerm.initial.shieldingGPerCm2).toBeGreaterThan(base.initial.shieldingGPerCm2);
  });
});

describe("scenario-override plumbing — a matching override changes nothing (brief rule 2)", () => {
  it("createInitialState: explicit base scenario == the default lookup, byte for byte", () => {
    const base = getScenario(params.scenarioId);
    const withDefault = createInitialState(params);
    const withExplicit = createInitialState(params, base);
    expect(withExplicit).toEqual(withDefault);
  });

  it("createRun: explicit base scenario == the default lookup, byte for byte", () => {
    const base = getScenario(params.scenarioId);
    expect(createRun(params, base)).toEqual(createRun(params));
  });

  it("runScenario: explicit base scenario == the default lookup, byte for byte, including the log", () => {
    const base = getScenario(params.scenarioId);
    const withDefault = runScenario(params, 0);
    const withExplicit = runScenario(params, 0, base);
    expect(withExplicit).toEqual(withDefault);
  });

  it("a genuinely custom scenario produces a different (but still deterministic) run", () => {
    const base = getScenario(params.scenarioId);
    const custom = buildCustomScenario(base, choices);
    const a = run(createInitialState(params, custom), params, custom, 200);
    const b = run(createInitialState(params, custom), params, custom, 200);
    expect(a).toEqual(b); // still deterministic

    const baseline = run(createInitialState(params), params, base, 200);
    expect(a).not.toEqual(baseline); // but genuinely different from the unmodified scenario
  });
});

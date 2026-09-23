/**
 * Pins the condition-ladder boundaries and the PIO2 conversion directly against
 * docs/INCIDENTS_AND_THRESHOLDS.md's own numbers (Phase 2 brief, M7 plan §1) — not against
 * whatever models/crew.ts happens to compute, so a future refactor that quietly drifts a
 * threshold fails here rather than only showing up as "the game feels different".
 */
import { describe, expect, it } from "vitest";
import { crewCondition, physiology, pio2MmHg, radiation as radConstants, worstCauseCode } from "../index.js";
import type { CrewMember } from "../types.js";

function member(overrides: Partial<CrewMember> = {}): CrewMember {
  return {
    id: "crew-1",
    name: "Ayesha",
    location: "habitat",
    healthFraction: 1,
    moraleFraction: 1,
    cumulativeDoseMSv: 0,
    eventDoseMSv: 0,
    bodyTempC: 37,
    alive: true,
    hydrationClock: 0,
    starvationClock: 0,
    hypothermiaClock: 0,
    hypoxiaClock: 0,
    injuryFraction: 0,
    fatigueFraction: 0,
    heatStressClock: 0,
    pio2MmHg: physiology.pio2NormoxiaLowMmHg.value,
    primaryStation: "lifeSupport",
    backupStation: "power",
    ...overrides,
  };
}

describe("condition ladder boundaries (docs/INCIDENTS_AND_THRESHOLDS.md)", () => {
  it("a fully nominal member is nominal", () => {
    expect(crewCondition(member())).toBe("nominal");
  });

  it("hydration clock crosses impaired/critical/lost at its own stated fractions", () => {
    expect(crewCondition(member({ hydrationClock: physiology.hydrationImpairedFraction.value - 0.01 }))).toBe(
      "nominal",
    );
    expect(crewCondition(member({ hydrationClock: physiology.hydrationImpairedFraction.value }))).toBe("impaired");
    expect(crewCondition(member({ hydrationClock: physiology.hydrationCriticalFraction.value }))).toBe("critical");
    expect(crewCondition(member({ hydrationClock: 1 }))).toBe("lost");
  });

  it("starvation clock crosses impaired/critical/lost at its own stated fractions", () => {
    expect(crewCondition(member({ starvationClock: physiology.starvationImpairedFraction.value - 0.01 }))).toBe(
      "nominal",
    );
    expect(crewCondition(member({ starvationClock: physiology.starvationImpairedFraction.value }))).toBe("impaired");
    expect(crewCondition(member({ starvationClock: physiology.starvationCriticalFraction.value }))).toBe("critical");
    expect(crewCondition(member({ starvationClock: 1 }))).toBe("lost");
  });

  it("hypothermia clock crosses impaired/critical/lost at its own stated fractions", () => {
    expect(crewCondition(member({ hypothermiaClock: physiology.hypothermiaImpairedFraction.value - 0.01 }))).toBe(
      "nominal",
    );
    expect(crewCondition(member({ hypothermiaClock: physiology.hypothermiaImpairedFraction.value }))).toBe(
      "impaired",
    );
    expect(crewCondition(member({ hypothermiaClock: physiology.hypothermiaCriticalFraction.value }))).toBe(
      "critical",
    );
    expect(crewCondition(member({ hypothermiaClock: 1 }))).toBe("lost");
  });

  it("hypoxia is read from PIO2 bands, not the hypoxia clock, until the clock itself reaches 1", () => {
    expect(crewCondition(member({ pio2MmHg: physiology.pio2HypoxiaLowerLimitMmHg.value - 1 }))).toBe("impaired");
    expect(crewCondition(member({ pio2MmHg: physiology.pio2CriticalMmHg.value - 1 }))).toBe("critical");
    expect(crewCondition(member({ hypoxiaClock: 1, pio2MmHg: physiology.pio2NormoxiaLowMmHg.value }))).toBe("lost");
  });

  it("acute dose crosses impaired/critical/lost at the ARS thresholds", () => {
    expect(crewCondition(member({ eventDoseMSv: radConstants.arsOnsetMSv.value }))).toBe("impaired");
    expect(crewCondition(member({ eventDoseMSv: radConstants.arsSevereMSv.value }))).toBe("critical");
    expect(crewCondition(member({ eventDoseMSv: radConstants.arsLethalMSv.value }))).toBe("lost");
  });

  it("fatigue caps at impaired — never independently lethal", () => {
    expect(crewCondition(member({ fatigueFraction: 1 }))).toBe("impaired");
  });

  it("an alive member with a fully-tripped clock is worse than a partially tripped one, worst-of wins", () => {
    expect(
      crewCondition(
        member({ hydrationClock: physiology.hydrationImpairedFraction.value, starvationClock: 1 }),
      ),
    ).toBe("lost");
  });

  it("a dead member is always lost, regardless of clocks", () => {
    expect(crewCondition(member({ alive: false }))).toBe("lost");
  });
});

describe("PIO2 conversion (OCHMO-TB-003, docs/INCIDENTS_AND_THRESHOLDS.md S1.1)", () => {
  it("is algebraically exact against ppO2 - 47 x FO2, not merely close", () => {
    const o2 = 160;
    const co2 = 3;
    const diluent = physiology.diluentGasPressureMmHg.value;
    const total = o2 + co2 + diluent;
    const fo2 = o2 / total;
    const expected = o2 - physiology.waterVapourPressureBodyMmHg.value * fo2;

    expect(pio2MmHg(o2, co2)).toBeCloseTo(expected, 9);
  });

  it("falls below the mild-hypoxia PIO2 band even while cabin ppO2 alone still reads normoxic", () => {
    // The exact scenario docs/INCIDENTS_AND_THRESHOLDS.md S1.1 warns about: "a cabin can sit
    // above 127 mmHg ppO2 and still be hypoxic once this correction is applied."
    const o2 = 130; // above the 127 mmHg cabin ppO2 hypoxia line on its own
    const co2 = 1;
    const pio2 = pio2MmHg(o2, co2);
    expect(o2).toBeGreaterThan(physiology.pio2HypoxiaLowerLimitMmHg.value);
    expect(pio2).toBeLessThan(physiology.pio2HypoxiaLowerLimitMmHg.value);
  });
});

describe("worstCauseCode (Black Box cause, not just \"someone died\")", () => {
  it("attributes each lethal clock to its own distinct code", () => {
    expect(worstCauseCode(member({ eventDoseMSv: radConstants.arsLethalMSv.value }))).toBe("crew.lost.radiation");
    expect(worstCauseCode(member({ hypoxiaClock: 1 }))).toBe("crew.lost.hypoxia");
    expect(worstCauseCode(member({ hydrationClock: 1 }))).toBe("crew.lost.thirst");
    expect(worstCauseCode(member({ starvationClock: 1 }))).toBe("crew.lost.starvation");
    expect(worstCauseCode(member({ hypothermiaClock: 1 }))).toBe("crew.lost.hypothermia");
    expect(worstCauseCode(member())).toBe("crew.lost");
  });

  it("radiation takes priority when multiple clocks are simultaneously tripped", () => {
    expect(
      worstCauseCode(member({ eventDoseMSv: radConstants.arsLethalMSv.value, hydrationClock: 1, starvationClock: 1 })),
    ).toBe("crew.lost.radiation");
  });
});

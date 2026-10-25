import { describe, it, expect } from "vitest";
import {
  crisisApollo13Co2,
  crisisSpe1972,
  crisisMirFire,
  firstLight,
  isCrisisScenario,
  createRun,
  tick,
} from "../index.js";

describe("M9.3 — Historical Crisis Scenarios", () => {
  it("recognizes crisis scenarios with isCrisisScenario", () => {
    expect(isCrisisScenario(crisisApollo13Co2)).toBe(true);
    expect(isCrisisScenario(crisisSpe1972)).toBe(true);
    expect(isCrisisScenario(crisisMirFire)).toBe(true);
    expect(isCrisisScenario(firstLight)).toBe(false);
  });

  describe("crisis-apollo13-co2", () => {
    it("initializes entryState with LM Aquarius constraints", () => {
      const state = createRun(
        {
          scenarioId: "crisis-apollo13-co2",
          crewSize: 3,
          difficulty: "nominal",
          seed: 12345,
          missionStartIso: "1970-04-11T19:13:00Z",
        },
        crisisApollo13Co2,
      );

      expect(state.atmosphere.habitatVolumeM3).toBe(6.7);
      expect(state.atmosphere.o2PartialPressureMmHg).toBe(258);
      expect(state.atmosphere.co2PartialPressureMmHg).toBe(3.8);
      expect(state.atmosphere.scrubberEfficiencyFraction).toBeCloseTo(2 / 3);
      expect(state.activeIncidents.some((i) => i.definitionId === "o2tank-apollo13")).toBe(true);
      expect(crisisApollo13Co2.availableMaterials.length).toBeGreaterThanOrEqual(5);
    });

    it("rises toward historical peak ppCO2 without intervention", () => {
      let state = createRun(
        {
          scenarioId: "crisis-apollo13-co2",
          crewSize: 3,
          difficulty: "nominal",
          seed: 12345,
          missionStartIso: "1970-04-11T19:13:00Z",
        },
        crisisApollo13Co2,
      );

      const initialCo2 = state.atmosphere.co2PartialPressureMmHg;
      // Advance by 4 hours with no intervention
      for (let h = 0; h < 4; h++) {
        state = tick(
          state,
          {
            scenarioId: "crisis-apollo13-co2",
            crewSize: 3,
            difficulty: "nominal",
            seed: 12345,
            missionStartIso: "1970-04-11T19:13:00Z",
          },
          crisisApollo13Co2,
        );
      }

      // Without scrubber repair, ppCO2 should have risen significantly
      expect(state.atmosphere.co2PartialPressureMmHg).toBeGreaterThan(initialCo2);
    });

    it("does not prematurely auto-default the Apollo 13 decision within 2 hours", () => {
      let state = createRun(
        {
          scenarioId: "crisis-apollo13-co2",
          crewSize: 3,
          difficulty: "nominal",
          seed: 12345,
          missionStartIso: "1970-04-11T19:13:00Z",
        },
        crisisApollo13Co2,
      );

      // Advance by 3 hours
      for (let h = 0; h < 3; h++) {
        state = tick(
          state,
          {
            scenarioId: "crisis-apollo13-co2",
            crewSize: 3,
            difficulty: "nominal",
            seed: 12345,
            missionStartIso: "1970-04-11T19:13:00Z",
          },
          crisisApollo13Co2,
        );
      }

      const incident = state.activeIncidents.find((i) => i.definitionId === "o2tank-apollo13");
      // Must NOT have timed out to "noResponse"
      expect(incident?.chosenResponseId).toBeUndefined();
    });
  });

  describe("crisis-spe-1972", () => {
    it("initializes with active SPE and 2 EVA crew members", () => {
      const state = createRun(
        {
          scenarioId: "crisis-spe-1972",
          crewSize: 3,
          difficulty: "nominal",
          seed: 12345,
          missionStartIso: "1972-08-04T06:00:00Z",
        },
        crisisSpe1972,
      );

      expect(state.radiation.solarParticleEventActive).toBe(true);
      expect(state.activeIncidents.some((i) => i.definitionId === "spe-1972")).toBe(true);

      const evaCrew = state.crew.filter((c) => c.location === "eva");
      const habCrew = state.crew.filter((c) => c.location === "habitat");
      expect(evaCrew.length).toBe(2);
      expect(habCrew.length).toBe(1);
    });

    it("maintains comfortable habitat temperature while EVA crew accumulates acute proton dose", () => {
      let state = createRun(
        {
          scenarioId: "crisis-spe-1972",
          crewSize: 3,
          difficulty: "nominal",
          seed: 12345,
          missionStartIso: "1972-08-04T06:00:00Z",
        },
        crisisSpe1972,
      );

      // Tick 1 hour
      state = tick(
        state,
        {
          scenarioId: "crisis-spe-1972",
          crewSize: 3,
          difficulty: "nominal",
          seed: 12345,
          missionStartIso: "1972-08-04T06:00:00Z",
        },
        crisisSpe1972,
      );

      // Habitat temperature must not freeze (should stay > 18 deg C)
      expect(state.thermal.habitatTempC).toBeGreaterThan(18);

      // EVA crew must accumulate significant dose (>100 mSv ARS threshold in ~1 hour of >400 rem flux)
      const evaCrew = state.crew.filter((c) => c.location === "eva");
      expect(evaCrew.length).toBe(2);
      for (const member of evaCrew) {
        expect(member.cumulativeDoseMSv).toBeGreaterThan(100);
      }
    });

    it("evaluates key metric properly for sheltered vs exposed crew", () => {
      const state = createRun(
        {
          scenarioId: "crisis-spe-1972",
          crewSize: 3,
          difficulty: "nominal",
          seed: 12345,
          missionStartIso: "1972-08-04T06:00:00Z",
        },
        crisisSpe1972,
      );

      const metric = crisisSpe1972.historicalOutcome.keyMetric;
      expect(metric.historicalValue).toBe(250);
      expect(metric.unit).toBe("mSv");
      expect(typeof metric.playerValue(state)).toBe("number");
    });
  });

  describe("crisis-mir-fire", () => {
    it("initializes Kvant-1 fire with extinguishers and respirators", () => {
      const state = createRun(
        {
          scenarioId: "crisis-mir-fire",
          crewSize: 6,
          difficulty: "nominal",
          seed: 12345,
          missionStartIso: "1997-02-23T19:35:00Z",
        },
        crisisMirFire,
      );

      expect(state.safetyConsumables.fireExtinguishers).toBe(3);
      expect(state.safetyConsumables.respiratorCartridges).toBe(4);
      expect(state.crew.length).toBe(6);
      expect(state.activeIncidents.some((i) => i.definitionId === "fire-mir97")).toBe(true);
    });

    it("evaluates historical outcome metric on fight vs ignore response", () => {
      const state = createRun(
        {
          scenarioId: "crisis-mir-fire",
          crewSize: 6,
          difficulty: "nominal",
          seed: 12345,
          missionStartIso: "1997-02-23T19:35:00Z",
        },
        crisisMirFire,
      );

      const incident = state.activeIncidents.find((i) => i.definitionId === "fire-mir97")!;
      incident.chosenResponseId = "fight";

      const metric = crisisMirFire.historicalOutcome.keyMetric;
      expect(metric.historicalValue).toBe(14);
      expect(metric.unit).toBe("min");
      expect(metric.playerValue(state)).toBe(14);

      incident.chosenResponseId = "evacuate";
      expect(metric.playerValue(state)).toBe(30);
    });
  });

  describe("Replay state isolation across restarts", () => {
    it("starts fresh after Apollo 13 decision was made in a previous run", () => {
      const params = {
        scenarioId: "crisis-apollo13-co2" as const,
        crewSize: 3,
        difficulty: "nominal" as const,
        seed: 1,
        missionStartIso: "1970-04-11T19:13:00Z",
      };

      // Run 1: Player improvises adapter and modifies system
      const run1 = createRun(params, crisisApollo13Co2);
      const inc1 = run1.activeIncidents.find((i) => i.definitionId === "o2tank-apollo13")!;
      inc1.chosenResponseId = "improviseAdapter";
      inc1.resolvedAtHour = 1;
      run1.systems.co2Scrubber!.operational = true;

      // Run 2: Re-initialized run must be completely pristine
      const run2 = createRun(params, crisisApollo13Co2);
      const inc2 = run2.activeIncidents.find((i) => i.definitionId === "o2tank-apollo13")!;
      expect(inc2.chosenResponseId).toBeUndefined();
      expect(inc2.resolvedAtHour).toBeUndefined();
      expect(run2.systems.co2Scrubber!.operational).toBe(false);
    });

    it("restores original EVA/habitat locations for SPE 1972 crew on replay restart", () => {
      const params = {
        scenarioId: "crisis-spe-1972" as const,
        crewSize: 3,
        difficulty: "nominal" as const,
        seed: 1,
        missionStartIso: "1972-08-04T06:00:00Z",
      };

      // Run 1: Shelter all crew members
      const run1 = createRun(params, crisisSpe1972);
      for (const m of run1.crew) {
        m.location = "stormShelter";
      }

      // Run 2: Must restore Commander & LMP to EVA, CMP to habitat
      const run2 = createRun(params, crisisSpe1972);
      const commander = run2.crew.find((c) => c.id === "cdr")!;
      const lmp = run2.crew.find((c) => c.id === "lmp")!;
      const cmp = run2.crew.find((c) => c.id === "cmp")!;

      expect(commander.location).toBe("eva");
      expect(lmp.location).toBe("eva");
      expect(cmp.location).toBe("habitat");
    });

    it("resets safety consumables and incident state on Mir Fire restart", () => {
      const params = {
        scenarioId: "crisis-mir-fire" as const,
        crewSize: 6,
        difficulty: "nominal" as const,
        seed: 1,
        missionStartIso: "1997-02-23T19:35:00Z",
      };

      // Run 1: Extinguishers depleted
      const run1 = createRun(params, crisisMirFire);
      run1.safetyConsumables.fireExtinguishers = 0;
      run1.safetyConsumables.respiratorCartridges = 0;
      const inc1 = run1.activeIncidents.find((i) => i.definitionId === "fire-mir97")!;
      inc1.chosenResponseId = "fight";

      // Run 2: Must reset to 3 extinguishers and 4 cartridges, incident unresolved
      const run2 = createRun(params, crisisMirFire);
      expect(run2.safetyConsumables.fireExtinguishers).toBe(3);
      expect(run2.safetyConsumables.respiratorCartridges).toBe(4);
      const inc2 = run2.activeIncidents.find((i) => i.definitionId === "fire-mir97")!;
      expect(inc2.chosenResponseId).toBeUndefined();
    });
  });
});

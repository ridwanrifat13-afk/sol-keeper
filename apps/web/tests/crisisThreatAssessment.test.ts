import { describe, expect, it } from "vitest";
import {
  createRun,
  crisisApollo13Co2,
  crisisSpe1972,
  crisisMirFire,
} from "@sol-keeper/sim";
import { assessCrisisOutcome } from "../src/dial/crisisThreatAssessment.js";

describe("crisisThreatAssessment", () => {
  describe("Apollo 13 (crisis-apollo13-co2)", () => {
    it("evaluates clean nominal outcome when LiOH adapter is improvised", () => {
      const state = createRun(
        {
          scenarioId: "crisis-apollo13-co2",
          crewSize: 3,
          difficulty: "nominal",
          seed: 1,
          missionStartIso: "1970-04-11T19:13:00Z",
        },
        crisisApollo13Co2,
      );

      const incident = state.activeIncidents.find((i) => i.definitionId === "o2tank-apollo13")!;
      incident.chosenResponseId = "improviseAdapter";
      incident.resolvedAtHour = 1;
      state.atmosphere.co2PartialPressureMmHg = 3.8;

      const assessment = assessCrisisOutcome(crisisApollo13Co2, state);
      expect(assessment.isCrisis).toBe(true);
      expect(assessment.outcomeLevel).toBe("nominal");
      expect(assessment.badgeHeadline).toContain("Improvised LiOH Adapter Installed");
      expect(assessment.threatsAndCautions.length).toBeGreaterThanOrEqual(3);
      expect(assessment.threatsAndCautions[0]).toContain("Command Module canisters successfully modified");
    });

    it("evaluates critical hazard when Apollo 13 is unresolved and CO2 surges", () => {
      const state = createRun(
        {
          scenarioId: "crisis-apollo13-co2",
          crewSize: 3,
          difficulty: "nominal",
          seed: 1,
          missionStartIso: "1970-04-11T19:13:00Z",
        },
        crisisApollo13Co2,
      );

      state.atmosphere.co2PartialPressureMmHg = 16.5;

      const assessment = assessCrisisOutcome(crisisApollo13Co2, state);
      expect(assessment.isCrisis).toBe(true);
      expect(assessment.outcomeLevel).toBe("critical");
      expect(assessment.badgeHeadline).toContain("Critical Hypercapnia Hazard");
      expect(assessment.threatsAndCautions.some((t) => t.includes("Lethal hypercapnia"))).toBe(true);
    });
  });

  describe("SPE 1972 (crisis-spe-1972)", () => {
    it("evaluates nominal outcome when all crew sheltered in regolith shelter", () => {
      const state = createRun(
        {
          scenarioId: "crisis-spe-1972",
          crewSize: 3,
          difficulty: "nominal",
          seed: 1,
          missionStartIso: "1972-08-04T06:00:00Z",
        },
        crisisSpe1972,
      );

      for (const m of state.crew) {
        m.location = "stormShelter";
        m.cumulativeDoseMSv = 30;
      }

      const assessment = assessCrisisOutcome(crisisSpe1972, state);
      expect(assessment.isCrisis).toBe(true);
      expect(assessment.outcomeLevel).toBe("nominal");
      expect(assessment.badgeHeadline).toContain("Regolith Storm Shelter Protected Crew");
      expect(assessment.badgeDetail).toContain("30 mSv");
    });

    it("evaluates critical hazard when unshielded EVA crew sustains ARS dose", () => {
      const state = createRun(
        {
          scenarioId: "crisis-spe-1972",
          crewSize: 3,
          difficulty: "nominal",
          seed: 1,
          missionStartIso: "1972-08-04T06:00:00Z",
        },
        crisisSpe1972,
      );

      const lmp = state.crew.find((c) => c.id === "lmp")!;
      lmp.location = "eva";
      lmp.cumulativeDoseMSv = 150;

      const assessment = assessCrisisOutcome(crisisSpe1972, state);
      expect(assessment.isCrisis).toBe(true);
      expect(assessment.outcomeLevel).toBe("critical");
      expect(assessment.badgeHeadline).toContain("Acute Radiation Syndrome Hazard");
      expect(assessment.badgeDetail).toContain("150 mSv");
    });
  });

  describe("Mir Fire 1997 (crisis-mir-fire)", () => {
    it("evaluates nominal outcome when fire is fought with extinguishers", () => {
      const state = createRun(
        {
          scenarioId: "crisis-mir-fire",
          crewSize: 6,
          difficulty: "nominal",
          seed: 1,
          missionStartIso: "1997-02-23T19:35:00Z",
        },
        crisisMirFire,
      );

      const incident = state.activeIncidents.find((i) => i.definitionId === "fire-mir97")!;
      incident.chosenResponseId = "fight";
      incident.resolvedAtHour = 1;
      state.safetyConsumables.fireExtinguishers = 1; // 2 used

      const assessment = assessCrisisOutcome(crisisMirFire, state);
      expect(assessment.isCrisis).toBe(true);
      expect(assessment.outcomeLevel).toBe("nominal");
      expect(assessment.badgeHeadline).toContain("Mir Fire Extinguished");
      expect(assessment.badgeDetail).toContain("2 extinguisher(s) spent");
    });

    it("evaluates critical hazard when fire burns uncontained", () => {
      const state = createRun(
        {
          scenarioId: "crisis-mir-fire",
          crewSize: 6,
          difficulty: "nominal",
          seed: 1,
          missionStartIso: "1997-02-23T19:35:00Z",
        },
        crisisMirFire,
      );

      const assessment = assessCrisisOutcome(crisisMirFire, state);
      expect(assessment.isCrisis).toBe(true);
      expect(assessment.outcomeLevel).toBe("critical");
      expect(assessment.badgeHeadline).toContain("Uncontrolled Fire Hazard");
    });
  });
});

/**
 * The three Reality Dial log-text tables were hand-written, 105 strings across three
 * levels covering the same ~35 codes. That is exactly the kind of surface a typo silently
 * survives on — a missing key just falls back to specialist, which looks fine in a casual
 * read-through and is wrong. These tests check the tables mechanically instead.
 */
import { describe, expect, it } from "vitest";
import type { LogEntry } from "@sol-keeper/sim";
import {
  CADET_LOG_TEMPLATES,
  COMMANDER_LOG_TEMPLATES,
  EN_LOG_TEMPLATES,
  hasTemplate,
  logText,
} from "../src/i18n/logText";
import { DIAL_LEVELS } from "../src/dial/types";

function entry(overrides: Partial<LogEntry>): LogEntry {
  return {
    id: "1:0",
    hour: 1,
    kind: "resource",
    severity: "warning",
    code: "power.brownout",
    data: {},
    ...overrides,
  };
}

describe("Reality Dial log templates", () => {
  it("all three levels cover exactly the same set of codes", () => {
    const specialistCodes = Object.keys(EN_LOG_TEMPLATES).sort();
    const cadetCodes = Object.keys(CADET_LOG_TEMPLATES).sort();
    const commanderCodes = Object.keys(COMMANDER_LOG_TEMPLATES).sort();

    expect(cadetCodes).toEqual(specialistCodes);
    expect(commanderCodes).toEqual(specialistCodes);
  });

  it("covers every code the sim's models actually log", () => {
    // A sample drawn from every model file's log.log/logEdge calls (packages/sim/src/models,
    // engine/events.ts, engine/tick.ts). If a model gains a new code, this fails and says so,
    // rather than the code silently rendering as its own machine name in the mission log.
    const codesTheSimLogs = [
      "power.brownout",
      "power.systemShed",
      "power.batteryDepleted",
      "thermal.heaterUnpowered",
      "thermal.freezeRisk",
      "atmosphere.scrubberOffline",
      "atmosphere.co2AboveLimit",
      "atmosphere.lowOxygen",
      "water.recoveryOffline",
      "water.belowOneDayReserve",
      "water.insufficientForElectrolysis",
      "food.growLightsOff",
      "food.lowReserve",
      "food.exhausted",
      "food.harvest",
      "radiation.aboveDesignTarget",
      "radiation.careerLimitExceeded",
      "radiation.eventLimitExceeded",
      "crew.cold",
      "crew.noWater",
      "crew.lost",
      "hazard.dustStorm.start",
      "hazard.dustStorm.obscuring",
      "hazard.solarParticleEvent.start",
      "hazard.spe.crewExposed",
      "hazard.pumpFailure.start",
      "hazard.pumpFailure",
      "hazard.cropBlight.start",
      "hazard.cropBlight",
      "system.failure",
      "system.repaired",
      "isru.passedMoxieMissionTotal",
      "comms.blackoutStart",
      "comms.blackoutEnd",
      "end.missionComplete",
      "end.crewLost",
    ];

    for (const level of DIAL_LEVELS) {
      const missing = codesTheSimLogs.filter((code) => !hasTemplate(code, level));
      expect(missing, `${level} is missing templates for: ${missing.join(", ")}`).toEqual([]);
    }
  });

  it("interpolates a system id through its friendly label at every level, not raw", () => {
    const e = entry({ code: "power.systemShed", system: "co2Scrubber", data: { powerKw: 1.2 } });
    for (const level of DIAL_LEVELS) {
      const text = logText(e, level);
      expect(text).not.toContain("co2Scrubber");
    }
    expect(logText(e, "specialist")).toContain("CO₂ scrubber");
    expect(logText(e, "cadet")).toContain("air cleaner");
  });

  it("interpolates a crew location through its friendly label, not the raw enum", () => {
    const e = entry({
      code: "hazard.spe.crewExposed",
      data: { crew: "Ayesha", location: "stormShelter" },
    });
    for (const level of DIAL_LEVELS) {
      expect(logText(e, level)).not.toContain("stormShelter");
    }
  });

  it("interpolates a crop id through its friendly label", () => {
    const e = entry({
      code: "food.harvest",
      data: { harvestKg: 2.5, crop: "lettuce", tray: "tray-1" },
    });
    expect(logText(e, "specialist")).toContain("lettuce");
    expect(logText(e, "cadet")).toContain("lettuce");
    expect(logText(e, "cadet")).toContain("🥬");
  });

  it("interpolates a survival mode through its friendly label", () => {
    const e = entry({
      code: "atmosphere.co2AboveLimit",
      data: { co2MmHg: 5, limitMmHg: 3, mode: "mode1" },
    });
    expect(logText(e, "commander")).not.toContain("mode1");
    expect(logText(e, "commander")).toContain("Reduced");
  });

  it("an unknown code falls back to the raw code rather than throwing", () => {
    const e = entry({ code: "totally.unknown.code" });
    expect(logText(e)).toBe("totally.unknown.code");
  });

  it("defaults to specialist when no level is given", () => {
    const e = entry({ code: "crew.lost", data: { crew: "Diego", hour: 400 } });
    expect(logText(e)).toBe(logText(e, "specialist"));
  });
});

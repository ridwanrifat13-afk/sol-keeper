/**
 * Every timestamp in the UI used to say "Sol X.XX" unconditionally, converting through the
 * Mars sol length even for a body where that unit does not apply. These tests pin the fix:
 * the word and the conversion both follow `body`, not a hardcoded assumption.
 */
import { describe, expect, it } from "vitest";
import { environment, units } from "@sol-keeper/sim";
import { durationLabel, elapsedValue, timeUnitWord, timestampLabel } from "../src/dial/missionTime";

describe("missionTime", () => {
  it("says Sol on Mars and Day on the Moon", () => {
    expect(timeUnitWord("mars")).toBe("Sol");
    expect(timeUnitWord("moon")).toBe("Day");
  });

  it("converts through the Mars sol length on Mars, and Earth days on the Moon", () => {
    const hours = 100;
    expect(elapsedValue(hours, "mars")).toBeCloseTo(units.hoursToSols(hours), 6);
    expect(elapsedValue(hours, "moon")).toBeCloseTo(hours / 24, 6);
    // The two must differ, since a Mars sol (24.6597 h) is not an Earth day (24 h) — if this
    // ever matched, it would mean the Moon path had quietly started using the Mars sol again.
    expect(elapsedValue(hours, "mars")).not.toBeCloseTo(elapsedValue(hours, "moon"), 3);
  });

  it("formats a full timestamp with the right word and precision", () => {
    expect(timestampLabel(units.SOL_HOURS, "mars", 2)).toBe("Sol 1.00");
    expect(timestampLabel(24, "moon", 2)).toBe("Day 1.00");
  });

  it("formats a duration as a whole-number count", () => {
    expect(durationLabel(units.SOL_HOURS * 30, "mars")).toBe("30 sols");
    expect(durationLabel(24 * 14, "moon")).toBe("14 days");
  });

  it("354 lunar-night hours reads as about 15 days, not 14 Mars sols", () => {
    const nightHours = environment.lunarNightHours.value;
    expect(durationLabel(nightHours, "moon")).toBe("15 days");
    // The bug this whole module exists to prevent: converting through the Mars sol length
    // would have shown "14 sols" for a lunar-night duration, the wrong word and a value off
    // by the sol/day length difference.
    expect(durationLabel(nightHours, "moon")).not.toContain("sols");
  });
});

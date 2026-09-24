import { describe, expect, it } from "vitest";
import { gaugeHelp, hasGaugeHelp } from "../src/i18n/gaugeHelp";
import { DIAL_LEVELS } from "../src/dial/types";

// The 6 gauges Gauge.tsx is actually given a helpKey for (LifeSupportConsole/PowerConsole) —
// no sim-side registry of "gauge keys" exists to derive this from, unlike the incident/goal
// coverage tests, so this list is the source of truth and must be kept in sync by hand.
const GAUGE_KEYS = ["gauge.oxygen", "gauge.co2", "gauge.water", "gauge.food", "gauge.battery", "gauge.cabin"];

describe("Gauge help text", () => {
  it("covers every gauge key at all three levels", () => {
    for (const level of DIAL_LEVELS) {
      const missing = GAUGE_KEYS.filter((key) => !hasGaugeHelp(key, level));
      expect(missing, `${level} is missing templates for: ${missing.join(", ")}`).toEqual([]);
    }
  });

  it("never falls back to the raw key for a declared key, at any level", () => {
    for (const key of GAUGE_KEYS) {
      for (const level of DIAL_LEVELS) {
        expect(gaugeHelp(key, level), `${level}/${key} rendered as its own raw key`).not.toBe(key);
      }
    }
  });

  it("an unknown key falls back to itself rather than throwing", () => {
    expect(gaugeHelp("totally.unknown.key", "specialist")).toBe("totally.unknown.key");
  });
});

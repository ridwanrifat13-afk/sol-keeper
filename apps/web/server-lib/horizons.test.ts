/**
 * Parsed against the real saved Horizons samples — the exact row layout (a two-token
 * date/time column before delta) only became clear from looking at a real response, so the
 * regression that matters most is "does this still parse the actual saved sample."
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildHorizonsUrl, nextDay, parseHorizonsResult } from "./horizons.js";

const samplesDir = fileURLToPath(new URL("../../../docs/api-samples/", import.meta.url));
const loadSample = (name: string): { result: string } =>
  JSON.parse(readFileSync(`${samplesDir}${name}`, "utf-8")) as { result: string };

describe("parseHorizonsResult", () => {
  it("parses the real Mars sample's first row to the expected AU distance", () => {
    const sample = loadSample("horizons_mars.json");
    const distance = parseHorizonsResult(sample.result);
    // The saved sample's first $$SOE row is "2026-Sep-18 00:00  1.75056628760467 -10.8266447".
    expect(distance.distanceAu).toBeCloseTo(1.75056628760467, 10);
    expect(distance.distanceKm).toBeCloseTo(1.75056628760467 * 149597870.7, 3);
    expect(distance.oneWayLightSeconds).toBeCloseTo(1.75056628760467 * 499.004784, 6);
  });

  it("parses the real Moon sample without throwing", () => {
    const sample = loadSample("horizons_moon.json");
    const distance = parseHorizonsResult(sample.result);
    expect(distance.distanceAu).toBeGreaterThan(0);
    // The Moon is a few hundred thousand km away, nowhere near Mars' distance in AU.
    expect(distance.distanceAu).toBeLessThan(0.01);
  });

  it("fails loudly rather than returning 0 when the data markers are missing", () => {
    expect(() => parseHorizonsResult("no markers here")).toThrow(/\$\$SOE/);
  });

  it("fails loudly on an empty data block", () => {
    expect(() => parseHorizonsResult("$$SOE\n$$EOE")).toThrow(/no ephemeris rows/);
  });

  it("fails loudly when a row doesn't parse to a finite number", () => {
    expect(() => parseHorizonsResult("$$SOE\n 2026-Sep-18 00:00 not-a-number -1\n$$EOE")).toThrow(
      /did not parse/,
    );
  });
});

describe("buildHorizonsUrl", () => {
  it("selects the right target body command (499 Mars, 301 Moon)", () => {
    expect(buildHorizonsUrl("mars", "2026-09-18", "2026-09-19")).toContain("COMMAND=%27499%27");
    expect(buildHorizonsUrl("moon", "2026-09-18", "2026-09-19")).toContain("COMMAND=%27301%27");
  });

  it("is geocentric (CENTER=500@399), matching the brief's contract", () => {
    expect(buildHorizonsUrl("mars", "2026-09-18", "2026-09-19")).toContain("CENTER=%27500%40399%27");
  });
});

describe("nextDay", () => {
  it("advances one calendar day, including across a month boundary", () => {
    expect(nextDay("2026-09-18")).toBe("2026-09-19");
    expect(nextDay("2026-09-30")).toBe("2026-10-01");
  });
});

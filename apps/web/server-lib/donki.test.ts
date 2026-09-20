/**
 * Parser tests against the real saved DONKI samples in docs/api-samples/, not hand-built
 * fixtures — the field-name differences between FLR/SEP/CME/GST are exactly the kind of
 * thing a hand-written fixture would get conveniently, silently wrong.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mergeSpaceWeatherEvents, normalizeDonkiEvents } from "./donki.js";

const samplesDir = fileURLToPath(new URL("../../../docs/api-samples/", import.meta.url));
const loadSample = (name: string): unknown => JSON.parse(readFileSync(`${samplesDir}${name}`, "utf-8"));

describe("normalizeDonkiEvents", () => {
  it("maps FLR's beginTime and classType, which SEP/CME/GST don't have", () => {
    const raw = loadSample("donki_FLR_2024-05.json");
    const events = normalizeDonkiEvents("FLR", raw);
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.type).toBe("FLR");
      expect(e.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
    expect(events.some((e) => e.classType !== undefined)).toBe(true);
  });

  it("maps SEP's eventTime, and never invents a classType SEP doesn't have", () => {
    const raw = loadSample("donki_SEP_2024-05.json");
    const events = normalizeDonkiEvents("SEP", raw);
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.type).toBe("SEP");
      expect(e).not.toHaveProperty("classType");
    }
  });

  it("maps CME's startTime (activityID is the id, not part of the contract shape)", () => {
    const raw = loadSample("donki_CME_2024-05.json");
    const events = normalizeDonkiEvents("CME", raw);
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.type).toBe("CME");
      expect(e.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("maps GST's startTime", () => {
    const raw = loadSample("donki_GST_2024-05.json");
    const events = normalizeDonkiEvents("GST", raw);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.type === "GST")).toBe(true);
  });

  it("an empty array (a real quiet-period response, not an error) normalizes to no events", () => {
    const raw = loadSample("donki_GST_recent.json");
    expect(raw).toEqual([]);
    expect(normalizeDonkiEvents("GST", raw)).toEqual([]);
  });

  it("non-array input (an unexpected shape) normalizes to no events rather than throwing", () => {
    expect(normalizeDonkiEvents("FLR", { unexpected: "shape" })).toEqual([]);
  });
});

describe("mergeSpaceWeatherEvents", () => {
  it("sorts the merged list newest-first across all four types", () => {
    const merged = mergeSpaceWeatherEvents({
      FLR: [{ type: "FLR", startTime: "2024-05-01T00:00Z" }],
      SEP: [{ type: "SEP", startTime: "2024-05-09T13:59Z" }],
      CME: [{ type: "CME", startTime: "2024-05-03T00:00Z" }],
      GST: [{ type: "GST", startTime: "2024-05-02T15:00Z" }],
    });
    expect(merged.map((e) => e.type)).toEqual(["SEP", "CME", "GST", "FLR"]);
  });
});

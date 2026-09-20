import { describe, expect, it } from "vitest";
import { IMAGE_QUERY_WHITELIST, parseBodyParam, parseDateParam, parseDaysParam, parseImageQueryParam } from "./validate.js";

describe("parseDaysParam", () => {
  it("defaults to 7 when absent", () => {
    const r = parseDaysParam(null);
    expect(r.ok && r.value).toBe(7);
  });

  it("accepts the full 1..60 range", () => {
    expect(parseDaysParam("1").ok).toBe(true);
    expect(parseDaysParam("60").ok).toBe(true);
  });

  it("rejects 0, 61, negative, non-integer, and non-numeric input", () => {
    for (const bad of ["0", "61", "-1", "3.5", "seven", ""]) {
      expect(parseDaysParam(bad).ok).toBe(false);
    }
  });
});

describe("parseBodyParam", () => {
  it("accepts exactly mars and moon", () => {
    expect(parseBodyParam("mars")).toEqual({ ok: true, value: "mars" });
    expect(parseBodyParam("moon")).toEqual({ ok: true, value: "moon" });
  });

  it("rejects anything else, including a body this project never simulates", () => {
    expect(parseBodyParam("earth").ok).toBe(false);
    expect(parseBodyParam(null).ok).toBe(false);
  });
});

describe("parseDateParam", () => {
  it("accepts a real calendar date in YYYY-MM-DD form", () => {
    expect(parseDateParam("2026-09-18")).toEqual({ ok: true, value: "2026-09-18" });
  });

  it("rejects a wrong format even if it looks date-like", () => {
    for (const bad of ["09/18/2026", "2026-9-18", "2026-09-18T00:00", "not-a-date", null]) {
      expect(parseDateParam(bad).ok).toBe(false);
    }
  });

  it("rejects a calendar date that does not exist, like Feb 30", () => {
    expect(parseDateParam("2026-02-30").ok).toBe(false);
  });
});

describe("parseImageQueryParam", () => {
  it("accepts every whitelisted key", () => {
    for (const key of Object.keys(IMAGE_QUERY_WHITELIST)) {
      expect(parseImageQueryParam(key).ok).toBe(true);
    }
  });

  it("rejects free-text search strings — this endpoint is not an open proxy", () => {
    expect(parseImageQueryParam("anything the caller wants").ok).toBe(false);
    expect(parseImageQueryParam(null).ok).toBe(false);
  });
});

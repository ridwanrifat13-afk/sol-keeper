/**
 * JPL Horizons: Earth-to-body distance and one-way light time, for the mission clock's
 * "how far away is home right now" readout.
 *
 * Horizons has no CORS headers, so this can only be called server-side, and it returns the
 * ephemeris as a text table embedded in a JSON `result` field rather than structured JSON.
 * The parser below is checked against the real saved samples in
 * docs/api-samples/horizons_{mars,moon}.json, not against Horizons' documentation alone —
 * the exact column layout (a two-token date/time column, then delta, then deldot) only
 * showed up by looking at a real response.
 */
import { units } from "@sol-keeper/sim";
import type { ApiBody } from "./validate.js";

const HORIZONS_COMMAND: Record<ApiBody, string> = {
  mars: "499",
  moon: "301",
};

/**
 * Builds the Horizons request for one calendar day: a one-day ephemeris window starting at
 * `date`, geocentric (CENTER=500@399, i.e. Earth's body center), stepped once so the table
 * between $$SOE/$$EOE holds exactly the row this endpoint needs.
 */
export function buildHorizonsUrl(body: ApiBody, date: string, stopDate: string): string {
  const params = new URLSearchParams({
    format: "json",
    COMMAND: `'${HORIZONS_COMMAND[body]}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'500@399'",
    START_TIME: `'${date}'`,
    STOP_TIME: `'${stopDate}'`,
    STEP_SIZE: "'1 d'",
    QUANTITIES: "'20'",
  });
  return `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
}

export interface HorizonsDistance {
  readonly distanceAu: number;
  readonly distanceKm: number;
  readonly oneWayLightSeconds: number;
}

/**
 * Parses the first ephemeris row out of a Horizons `result` text block.
 *
 * Fails loudly (throws) if the $$SOE/$$EOE markers or a usable row are missing, per the
 * brief — a parser that returned 0 on a malformed response would silently tell the player
 * Earth is next door.
 */
export function parseHorizonsResult(resultText: string): HorizonsDistance {
  const startIdx = resultText.indexOf("$$SOE");
  const endIdx = resultText.indexOf("$$EOE");
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error("Horizons response missing $$SOE/$$EOE data markers");
  }

  const block = resultText.slice(startIdx + "$$SOE".length, endIdx).trim();
  const firstLine = block.split("\n")[0]?.trim();
  if (!firstLine) {
    throw new Error("Horizons response has no ephemeris rows between $$SOE and $$EOE");
  }

  // A row looks like: "2026-Sep-18 00:00     1.75056628760467 -10.8266447" — the date and
  // time are two whitespace-separated tokens, so delta is the third token overall.
  const tokens = firstLine.split(/\s+/);
  const deltaAu = Number(tokens[2]);
  if (!Number.isFinite(deltaAu)) {
    throw new Error(`Horizons row did not parse to a finite delta: ${JSON.stringify(firstLine)}`);
  }

  return {
    distanceAu: deltaAu,
    distanceKm: units.auToKm(deltaAu),
    oneWayLightSeconds: units.auToLightSeconds(deltaAu),
  };
}

/** The day after `date`, as YYYY-MM-DD — Horizons wants a real STOP_TIME, not just START_TIME. */
export function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y as number, (m as number) - 1, (d as number) + 1));
  return next.toISOString().slice(0, 10);
}

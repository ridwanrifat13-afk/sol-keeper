/**
 * DONKI (Database Of Notifications, Knowledge, Information) parsing for the "Live Sky"
 * feature — real recent solar activity, normalized into the four event types the game's
 * radiation-storm hazard cares about.
 *
 * Field names genuinely differ per event type (checked against the saved samples in
 * docs/api-samples/, not guessed): FLR uses flrID/beginTime/classType, SEP uses
 * sepID/eventTime with no classType, CME uses activityID/startTime with no classType, and
 * GST uses gstID/startTime with no classType either. A single shared shape would either
 * invent fields that don't exist or silently drop real ones, so each type gets its own
 * mapping function rather than one generic one.
 */
import type { SpaceWeatherEvent, SpaceWeatherType } from "./types.js";

interface RawFlr {
  readonly flrID: string;
  readonly beginTime: string;
  readonly classType?: string;
  readonly link?: string;
}

interface RawSep {
  readonly sepID: string;
  readonly eventTime: string;
  readonly link?: string;
}

interface RawCme {
  readonly activityID: string;
  readonly startTime: string;
  readonly link?: string;
}

interface RawGst {
  readonly gstID: string;
  readonly startTime: string;
  readonly link?: string;
}

function normalizeFlr(raw: readonly RawFlr[]): SpaceWeatherEvent[] {
  return raw.map((e) => ({
    type: "FLR",
    startTime: e.beginTime,
    ...(e.classType !== undefined ? { classType: e.classType } : {}),
    ...(e.link !== undefined ? { link: e.link } : {}),
  }));
}

function normalizeSep(raw: readonly RawSep[]): SpaceWeatherEvent[] {
  return raw.map((e) => ({
    type: "SEP",
    startTime: e.eventTime,
    ...(e.link !== undefined ? { link: e.link } : {}),
  }));
}

function normalizeCme(raw: readonly RawCme[]): SpaceWeatherEvent[] {
  return raw.map((e) => ({
    type: "CME",
    startTime: e.startTime,
    ...(e.link !== undefined ? { link: e.link } : {}),
  }));
}

function normalizeGst(raw: readonly RawGst[]): SpaceWeatherEvent[] {
  return raw.map((e) => ({
    type: "GST",
    startTime: e.startTime,
    ...(e.link !== undefined ? { link: e.link } : {}),
  }));
}

/** Dispatches to the right per-type mapping. `raw` is whatever DONKI returned for that type. */
export function normalizeDonkiEvents(type: SpaceWeatherType, raw: unknown): SpaceWeatherEvent[] {
  if (!Array.isArray(raw)) return [];
  switch (type) {
    case "FLR":
      return normalizeFlr(raw as RawFlr[]);
    case "SEP":
      return normalizeSep(raw as RawSep[]);
    case "CME":
      return normalizeCme(raw as RawCme[]);
    case "GST":
      return normalizeGst(raw as RawGst[]);
  }
}

/** Merges normalized events from all four types, newest first — what the client renders. */
export function mergeSpaceWeatherEvents(byType: Record<SpaceWeatherType, SpaceWeatherEvent[]>): SpaceWeatherEvent[] {
  return Object.values(byType)
    .flat()
    .sort((a, b) => b.startTime.localeCompare(a.startTime));
}

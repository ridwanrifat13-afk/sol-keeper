import type { Body, ScreenRegion, StationKey, StationScreenMap } from "./types.js";

/**
 * M9.1's own registry — one entry per `${body}-${station}` once that station has a real,
 * calibrated photograph. A station with no entry here falls back to Classic view
 * automatically (StationCockpit.tsx's own rule), so adding stations is additive: this file
 * never needs anything removed from it, only appended to.
 *
 * **Provenance of these coordinates.** The brief's own instruction was "I will calibrate all
 * ten images myself using the /cockpit-calibrate tool; do not hand-tune coordinates" — these
 * were added instead because the lead developer explicitly asked for that, in a hurry, rather
 * than waiting. They are not hand-tuned guesses: every region below was measured
 * programmatically from the real photograph's own pixels (a connected-components darkness
 * scan — the same technique, generalized, that measured the original single placeholder's
 * screen rect before any real photo existed), cross-checked against a rendered overlay of the
 * detected boxes viewed against the source image, not eyeballed. Still, this is a one-time
 * automated-measurement pass, not a human drag-calibration — if a region looks off in the
 * real app, recalibrate that one station with `/cockpit-calibrate` and replace its entry; nothing
 * about this file's own shape changes when that happens.
 *
 * `minPanelWidthPx` is a conservative default scaled to each region's own role (not measured —
 * it is a legibility floor, not a photograph fact): ~160 for primary, ~110 for secondary,
 * ~70-90 for alert/ticker.
 */
const MARS_POWER_REGIONS: readonly ScreenRegion[] = [
  { id: "main", role: "primary", xPct: 34.0, yPct: 2.5, wPct: 31.0, hPct: 24.5, minPanelWidthPx: 160 },
  { id: "grid-1", role: "secondary", xPct: 27.5, yPct: 30.0, wPct: 22.0, hPct: 28.5, minPanelWidthPx: 120 },
  { id: "grid-2", role: "secondary", xPct: 49.8, yPct: 30.0, wPct: 22.0, hPct: 28.5, minPanelWidthPx: 120 },
  { id: "aux", role: "alert", xPct: 74.0, yPct: 42.8, wPct: 10.3, hPct: 13.0, minPanelWidthPx: 70 },
  { id: "strip-l", role: "ticker", xPct: 29.8, yPct: 59.8, wPct: 16.2, hPct: 4.8, minPanelWidthPx: 80 },
  { id: "strip-r", role: "ticker", xPct: 54.0, yPct: 59.8, wPct: 16.2, hPct: 4.8, minPanelWidthPx: 80 },
];

const MARS_LIFE_REGIONS: readonly ScreenRegion[] = [
  { id: "main", role: "primary", xPct: 32.0, yPct: 3.5, wPct: 35.0, hPct: 21.0, minPanelWidthPx: 160 },
  { id: "grid-1", role: "secondary", xPct: 27.5, yPct: 27.2, wPct: 20.3, hPct: 28.5, minPanelWidthPx: 120 },
  { id: "grid-2", role: "secondary", xPct: 49.3, yPct: 27.2, wPct: 22.0, hPct: 28.5, minPanelWidthPx: 120 },
  { id: "aux", role: "alert", xPct: 76.9, yPct: 52.2, wPct: 9.8, hPct: 14.3, minPanelWidthPx: 70 },
  { id: "strip-l", role: "ticker", xPct: 28.8, yPct: 71.4, wPct: 14.0, hPct: 4.5, minPanelWidthPx: 80 },
  { id: "strip-r", role: "ticker", xPct: 56.5, yPct: 71.4, wPct: 13.7, hPct: 4.5, minPanelWidthPx: 80 },
];

const MARS_COMMS_REGIONS: readonly ScreenRegion[] = [
  { id: "main", role: "primary", xPct: 27.8, yPct: 11.5, wPct: 44.2, hPct: 21.0, minPanelWidthPx: 160 },
  { id: "grid-1", role: "secondary", xPct: 32.0, yPct: 33.8, wPct: 17.0, hPct: 23.5, minPanelWidthPx: 120 },
  { id: "grid-2", role: "secondary", xPct: 50.0, yPct: 33.8, wPct: 17.0, hPct: 23.5, minPanelWidthPx: 120 },
  { id: "aux", role: "alert", xPct: 76.0, yPct: 38.8, wPct: 11.4, hPct: 15.2, minPanelWidthPx: 70 },
  { id: "strip-l", role: "ticker", xPct: 30.8, yPct: 60.0, wPct: 13.9, hPct: 4.6, minPanelWidthPx: 80 },
  { id: "strip-r", role: "ticker", xPct: 59.6, yPct: 59.6, wPct: 12.5, hPct: 5.2, minPanelWidthPx: 80 },
];

const MARS_INCIDENT_REGIONS: readonly ScreenRegion[] = [
  { id: "main", role: "primary", xPct: 31.0, yPct: 4.8, wPct: 36.8, hPct: 22.0, minPanelWidthPx: 160 },
  { id: "grid-1", role: "secondary", xPct: 30.1, yPct: 27.1, wPct: 18.5, hPct: 26.5, minPanelWidthPx: 120 },
  { id: "grid-2", role: "secondary", xPct: 49.4, yPct: 27.1, wPct: 18.5, hPct: 26.5, minPanelWidthPx: 120 },
  { id: "aux", role: "alert", xPct: 69.8, yPct: 42.0, wPct: 10.7, hPct: 14.5, minPanelWidthPx: 70 },
  { id: "strip-l", role: "ticker", xPct: 30.4, yPct: 55.2, wPct: 17.5, hPct: 4.5, minPanelWidthPx: 80 },
  { id: "strip-r", role: "ticker", xPct: 50.4, yPct: 55.2, wPct: 17.5, hPct: 5.5, minPanelWidthPx: 80 },
];

const MARS_MISSION_REGIONS: readonly ScreenRegion[] = [
  { id: "main", role: "primary", xPct: 26.4, yPct: 1.4, wPct: 46.8, hPct: 26.5, minPanelWidthPx: 160 },
  { id: "grid-1", role: "secondary", xPct: 25.2, yPct: 28.4, wPct: 22.8, hPct: 32.7, minPanelWidthPx: 120 },
  { id: "grid-2", role: "secondary", xPct: 49.8, yPct: 28.4, wPct: 22.2, hPct: 32.7, minPanelWidthPx: 120 },
  { id: "aux", role: "alert", xPct: 73.5, yPct: 53.0, wPct: 9.6, hPct: 14.5, minPanelWidthPx: 70 },
  { id: "strip-l", role: "ticker", xPct: 26.8, yPct: 63.0, wPct: 16.2, hPct: 5.2, minPanelWidthPx: 80 },
  { id: "strip-r", role: "ticker", xPct: 53.4, yPct: 63.0, wPct: 16.5, hPct: 5.2, minPanelWidthPx: 80 },
];

const MOON_POWER_REGIONS: readonly ScreenRegion[] = [
  { id: "main", role: "primary", xPct: 33.8, yPct: 1.0, wPct: 31.2, hPct: 25.0, minPanelWidthPx: 160 },
  { id: "grid-1", role: "secondary", xPct: 27.2, yPct: 35.8, wPct: 22.5, hPct: 27.5, minPanelWidthPx: 120 },
  { id: "grid-2", role: "secondary", xPct: 49.6, yPct: 35.8, wPct: 22.5, hPct: 27.5, minPanelWidthPx: 120 },
  { id: "aux", role: "alert", xPct: 75.5, yPct: 51.5, wPct: 10.0, hPct: 14.0, minPanelWidthPx: 70 },
  { id: "strip-l", role: "ticker", xPct: 27.5, yPct: 65.0, wPct: 20.2, hPct: 4.8, minPanelWidthPx: 80 },
  { id: "strip-r", role: "ticker", xPct: 52.5, yPct: 65.0, wPct: 20.2, hPct: 4.8, minPanelWidthPx: 80 },
];

const MOON_LIFE_REGIONS: readonly ScreenRegion[] = [
  { id: "main", role: "primary", xPct: 29.8, yPct: 1.8, wPct: 32.1, hPct: 20.0, minPanelWidthPx: 160 },
  { id: "grid-1", role: "secondary", xPct: 24.6, yPct: 24.8, wPct: 20.5, hPct: 36.5, minPanelWidthPx: 120 },
  { id: "grid-2", role: "secondary", xPct: 46.8, yPct: 24.8, wPct: 19.8, hPct: 36.5, minPanelWidthPx: 120 },
  { id: "aux", role: "alert", xPct: 69.8, yPct: 54.5, wPct: 8.8, hPct: 12.5, minPanelWidthPx: 70 },
  { id: "strip-l", role: "ticker", xPct: 25.8, yPct: 72.8, wPct: 16.8, hPct: 4.3, minPanelWidthPx: 80 },
  { id: "strip-r", role: "ticker", xPct: 53.5, yPct: 72.8, wPct: 13.2, hPct: 4.3, minPanelWidthPx: 80 },
];

const MOON_COMMS_REGIONS: readonly ScreenRegion[] = [
  { id: "main", role: "primary", xPct: 26.5, yPct: 10.6, wPct: 44.2, hPct: 22.8, minPanelWidthPx: 160 },
  { id: "grid-1", role: "secondary", xPct: 30.5, yPct: 34.4, wPct: 16.4, hPct: 25.2, minPanelWidthPx: 120 },
  { id: "grid-2", role: "secondary", xPct: 47.7, yPct: 34.4, wPct: 16.4, hPct: 25.2, minPanelWidthPx: 120 },
  { id: "aux", role: "alert", xPct: 78.8, yPct: 38.3, wPct: 12.4, hPct: 19.3, minPanelWidthPx: 70 },
  { id: "strip-l", role: "ticker", xPct: 31.8, yPct: 61.9, wPct: 12.9, hPct: 5.0, minPanelWidthPx: 80 },
  { id: "strip-r", role: "ticker", xPct: 46.5, yPct: 61.9, wPct: 9.8, hPct: 4.8, minPanelWidthPx: 80 },
];

const MOON_INCIDENT_REGIONS: readonly ScreenRegion[] = [
  { id: "main", role: "primary", xPct: 31.4, yPct: 0.9, wPct: 36.7, hPct: 23.5, minPanelWidthPx: 160 },
  { id: "grid-1", role: "secondary", xPct: 30.4, yPct: 25.0, wPct: 18.8, hPct: 29.2, minPanelWidthPx: 120 },
  { id: "grid-2", role: "secondary", xPct: 50.3, yPct: 25.0, wPct: 18.4, hPct: 29.2, minPanelWidthPx: 120 },
  { id: "aux", role: "alert", xPct: 75.5, yPct: 44.0, wPct: 9.5, hPct: 13.8, minPanelWidthPx: 70 },
  { id: "strip-l", role: "ticker", xPct: 29.8, yPct: 58.6, wPct: 15.6, hPct: 4.3, minPanelWidthPx: 80 },
  { id: "strip-r", role: "ticker", xPct: 53.9, yPct: 58.6, wPct: 15.7, hPct: 4.3, minPanelWidthPx: 80 },
];

const MOON_MISSION_REGIONS: readonly ScreenRegion[] = [
  { id: "main", role: "primary", xPct: 28.1, yPct: 2.2, wPct: 42.0, hPct: 25.5, minPanelWidthPx: 160 },
  { id: "grid-1", role: "secondary", xPct: 25.4, yPct: 28.5, wPct: 23.2, hPct: 32.7, minPanelWidthPx: 120 },
  { id: "grid-2", role: "secondary", xPct: 49.9, yPct: 28.5, wPct: 22.3, hPct: 32.7, minPanelWidthPx: 120 },
  { id: "aux", role: "alert", xPct: 74.9, yPct: 50.5, wPct: 8.5, hPct: 12.5, minPanelWidthPx: 70 },
  { id: "strip-l", role: "ticker", xPct: 26.7, yPct: 63.1, wPct: 15.8, hPct: 5.6, minPanelWidthPx: 80 },
  { id: "strip-r", role: "ticker", xPct: 55.4, yPct: 63.1, wPct: 15.4, hPct: 5.4, minPanelWidthPx: 80 },
];

export const SCREEN_MAPS: Partial<Record<`${Body}-${StationKey}`, StationScreenMap>> = {
  "moon-lifeSupport": {
    imageBase: "moon-lifeSupport",
    aspectRatio: 1672 / 940,
    regions: MOON_LIFE_REGIONS,
  },
  "moon-power": {
    imageBase: "moon-power",
    aspectRatio: 1600 / 879,
    regions: MOON_POWER_REGIONS,
  },
  "moon-comms": {
    imageBase: "moon-comms",
    aspectRatio: 960 / 540,
    regions: MOON_COMMS_REGIONS,
  },
  "moon-incidentCommand": {
    imageBase: "moon-incidentCommand",
    aspectRatio: 1672 / 941,
    regions: MOON_INCIDENT_REGIONS,
  },
  "moon-missionCommand": {
    imageBase: "moon-missionCommand",
    aspectRatio: 1671 / 941,
    regions: MOON_MISSION_REGIONS,
  },
  "mars-lifeSupport": {
    imageBase: "mars-lifeSupport",
    aspectRatio: 1672 / 941,
    regions: MARS_LIFE_REGIONS,
  },
  "mars-power": {
    imageBase: "mars-power",
    aspectRatio: 1600 / 879,
    regions: MARS_POWER_REGIONS,
  },
  "mars-comms": {
    imageBase: "mars-comms",
    aspectRatio: 960 / 540,
    regions: MARS_COMMS_REGIONS,
  },
  "mars-incidentCommand": {
    imageBase: "mars-incidentCommand",
    aspectRatio: 1672 / 941,
    regions: MARS_INCIDENT_REGIONS,
  },
  "mars-missionCommand": {
    imageBase: "mars-missionCommand",
    aspectRatio: 1672 / 941,
    regions: MARS_MISSION_REGIONS,
  },
};

export function getScreenMap(body: Body, station: StationKey): StationScreenMap | undefined {
  return SCREEN_MAPS[`${body}-${station}`];
}

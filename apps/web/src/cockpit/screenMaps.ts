import type { Body, StationKey, StationScreenMap } from "./types.js";

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
export const SCREEN_MAPS: Partial<Record<`${Body}-${StationKey}`, StationScreenMap>> = {
  "moon-lifeSupport": {
    imageBase: "moon-lifeSupport",
    aspectRatio: 1672 / 941,
    regions: [
      { id: "main", role: "primary", xPct: 31.7, yPct: 1.59, wPct: 36.12, hPct: 26.57, minPanelWidthPx: 160 },
      { id: "grid-1", role: "secondary", xPct: 23.74, yPct: 28.91, wPct: 16.51, hPct: 17.11, minPanelWidthPx: 110 },
      { id: "grid-2", role: "secondary", xPct: 41.27, yPct: 29.01, wPct: 16.63, hPct: 14.98, minPanelWidthPx: 110 },
      { id: "grid-3", role: "secondary", xPct: 60.35, yPct: 29.76, wPct: 14.77, hPct: 14.24, minPanelWidthPx: 110 },
      { id: "grid-4", role: "secondary", xPct: 23.74, yPct: 47.5, wPct: 16.51, hPct: 15.83, minPanelWidthPx: 110 },
      { id: "grid-5", role: "secondary", xPct: 41.21, yPct: 47.93, wPct: 17.4, hPct: 15.09, minPanelWidthPx: 110 },
      { id: "grid-6", role: "secondary", xPct: 59.63, yPct: 47.29, wPct: 16.33, hPct: 15.94, minPanelWidthPx: 110 },
      { id: "lower", role: "secondary", xPct: 39.59, yPct: 63.87, wPct: 19.8, hPct: 11.9, minPanelWidthPx: 130 },
      { id: "aux", role: "alert", xPct: 78.35, yPct: 61.21, wPct: 6.22, hPct: 9.88, minPanelWidthPx: 70 },
      { id: "strip-l", role: "ticker", xPct: 26.91, yPct: 78.75, wPct: 21.71, hPct: 4.04, minPanelWidthPx: 130 },
      { id: "strip-r", role: "ticker", xPct: 60.71, yPct: 78.75, wPct: 12.02, hPct: 3.93, minPanelWidthPx: 80 },
    ],
  },
  "moon-power": {
    imageBase: "moon-power",
    aspectRatio: 2048 / 1152,
    regions: [
      { id: "main", role: "primary", xPct: 34.67, yPct: 3.99, wPct: 30.08, hPct: 23.44, minPanelWidthPx: 160 },
      { id: "grid-1", role: "secondary", xPct: 26.61, yPct: 31.77, wPct: 13.87, hPct: 13.37, minPanelWidthPx: 110 },
      { id: "grid-2", role: "secondary", xPct: 42.87, yPct: 31.86, wPct: 13.82, hPct: 13.28, minPanelWidthPx: 110 },
      { id: "grid-3", role: "secondary", xPct: 59.13, yPct: 31.77, wPct: 13.82, hPct: 13.37, minPanelWidthPx: 110 },
      { id: "lower", role: "secondary", xPct: 42.82, yPct: 48.61, wPct: 13.87, hPct: 13.19, minPanelWidthPx: 110 },
      { id: "aux", role: "alert", xPct: 82.96, yPct: 52.08, wPct: 12.01, hPct: 12.85, minPanelWidthPx: 70 },
      { id: "strip-l", role: "ticker", xPct: 38.09, yPct: 65.45, wPct: 10.06, hPct: 3.73, minPanelWidthPx: 80 },
    ],
  },
  "moon-comms": {
    imageBase: "moon-comms",
    aspectRatio: 1672 / 941,
    regions: [
      { id: "main", role: "primary", xPct: 22.97, yPct: 29.97, wPct: 52.99, hPct: 31.53, minPanelWidthPx: 160 },
      { id: "top-left", role: "secondary", xPct: 26.32, yPct: 10.63, wPct: 23.03, hPct: 19.17, minPanelWidthPx: 110 },
      { id: "top-right", role: "secondary", xPct: 48.92, yPct: 10.1, wPct: 23.92, hPct: 19.7, minPanelWidthPx: 110 },
      { id: "aux", role: "alert", xPct: 78.53, yPct: 37.73, wPct: 14.0, hPct: 22.21, minPanelWidthPx: 70 },
      { id: "strip-l", role: "ticker", xPct: 31.76, yPct: 61.85, wPct: 12.92, hPct: 4.89, minPanelWidthPx: 80 },
      { id: "strip-r", role: "ticker", xPct: 46.41, yPct: 61.74, wPct: 9.75, hPct: 4.68, minPanelWidthPx: 80 },
    ],
  },
  "moon-incidentCommand": {
    imageBase: "moon-incidentCommand",
    aspectRatio: 1672 / 940,
    regions: [
      { id: "main", role: "primary", xPct: 31.64, yPct: 0.74, wPct: 36.42, hPct: 25.32, minPanelWidthPx: 160 },
      { id: "grid-1", role: "secondary", xPct: 24.58, yPct: 27.02, wPct: 16.33, hPct: 16.91, minPanelWidthPx: 110 },
      { id: "grid-2", role: "secondary", xPct: 41.33, yPct: 27.02, wPct: 17.34, hPct: 16.91, minPanelWidthPx: 110 },
      { id: "grid-3", role: "secondary", xPct: 58.85, yPct: 27.02, wPct: 16.03, hPct: 16.91, minPanelWidthPx: 110 },
      { id: "grid-4", role: "secondary", xPct: 30.14, yPct: 44.89, wPct: 19.62, hPct: 17.13, minPanelWidthPx: 110 },
      { id: "grid-5", role: "secondary", xPct: 49.82, yPct: 44.89, wPct: 19.62, hPct: 17.13, minPanelWidthPx: 110 },
      { id: "aux", role: "alert", xPct: 76.2, yPct: 44.47, wPct: 8.97, hPct: 12.13, minPanelWidthPx: 70 },
      { id: "strip-l", role: "ticker", xPct: 31.1, yPct: 63.94, wPct: 14.35, hPct: 4.47, minPanelWidthPx: 80 },
      { id: "strip-r", role: "ticker", xPct: 53.95, yPct: 64.04, wPct: 10.77, hPct: 4.36, minPanelWidthPx: 80 },
    ],
  },
  "moon-missionCommand": {
    imageBase: "moon-missionCommand",
    aspectRatio: 1672 / 940,
    regions: [
      { id: "main", role: "primary", xPct: 29.78, yPct: 2.45, wPct: 39.77, hPct: 24.89, minPanelWidthPx: 160 },
      { id: "grid-1", role: "secondary", xPct: 23.5, yPct: 30.64, wPct: 16.21, hPct: 13.19, minPanelWidthPx: 110 },
      { id: "grid-2", role: "secondary", xPct: 42.05, yPct: 30.74, wPct: 15.43, hPct: 13.09, minPanelWidthPx: 110 },
      { id: "grid-3", role: "secondary", xPct: 59.87, yPct: 30.74, wPct: 14.71, hPct: 12.98, minPanelWidthPx: 110 },
      { id: "grid-4", role: "secondary", xPct: 23.56, yPct: 46.81, wPct: 16.15, hPct: 12.66, minPanelWidthPx: 110 },
      { id: "grid-5", role: "secondary", xPct: 42.05, yPct: 46.7, wPct: 15.43, hPct: 12.55, minPanelWidthPx: 110 },
      { id: "grid-6", role: "secondary", xPct: 59.87, yPct: 46.7, wPct: 14.71, hPct: 12.45, minPanelWidthPx: 110 },
      { id: "grid-7", role: "secondary", xPct: 23.56, yPct: 62.23, wPct: 16.21, hPct: 11.28, minPanelWidthPx: 110 },
      { id: "grid-8", role: "secondary", xPct: 42.11, yPct: 62.02, wPct: 15.43, hPct: 11.17, minPanelWidthPx: 110 },
      { id: "grid-9", role: "secondary", xPct: 59.87, yPct: 62.02, wPct: 14.77, hPct: 11.17, minPanelWidthPx: 110 },
      { id: "aux", role: "alert", xPct: 77.99, yPct: 55.85, wPct: 7.6, hPct: 10.53, minPanelWidthPx: 70 },
      { id: "strip-l", role: "ticker", xPct: 28.41, yPct: 76.49, wPct: 15.91, hPct: 3.09, minPanelWidthPx: 80 },
      { id: "strip-r", role: "ticker", xPct: 57.89, yPct: 76.49, wPct: 13.4, hPct: 3.09, minPanelWidthPx: 80 },
    ],
  },
  "mars-power": {
    imageBase: "mars-power",
    aspectRatio: 1672 / 941,
    regions: [
      { id: "main", role: "primary", xPct: 34.21, yPct: 3.08, wPct: 31.22, hPct: 23.49, minPanelWidthPx: 160 },
      { id: "grid-1", role: "secondary", xPct: 26.2, yPct: 27.63, wPct: 15.31, hPct: 16.26, minPanelWidthPx: 110 },
      { id: "grid-2", role: "secondary", xPct: 41.99, yPct: 28.06, wPct: 15.73, hPct: 14.67, minPanelWidthPx: 110 },
      { id: "grid-3", role: "secondary", xPct: 58.13, yPct: 27.63, wPct: 15.67, hPct: 17.43, minPanelWidthPx: 110 },
      { id: "lower", role: "secondary", xPct: 39.59, yPct: 44.21, wPct: 20.57, hPct: 14.24, minPanelWidthPx: 130 },
      { id: "aux", role: "alert", xPct: 69.98, yPct: 45.3, wPct: 16.51, hPct: 12.3, minPanelWidthPx: 70 },
      { id: "strip-l", role: "ticker", xPct: 30.26, yPct: 59.94, wPct: 17.0, hPct: 4.78, minPanelWidthPx: 80 },
      { id: "strip-r", role: "ticker", xPct: 53.5, yPct: 59.94, wPct: 16.6, hPct: 4.78, minPanelWidthPx: 80 },
    ],
  },
  "mars-comms": {
    imageBase: "mars-comms",
    aspectRatio: 1672 / 941,
    regions: [
      { id: "main", role: "primary", xPct: 31.46, yPct: 33.05, wPct: 36.3, hPct: 24.87, minPanelWidthPx: 160 },
      { id: "top-left", role: "secondary", xPct: 27.93, yPct: 11.8, wPct: 21.11, hPct: 19.34, minPanelWidthPx: 110 },
      { id: "top-right", role: "secondary", xPct: 50.96, yPct: 11.58, wPct: 21.11, hPct: 19.55, minPanelWidthPx: 110 },
      { id: "aux", role: "alert", xPct: 76.02, yPct: 39.21, wPct: 10.41, hPct: 13.6, minPanelWidthPx: 70 },
      { id: "strip-l", role: "ticker", xPct: 30.8, yPct: 59.4, wPct: 13.94, hPct: 5.31, minPanelWidthPx: 80 },
      { id: "strip-r", role: "ticker", xPct: 59.33, yPct: 59.94, wPct: 12.8, hPct: 4.78, minPanelWidthPx: 80 },
    ],
  },
  "mars-incidentCommand": {
    imageBase: "mars-incidentCommand",
    aspectRatio: 1672 / 941,
    regions: [
      { id: "main", role: "primary", xPct: 29.13, yPct: 2.02, wPct: 37.74, hPct: 27.95, minPanelWidthPx: 160 },
      { id: "grid-1", role: "secondary", xPct: 27.45, yPct: 36.34, wPct: 14.06, hPct: 13.71, minPanelWidthPx: 110 },
      { id: "grid-2", role: "secondary", xPct: 42.34, yPct: 36.24, wPct: 15.37, hPct: 13.82, minPanelWidthPx: 110 },
      { id: "grid-3", role: "secondary", xPct: 58.55, yPct: 36.03, wPct: 15.13, hPct: 14.35, minPanelWidthPx: 110 },
      { id: "grid-4", role: "secondary", xPct: 32.0, yPct: 51.86, wPct: 17.58, hPct: 16.05, minPanelWidthPx: 110 },
      { id: "grid-5", role: "secondary", xPct: 50.84, yPct: 51.86, wPct: 16.81, hPct: 13.6, minPanelWidthPx: 110 },
      { id: "aux", role: "alert", xPct: 75.78, yPct: 44.31, wPct: 7.83, hPct: 10.95, minPanelWidthPx: 70 },
      { id: "strip-l", role: "ticker", xPct: 30.62, yPct: 31.35, wPct: 12.92, hPct: 3.19, minPanelWidthPx: 80 },
      { id: "strip-r", role: "ticker", xPct: 56.04, yPct: 30.82, wPct: 10.17, hPct: 3.72, minPanelWidthPx: 80 },
    ],
  },
  "mars-lifeSupport": {
    imageBase: "mars-lifeSupport",
    aspectRatio: 1672 / 941,
    regions: [
      { id: "main", role: "primary", xPct: 31.82, yPct: 3.29, wPct: 35.29, hPct: 20.83, minPanelWidthPx: 160 },
      { id: "grid-1", role: "secondary", xPct: 27.21, yPct: 26.57, wPct: 14.29, hPct: 14.24, minPanelWidthPx: 110 },
      { id: "grid-2", role: "secondary", xPct: 42.64, yPct: 26.46, wPct: 14.11, hPct: 14.13, minPanelWidthPx: 110 },
      { id: "grid-3", role: "secondary", xPct: 57.95, yPct: 26.57, wPct: 14.41, hPct: 14.13, minPanelWidthPx: 110 },
      { id: "grid-4", role: "secondary", xPct: 27.21, yPct: 42.93, wPct: 14.29, hPct: 13.39, minPanelWidthPx: 110 },
      { id: "grid-5", role: "secondary", xPct: 42.7, yPct: 42.93, wPct: 14.11, hPct: 13.18, minPanelWidthPx: 110 },
      { id: "grid-6", role: "secondary", xPct: 58.01, yPct: 42.93, wPct: 14.41, hPct: 13.28, minPanelWidthPx: 110 },
      { id: "lower", role: "secondary", xPct: 40.31, yPct: 58.45, wPct: 19.08, hPct: 11.26, minPanelWidthPx: 130 },
      { id: "aux", role: "alert", xPct: 75.0, yPct: 51.97, wPct: 16.27, hPct: 17.96, minPanelWidthPx: 70 },
      { id: "strip-l", role: "ticker", xPct: 28.89, yPct: 71.31, wPct: 14.17, hPct: 4.68, minPanelWidthPx: 80 },
      { id: "strip-r", role: "ticker", xPct: 56.64, yPct: 71.31, wPct: 13.76, hPct: 4.68, minPanelWidthPx: 80 },
    ],
  },
  "mars-missionCommand": {
    imageBase: "mars-missionCommand",
    aspectRatio: 1672 / 941,
    regions: [
      { id: "main", role: "primary", xPct: 25.12, yPct: 1.28, wPct: 49.52, hPct: 28.69, minPanelWidthPx: 160 },
      { id: "grid-1", role: "secondary", xPct: 23.74, yPct: 30.5, wPct: 16.27, hPct: 12.96, minPanelWidthPx: 110 },
      { id: "grid-2", role: "secondary", xPct: 41.93, yPct: 30.71, wPct: 16.15, hPct: 12.75, minPanelWidthPx: 110 },
      { id: "grid-3", role: "secondary", xPct: 59.99, yPct: 29.97, wPct: 16.57, hPct: 13.5, minPanelWidthPx: 110 },
      { id: "grid-4", role: "secondary", xPct: 23.74, yPct: 45.59, wPct: 16.27, hPct: 12.11, minPanelWidthPx: 110 },
      { id: "grid-5", role: "secondary", xPct: 41.93, yPct: 45.59, wPct: 16.15, hPct: 12.01, minPanelWidthPx: 110 },
      { id: "grid-6", role: "secondary", xPct: 59.93, yPct: 45.59, wPct: 16.39, hPct: 12.11, minPanelWidthPx: 110 },
      { id: "grid-7", role: "secondary", xPct: 23.86, yPct: 59.72, wPct: 16.15, hPct: 11.9, minPanelWidthPx: 110 },
      { id: "grid-8", role: "secondary", xPct: 41.93, yPct: 59.72, wPct: 16.15, hPct: 11.69, minPanelWidthPx: 110 },
      { id: "grid-9", role: "secondary", xPct: 59.93, yPct: 59.72, wPct: 16.21, hPct: 11.9, minPanelWidthPx: 110 },
      { id: "aux", role: "alert", xPct: 79.13, yPct: 55.05, wPct: 9.75, hPct: 13.92, minPanelWidthPx: 70 },
      { id: "strip-l", role: "ticker", xPct: 26.32, yPct: 73.33, wPct: 14.77, hPct: 4.25, minPanelWidthPx: 80 },
      { id: "strip-r", role: "ticker", xPct: 58.91, yPct: 73.33, wPct: 14.29, hPct: 4.25, minPanelWidthPx: 80 },
    ],
  },
};

export function getScreenMap(body: Body, station: StationKey): StationScreenMap | undefined {
  return SCREEN_MAPS[`${body}-${station}`];
}

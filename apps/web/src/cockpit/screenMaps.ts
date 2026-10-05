import type { Body, StationKey, StationScreenMap } from "./types.js";

/**
 * M9.1's own registry — one entry per `${body}-${station}` once that station has a real,
 * calibrated photograph. A station with no entry here falls back to Classic view
 * automatically (StationCockpit.tsx's own rule), so adding stations is additive: this file
 * never needs anything removed from it, only appended to.
 *
 * `moon-lifeSupport` demonstrates the mechanism end to end (M9.1's own "Order of work" step
 * 3) using a disclosed placeholder photograph (a stock broadcast monitor, provenance unknown
 * — see apps/web/public/stations/CREDITS.md), not the real multi-screen console image the
 * brief's own seed layout was written for.
 *
 * Those seed coordinates ("Approximate seed values for the lunar life-support image (16:9),
 * TO BE CORRECTED with the calibration tool — do not trust these") assume a 16:9 photo whose
 * screen area spans most of the frame. The placeholder is a near-square photo (357x341) with
 * one real screen occupying a measured sub-rectangle of it (x 9.24%, y 9.68%, w 80.67%,
 * h 63.05% of the full image — found the same way the /cockpit-calibrate tool would, a
 * flood-fill from a known-black pixel, not eyeballed). The regions below are the brief's own
 * seed layout, kept at its own relative proportions, affine-mapped from its original 0-100%
 * canvas onto that measured rectangle instead — so eleven distinct regions land somewhere on
 * the one real screen this placeholder has, rather than several of them floating over the
 * bezel. This mapping, and the placeholder photo itself, are both provisional: replace this
 * whole entry wholesale once the real lunar life-support console photograph and its own
 * /cockpit-calibrate pass exist — do not try to reuse or adjust these numbers for it.
 */
export const SCREEN_MAPS: Partial<Record<`${Body}-${StationKey}`, StationScreenMap>> = {
  "moon-lifeSupport": {
    imageBase: "moon-lifeSupport",
    aspectRatio: 357 / 341,
    regions: [
      {
        id: "main",
        role: "primary",
        xPct: 19.83,
        yPct: 9.68,
        wPct: 48.48,
        hPct: 20.08,
        minPanelWidthPx: 160,
      },
      {
        id: "grid-1",
        role: "secondary",
        xPct: 9.24,
        yPct: 30.7,
        wPct: 20.78,
        hPct: 13.31,
        minPanelWidthPx: 110,
      },
      {
        id: "grid-2",
        role: "secondary",
        xPct: 33.14,
        yPct: 30.93,
        wPct: 21.19,
        hPct: 13.31,
        minPanelWidthPx: 110,
      },
      {
        id: "grid-3",
        role: "secondary",
        xPct: 57.45,
        yPct: 30.93,
        wPct: 21.19,
        hPct: 13.31,
        minPanelWidthPx: 110,
      },
      {
        id: "grid-4",
        role: "secondary",
        xPct: 9.24,
        yPct: 44.86,
        wPct: 20.78,
        hPct: 13.31,
        minPanelWidthPx: 110,
      },
      {
        id: "grid-5",
        role: "secondary",
        xPct: 33.14,
        yPct: 44.86,
        wPct: 21.19,
        hPct: 13.31,
        minPanelWidthPx: 110,
      },
      {
        id: "grid-6",
        role: "secondary",
        xPct: 57.45,
        yPct: 44.86,
        wPct: 21.19,
        hPct: 13.31,
        minPanelWidthPx: 110,
      },
      {
        id: "lower",
        role: "secondary",
        xPct: 30.97,
        yPct: 59.03,
        wPct: 25.4,
        hPct: 8.33,
        minPanelWidthPx: 130,
      },
      {
        id: "aux",
        role: "alert",
        xPct: 80.68,
        yPct: 55.29,
        wPct: 9.23,
        hPct: 9.57,
        minPanelWidthPx: 70,
      },
      {
        id: "strip-l",
        role: "ticker",
        xPct: 11.28,
        yPct: 69.38,
        wPct: 31.51,
        hPct: 3.35,
        minPanelWidthPx: 130,
      },
      {
        id: "strip-r",
        role: "ticker",
        xPct: 57.86,
        yPct: 69.38,
        wPct: 17.52,
        hPct: 3.35,
        minPanelWidthPx: 80,
      },
    ],
  },
};

export function getScreenMap(body: Body, station: StationKey): StationScreenMap | undefined {
  return SCREEN_MAPS[`${body}-${station}`];
}

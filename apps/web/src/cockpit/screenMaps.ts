import type { Body, StationKey, StationScreenMap } from "./types.js";

/**
 * M9.1's own registry — one entry per `${body}-${station}` once that station has a real,
 * calibrated photograph. A station with no entry here falls back to Classic view
 * automatically (StationCockpit.tsx's own rule), so adding stations is additive: this file
 * never needs anything removed from it, only appended to.
 *
 * Every station now has a real, multi-monitor photograph in apps/web/public/stations/ (ten
 * images: power/comms/incidentCommand/missionCommand/lifeSupport × moon/mars — see
 * CREDITS.md). None has been calibrated with the `/cockpit-calibrate` tool yet (M9.1's own
 * explicit instruction: "I will calibrate all ten images myself using this tool; do not
 * hand-tune coordinates"), so this file is deliberately empty — every station renders
 * Classic-only until a real, drag-calibrated entry lands here. An earlier version of this
 * file had one entry (moon-lifeSupport) with coordinates affine-mapped onto a disclosed stock
 * placeholder photo, to prove the mechanism end to end; that placeholder has since been
 * replaced by the real photograph above, so those coordinates — calibrated against a
 * completely different image's geometry — were removed rather than left in place silently
 * wrong. Do not reintroduce hand-tuned numbers here; add entries only from the calibration
 * tool's own "Copy JSON" output.
 */
export const SCREEN_MAPS: Partial<Record<`${Body}-${StationKey}`, StationScreenMap>> = {};

export function getScreenMap(body: Body, station: StationKey): StationScreenMap | undefined {
  return SCREEN_MAPS[`${body}-${station}`];
}

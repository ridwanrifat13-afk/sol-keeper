/**
 * M9: sizing a player-chosen `ShieldingApproach` at setup time — a real, differentiated
 * trade-off (mass launched vs. crew-hours spent pre-mission), not a tick-by-tick model.
 * `models/water.ts` already, unconditionally, turns stored water into standing shielding
 * every tick via `habitat.waterWallShieldingGPerCm2PerKg` — `waterWall` here just launches
 * more of it; the per-tick conversion already exists and needs no changes.
 */
import { habitat, management } from "../data/constants.js";
import type { ShieldingApproach } from "../types.js";

export interface SizedShielding {
  /** Added to the base scenario's own starting `shieldingGPerCm2` — a flat bump, not
   *  a replacement (`hullOnly` keeps the base scenario's number entirely unchanged). */
  readonly shieldingGPerCm2Delta: number;
  /** Added to `initial.potableWaterKg` (`waterWall` only) — the existing per-tick formula
   *  in models/water.ts turns this into standing shielding automatically, so this delta is
   *  the only lever `waterWall` needs to pull. */
  readonly potableWaterKgDelta: number;
  /** One-time, pre-mission construction cost (`regolithBerm` only) — an ESM crew-time line,
   *  never launched mass, which is the point of this approach's trade-off. */
  readonly constructionCrewHours: number;
}

/** How much launched water a full water-wall tank adds — the same 2000 kg
 *  `habitat.waterWallShieldingGPerCm2PerKg`'s own note is written against ("a full 2000 kg
 *  tank adds about 5 g/cm^2"), so the two stay consistent by construction. */
const WATER_WALL_TANK_KG = 2000;

export function sizeShielding(approach: ShieldingApproach): SizedShielding {
  switch (approach) {
    case "hullOnly":
      return { shieldingGPerCm2Delta: 0, potableWaterKgDelta: 0, constructionCrewHours: 0 };
    case "waterWall":
      return { shieldingGPerCm2Delta: 0, potableWaterKgDelta: WATER_WALL_TANK_KG, constructionCrewHours: 0 };
    case "regolithBerm":
      return {
        shieldingGPerCm2Delta: habitat.regolithBermShieldingGPerCm2.value,
        potableWaterKgDelta: 0,
        constructionCrewHours: management.regolithBermConstructionCrewHours.value,
      };
  }
}

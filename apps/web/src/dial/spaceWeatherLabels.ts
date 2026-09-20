import type { TFunction } from "i18next";
import type { DialLevel } from "./types.js";
import type { SpaceWeatherType } from "../../server-lib/types.js";

/**
 * DONKI's four event codes, in words a cadet can read without a glossary (cadet) or the
 * terms a specialist/commander would recognize (technical) — see
 * i18n/locales/{en,bn}.json's spaceWeatherType keys. The Bangla technical set is a
 * best-effort translation of genuinely specialized vocabulary and should be checked by a
 * fluent speaker before being treated as final.
 */
export function spaceWeatherTypeLabel(type: SpaceWeatherType, level: DialLevel, t: TFunction): string {
  const bucket = level === "cadet" ? "cadet" : "technical";
  return t(`spaceWeatherType.${bucket}.${type}`);
}

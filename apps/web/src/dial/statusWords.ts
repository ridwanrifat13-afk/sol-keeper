import type { StatusLevel } from "../components/status.js";
import type { DialLevel } from "./types.js";

/**
 * The glyph and colour a status carries never change with the Reality Dial — that would
 * break the "state is never colour alone" rule for whichever level lost its wording. Only
 * the word beside the glyph adapts, and only at the cadet level: "Nominal/Caution/Critical"
 * is exactly as legible to a specialist as to a commander, so those two levels share it.
 */
const CADET_WORDS: Record<StatusLevel, string> = {
  nominal: "Good",
  caution: "Careful",
  critical: "Danger",
};

export function statusWord(level: DialLevel, status: StatusLevel, fallback: string): string {
  return level === "cadet" ? CADET_WORDS[status] : fallback;
}

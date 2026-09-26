import type { DialLevel, Language } from "./types.js";

/**
 * The exact crew-loss wording the Phase 2 brief specifies, word for word (in English) — not a
 * paraphrase logText.ts's per-cause mission-log lines are free to elaborate on. This is the
 * one string shown prominently the moment a crew member is lost (the Debrief headline, a
 * future Decision Card banner), where the brief's own quoted text is the requirement itself.
 * The Bangla side (M11) is a faithful DRAFT translation of that same requirement, not the
 * brief's own wording — needsReview, same as every other Bangla string this milestone added.
 */
export function crewLossHeadline(crewName: string, level: DialLevel, language: Language = "en"): string {
  if (language === "bn") {
    return level === "cadet"
      ? `${crewName} খুব অসুস্থ হয়ে পড়েছিল, চালিয়ে যাওয়া সম্ভব ছিল না। মিশন শেষ করতে হয়েছে।`
      : `${crewName}-কে হারানো হয়েছে।`;
  }
  return level === "cadet"
    ? `${crewName} became too sick to continue. The mission had to end.`
    : `${crewName} was lost.`;
}

/**
 * i18next setup (brief tech stack: "i18next with en and bn locales from day one").
 *
 * Scope, disclosed rather than silently partial: this covers the app shell (tab names, and,
 * as of M10.6, the run-link version-mismatch/invalid banner), the Live Sky view end-to-end,
 * and, as of M10.8, `views/Report/MissionReportView.tsx`'s own chrome (headings, labels,
 * outcome text, table headers — the M10 plan's own user decision 2: "report chrome... gets
 * real en+bn now"), as real, working translation, not a stub. M10.7 adds the "shareLink"
 * namespace's own button/status strings (`CopyLinkButton`, used from Launch Packing, Debrief,
 * and the Report) without migrating either of those views' surrounding English text — the
 * same incremental, disclosed pattern M10.6 already established. The Report page's own
 * `report.disclosureNote` says so on the page itself: station names, decision text, and
 * causal-chain descriptions on that page still come from `logText.ts`, which has no locale
 * parameter (English-only until M11 — the same user decision). The rest of the UI (Operate,
 * Ripple Web, Debrief, Data Sources) and the event-log text system
 * (i18n/logText.ts, which already has its own English-only cadet/specialist/commander
 * templates) are not yet migrated to translation keys; that is a follow-up pass, not
 * something this file pretends to cover. The Bangla space-weather technical terms
 * (spaceWeatherType.technical in locales/bn.json) are a best-effort translation and should
 * be checked by a fluent Bangla speaker before being treated as final — the same
 * "disclosed, not guessed-and-hidden" treatment this project gives an unverified constant.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import bn from "./locales/bn.json";

export const SUPPORTED_LANGUAGES = ["en", "bn"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "sol-keeper-language";

function loadStoredLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "bn") return stored;
  } catch {
    // Storage unavailable (private browsing, blocked cookies) — fall back silently.
  }
  return "en";
}

export function storeLanguage(lang: SupportedLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Non-fatal — the choice just won't survive a reload this session.
  }
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, bn: { translation: bn } },
  lng: loadStoredLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes; double-escaping breaks Bangla numerals/punctuation.
});

export default i18n;

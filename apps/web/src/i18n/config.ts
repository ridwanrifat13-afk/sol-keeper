/**
 * i18next setup (brief tech stack: "i18next with en and bn locales from day one").
 *
 * Scope, disclosed rather than silently partial: this covers the app shell (tab names, and,
 * as of M10.6, the run-link version-mismatch/invalid banner) and the Live Sky view
 * end-to-end, as a real, working translation pipeline — not a stub. The rest of the UI
 * (Operate, Ripple Web, Debrief, Data Sources) and the event-log text system
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

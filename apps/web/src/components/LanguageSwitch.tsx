import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, storeLanguage, type SupportedLanguage } from "../i18n/config.js";

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  bn: "বাংলা",
};

/**
 * en/bn switch (brief tech stack). Persisted the same way the Reality Dial level is
 * (store/dial.ts's pattern): read once at i18n init, written back on every change, never
 * blocking render if storage is unavailable.
 */
export function LanguageSwitch() {
  const { i18n } = useTranslation();

  return (
    <div className="language-switch" role="group" aria-label="Language / ভাষা">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          className={`btn btn-tiny ${i18n.language === lang ? "btn-active" : ""}`}
          aria-pressed={i18n.language === lang}
          onClick={() => {
            void i18n.changeLanguage(lang);
            storeLanguage(lang);
          }}
        >
          {LANGUAGE_NAMES[lang]}
        </button>
      ))}
    </div>
  );
}

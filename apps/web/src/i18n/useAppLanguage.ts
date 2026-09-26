import { useTranslation } from "react-i18next";
import type { Language } from "../dial/types.js";

/**
 * The player's current language, narrowed to `dial/types.ts`'s own `Language` (not
 * `i18n/config.ts`'s `SupportedLanguage` — see `dial/types.ts`'s own comment on why the two
 * are kept as separate, structurally-identical declarations). `i18next`'s own `i18n.language`
 * is typed as a bare `string`; it is only ever actually set to `"en"` or `"bn"`
 * (`i18n/config.ts`'s `loadStoredLanguage`/`LanguageSwitch`'s own `changeLanguage` calls), so
 * this narrows defensively to `"en"` rather than trusting that at the type level.
 */
export function useAppLanguage(): Language {
  const { i18n } = useTranslation();
  return i18n.language === "bn" ? "bn" : "en";
}

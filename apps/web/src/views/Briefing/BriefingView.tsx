import { useTranslation } from "react-i18next";
import { requiredMarginFraction, scenarioEsmBreakdown } from "@sol-keeper/sim";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { LandingSiteMap } from "../../components/LandingSiteMap.js";
import { stationLabel } from "../../dial/labels.js";
import { durationLabel } from "../../dial/missionTime.js";
import { MISSION_GUIDES } from "../../dial/missionGuides.js";
import { goalText } from "../../i18n/goalText.js";
import { useAppLanguage } from "../../i18n/useAppLanguage.js";

/**
 * Mission Briefing (M8.6, brief: "crew names, roles and stations; duration; landing site; the
 * hazard coming...; primary goal; one stretch goal; what failure looks like. Readable in
 * under 90 seconds, with a Cadet version using icons."). The default screen a fresh mission
 * opens on (App.tsx).
 *
 * Folds in two former tabs (M8.3's settled navigation, absorbed here rather than left
 * unreached): LandingSiteView's own Leaflet map (moved wholesale to components/
 * LandingSiteMap.tsx) and LaunchPackingView's packed-mass headline only — its interactive
 * phase switcher and 5x5 risk-matrix explorer are a teaching tool with no real per-system
 * data behind it, and including them here would blow well past the 90-second read; deleted
 * rather than carried forward, a settled scope call, not an oversight. Both files' own tabs
 * are gone (M8.3); this is what actually absorbs their content.
 *
 * This is the first screen to use i18next JSON keys directly (en.json/bn.json's own
 * `briefing`/`scenario.*.briefing` sections) rather than a new logText.ts-style TS table —
 * i18n/config.ts's own "follow-up pass" note names exactly this. The Reality Dial's cadet
 * tier gets its own key variant (icons, shorter sentences) where the wording genuinely
 * differs; specialist and commander currently share the same text, the same simplification
 * dial/labels.ts's own 2-tier helpers already use.
 */
export function BriefingView() {
  const scenario = useRun((s) => s.scenario);
  const crew = useRun((s) => s.state.crew);
  const level = useDial((s) => s.level);
  const language = useAppLanguage();
  const { t } = useTranslation();

  const cadet = level === "cadet";
  const variant = cadet ? "cadet" : "specialist";

  // LaunchPackingView's own headline figure, at a fixed PDR phase (this screen shows one
  // number, not the interactive phase picker that view offered) — real, sourced hardware
  // mass plus NASA Ames APR 8070.1's own phase-dependent required margin, never invented.
  const breakdown = scenarioEsmBreakdown(scenario);
  const marginFraction = requiredMarginFraction("pdr");
  const bareMassKg = breakdown.perSystem.reduce((sum, line) => sum + (line.massKg ?? 0), 0);
  const packedMassKg = Math.round(bareMassKg * (1 + marginFraction));

  return (
    <div className="console">
      <header className="view-head">
        <h2>{t("briefing.title")}</h2>
        <p className="view-hint">
          {scenario.site.name} · {t(scenario.body === "mars" ? "briefing.bodyMars" : "briefing.bodyMoon")} ·{" "}
          {durationLabel(scenario.durationHours, scenario.body)}
        </p>
      </header>

      <section className="panel" aria-labelledby="briefing-crew-heading">
        <h2 id="briefing-crew-heading">{t("briefing.crewHeading")}</h2>
        <ul className="status-list">
          {crew.map((member) => (
            <li key={member.id}>
              <span className="status-list-label">{member.name}</span>
              <span className="status-list-value">
                {stationLabel(member.primaryStation, level, language)} · {t("briefing.backup")}{" "}
                {stationLabel(member.backupStation, level, language)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="briefing-site-heading">
        <h2 id="briefing-site-heading">{t("briefing.siteHeading")}</h2>
        <LandingSiteMap />
      </section>

      <section className="panel" aria-labelledby="briefing-hazard-heading">
        <h2 id="briefing-hazard-heading">{t("briefing.hazardHeading")}</h2>
        <p>{t(`${scenario.briefingKey}.${variant}`)}</p>
      </section>

      <section className="panel" aria-labelledby="briefing-goals-heading">
        <h2 id="briefing-goals-heading">{t("briefing.goalsHeading")}</h2>
        <p>
          <strong>{t("briefing.primaryGoalLabel")}:</strong>{" "}
          {goalText(scenario.primaryGoal.briefKey, level, language)}
        </p>
        <p>
          <strong>{t("briefing.stretchGoalLabel")}:</strong>{" "}
          {goalText(scenario.stretchGoal.briefKey, level, language)}
        </p>
      </section>

      <section className="panel" aria-labelledby="briefing-failure-heading">
        <h2 id="briefing-failure-heading">{t("briefing.failureHeading")}</h2>
        <p>{t(`briefing.failure.partial.${variant}`)}</p>
        <p>{t(`briefing.failure.abort.${variant}`)}</p>
        <p>{t(`briefing.failure.loss.${variant}`)}</p>
      </section>

      <section className="panel" aria-labelledby="briefing-mass-heading">
        <h2 id="briefing-mass-heading">{t("briefing.massHeading")}</h2>
        <p>{t(cadet ? "briefing.massLineCadet" : "briefing.massLine", { kg: packedMassKg.toLocaleString() })}</p>
      </section>

      <section className="panel" aria-labelledby="briefing-guide-heading">
        <h2 id="briefing-guide-heading">Mission Guide</h2>
        <p className="panel-hint">{MISSION_GUIDES[scenario.id].tagline}</p>
        {MISSION_GUIDES[scenario.id].paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </section>
    </div>
  );
}

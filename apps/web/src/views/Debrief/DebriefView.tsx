import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { FiFileText } from "react-icons/fi";
import { causalCascade, directEffects, type Body, type LogEntry, type RunStatus } from "@sol-keeper/sim";
import { useDial } from "../../store/dial.js";
import { useRun } from "../../store/run.js";
import { logText } from "../../i18n/logText.js";
import { useAppLanguage } from "../../i18n/useAppLanguage.js";
import { buildResourceSummary } from "../../dial/resourceSummary.js";
import { crewLossConditions, groupIncidents, majorIncidents, type IncidentGroup } from "../../dial/blackBox.js";
import type { DialLevel, Language } from "../../dial/types.js";
import { durationLabel, elapsedValue, timeUnitWord, timestampLabel } from "../../dial/missionTime.js";
import { statusFromSeverity } from "../../components/status.js";
import { crewLossHeadline } from "../../dial/crewLoss.js";
import { ReportLinkButton } from "../../components/ReportLinkButton.js";
import { DashboardGrid } from "../../components/DashboardGrid.js";

/**
 * The Black Box debrief — what happened, and what an entry actually caused.
 *
 * The two honesty rules behind "major incidents" and the crew-loss "conditions" list are
 * documented at dial/blackBox.ts, next to the functions that implement them, so the rule
 * and its code cannot drift apart the way a comment here and logic there eventually would.
 *
 * M11: fully bilingual — every heading/label/hint below is a real `t()` call
 * (`locales/en.json`/`bn.json`'s own "debrief" namespace), and every station-name/log-text
 * call takes the player's current language via `useAppLanguage()`, the same pipeline
 * `views/Report/MissionReportView.tsx` now uses.
 */
const CREW_LOSS_WINDOW_HOURS = 72;

export function DebriefView({ onViewReport }: { onViewReport: () => void }) {
  const state = useRun((s) => s.state);
  const body = useRun((s) => s.scenario.body);
  const level = useDial((s) => s.level);
  const language = useAppLanguage();
  const { t } = useTranslation();

  if (state.status === "running") {
    return (
      <DashboardGrid className="debrief console two-col">
        <header className="view-head">
          <h2>{t("debrief.notReadyHeading")}</h2>
          <p className="view-hint">{t("debrief.notReadyHint")}</p>
        </header>
        <ReportLinkButton />
      </DashboardGrid>
    );
  }

  const summary = buildResourceSummary(state, level, language);
  const log = state.log;
  const incidents = majorIncidents(log);
  const incidentGroups = groupIncidents(incidents, log);
  const crewLosses = log.filter((e) => e.code === "crew.lost" || e.code.startsWith("crew.lost."));

  const headline = outcomeHeadline(t, state.status, state.hour, body, summary.livingCrew, state.crew.length);

  return (
    <DashboardGrid className="debrief console two-col" layoutKey="debrief">
      <header className="view-head">
        <h2>{headline.title}</h2>
        <p className="view-hint">{headline.subtitle}</p>
      </header>

      <div className="debrief-actions">
        <ReportLinkButton />
        {/* M10.8: the dedicated printable one-pager (crew+stations, site, a station-tagged
            decision timeline, a "What NASA did" card, a replay link, a data-sources footer) —
            Debrief stays the interactive/exploratory view, per the M10 plan's own finding #5. */}
        <button type="button" className="btn" onClick={onViewReport}>
          <FiFileText aria-hidden="true" /> {t("debrief.viewReport")}
        </button>
      </div>

      <section className="panel" aria-labelledby="final-numbers-heading">
        <h2 id="final-numbers-heading">{t("debrief.finalNumbersHeading")}</h2>
        <dl className="final-numbers">
          <FinalNumber
            label={t("debrief.oxygen")}
            value={summary.oxygen.text.valueText ?? formatValue(state.atmosphere.o2PartialPressureMmHg, summary.oxygen.text)}
            status={summary.oxygen.status.className}
          />
          <FinalNumber
            label={t("debrief.water")}
            value={summary.water.text.valueText ?? formatValue(state.water.potableKg, summary.water.text)}
            status={summary.water.status.className}
          />
          <FinalNumber
            label={t("debrief.food")}
            value={summary.food.text.valueText ?? formatValue(state.food.storedDryMassKg, summary.food.text)}
            status={summary.food.status.className}
          />
          <FinalNumber
            label={t("debrief.battery")}
            value={summary.battery.text.valueText ?? formatValue(state.power.batteryEnergyKwh, summary.battery.text)}
            status={summary.battery.status.className}
          />
          <FinalNumber
            label={t("debrief.harvested")}
            value={`${state.food.cumulativeHarvestKg.toFixed(1)} kg`}
            status="is-nominal"
          />
          <FinalNumber
            label={t("debrief.isruOxygen")}
            value={`${(state.isru.moxieO2ProducedKg * 1000).toFixed(0)} g`}
            status="is-nominal"
          />
        </dl>
      </section>

      {crewLosses.length > 0 && (
        <section className="panel" aria-labelledby="crew-lost-heading">
          <h2 id="crew-lost-heading">{t("debrief.crewLostHeading")}</h2>
          {crewLosses.map((loss) => (
            <CrewLossReport key={loss.id} entry={loss} log={log} level={level} language={language} />
          ))}
        </section>
      )}

      <section className="panel" aria-labelledby="incidents-heading">
        <h2 id="incidents-heading">{t("debrief.incidentsHeading", { count: incidents.length })}</h2>
        <p className="panel-hint">{t("debrief.incidentsHint")}</p>
        <ul className="incident-list">
          {incidentGroups.length === 0 && <li className="event-empty">{t("debrief.incidentsEmpty")}</li>}
          {incidentGroups.map((group) => (
            <IncidentRow
              key={`${group.sample.id}-${group.count}`}
              group={group}
              log={log}
              level={level}
              language={language}
              body={body}
            />
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="timeline-heading">
        <h2 id="timeline-heading">{t("debrief.timelineHeading", { count: log.length })}</h2>
        <ul className="event-list event-list-full">
          {log.map((entry) => {
            const status = statusFromSeverity(entry.severity);
            return (
              <li key={entry.id} className={`event-card ${status.className}`}>
                <div className="event-head">
                  <span className="event-sev">
                    <span aria-hidden="true">{status.glyph}</span> {status.label}
                  </span>
                  <span className="event-time">{timestampLabel(entry.hour, body)}</span>
                </div>
                <p className="event-text">{logText(entry, level, language)}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </DashboardGrid>
  );
}

/**
 * Debrief headline text for the four real Phase 2 outcomes (Phase 1 only had "won"/"lost").
 * Real `t()` calls as of M11 (`locales/en.json`/`bn.json`'s "debrief" namespace) — distinct
 * keys from `views/Report/MissionReportView.tsx`'s own "report.title*"/"report.outcome*" keys
 * since the two screens' wording differs slightly (this one names the raw hour number).
 */
function outcomeHeadline(
  t: TFunction,
  status: RunStatus,
  hour: number,
  body: Body,
  livingCrew: number,
  crewSize: number,
): { title: string; subtitle: string } {
  const timestamp = timestampLabel(hour, body);
  switch (status) {
    case "success":
      return {
        title: t("debrief.titleSuccess"),
        subtitle: t("debrief.outcomeSuccess", { duration: durationLabel(hour, body), living: livingCrew, crew: crewSize }),
      };
    case "partial":
      return { title: t("debrief.titlePartial"), subtitle: t("debrief.outcomePartial", { hour, timestamp }) };
    case "abort":
      return { title: t("debrief.titleAbort"), subtitle: t("debrief.outcomeAbort", { hour, timestamp }) };
    case "loss":
      return { title: t("debrief.titleLoss"), subtitle: t("debrief.outcomeLoss", { hour, timestamp }) };
    case "running":
      return { title: t("debrief.notReadyHeading"), subtitle: "" };
  }
}

function formatValue(value: number, text: { unit: string; decimals: number }): string {
  return `${value.toFixed(text.decimals)} ${text.unit}`.trim();
}

function FinalNumber({ label, value, status }: { label: string; value: string; status: string }) {
  return (
    <div className={`final-number ${status}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function IncidentRow({
  group,
  log,
  level,
  language,
  body,
}: {
  group: IncidentGroup;
  log: readonly LogEntry[];
  level: DialLevel;
  language: Language;
  body: Body;
}) {
  const { t } = useTranslation();
  const effects = directEffects(log, group.sample.id);
  const cascadeSize = causalCascade(log, group.sample.id).length;
  const when =
    group.count > 1
      ? `${timeUnitWord(body)} ${elapsedValue(group.firstHour, body).toFixed(2)}–${elapsedValue(group.lastHour, body).toFixed(2)}`
      : timestampLabel(group.firstHour, body);

  return (
    <li className="incident-row">
      <div className="incident-head">
        <span className="incident-time">{when}</span>
        <span className="incident-text">
          {logText(group.sample, level, language)}
          {group.count > 1 ? t("debrief.recurred", { count: group.count }) : ""}
        </span>
      </div>
      <p className="incident-effects">
        {group.count > 1 ? (
          <>{t("debrief.effectsAcrossOccurrences", { total: group.totalDirectEffects, count: group.count })}</>
        ) : (
          <>
            → {effects.length} {t("debrief.directEffect", { count: effects.length })}
            {cascadeSize !== effects.length ? t("debrief.totalDownstream", { count: cascadeSize }) : ""}
            {": "}
            {effects
              .slice(0, 6)
              .map((e) => logText(e, level, language))
              .join("; ")}
            {effects.length > 6 ? "; …" : ""}
          </>
        )}
      </p>
    </li>
  );
}

function CrewLossReport({
  entry,
  log,
  level,
  language,
}: {
  entry: LogEntry;
  log: readonly LogEntry[];
  level: DialLevel;
  language: Language;
}) {
  const { t } = useTranslation();
  const groups = crewLossConditions(entry, log, CREW_LOSS_WINDOW_HOURS);

  return (
    <div className="crew-loss-report">
      <p className="crew-loss-headline">
        {crewLossHeadline(typeof entry.data["crew"] === "string" ? entry.data["crew"] : "Crew member", level, language)}
      </p>
      {groups.length > 0 ? (
        <>
          <p className="panel-hint">
            {/* 72 hours is exactly 3 Earth days regardless of which body the mission is on —
                a fixed window choice, not derived from either body's day length, so this
                is the one time span in the app that does not need a Mars/Moon distinction. */}
            {t("debrief.crewLossWindowHint")}
          </p>
          <ul className="condition-list">
            {groups.map((group) => (
              <li key={group.code} className="condition-row">
                {logText(group.sample, level, language)}
                {group.count > 1 ? t("debrief.recurredShort", { count: group.count }) : ""}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="panel-hint">{t("debrief.crewLossNoConditions")}</p>
      )}
    </div>
  );
}

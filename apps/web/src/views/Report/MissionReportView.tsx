import { useTranslation } from "react-i18next";
import { causalCascade, directEffects, runFingerprint, type Body, type LogEntry, type RunStatus } from "@sol-keeper/sim";
import { useDial } from "../../store/dial.js";
import { useRun } from "../../store/run.js";
import { logText } from "../../i18n/logText.js";
import { groupIncidents, majorIncidents, type IncidentGroup } from "../../dial/blackBox.js";
import { decisionTimeline } from "../../dial/decisionTimeline.js";
import { whatNasaDidCards } from "../../dial/whatNasaDid.js";
import { durationLabel, elapsedValue, timeUnitWord, timestampLabel } from "../../dial/missionTime.js";
import { stationLabel } from "../../dial/labels.js";
import type { DialLevel } from "../../dial/types.js";
import { ReportLinkButton } from "../../components/ReportLinkButton.js";

/**
 * M10.8: the Mission Report — the brief's own printable one-pager (print CSS → browser print
 * to PDF): outcome, crew and their stations, site, a decision timeline tagged by station, the
 * Black Box causal chain, one "What NASA did" card per real-world incident, a replay link, a
 * data-sources footer. Deliberately a separate view from `DebriefView` (M10 plan's own
 * finding #5): different jobs (this is one linear document meant to be read start to finish
 * or printed, not an interactive exploration console) and different lifetimes (a landing page
 * for an inbound report link, not a mid-app tab — `App.tsx` renders it as a third takeover
 * alongside Setup, never inside the station-console shell).
 *
 * Bilingual scope, disclosed on the page itself (`report.disclosureNote`) and in the M10.8
 * summary: this file's own headings/labels/outcome text are real `t()` calls, translated in
 * both `locales/en.json` and `locales/bn.json`. Everything below that comes from `logText()`
 * (station names, decision text, causal-chain descriptions) stays English-only — the same
 * scope boundary M10 plan's user decision 2 drew, unchanged by this milestone.
 */
export function MissionReportView({ onBack }: { onBack: () => void }) {
  const state = useRun((s) => s.state);
  const scenario = useRun((s) => s.scenario);
  const level = useDial((s) => s.level);
  const { t } = useTranslation();

  const body = scenario.body;
  const livingCrew = state.crew.filter((c) => c.alive).length;
  const log = state.log;
  const incidents = majorIncidents(log);
  const incidentGroups = groupIncidents(incidents, log);
  const decisions = decisionTimeline(log);
  const nasaCards = whatNasaDidCards(state.activeIncidents);

  const { titleKey, detailKey } = outcomeKeys(state.status);
  const outcomeVars = {
    duration: durationLabel(state.hour, body),
    timestamp: timestampLabel(state.hour, body),
    living: livingCrew,
    crew: state.crew.length,
  };

  return (
    <div className="mission-report">
      <div className="report-toolbar">
        <button type="button" className="btn btn-quiet" onClick={onBack}>
          ← {t("report.back")}
        </button>
        <p className="report-print-hint">{t("report.printHint")}</p>
      </div>

      <header className="view-head report-head">
        <h1>{t("report.title")}</h1>
        <h2>{t(titleKey)}</h2>
        <p className="view-hint">{t(detailKey, outcomeVars)}</p>
        <p className="report-run-signature">
          {t("report.runSignature")}: <code>{runFingerprint(state)}</code>
        </p>
      </header>

      <p className="report-disclosure">{t("report.disclosureNote")}</p>

      <section className="panel" aria-labelledby="report-crew-heading">
        <h2 id="report-crew-heading">{t("report.crewHeading")}</h2>
        <table className="report-crew-table">
          <thead>
            <tr>
              <th scope="col">{t("report.crewName")}</th>
              <th scope="col">{t("report.crewStatus")}</th>
              <th scope="col">{t("report.primaryStation")}</th>
              <th scope="col">{t("report.backupStation")}</th>
            </tr>
          </thead>
          <tbody>
            {state.crew.map((member) => (
              <tr key={member.id}>
                <td>{member.name}</td>
                <td>{member.alive ? t("report.crewAlive") : t("report.crewLost")}</td>
                <td>{stationLabel(member.primaryStation, level)}</td>
                <td>{stationLabel(member.backupStation, level)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel" aria-labelledby="report-site-heading">
        <h2 id="report-site-heading">{t("report.siteHeading")}</h2>
        <p>
          {scenario.site.name} — {body === "mars" ? t("report.bodyMars") : t("report.bodyMoon")} (
          {scenario.site.latDeg.toFixed(2)}°, {scenario.site.lonDeg.toFixed(2)}°)
        </p>
      </section>

      <section className="panel" aria-labelledby="report-decisions-heading">
        <h2 id="report-decisions-heading">{t("report.decisionsHeading")}</h2>
        {decisions.length === 0 ? (
          <p className="panel-hint">{t("report.decisionsEmpty")}</p>
        ) : (
          <ul className="report-decision-list">
            {decisions.map(({ entry, station }) => (
              <li key={entry.id} className="report-decision-row">
                <span className="report-decision-station">
                  {station !== undefined ? stationLabel(station, level) : "—"}
                </span>
                <span className="report-decision-time">{timestampLabel(entry.hour, body)}</span>
                <span className="report-decision-text">{logText(entry, level)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="report-causal-heading">
        <h2 id="report-causal-heading">{t("report.causalChainHeading")}</h2>
        <p className="panel-hint">{t("report.causalChainHint")}</p>
        {incidentGroups.length === 0 ? (
          <p className="panel-hint">{t("report.causalChainEmpty")}</p>
        ) : (
          <ul className="incident-list">
            {incidentGroups.map((group) => (
              <ReportIncidentRow key={`${group.sample.id}-${group.count}`} group={group} log={log} level={level} body={body} />
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="report-nasa-heading">
        <h2 id="report-nasa-heading">{t("report.whatNasaDidHeading")}</h2>
        {nasaCards.length === 0 ? (
          <p className="panel-hint">{t("report.whatNasaDidEmpty")}</p>
        ) : (
          <ul className="nasa-card-list">
            {nasaCards.map((card) => (
              <li key={card.incidentId} className="nasa-card">
                <p className="nasa-card-analogue">{card.analogue}</p>
                <p className="nasa-card-source">
                  {card.url !== undefined ? (
                    <a href={card.url} target="_blank" rel="noreferrer">
                      {card.title}
                    </a>
                  ) : (
                    card.title
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel report-no-print" aria-labelledby="report-replay-heading">
        <h2 id="report-replay-heading">{t("report.replayHeading")}</h2>
        <p className="panel-hint">{t("report.replayHint")}</p>
        <ReportLinkButton />
      </section>

      <footer className="panel report-data-sources-footer" aria-labelledby="report-sources-heading">
        <h2 id="report-sources-heading">{t("report.dataSourcesHeading")}</h2>
        <p className="panel-hint">{t("report.dataSourcesHint")}</p>
        <p className="report-not-affiliated">{t("report.notAffiliated")}</p>
      </footer>
    </div>
  );
}

function outcomeKeys(status: RunStatus): { titleKey: string; detailKey: string } {
  switch (status) {
    case "success":
      return { titleKey: "report.titleSuccess", detailKey: "report.outcomeSuccess" };
    case "partial":
      return { titleKey: "report.titlePartial", detailKey: "report.outcomePartial" };
    case "abort":
      return { titleKey: "report.titleAbort", detailKey: "report.outcomeAbort" };
    case "loss":
      return { titleKey: "report.titleLoss", detailKey: "report.outcomeLoss" };
    case "running":
      return { titleKey: "report.titleRunning", detailKey: "report.outcomeRunning" };
  }
}

/** Mirrors `DebriefView`'s own `IncidentRow` (same underlying `dial/blackBox.ts` grouping),
 *  rendered separately rather than shared: this file's headings are real `t()` calls, and
 *  Debrief's are not (M10 plan's own finding #5 — different jobs, not a shared component). */
function ReportIncidentRow({
  group,
  log,
  level,
  body,
}: {
  group: IncidentGroup;
  log: readonly LogEntry[];
  level: DialLevel;
  body: Body;
}) {
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
          {logText(group.sample, level)}
          {group.count > 1 ? ` (recurred ${group.count} times)` : ""}
        </span>
      </div>
      <p className="incident-effects">
        {group.count > 1 ? (
          <>→ {group.totalDirectEffects} effects across all {group.count} occurrences.</>
        ) : (
          <>
            → {effects.length} direct effect{effects.length === 1 ? "" : "s"}
            {cascadeSize !== effects.length ? `, ${cascadeSize} total downstream` : ""}:{" "}
            {effects
              .slice(0, 6)
              .map((e) => logText(e, level))
              .join("; ")}
            {effects.length > 6 ? "; …" : ""}
          </>
        )}
      </p>
    </li>
  );
}

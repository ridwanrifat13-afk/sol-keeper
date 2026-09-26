import { useTranslation } from "react-i18next";
import { causalCascade, directEffects, type Body, type LogEntry, type RunStatus } from "@sol-keeper/sim";
import { useDial } from "../../store/dial.js";
import { useRun, runLinkConfigFromStore } from "../../store/run.js";
import { logText } from "../../i18n/logText.js";
import { buildResourceSummary } from "../../dial/resourceSummary.js";
import { crewLossConditions, groupIncidents, majorIncidents, type IncidentGroup } from "../../dial/blackBox.js";
import type { DialLevel } from "../../dial/types.js";
import { durationLabel, elapsedValue, timeUnitWord, timestampLabel } from "../../dial/missionTime.js";
import { statusFromSeverity } from "../../components/status.js";
import { crewLossHeadline } from "../../dial/crewLoss.js";
import { CopyLinkButton } from "../../components/CopyLinkButton.js";
import { buildRunLinkUrl } from "../../share/runLink.js";

/**
 * The Black Box debrief — what happened, and what an entry actually caused.
 *
 * The two honesty rules behind "major incidents" and the crew-loss "conditions" list are
 * documented at dial/blackBox.ts, next to the functions that implement them, so the rule
 * and its code cannot drift apart the way a comment here and logic there eventually would.
 */
const CREW_LOSS_WINDOW_HOURS = 72;

export function DebriefView() {
  const state = useRun((s) => s.state);
  const body = useRun((s) => s.scenario.body);
  const params = useRun((s) => s.params);
  const setupChoices = useRun((s) => s.setupChoices);
  const inputLog = useRun((s) => s.inputLog);
  const level = useDial((s) => s.level);
  const { t } = useTranslation();

  // M10.7: "Copy report link" works at any point in a run, not only once it's finished —
  // `replayRun` (M10.4) rebuilds exactly `state.hour`'s worth of the mission whatever that
  // hour is, and a link to "here's how far I've gotten" is genuinely useful mid-mission too,
  // not just as a finished mission's report.
  const reportLinkButton = (
    <CopyLinkButton
      label={t("shareLink.copyReportLink")}
      buildUrl={() =>
        buildRunLinkUrl(window.location, runLinkConfigFromStore({ params, setupChoices }), {
          inputLog,
          throughHour: state.hour,
        })
      }
    />
  );

  if (state.status === "running") {
    return (
      <div className="debrief">
        <header className="view-head">
          <h2>Debrief</h2>
          <p className="view-hint">
            The Black Box fills in once the mission ends — keep the outpost running.
          </p>
        </header>
        {reportLinkButton}
      </div>
    );
  }

  const summary = buildResourceSummary(state, level);
  const log = state.log;
  const incidents = majorIncidents(log);
  const incidentGroups = groupIncidents(incidents, log);
  const crewLosses = log.filter((e) => e.code === "crew.lost" || e.code.startsWith("crew.lost."));

  const headline = outcomeHeadline(state.status, state.hour, body, summary.livingCrew, state.crew.length);

  return (
    <div className="debrief">
      <header className="view-head">
        <h2>{headline.title}</h2>
        <p className="view-hint">{headline.subtitle}</p>
      </header>

      {reportLinkButton}

      <section className="panel" aria-labelledby="final-numbers-heading">
        <h2 id="final-numbers-heading">Final numbers</h2>
        <dl className="final-numbers">
          <FinalNumber
            label="Oxygen"
            value={summary.oxygen.text.valueText ?? formatValue(state.atmosphere.o2PartialPressureMmHg, summary.oxygen.text)}
            status={summary.oxygen.status.className}
          />
          <FinalNumber
            label="Water"
            value={summary.water.text.valueText ?? formatValue(state.water.potableKg, summary.water.text)}
            status={summary.water.status.className}
          />
          <FinalNumber
            label="Food"
            value={summary.food.text.valueText ?? formatValue(state.food.storedDryMassKg, summary.food.text)}
            status={summary.food.status.className}
          />
          <FinalNumber
            label="Battery"
            value={summary.battery.text.valueText ?? formatValue(state.power.batteryEnergyKwh, summary.battery.text)}
            status={summary.battery.status.className}
          />
          <FinalNumber label="Harvested" value={`${state.food.cumulativeHarvestKg.toFixed(1)} kg`} status="is-nominal" />
          <FinalNumber
            label="ISRU oxygen"
            value={`${(state.isru.moxieO2ProducedKg * 1000).toFixed(0)} g`}
            status="is-nominal"
          />
        </dl>
      </section>

      {crewLosses.length > 0 && (
        <section className="panel" aria-labelledby="crew-lost-heading">
          <h2 id="crew-lost-heading">Crew lost</h2>
          {crewLosses.map((loss) => (
            <CrewLossReport key={loss.id} entry={loss} log={log} level={level} />
          ))}
        </section>
      )}

      <section className="panel" aria-labelledby="incidents-heading">
        <h2 id="incidents-heading">Major incidents ({incidents.length})</h2>
        <p className="panel-hint">
          Every entry below is one the engine recorded as the cause of at least one other
          entry — the causal chain is real, not inferred after the fact. Runs of the same
          recurring incident (a brownout re-triggering as a dust storm's shortfall shifts
          hour to hour) are grouped into one row.
        </p>
        <ul className="incident-list">
          {incidentGroups.length === 0 && (
            <li className="event-empty">No incident on this run triggered a recorded chain.</li>
          )}
          {incidentGroups.map((group) => (
            <IncidentRow key={`${group.sample.id}-${group.count}`} group={group} log={log} level={level} body={body} />
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="timeline-heading">
        <h2 id="timeline-heading">Full mission log ({log.length})</h2>
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
                <p className="event-text">{logText(entry, level)}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/**
 * Debrief headline text for the four real Phase 2 outcomes (Phase 1 only had "won"/"lost").
 * Hardcoded English, same as the rest of this view (config.ts already discloses that Debrief
 * is not yet migrated to i18next translation keys) — a pre-existing gap this function does
 * not close, flagged again in the M7 milestone summary rather than silently left undocumented.
 */
function outcomeHeadline(
  status: RunStatus,
  hour: number,
  body: Body,
  livingCrew: number,
  crewSize: number,
): { title: string; subtitle: string } {
  switch (status) {
    case "success":
      return {
        title: "Mission complete",
        subtitle: `${durationLabel(hour, body)}, ${livingCrew} of ${crewSize} crew home safe.`,
      };
    case "partial":
      return {
        title: "Mission ended — goal not met",
        subtitle: `Crew safe, but the mission's goal was missed. Ended at hour ${hour} (${timestampLabel(hour, body)}).`,
      };
    case "abort":
      return {
        title: "Mission aborted",
        subtitle: `The crew chose to abort. Ended at hour ${hour} (${timestampLabel(hour, body)}).`,
      };
    case "loss":
      return {
        title: "Mission lost",
        subtitle: `Ended at hour ${hour} (${timestampLabel(hour, body)}).`,
      };
    case "running":
      return { title: "Debrief", subtitle: "" };
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

function CrewLossReport({
  entry,
  log,
  level,
}: {
  entry: LogEntry;
  log: readonly LogEntry[];
  level: DialLevel;
}) {
  const groups = crewLossConditions(entry, log, CREW_LOSS_WINDOW_HOURS);

  return (
    <div className="crew-loss-report">
      <p className="crew-loss-headline">
        {crewLossHeadline(typeof entry.data["crew"] === "string" ? entry.data["crew"] : "Crew member", level)}
      </p>
      {groups.length > 0 ? (
        <>
          <p className="panel-hint">
            {/* 72 hours is exactly 3 Earth days regardless of which body the mission is on —
                a fixed window choice, not derived from either body's day length, so this
                is the one time span in the app that does not need a Mars/Moon distinction. */}
            Conditions in the 3 days before — not a proven cause; health declines gradually
            across several models at once.
          </p>
          <ul className="condition-list">
            {groups.map((group) => (
              <li key={group.code} className="condition-row">
                {logText(group.sample, level)}
                {group.count > 1 ? ` (×${group.count})` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="panel-hint">No severe conditions were logged in the preceding window.</p>
      )}
    </div>
  );
}

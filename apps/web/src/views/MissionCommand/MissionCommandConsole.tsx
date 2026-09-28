import {
  checkGoal,
  crew as crewConstants,
  crewCondition,
  isDoubleCovering,
  stationCoverer,
  stationPerformance,
  EventLogger,
  Rng,
  STATION_IDS,
  type StationId,
  type TickContext,
} from "@sol-keeper/sim";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { CrewPanel } from "../../components/CrewPanel.js";
import { ScenarioSwitch } from "../../components/ScenarioSwitch.js";
import { EsmPanel } from "../../components/EsmPanel.js";
import { STATUS } from "../../components/status.js";
import {
  co2ScrubberModeLabel,
  stationLabel,
  survivalModeLabel,
  thermalControlModeLabel,
  waterReclamationModeLabel,
} from "../../dial/labels.js";
import { goalText } from "../../i18n/goalText.js";
import { useAppLanguage } from "../../i18n/useAppLanguage.js";

/**
 * The Mission Command console (M8.3): crew status, which mission is running, and the whole
 * mission's ESM budget — moved wholesale from the old Operate view (M8's settled navigation:
 * crew assignment and daily-plan/goals content are Mission Command concerns; the ESM budget
 * is a whole-mission figure, not any one resource console's).
 *
 * M8.4 Part E, the last of the five: real crew station assignment (assignStation, M8.1 —
 * already wired, no sim change needed), a per-station coverage summary showing the real,
 * already-computed consequence (stationPerformance/isDoubleCovering) of the *current*
 * assignment rather than an invented hypothetical-hover preview, a read-only daily-plan
 * rollup of what the other four consoles currently have set, and a real goals readout
 * (checkGoal, live against the scenario's own primary/stretch goal).
 *
 * M9.x (player request, batch 2): "Crew schedule" — the overtime-authorization toggle, the
 * fourth of four new nominal-conditions levers this batch adds (the other three are the Life
 * Support console's water reclamation and thermal control dials). Reads
 * crew.overtimeCeilingFractionOfAverage/crew.overtimeFatiguePerHourAboveCeiling
 * (BVAD-2022, already sourced, never read by any model before this) via
 * engine/crewHours.ts's own day-boundary bookkeeping.
 */
export function MissionCommandConsole() {
  // `state` is mutated in place (store/run.ts's own doc comment) — subscribing to `version`
  // is what actually triggers a re-render for a console reading it (the same fix M8.2's
  // DecisionCard and M8.4 Part D's IncidentCommandConsole needed for the same reason).
  useRun((s) => s.version);
  const state = useRun((s) => s.state);
  const params = useRun((s) => s.params);
  const scenario = useRun((s) => s.scenario);
  const phase = useRun((s) => s.phase);
  const assignStation = useRun((s) => s.assignStation);
  const setOvertimeAuthorized = useRun((s) => s.setOvertimeAuthorized);
  const level = useDial((s) => s.level);
  const language = useAppLanguage();
  const locked = phase !== "planning";

  // Read-only ad hoc TickContext, the same shape resolveIncident/DecisionCard already build —
  // stationPerformance/stationCoverer/isDoubleCovering only ever read ctx.state, never
  // ctx.rng/ctx.log, so building this here has no side effect.
  const ctx: TickContext = {
    state,
    params,
    scenario,
    rng: new Rng(state.rng),
    log: new EventLogger(state.log, state.hour),
    dtHours: 1,
  };

  const primaryMet = checkGoal(scenario.primaryGoal, state, scenario);
  const stretchMet = checkGoal(scenario.stretchGoal, state, scenario);

  return (
    <div className="console">
      <header className="view-head">
        <h2>Mission Command</h2>
        <p className="view-hint">Crew status, the current mission, and the whole-mission mass budget.</p>
      </header>

      <ScenarioSwitch />
      <CrewPanel />

      <section className="panel" aria-labelledby="station-coverage-heading">
        <h2 id="station-coverage-heading">Station coverage</h2>
        <p className="panel-hint">Who covers what right now, and how effectively.</p>
        <ul className="status-list">
          {STATION_IDS.map((station) => {
            const coverer = stationCoverer(ctx, station);
            const performance = stationPerformance(ctx, station, crewCondition);
            const doubleCovering = coverer !== undefined && isDoubleCovering(ctx, coverer);
            return (
              <li key={station}>
                <span className="status-list-label">{stationLabel(station, level, language)}</span>
                <span className="status-list-value">
                  {coverer !== undefined ? coverer.name : "Unassigned"} · {Math.round(performance * 100)}%
                  {doubleCovering ? " (double-covering)" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel" aria-labelledby="crew-assignment-heading">
        <h2 id="crew-assignment-heading">Crew assignment</h2>
        <p className="panel-hint">
          Which station each crew member covers.
          {locked && " Locked while the sol is running — adjust it during Sol Planning."}
        </p>
        <ul className="crew-location-list">
          {state.crew
            .filter((c) => c.alive)
            .map((member) => (
              <li key={member.id} className="crew-location-row">
                <span className="crew-location-name">{member.name}</span>
                <span className="button-row" role="group" aria-label={`${member.name}'s station`}>
                  {STATION_IDS.map((station: StationId) => (
                    <button
                      key={station}
                      type="button"
                      className={`btn btn-tiny ${member.primaryStation === station ? "btn-active" : ""}`}
                      aria-pressed={member.primaryStation === station}
                      disabled={locked}
                      onClick={() => {
                        assignStation(member.id, station);
                      }}
                    >
                      {stationLabel(station, level, language)}
                    </button>
                  ))}
                </span>
              </li>
            ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="crew-schedule-heading">
        <h2 id="crew-schedule-heading">Crew schedule</h2>
        <p className="panel-hint">
          A fourth real lever: authorizing overtime raises today's crew-hours ceiling by{" "}
          {Math.round((crewConstants.overtimeCeilingFractionOfAverage.value - 1) * 100)}%
          (BVAD-2022's own "maximum available VST" figure) — more room for incident response and
          repairs — but any hours actually worked past the ordinary budget cost the whole crew
          real, felt fatigue once the sol ends. Costs nothing if the extra hours go unused.
          {locked && " Locked while the sol is running — adjust it during Sol Planning."}
        </p>
        <div className="button-row" role="group" aria-label="Overtime authorization">
          <button
            type="button"
            className={`btn ${!state.crewHours.overtimeAuthorized ? "btn-active" : ""}`}
            aria-pressed={!state.crewHours.overtimeAuthorized}
            disabled={locked}
            onClick={() => {
              setOvertimeAuthorized(false);
            }}
          >
            Standard hours
            <span className="btn-sub">no fatigue risk</span>
          </button>
          <button
            type="button"
            className={`btn ${state.crewHours.overtimeAuthorized ? "btn-active" : ""}`}
            aria-pressed={state.crewHours.overtimeAuthorized}
            disabled={locked}
            onClick={() => {
              setOvertimeAuthorized(true);
            }}
          >
            Authorize overtime
            <span className="btn-sub">
              up to {(state.crewHours.unboostedBudgetTodayHours * crewConstants.overtimeCeilingFractionOfAverage.value).toFixed(1)} h today
            </span>
          </button>
        </div>
        <p className="panel-hint">
          Today: {state.crewHours.spentTodayHours.toFixed(1)} / {state.crewHours.budgetTodayHours.toFixed(1)} h spent.
        </p>
      </section>

      <section className="panel" aria-labelledby="daily-plan-heading">
        <h2 id="daily-plan-heading">Daily plan</h2>
        <ul className="status-list">
          <li>
            <span className="status-list-label">Rations</span>
            <span className="status-list-value">{survivalModeLabel(state.food.mode, level, language)}</span>
          </li>
          <li>
            <span className="status-list-label">Downlink priority</span>
            <span className="status-list-value">
              {state.comms.priority === "personal" ? "Personal correspondence" : "Science downlink"}
            </span>
          </li>
          <li>
            <span className="status-list-label">Air cleaner</span>
            <span className="status-list-value">{co2ScrubberModeLabel(state.atmosphere.co2ScrubberMode, level, language)}</span>
          </li>
          <li>
            <span className="status-list-label">Water reclamation</span>
            <span className="status-list-value">{waterReclamationModeLabel(state.water.reclamationMode, level, language)}</span>
          </li>
          <li>
            <span className="status-list-label">Thermal control</span>
            <span className="status-list-value">{thermalControlModeLabel(state.thermal.controlMode, level, language)}</span>
          </li>
          <li>
            <span className="status-list-label">Overtime</span>
            <span className="status-list-value">{state.crewHours.overtimeAuthorized ? "Authorized" : "Standard hours"}</span>
          </li>
          <li>
            <span className="status-list-label">Repair queue</span>
            <span className="status-list-value">{state.crewHours.queue.length} item(s)</span>
          </li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="goals-heading">
        <h2 id="goals-heading">Goals</h2>
        <p>
          <span className={STATUS[primaryMet ? "nominal" : "caution"].className}>
            <span aria-hidden="true">{STATUS[primaryMet ? "nominal" : "caution"].glyph}</span>{" "}
            {primaryMet ? "Primary goal met" : "Primary goal"}
          </span>
        </p>
        <p className="panel-hint">{goalText(scenario.primaryGoal.briefKey, level, language)}</p>
        <p>
          <span className={STATUS[stretchMet ? "nominal" : "caution"].className}>
            <span aria-hidden="true">{STATUS[stretchMet ? "nominal" : "caution"].glyph}</span>{" "}
            {stretchMet ? "Stretch goal met" : "Stretch goal"}
          </span>
        </p>
        <p className="panel-hint">{goalText(scenario.stretchGoal.briefKey, level, language)}</p>
        {scenario.scienceTargetPoints > 0 && (
          <p className="panel-hint">
            Science: {state.science.points.toFixed(1)} / {scenario.scienceTargetPoints} points
          </p>
        )}
      </section>

      <EsmPanel />
    </div>
  );
}

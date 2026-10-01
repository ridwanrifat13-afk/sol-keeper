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
import { FiCalendar, FiUsers, FiAlertTriangle, FiClock } from "react-icons/fi";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { CrewPanel } from "../../components/CrewPanel.js";
import { OrbitalView } from "../../components/OrbitalView.js";
import { ScenarioSwitch } from "../../components/ScenarioSwitch.js";
import { EsmPanel } from "../../components/EsmPanel.js";
import { STATUS } from "../../components/status.js";
import { StatusPill } from "../../components/StatusPill.js";
import {
  co2ScrubberModeLabel,
  stationLabel,
  survivalModeLabel,
  thermalControlModeLabel,
  waterReclamationModeLabel,
} from "../../dial/labels.js";
import { goalText } from "../../i18n/goalText.js";
import { useAppLanguage } from "../../i18n/useAppLanguage.js";
import { durationLabel, elapsedValue, timeUnitWord } from "../../dial/missionTime.js";
import { SCENARIO_LABELS } from "../../dial/scenarioLabels.js";

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
 *
 * Player request #9's second half: "the mission command panels should look like a real NASA
 * operation center." The `ops-center` class (styles.css) adds a console-room grid backdrop
 * and a "big board" status strip — real, already-live numbers (mission elapsed time, crew
 * alive/total, active alerts) in the large tabular-nums readout a real ops room's main
 * display uses, not new state or invented figures.
 *
 * A later request built on that same theme: "a 3d model like eyes.nasa.gov... to show
 * moon/mars orbiting." That first shipped as an original Three.js/WebGL scene (real orbital
 * periods, synced to store/run.ts's own speed/phase/status) — then the player asked directly
 * whether NASA's own eyes.nasa.gov could be used instead. OrbitalView.tsx is now a direct
 * embed of that real app (its own doc comment has the full investigation: no frame-blocking
 * header, its own documented `logo=false` embed option genuinely removes the NASA insignia —
 * confirmed with the player, since attribution alone doesn't satisfy brief rule 5 — and real
 * `#/mars`/`#/moon` routes). No longer synced to the sim clock: NASA's own app runs on the
 * real live clock with no cross-origin API this page can drive, a real, disclosed trade the
 * player accepted for the real thing over a custom approximation. A plain iframe needs no
 * code-splitting the way the Three.js build it replaced did.
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

  const aliveCrewCount = state.crew.filter((c) => c.alive).length;
  const activeAlertCount = state.activeIncidents.filter((i) => i.resolvedAtHour === undefined).length;

  return (
    <div className="console ops-center two-col">
      <header className="view-head">
        <h2>Mission Command</h2>
        <p className="view-hint">Crew status, the current mission, and the whole-mission mass budget.</p>
      </header>

      <section className="ops-board panel-span-full" aria-labelledby="ops-board-heading">
        <h2 id="ops-board-heading" className="visually-hidden">
          Mission status board
        </h2>
        <div className="ops-board-row">
          <span className="ops-live-dot" aria-hidden="true" />
          <span className="ops-board-title">
            {SCENARIO_LABELS[scenario.id].label.toUpperCase()} ·{" "}
            {state.status === "running" ? "MISSION IN PROGRESS" : state.status.toUpperCase()}
          </span>
        </div>
        <div className="ops-board-readouts">
          <div className="ops-readout">
            <span className="ops-readout-icon" aria-hidden="true">
              <FiCalendar />
            </span>
            <span className="ops-readout-body">
              <span className="ops-readout-value">
                {elapsedValue(state.hour, scenario.body).toFixed(2)}
                <span className="ops-readout-unit"> / {durationLabel(scenario.durationHours, scenario.body)}</span>
              </span>
              <span className="ops-readout-label">{timeUnitWord(scenario.body)} elapsed</span>
            </span>
          </div>
          <div className="ops-readout">
            <span className="ops-readout-icon" aria-hidden="true">
              <FiUsers />
            </span>
            <span className="ops-readout-body">
              <span className="ops-readout-value">
                {aliveCrewCount}
                <span className="ops-readout-unit"> / {state.crew.length}</span>
              </span>
              <span className="ops-readout-label">Crew alive</span>
            </span>
          </div>
          <div className="ops-readout">
            <span className="ops-readout-icon" aria-hidden="true">
              <FiAlertTriangle />
            </span>
            <span className="ops-readout-body">
              <span className={`ops-readout-value ${activeAlertCount > 0 ? "ops-readout-alert" : ""}`}>
                {activeAlertCount}
              </span>
              <span className="ops-readout-label">Active alerts</span>
            </span>
          </div>
          <div className="ops-readout">
            <span className="ops-readout-icon" aria-hidden="true">
              <FiClock />
            </span>
            <span className="ops-readout-body">
              <span className="ops-readout-value">{state.hour}</span>
              <span className="ops-readout-label">Mission hour</span>
            </span>
          </div>
        </div>
      </section>

      <OrbitalView />

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
          <StatusPill
            status={STATUS[primaryMet ? "nominal" : "caution"]}
            label={primaryMet ? "Primary goal met" : "Primary goal"}
          />
        </p>
        <p className="panel-hint">{goalText(scenario.primaryGoal.briefKey, level, language)}</p>
        <p>
          <StatusPill
            status={STATUS[stretchMet ? "nominal" : "caution"]}
            label={stretchMet ? "Stretch goal met" : "Stretch goal"}
          />
        </p>
        <p className="panel-hint">{goalText(scenario.stretchGoal.briefKey, level, language)}</p>
        {scenario.scienceTargetPoints > 0 && (
          <p className="panel-hint">
            Science: {state.science.points.toFixed(1)} / {scenario.scienceTargetPoints} points
          </p>
        )}
      </section>

      <EsmPanel className="panel-span-full" />
    </div>
  );
}

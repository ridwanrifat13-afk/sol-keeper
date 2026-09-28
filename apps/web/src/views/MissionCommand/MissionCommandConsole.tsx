import {
  checkGoal,
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
import { FactCardGallery } from "../../components/FactCardGallery.js";
import { STATUS } from "../../components/status.js";
import { stationLabel, survivalModeLabel } from "../../dial/labels.js";
import { powerFactCardTopicFor } from "../../dial/factCardTopics.js";
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

      <section className="panel" aria-labelledby="real-hardware-heading">
        <h2 id="real-hardware-heading">Real hardware</h2>
        <p className="panel-hint">
          Player request: what does the crew actually operate? Real NASA photos of the hardware
          each station's console models — not concept art, the real flight or flight-derived
          units.
        </p>
      </section>
      <FactCardGallery
        topic={powerFactCardTopicFor(scenario.body)}
        heading={scenario.body === "mars" ? "Power: MOXIE (Mars ISRU)" : "Power: the lunar south pole"}
      />
      <FactCardGallery topic="co2-scrubber" heading="Life support: the ISS's CDRA CO₂ scrubber" />
      <FactCardGallery topic="veggie" heading="Crops: NASA's Veggie plant-growth hardware" />
      <FactCardGallery topic="deep-space-network" heading="Comms: the Deep Space Network" />
    </div>
  );
}

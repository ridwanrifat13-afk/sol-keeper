import { getScenario, type ScenarioId } from "@sol-keeper/sim";
import { useRun } from "../store/run.js";
import { SCENARIO_LABELS } from "../dial/scenarioLabels.js";

const SCENARIO_IDS: readonly ScenarioId[] = ["jezero-outpost", "first-light", "the-long-night"];

/**
 * Picks which scenario is running. Starting a different scenario is the same act as
 * restarting the current one — both replace the whole run — so this reuses `reset` with an
 * override rather than adding a second code path.
 *
 * Stands in for the mission-setup step Prepare would otherwise own; Prepare itself (crew
 * composition, landing-site map, loadout) is P0 in the feature list but not part of any
 * milestone through M4, so this is deliberately just an id switch, not mission planning.
 */
export function ScenarioSwitch() {
  const scenarioId = useRun((s) => s.scenario.id);
  const reset = useRun((s) => s.reset);

  return (
    <div className="scenario-switch" role="group" aria-label="Mission scenario">
      {SCENARIO_IDS.map((id) => {
        const meta = SCENARIO_LABELS[id];
        return (
          <button
            key={id}
            type="button"
            className={`btn btn-scenario ${scenarioId === id ? "btn-active" : ""}`}
            aria-pressed={scenarioId === id}
            onClick={() => {
              if (id === scenarioId) return;
              reset({ scenarioId: id, crewSize: getScenario(id).crewSize });
            }}
          >
            {meta.label}
            <span className="btn-sub">{meta.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

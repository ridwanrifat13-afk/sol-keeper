import { getScenario, type ScenarioId } from "@sol-keeper/sim";
import { useRun } from "../store/run.js";

const SCENARIOS: readonly { id: ScenarioId; label: string; hint: string }[] = [
  { id: "jezero-outpost", label: "Jezero Outpost", hint: "Mars · 30 sols · dust storm" },
  { id: "first-light", label: "First Light", hint: "Moon · one 354 h night" },
  { id: "the-long-night", label: "The Long Night", hint: "Moon · 3 lunar nights, reactor-powered" },
];

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
      {SCENARIOS.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`btn btn-scenario ${scenarioId === s.id ? "btn-active" : ""}`}
          aria-pressed={scenarioId === s.id}
          onClick={() => {
            if (s.id === scenarioId) return;
            reset({ scenarioId: s.id, crewSize: getScenario(s.id).crewSize });
          }}
        >
          {s.label}
          <span className="btn-sub">{s.hint}</span>
        </button>
      ))}
    </div>
  );
}

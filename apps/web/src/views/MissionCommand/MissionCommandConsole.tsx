import { CrewPanel } from "../../components/CrewPanel.js";
import { ScenarioSwitch } from "../../components/ScenarioSwitch.js";
import { EsmPanel } from "../../components/EsmPanel.js";

/**
 * The Mission Command console (M8.3): crew status, which mission is running, and the whole
 * mission's ESM budget — moved wholesale from the old Operate view (M8's settled navigation:
 * crew assignment and daily-plan/goals content are Mission Command concerns; the ESM budget
 * is a whole-mission figure, not any one resource console's).
 *
 * Crew *assignment* (which station each member covers) and the daily-plan/goals readouts are
 * M8.4 Part E's job, not this shell-only pass.
 */
export function MissionCommandConsole() {
  return (
    <div className="console">
      <header className="view-head">
        <h2>Mission Command</h2>
        <p className="view-hint">Crew status, the current mission, and the whole-mission mass budget.</p>
      </header>

      <ScenarioSwitch />
      <CrewPanel />
      <EsmPanel />
    </div>
  );
}

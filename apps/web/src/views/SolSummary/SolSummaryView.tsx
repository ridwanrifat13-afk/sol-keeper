import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { solSummaryLines } from "../../dial/solSummary.js";
import { stationLabel } from "../../dial/labels.js";
import { logText } from "../../i18n/logText.js";
import { statusFromSeverity } from "../../components/status.js";
import { timestampLabel } from "../../dial/missionTime.js";

/**
 * The end-of-sol summary (M8.5, brief's M8 core loop: "auto-pause on any incident or
 * threshold crossing -> Decision Card at the owning station -> end-of-sol summary (3 lines
 * max, one per station that acted)"). Shown the instant `step()` (store/run.ts) crosses a
 * 24-hour day boundary — the same moment `phase` resets to "planning" — as a blocking overlay
 * (same pattern as the Data Sources overlay, App.tsx), dismissed explicitly rather than
 * auto-clearing, so a player who stepped away still sees it on return.
 */
export function SolSummaryView() {
  // `justEndedSol`/`state.log` are read from the mutated-in-place store — subscribing to
  // `version` is what actually triggers a re-render (the recurring lesson this session:
  // DecisionCard, M8.4 Parts D/E all needed the same fix).
  useRun((s) => s.version);
  const justEndedSol = useRun((s) => s.justEndedSol);
  const state = useRun((s) => s.state);
  const scenario = useRun((s) => s.scenario);
  const dismissSolSummary = useRun((s) => s.dismissSolSummary);
  const level = useDial((s) => s.level);

  if (justEndedSol === undefined) return null;

  const lines = solSummaryLines(state.log, justEndedSol.startHour, justEndedSol.endHour);

  return (
    <div className="overlay-backdrop">
      <div className="overlay-panel" role="dialog" aria-modal="true" aria-labelledby="sol-summary-heading">
        <h2 id="sol-summary-heading">
          {timestampLabel(justEndedSol.endHour, scenario.body)} complete
        </h2>
        {lines.length === 0 ? (
          <p className="panel-hint">A quiet sol — nothing significant to report.</p>
        ) : (
          <ul className="status-list">
            {lines.map((line) => {
              const status = statusFromSeverity(line.entry.severity);
              return (
                <li key={line.entry.id}>
                  <span className="status-list-label">{stationLabel(line.station, level)}</span>
                  <span className={`status-list-value ${status.className}`}>
                    <span aria-hidden="true">{status.glyph}</span> {logText(line.entry, level)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="button-row">
          <button
            type="button"
            className="btn btn-active"
            onClick={() => {
              dismissSolSummary();
            }}
          >
            Continue to Sol Planning
          </button>
        </div>
      </div>
    </div>
  );
}

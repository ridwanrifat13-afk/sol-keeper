import { useRun } from "../../store/run.js";
import { STATUS } from "../../components/status.js";

/**
 * M9.1's cockpit `alert` region, when no Decision Card is pending: "the station's most
 * critical gauge." Mission Command already computes an active-incident count for its own ops
 * board (`activeAlertCount`, MissionCommandConsole.tsx) — reused here directly rather than
 * inventing a second definition of "alert."
 */
export function MissionCommandAlertSummary() {
  const activeIncidents = useRun((s) => s.state.activeIncidents);
  const activeAlertCount = activeIncidents.filter((i) => i.resolvedAtHour === undefined).length;
  const status = activeAlertCount > 0 ? STATUS.critical : STATUS.nominal;

  return (
    <div className={`cockpit-alert-summary ${status.className}`}>
      <span className="cockpit-alert-summary-label">Active alerts</span>
      <span className="cockpit-alert-summary-status">
        <span aria-hidden="true">{status.glyph}</span> {status.label}
      </span>
      <span className="cockpit-alert-summary-value">{activeAlertCount}</span>
    </div>
  );
}

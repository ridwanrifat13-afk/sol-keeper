import { useMemo } from "react";
import { useRun } from "../../store/run.js";
import { useLiveOrSnapshot } from "../../data/liveOrSnapshot.js";
import type { LightTimeResponse } from "../../../server-lib/types.js";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * M9.1's cockpit `alert` region, when no Decision Card is pending: "the station's most
 * critical gauge." Comms has no nominal/caution/critical resource to reuse the way every
 * other station's own AlertSummary does (LifeSupportAlertSummary.tsx, PowerAlertSummary.tsx) —
 * its single most important number is the real one-way light-time delay this console's own
 * main panel already fetches, shown here plainly rather than inventing a risk colour for a
 * fact that isn't a risk.
 */
export function CommsAlertSummary() {
  const scenario = useRun((s) => s.scenario);
  const date = useMemo(() => todayIso(), []);
  const lightTime = useLiveOrSnapshot<LightTimeResponse>(
    `/snapshots/light-time-${scenario.body}.json`,
    `/api/light-time?body=${scenario.body}&date=${date}`,
  );
  const oneWayMinutes = lightTime.data ? lightTime.data.oneWayLightSeconds / 60 : undefined;

  return (
    <div className="cockpit-alert-summary">
      <span className="cockpit-alert-summary-label">One-way delay</span>
      <span className="cockpit-alert-summary-value">
        {oneWayMinutes !== undefined ? `${oneWayMinutes.toFixed(1)} min` : "—"}
      </span>
    </div>
  );
}

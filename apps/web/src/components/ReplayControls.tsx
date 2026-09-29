import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SPEEDS, useRun, type Speed } from "../store/run.js";
import { useReplay } from "../store/replay.js";
import { timestampLabel } from "../dial/missionTime.js";

const SPEED_LABELS: Record<Speed, string> = {
  paused: "Paused",
  slow: "1×",
  normal: "4×",
  fast: "16×",
};

/**
 * M10.9: shown only while a report link's replay (`store/replay.ts`) is in progress — absent
 * entirely once it finishes, or on a `MissionReportView` reached the normal way (Debrief's
 * "View printable Mission Report", no replay involved at all).
 *
 * Same interval-driving shape `TimeControls` uses for live play (a `useEffect` owning a
 * `setInterval`, cleared on unmount or a speed change) — deliberately not a shared component:
 * `TimeControls` is built around the Sol Planning phase gate and auto-pause-on-notable-event,
 * neither of which applies to replaying already-made decisions (`store/replay.ts`'s own doc
 * comment).
 */
export function ReplayControls() {
  const active = useReplay((s) => s.active);
  const speed = useReplay((s) => s.speed);
  const throughHour = useReplay((s) => s.throughHour);
  const setSpeed = useReplay((s) => s.setSpeed);
  const tickOnce = useReplay((s) => s.tickOnce);
  const hour = useRun((s) => s.state.hour);
  const body = useRun((s) => s.scenario.body);
  const { t } = useTranslation();

  useEffect(() => {
    const ms = SPEEDS[speed];
    if (!active || ms === 0) return;
    const id = setInterval(tickOnce, ms);
    return () => {
      clearInterval(id);
    };
  }, [active, speed, tickOnce]);

  if (!active) return null;

  return (
    <div className="replay-controls report-no-print" role="group" aria-label={t("report.replayControlsLabel")}>
      <p className="replay-progress" aria-live="polite">
        {t("report.replayingLabel")} {timestampLabel(hour, body)} / {timestampLabel(throughHour, body)}
      </p>
      <div className="button-row">
        {/* Same sol countdown as TimeControls, beside the same pause button and on the same
         *  left side of the row, for the replay UI. */}
        <span className="sol-countdown">
          <span aria-hidden="true">⏳</span> Sol ends in {24 - (hour % 24)}h
        </span>
        {(Object.keys(SPEEDS) as Speed[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`btn ${speed === s ? "btn-active" : ""}`}
            aria-pressed={speed === s}
            onClick={() => {
              setSpeed(s);
            }}
          >
            {SPEED_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

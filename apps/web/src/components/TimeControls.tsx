import { useEffect } from "react";
import { SPEEDS, useRun, type Speed } from "../store/run.js";
import { units } from "@sol-keeper/sim";

const SPEED_LABELS: Record<Speed, string> = {
  paused: "Paused",
  slow: "1×",
  normal: "4×",
  fast: "12×",
};

/**
 * Time controls, and the loop that actually advances the mission.
 *
 * The loop lives here rather than in the store so that it is tied to a mounted component:
 * unmounting stops it, and there is no stray interval left running after a reset.
 */
export function TimeControls() {
  const speed = useRun((s) => s.speed);
  const status = useRun((s) => s.state.status);
  const hour = useRun((s) => s.state.hour);
  const step = useRun((s) => s.step);
  const setSpeed = useRun((s) => s.setSpeed);
  const reset = useRun((s) => s.reset);

  useEffect(() => {
    const ms = SPEEDS[speed];
    if (ms === 0 || status !== "running") return;
    const id = setInterval(() => {
      step(1);
    }, ms);
    return () => {
      clearInterval(id);
    };
  }, [speed, status, step]);

  const running = status === "running";
  const sol = units.hoursToSols(hour);

  return (
    <div className="time-controls">
      <div className="clock">
        <span className="clock-sol">Sol {sol.toFixed(2)}</span>
        <span className="clock-hour">hour {hour}</span>
      </div>

      <div className="button-row" role="group" aria-label="Simulation speed">
        {(Object.keys(SPEEDS) as Speed[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`btn ${speed === s ? "btn-active" : ""}`}
            aria-pressed={speed === s}
            disabled={!running && s !== "paused"}
            onClick={() => {
              setSpeed(s);
            }}
          >
            {SPEED_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="button-row">
        <button type="button" className="btn" disabled={!running} onClick={() => { step(1); }}>
          +1 hour
        </button>
        <button
          type="button"
          className="btn"
          disabled={!running}
          onClick={() => {
            step(Math.round(units.SOL_HOURS));
          }}
        >
          +1 sol
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => { reset(); }}>
          Restart
        </button>
      </div>
    </div>
  );
}

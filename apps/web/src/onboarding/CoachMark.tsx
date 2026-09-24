import { useEffect } from "react";
import type { StationId } from "@sol-keeper/sim";
import { useOnboarding } from "../store/onboarding.js";
import { useRun } from "../store/run.js";
import { useDial } from "../store/dial.js";
import { COACH_MARK_ORDER, coachMarkText } from "../i18n/onboardingText.js";
import { stationLabel } from "../dial/labels.js";

interface CoachMarkProps {
  /** The app shell's current tab. The tutorial stays out of the way of Briefing — the
   *  deliberately-chosen mission entry point (M8.3's settled navigation) — and only starts
   *  once the player has moved on to a station console under their own steam. */
  readonly view: StationId | "briefing" | "debrief";
  readonly onNavigate: (station: StationId) => void;
}

/**
 * The First Light onboarding tutorial (M8.7, brief: "first launch runs the 'First Light'
 * tutorial with coach marks, introducing one station at a time"). Not a blocking modal over
 * the console — a small anchored card so the console underneath (and the tab it's driven to)
 * stays visible and readable while it's introduced. It drives navigation itself (`onNavigate`)
 * rather than asking the player to find the right tab, so the tab's own existing
 * `tab-button-active` styling already does the "highlight this station" work with no separate
 * spotlight overlay needed.
 */
export function CoachMark({ view, onNavigate }: CoachMarkProps) {
  const seen = useOnboarding((s) => s.seen);
  const step = useOnboarding((s) => s.step);
  const next = useOnboarding((s) => s.next);
  const skip = useOnboarding((s) => s.skip);
  const setPhase = useRun((s) => s.setPhase);
  const level = useDial((s) => s.level);

  const totalSteps = COACH_MARK_ORDER.length;
  const station = COACH_MARK_ORDER[step] ?? COACH_MARK_ORDER[totalSteps - 1];
  const active = !seen && station !== undefined && view !== "briefing" && view !== "debrief";

  useEffect(() => {
    if (!active || station === undefined) return;
    setPhase("planning");
    onNavigate(station);
  }, [active, station, setPhase, onNavigate]);

  if (!active || station === undefined) return null;

  return (
    <div className="coach-mark" role="dialog" aria-label="First Light tutorial" aria-describedby="coach-mark-text">
      <p className="coach-mark-step">
        Step {step + 1} of {totalSteps} · {stationLabel(station, level)}
      </p>
      <p id="coach-mark-text" className="coach-mark-text">
        {coachMarkText(station, level)}
      </p>
      <div className="coach-mark-actions">
        <button type="button" className="btn btn-quiet" onClick={skip}>
          Skip tutorial
        </button>
        <button
          type="button"
          className="btn btn-active"
          onClick={() => {
            next(totalSteps);
          }}
        >
          {step + 1 >= totalSteps ? "Done" : "Next"}
        </button>
      </div>
    </div>
  );
}

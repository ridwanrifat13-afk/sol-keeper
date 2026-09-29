import { useEffect } from "react";
import type { StationId } from "@sol-keeper/sim";
import { useOnboarding } from "../store/onboarding.js";
import { useRun } from "../store/run.js";
import { useDial } from "../store/dial.js";
import { COACH_MARK_ORDER, coachMarkText } from "../i18n/onboardingText.js";
import { useAppLanguage } from "../i18n/useAppLanguage.js";
import { stationLabel } from "../dial/labels.js";

interface CoachMarkProps {
  /** The app shell's current tab. The tutorial stays out of the way of Setup, Briefing, and
   *  Habitat — M9 added Setup before Briefing as the app's true first screen, and M9.4a added
   *  Habitat as a sixth non-station tab (a visualization, not a console with its own
   *  station), so the tutorial should no more interrupt either than it interrupts reading
   *  about the mission already chosen (M8.3's original "stays off Briefing" reasoning, just
   *  widened twice) — it only starts once the player has moved on to a station console under
   *  their own steam. */
  readonly view: StationId | "setup" | "briefing" | "debrief" | "habitat" | "report";
  readonly onNavigate: (station: StationId) => void;
}

/**
 * The First Light onboarding tutorial (M8.7, brief: "first launch runs the 'First Light'
 * tutorial with coach marks, introducing one station at a time"). Not a blocking modal over
 * the console — a small anchored card so the console underneath stays visible and readable
 * while it's introduced.
 *
 * Player bug report: the tutorial used to call `onNavigate` itself on every activation,
 * forcing the view to `COACH_MARK_ORDER[step]` regardless of which tab the player had just
 * clicked — so a first-time player's very first sidebar click (say, "Life Support") silently
 * landed them on Power instead, with no indication their own click had been overridden. Fixed
 * by never driving navigation on activation: `station` is always `view` itself (safe — `active`
 * already guarantees `view` is one of the five StationIds), so the card always truthfully
 * describes wherever the player actually is, and clicking a sidebar tab always goes exactly
 * there. "Next" is the one remaining, explicit case where driving navigation is legitimate —
 * the player asked for the next lesson — advancing through COACH_MARK_ORDER's fixed sequence
 * starting from wherever they began; the one disclosed edge case is a player whose own first
 * click happens to match a later entry in that fixed order may see that one station's lesson
 * twice (and, correspondingly, one other station's lesson zero times) if they rely on Next
 * alone afterward — a minor tour-ordering nicety, not the player-fighting bug this fixes.
 */
export function CoachMark({ view, onNavigate }: CoachMarkProps) {
  const seen = useOnboarding((s) => s.seen);
  const step = useOnboarding((s) => s.step);
  const next = useOnboarding((s) => s.next);
  const skip = useOnboarding((s) => s.skip);
  const setPhase = useRun((s) => s.setPhase);
  const level = useDial((s) => s.level);
  const language = useAppLanguage();

  const totalSteps = COACH_MARK_ORDER.length;
  const active =
    !seen &&
    view !== "setup" &&
    view !== "briefing" &&
    view !== "debrief" &&
    view !== "habitat" &&
    view !== "report";
  const station = active ? view : undefined;
  const nextStation = COACH_MARK_ORDER[step + 1];

  useEffect(() => {
    if (!active) return;
    setPhase("planning");
  }, [active, setPhase]);

  if (!active || station === undefined) return null;

  return (
    <div className="coach-mark" role="dialog" aria-label="First Light tutorial" aria-describedby="coach-mark-text">
      <p className="coach-mark-step">
        Step {step + 1} of {totalSteps} · {stationLabel(station, level, language)}
      </p>
      <p id="coach-mark-text" className="coach-mark-text">
        {coachMarkText(station, level, language)}
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
            if (nextStation !== undefined) onNavigate(nextStation);
          }}
        >
          {step + 1 >= totalSteps ? "Done" : "Next"}
        </button>
      </div>
    </div>
  );
}

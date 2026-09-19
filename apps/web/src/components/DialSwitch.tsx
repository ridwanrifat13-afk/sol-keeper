import { useDial } from "../store/dial.js";
import { DIAL_LEVELS, DIAL_LEVEL_HINTS, DIAL_LEVEL_LABELS } from "../dial/types.js";

/**
 * The Reality Dial control. One simulation, three depths — this is the switch between them.
 *
 * It lives once, in the app shell, rather than per view: the same choice should hold whether
 * the player is looking at Operate, the Debrief, or Data Sources, because it is a statement
 * about the player, not about any one screen.
 */
export function DialSwitch() {
  const level = useDial((s) => s.level);
  const setLevel = useDial((s) => s.setLevel);

  return (
    <div className="dial-switch" role="group" aria-label="Reality Dial: how numbers are shown">
      {DIAL_LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          className={`btn btn-dial ${level === l ? "btn-active" : ""}`}
          aria-pressed={level === l}
          onClick={() => {
            setLevel(l);
          }}
        >
          {DIAL_LEVEL_LABELS[l]}
          <span className="btn-sub">{DIAL_LEVEL_HINTS[l]}</span>
        </button>
      ))}
    </div>
  );
}

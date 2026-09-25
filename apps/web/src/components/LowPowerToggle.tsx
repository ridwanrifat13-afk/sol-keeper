import { useAccessibility } from "../store/accessibility.js";

/**
 * M9.4c: the manual low-power-mode switch — see store/accessibility.ts for why this is a
 * player choice rather than auto-detected. A single on/off button, not a `role="group"`
 * like the Reality Dial or language switch, since there are only two states.
 */
export function LowPowerToggle() {
  const lowPowerMode = useAccessibility((s) => s.lowPowerMode);
  const setLowPowerMode = useAccessibility((s) => s.setLowPowerMode);

  return (
    <button
      type="button"
      className={`btn btn-quiet ${lowPowerMode ? "btn-active" : ""}`}
      aria-pressed={lowPowerMode}
      onClick={() => {
        setLowPowerMode(!lowPowerMode);
      }}
    >
      Low-power mode
    </button>
  );
}

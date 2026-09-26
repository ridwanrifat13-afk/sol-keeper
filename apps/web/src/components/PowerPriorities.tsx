import { useRun } from "../store/run.js";
import { useDial } from "../store/dial.js";
import { systemLabel } from "../dial/labels.js";
import { useAppLanguage } from "../i18n/useAppLanguage.js";
import { systemStatusInfo } from "../dial/systemStatus.js";

const CADET_WORDS: Record<string, string> = {
  Standby: "Waiting",
  Powered: "On",
  Shed: "Off",
  Failed: "Broken",
};

/**
 * The load-shed order.
 *
 * This is the central decision of the game: when the sun goes down or the dust comes in,
 * something has to go dark, and the player chooses what. Order is shown top-to-bottom as
 * "kept longest" to "dropped first", because that is the sentence a player needs, rather
 * than an abstract priority number.
 */
export function PowerPriorities() {
  const version = useRun((s) => s.version);
  const hour = useRun((s) => s.state.hour);
  const systems = useRun((s) => s.state.systems);
  const setPriority = useRun((s) => s.setPriority);
  const phase = useRun((s) => s.phase);
  const level = useDial((s) => s.level);
  const language = useAppLanguage();

  const ordered = Object.values(systems)
    .filter((s) => s !== undefined)
    .sort((a, b) => a.priority - b.priority);
  // Before the first tick, `poweredThisHour` is just its unset default (false) for every
  // system — no power stage has run to decide it. Reading that default as "Shed" would tell
  // a player that nine systems already lost power on a mission that has not started, right
  // next to a battery gauge honestly reporting "0.0 of 0.0 kW served". Caught by actually
  // opening the built app (see e2e/operate.spec.ts) rather than by a render test, which
  // never observes the pristine pre-tick frame a real user's first paint does. The same
  // four-state logic now lives in dial/systemStatus.ts, shared with the Ripple Web, so the
  // two views can never disagree about what "Shed" means for a given system.
  const missionStarted = hour > 0;
  // M8.4 Part A: only adjustable during Sol Planning (components/TimeControls.tsx), same as
  // the brief's own core loop — the order is a plan made before the sol runs, not a live dial.
  const locked = phase !== "planning";

  return (
    <section className="panel" aria-labelledby="power-priorities-heading">
      <h2 id="power-priorities-heading">Power priority</h2>
      <p className="panel-hint">
        When power runs short, systems at the bottom are switched off first.
        {locked && " Locked while the sol is running — adjust it during Sol Planning."}
      </p>

      <ol className="priority-list" key={version}>
        {ordered.map((system, index) => {
          const info = systemStatusInfo(system, missionStarted);
          const word = level === "cadet" ? (CADET_WORDS[info.word] ?? info.word) : info.word;
          const name = systemLabel(system.id, level, language);

          return (
            <li key={system.id} className={`priority-row ${info.className}`}>
              <span className="priority-rank" aria-hidden="true">
                {index + 1}
              </span>
              <span className="priority-name">
                {name}
                <span className="priority-power">{system.nominalPowerKw.toFixed(1)} kW</span>
              </span>
              <span className="priority-state">
                <span aria-hidden="true">{info.glyph}</span> {word}
              </span>
              <span className="priority-actions">
                <button
                  type="button"
                  className="btn btn-tiny"
                  disabled={index === 0 || locked}
                  aria-label={`Move ${name} up, keep it powered longer`}
                  onClick={() => {
                    setPriority(system.id, -1);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-tiny"
                  disabled={index === ordered.length - 1 || locked}
                  aria-label={`Move ${name} down, shed it sooner`}
                  onClick={() => {
                    setPriority(system.id, 1);
                  }}
                >
                  ↓
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

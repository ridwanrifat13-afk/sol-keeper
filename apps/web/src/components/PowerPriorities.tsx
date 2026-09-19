import { useRun } from "../store/run.js";
import type { SystemId } from "@sol-keeper/sim";

const SYSTEM_LABELS: Record<SystemId, string> = {
  powerDistribution: "Power distribution",
  lifeSupport: "Life support",
  co2Scrubber: "CO₂ scrubber",
  thermalControl: "Heating",
  oxygenGenerator: "Oxygen generator",
  waterRecovery: "Water recovery",
  moxie: "MOXIE (oxygen from air)",
  greenhouse: "Greenhouse",
  comms: "Comms",
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

  const ordered = Object.values(systems).sort((a, b) => a.priority - b.priority);
  // Before the first tick, `poweredThisHour` is just its unset default (false) for every
  // system — no power stage has run to decide it. Reading that default as "Shed" would tell
  // a player that nine systems already lost power on a mission that has not started, right
  // next to a battery gauge honestly reporting "0.0 of 0.0 kW served". Caught by actually
  // opening the built app (see e2e/operate.spec.ts) rather than by a render test, which
  // never observes the pristine pre-tick frame a real user's first paint does.
  const missionStarted = hour > 0;

  return (
    <section className="panel" aria-labelledby="power-priorities-heading">
      <h2 id="power-priorities-heading">Power priority</h2>
      <p className="panel-hint">
        When power runs short, systems at the bottom are switched off first.
      </p>

      <ol className="priority-list" key={version}>
        {ordered.map((system, index) => {
          const state = !missionStarted
            ? { glyph: "○", word: "Standby", cls: "is-standby" }
            : system.poweredThisHour
              ? { glyph: "●", word: "Powered", cls: "is-nominal" }
              : system.operational
                ? { glyph: "▲", word: "Shed", cls: "is-caution" }
                : { glyph: "■", word: "Failed", cls: "is-critical" };

          return (
            <li key={system.id} className={`priority-row ${state.cls}`}>
              <span className="priority-rank" aria-hidden="true">
                {index + 1}
              </span>
              <span className="priority-name">
                {SYSTEM_LABELS[system.id]}
                <span className="priority-power">{system.nominalPowerKw.toFixed(1)} kW</span>
              </span>
              <span className="priority-state">
                <span aria-hidden="true">{state.glyph}</span> {state.word}
              </span>
              <span className="priority-actions">
                <button
                  type="button"
                  className="btn btn-tiny"
                  disabled={index === 0}
                  aria-label={`Move ${SYSTEM_LABELS[system.id]} up, keep it powered longer`}
                  onClick={() => {
                    setPriority(system.id, -1);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-tiny"
                  disabled={index === ordered.length - 1}
                  aria-label={`Move ${SYSTEM_LABELS[system.id]} down, shed it sooner`}
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

export { SYSTEM_LABELS };

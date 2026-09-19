import { useRun } from "../store/run.js";
import { useDial } from "../store/dial.js";
import { logText } from "../i18n/logText.js";
import { statusFromSeverity } from "./status.js";
import { units } from "@sol-keeper/sim";

const MAX_CARDS = 40;

const CAUSE_PREFIX = { cadet: "why: ", specialist: "because: ", commander: "caused by: " } as const;

/**
 * The event feed — recent history, at whatever Reality Dial level the player has chosen.
 *
 * Entries already carry `causedBy`, so each card can show what it followed. Showing the
 * chain here, not just in the Debrief, proves the causal links the engine records are
 * actually usable rather than theoretically present.
 */
export function EventFeed() {
  const version = useRun((s) => s.version);
  const log = useRun((s) => s.state.log);
  const level = useDial((s) => s.level);

  const byId = new Map(log.map((e) => [e.id, e]));
  const recent = log.slice(-MAX_CARDS).reverse();

  return (
    <section className="panel" aria-labelledby="events-heading">
      <h2 id="events-heading">Mission log</h2>
      <p className="panel-hint">
        {log.length} event{log.length === 1 ? "" : "s"} recorded. Newest first.
      </p>

      <ul className="event-list" key={version} aria-live="polite">
        {recent.length === 0 && (
          <li className="event-empty">Nothing has happened yet. Start the clock.</li>
        )}

        {recent.map((entry) => {
          const status = statusFromSeverity(entry.severity);
          const causes = (entry.causedBy ?? [])
            .map((id) => byId.get(id))
            .filter((e): e is NonNullable<typeof e> => e !== undefined);

          return (
            <li key={entry.id} className={`event-card ${status.className}`}>
              <div className="event-head">
                <span className="event-sev">
                  <span aria-hidden="true">{status.glyph}</span> {status.label}
                </span>
                <span className="event-time">
                  Sol {units.hoursToSols(entry.hour).toFixed(2)}
                </span>
              </div>
              <p className="event-text">{logText(entry, level)}</p>
              {causes.length > 0 && (
                <p className="event-cause">
                  <span aria-hidden="true">↳ </span>
                  {CAUSE_PREFIX[level]}
                  {causes.map((c) => logText(c, level)).join("; ")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

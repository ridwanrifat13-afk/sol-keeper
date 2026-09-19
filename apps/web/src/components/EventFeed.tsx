import { useRun } from "../store/run.js";
import { logText } from "../i18n/logText.js";
import { statusFromSeverity } from "./status.js";
import { units } from "@sol-keeper/sim";

const MAX_CARDS = 40;

/**
 * The event feed — the M2 stand-in for M3's Black Box.
 *
 * Entries already carry `causedBy`, so each card can show what it followed. Showing the
 * chain from the start, rather than bolting it on at M3, is what proves the causal links
 * the engine records are actually usable.
 */
export function EventFeed() {
  const version = useRun((s) => s.version);
  const log = useRun((s) => s.state.log);

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
              <p className="event-text">{logText(entry)}</p>
              {causes.length > 0 && (
                <p className="event-cause">
                  <span aria-hidden="true">↳ </span>
                  because: {causes.map((c) => logText(c)).join("; ")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

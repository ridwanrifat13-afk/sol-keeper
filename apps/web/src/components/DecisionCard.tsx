/**
 * M8.2: the Decision Card. The player-facing counterpart to a bot's `chooseIncidentResponse`
 * (packages/sim/src/engine/bots.ts) — renders whichever incident `selectPendingIncident`
 * (apps/web/src/incidents/pendingIncident.ts) says is waiting, and calls `resolveIncident`
 * (store/run.ts, M8.1) on a choice, the same `applyResponse` seam a bot already uses.
 *
 * Renders globally (mounted from App.tsx), not scoped to one console, so it appears
 * regardless of which tab is active when auto-pause fires — the brief's own "Decision Card at
 * the owning station" names the station in the card, it does not require navigating there.
 *
 * Every trade-off line comes from a response's own declared fields
 * (`crewHoursCost`/`sparesCost`/`permanentPenalty`/`leavesOngoing`) via
 * `i18n/decisionText.ts`'s phrase functions — never invented, and never present when the
 * field isn't declared.
 */
import { type KeyboardEvent, useEffect, useRef } from "react";
import {
  EventLogger,
  Rng,
  scaledWarningTimeHours,
  wouldResolveThisHour,
  type TickContext,
} from "@sol-keeper/sim";
import { useRun } from "../store/run.js";
import { useDial } from "../store/dial.js";
import { selectPendingIncident } from "../incidents/pendingIncident.js";
import { stationLabel, systemLabel } from "../dial/labels.js";
import {
  crewHoursCostPhrase,
  decisionText,
  leavesOngoingPhrase,
  noChoicePhrase,
  permanentPenaltyPhrase,
  sparesCostPhrase,
  willResolveThisHourPhrase,
} from "../i18n/decisionText.js";

export function DecisionCard() {
  // `state` is mutated in place (store/run.ts's own doc comment) — a component that selects
  // only `s.state` sees the same object reference before and after a mutation and never
  // re-renders. Subscribing to `version` too (bumped on every store update) is what actually
  // triggers the re-render; OperateView.tsx does the same for the same reason.
  useRun((s) => s.version);
  const state = useRun((s) => s.state);
  const params = useRun((s) => s.params);
  const scenario = useRun((s) => s.scenario);
  const resolveIncident = useRun((s) => s.resolveIncident);
  const level = useDial((s) => s.level);
  const dialogRef = useRef<HTMLDivElement>(null);

  const pending = selectPendingIncident(state);
  const incidentId = pending?.incident.id;

  // Move focus into the card the moment a new incident becomes pending, so a keyboard/screen
  // reader user is not left focused on whatever was behind it.
  useEffect(() => {
    if (incidentId !== undefined) dialogRef.current?.focus();
  }, [incidentId]);

  if (pending === undefined) return null;
  const { incident, definition } = pending;

  // Read-only ad hoc TickContext, the same shape resolveIncident (store/run.ts) builds —
  // wouldResolveThisHour/scaledWarningTimeHours only ever read ctx.state/ctx.params, never
  // ctx.rng/ctx.log, so building this here has no side effect.
  const ctx: TickContext = {
    state,
    params,
    scenario,
    rng: new Rng(state.rng),
    log: new EventLogger(state.log, state.hour),
    dtHours: 1,
  };

  const detectedAtHour = incident.detectedAtHour ?? incident.triggeredAtHour;
  const totalWindowHours = scaledWarningTimeHours(ctx, definition);
  const hoursRemaining = Math.max(0, Math.ceil(totalWindowHours - (state.hour - detectedAtHour)));

  const defaultResponse = definition.responses.find((r) => r.id === definition.defaultResponseId);

  // A minimal focus trap: Tab cycles among this dialog's own buttons rather than escaping to
  // the page behind it, without pulling in a dependency for something this small.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || dialogRef.current === null) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button");
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="decision-card-overlay">
      <div
        className="decision-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-card-title"
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <p className="decision-card-station">
          <span aria-hidden="true">▲</span> {stationLabel(definition.station, level)}
        </p>
        <h2 id="decision-card-title">{decisionText(definition.briefKey, level, definition.analogue)}</h2>
        <p className="decision-card-countdown">
          <span aria-hidden="true">⧗</span>{" "}
          {level === "cadet" ? `${hoursRemaining} hour(s) to decide` : `${hoursRemaining} h left to decide`}
        </p>

        <div className="decision-card-responses">
          {definition.responses.map((response) => {
            const willResolve = wouldResolveThisHour(ctx, definition, response.id);
            return (
              <button
                key={response.id}
                type="button"
                className="btn decision-card-response"
                onClick={() => {
                  resolveIncident(incident.id, response.id);
                }}
              >
                <span className="decision-card-response-text">{decisionText(response.i18nKey, level)}</span>
                <span className="decision-card-response-tradeoffs">
                  {response.crewHoursCost !== undefined && response.crewHoursCost > 0 && (
                    <span>{crewHoursCostPhrase(level, response.crewHoursCost)}</span>
                  )}
                  {response.sparesCost !== undefined &&
                    response.sparesCost > 0 &&
                    response.sparesFromSystem !== undefined && (
                      <span>
                        {sparesCostPhrase(level, response.sparesCost, systemLabel(response.sparesFromSystem, level))}
                      </span>
                    )}
                  {response.permanentPenalty === true && <span>{permanentPenaltyPhrase(level)}</span>}
                  {response.leavesOngoing === true && <span>{leavesOngoingPhrase(level)}</span>}
                  <span>{willResolveThisHourPhrase(level, willResolve)}</span>
                </span>
              </button>
            );
          })}
        </div>

        {defaultResponse !== undefined && (
          <p className="decision-card-default">
            <strong>{noChoicePhrase(level)}</strong> {decisionText(defaultResponse.i18nKey, level)}
          </p>
        )}
      </div>
    </div>
  );
}

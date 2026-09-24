import { useRun } from "../store/run.js";
import type { RunStatus } from "@sol-keeper/sim";

/** Icon + word + colour class per outcome — never colour alone (brief rule 6). */
const RUN_STATUS_PRESENTATION: Record<RunStatus, { glyph: string; word: string; cls: string }> = {
  running: { glyph: "●", word: "Running", cls: "is-nominal" },
  success: { glyph: "★", word: "Mission complete", cls: "is-nominal" },
  partial: { glyph: "▲", word: "Mission ended — goal not met", cls: "is-caution" },
  abort: { glyph: "◆", word: "Mission aborted", cls: "is-caution" },
  loss: { glyph: "■", word: "Mission lost", cls: "is-critical" },
};

/** M8.3: extracted from OperateView (was a local, unexported function there) so the app
 *  shell can show it once, in the persistent header, rather than only inside one console. */
export function RunStatusBadge() {
  const status = useRun((s) => s.state.status);
  const reason = useRun((s) => s.state.endReasonCode);

  const presentation = RUN_STATUS_PRESENTATION[status];

  return (
    <div className={`run-badge ${presentation.cls}`} role="status">
      <span aria-hidden="true">{presentation.glyph}</span> {presentation.word}
      {reason !== undefined && status !== "running" && (
        <span className="run-badge-reason">
          {reason === "end.crewLost" ? " — the crew did not survive" : " — all crew survived"}
        </span>
      )}
    </div>
  );
}

import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { buildResourceSummary } from "../../dial/resourceSummary.js";
import { statusWord } from "../../dial/statusWords.js";
import { useAppLanguage } from "../../i18n/useAppLanguage.js";

/**
 * M9.1's cockpit `alert` region, when no Decision Card is pending: "the station's most
 * critical gauge." Power has exactly one resource gauge (battery) — reused directly from
 * `buildResourceSummary`, the same computation the Battery panel itself reads, no new status
 * logic (mirrors LifeSupportAlertSummary.tsx's own pattern, which picks the worst of several).
 */
export function PowerAlertSummary() {
  const state = useRun((s) => s.state);
  const level = useDial((s) => s.level);
  const language = useAppLanguage();
  const summary = buildResourceSummary(state, level, language);
  const battery = summary.battery;

  return (
    <div className={`cockpit-alert-summary ${battery.status.className}`}>
      <span className="cockpit-alert-summary-label">Battery</span>
      <span className="cockpit-alert-summary-status">
        <span aria-hidden="true">{battery.status.glyph}</span>{" "}
        {statusWord(level, battery.status.level, battery.status.label)}
      </span>
      <span className="cockpit-alert-summary-value">
        {battery.text.valueText ?? battery.text.detail}
      </span>
    </div>
  );
}

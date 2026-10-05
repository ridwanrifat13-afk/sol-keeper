import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { buildResourceSummary } from "../../dial/resourceSummary.js";
import { statusWord } from "../../dial/statusWords.js";
import { useAppLanguage } from "../../i18n/useAppLanguage.js";
import type { StatusPresentation } from "../../components/status.js";

const RANK: Record<StatusPresentation["level"], number> = { nominal: 0, caution: 1, critical: 2 };

/**
 * M9.1's cockpit `alert` region, when no Decision Card is pending: "the station's most
 * critical gauge." Incident Command is the cross-cutting console (its own dependency graph
 * already reads every resource/power/crew status at once), so this picks the worst across all
 * six resource readouts — the same reduce LifeSupportAlertSummary.tsx uses for its own five,
 * extended with battery since Incident Command's own graph treats power as just another node.
 */
export function IncidentCommandAlertSummary() {
  const state = useRun((s) => s.state);
  const level = useDial((s) => s.level);
  const language = useAppLanguage();
  const summary = buildResourceSummary(state, level, language);

  const gauges = [
    { label: "Oxygen", g: summary.oxygen },
    { label: "CO₂", g: summary.co2 },
    { label: "Water", g: summary.water },
    { label: "Food", g: summary.food },
    { label: "Cabin", g: summary.cabin },
    { label: "Battery", g: summary.battery },
  ];
  const worst = gauges.reduce((a, b) => (RANK[b.g.status.level] > RANK[a.g.status.level] ? b : a));

  return (
    <div className={`cockpit-alert-summary ${worst.g.status.className}`}>
      <span className="cockpit-alert-summary-label">{worst.label}</span>
      <span className="cockpit-alert-summary-status">
        <span aria-hidden="true">{worst.g.status.glyph}</span>{" "}
        {statusWord(level, worst.g.status.level, worst.g.status.label)}
      </span>
      <span className="cockpit-alert-summary-value">
        {worst.g.text.valueText ?? worst.g.text.detail}
      </span>
    </div>
  );
}

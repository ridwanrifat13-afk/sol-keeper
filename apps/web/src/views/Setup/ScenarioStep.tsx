import { useTranslation } from "react-i18next";
import { SCENARIOS } from "@sol-keeper/sim";
import { useSetup } from "../../store/setup.js";
import { useDial } from "../../store/dial.js";
import { SCENARIO_LABELS } from "../../dial/scenarioLabels.js";

/** M9.2a's first setup step. Reuses BriefingView's own real, sourced hazard teaser text
 *  (each scenario's own `briefingKey`) so a player sees what they're choosing, not a
 *  generic blurb. */
export function ScenarioStep() {
  const scenarioId = useSetup((s) => s.scenarioId);
  const setScenarioId = useSetup((s) => s.setScenarioId);
  const level = useDial((s) => s.level);
  const { t } = useTranslation();
  const variant = level === "cadet" ? "cadet" : "specialist";

  return (
    <section className="panel" aria-labelledby="setup-scenario-heading">
      <h2 id="setup-scenario-heading">Choose a mission</h2>
      <div className="scenario-switch" role="group" aria-label="Mission scenario">
        {Object.values(SCENARIOS).map((scenario) => {
          const meta = SCENARIO_LABELS[scenario.id];
          return (
            <button
              key={scenario.id}
              type="button"
              className={`btn btn-scenario ${scenarioId === scenario.id ? "btn-active" : ""}`}
              aria-pressed={scenarioId === scenario.id}
              onClick={() => {
                setScenarioId(scenario.id);
              }}
            >
              {meta.label}
              <span className="btn-sub">{meta.hint}</span>
              <span className="btn-sub">{t(`${scenario.briefingKey}.${variant}`)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

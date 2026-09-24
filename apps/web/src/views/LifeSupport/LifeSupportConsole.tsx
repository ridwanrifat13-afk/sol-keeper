import { survivalModes, type SurvivalMode } from "@sol-keeper/sim";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { Gauge } from "../../components/Gauge.js";
import { statusWord } from "../../dial/statusWords.js";
import { survivalModeLabel } from "../../dial/labels.js";
import { buildResourceSummary } from "../../dial/resourceSummary.js";

const SURVIVAL_MODES: readonly SurvivalMode[] = ["nominal", "mode1", "mode2"];

/**
 * The Life Support console (M8.3): oxygen, CO2, water, food and cabin temperature, plus the
 * rations control (moved wholesale from the old Operate view — already fully real, no change
 * needed). ISRU and crop-task status are read-only readouts here from M8.4 Part B on — no
 * settable MOXIE/crop-priority parameter exists in the sim today, so nothing invented yet.
 */
export function LifeSupportConsole() {
  const version = useRun((s) => s.version);
  const state = useRun((s) => s.state);
  const setSurvivalMode = useRun((s) => s.setSurvivalMode);
  const level = useDial((s) => s.level);

  const summary = buildResourceSummary(state, level);

  return (
    <div className="console" key={version}>
      <header className="view-head">
        <h2>Life Support</h2>
        <p className="view-hint">Air, water, food, and how hard the crew is rationing.</p>
      </header>

      <section className="panel" aria-labelledby="resources-heading">
        <h2 id="resources-heading">Resources</h2>
        <div className="gauge-grid">
          <Gauge
            icon="◇"
            label="Oxygen"
            value={state.atmosphere.o2PartialPressureMmHg}
            unit={summary.oxygen.text.unit}
            decimals={summary.oxygen.text.decimals}
            valueText={summary.oxygen.text.valueText}
            fraction={summary.oxygen.fraction}
            status={summary.oxygen.status}
            statusLabel={statusWord(level, summary.oxygen.status.level, summary.oxygen.status.label)}
            detail={summary.oxygen.text.detail}
          />
          <Gauge
            icon="▽"
            label="Carbon dioxide"
            value={state.atmosphere.co2PartialPressureMmHg}
            unit={summary.co2.text.unit}
            decimals={summary.co2.text.decimals}
            valueText={summary.co2.text.valueText}
            fraction={summary.co2.fraction}
            status={summary.co2.status}
            statusLabel={statusWord(level, summary.co2.status.level, summary.co2.status.label)}
            detail={summary.co2.text.detail}
          />
          <Gauge
            icon="≈"
            label="Water"
            value={state.water.potableKg}
            unit={summary.water.text.unit}
            decimals={summary.water.text.decimals}
            valueText={summary.water.text.valueText}
            fraction={summary.water.fraction}
            status={summary.water.status}
            statusLabel={statusWord(level, summary.water.status.level, summary.water.status.label)}
            detail={summary.water.text.detail}
          />
          <Gauge
            icon="✦"
            label="Food"
            value={state.food.storedDryMassKg}
            unit={summary.food.text.unit}
            decimals={summary.food.text.decimals}
            valueText={summary.food.text.valueText}
            fraction={summary.food.fraction}
            status={summary.food.status}
            statusLabel={statusWord(level, summary.food.status.level, summary.food.status.label)}
            detail={summary.food.text.detail}
          />
          <Gauge
            icon="◈"
            label="Cabin"
            value={state.thermal.habitatTempC}
            unit={summary.cabin.text.unit}
            decimals={summary.cabin.text.decimals}
            valueText={summary.cabin.text.valueText}
            fraction={summary.cabin.fraction}
            status={summary.cabin.status}
            statusLabel={statusWord(level, summary.cabin.status.level, summary.cabin.status.label)}
            detail={summary.cabin.text.detail}
          />
        </div>
      </section>

      <section className="panel" aria-labelledby="rations-heading">
        <h2 id="rations-heading">Rations</h2>
        <p className="panel-hint">
          Cutting rations stretches the stores and costs the crew morale and warmth.
        </p>
        <div className="button-row" role="group" aria-label="Survival mode">
          {SURVIVAL_MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={`btn ${state.food.mode === m ? "btn-active" : ""}`}
              aria-pressed={state.food.mode === m}
              onClick={() => {
                setSurvivalMode(m);
              }}
            >
              {survivalModeLabel(m, level)}
              <span className="btn-sub">
                {survivalModes[m].kcalPerCrewDay.value} kcal · {survivalModes[m].habitatTempC.value} °C
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

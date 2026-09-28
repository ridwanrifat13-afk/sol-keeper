import {
  co2GrowthBonusFraction,
  co2Ppm,
  cropRequiredLightHours,
  habitat,
  physiology,
  survivalModes,
  type SurvivalMode,
} from "@sol-keeper/sim";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { Gauge } from "../../components/Gauge.js";
import { FactCardGallery } from "../../components/FactCardGallery.js";
import { statusWord } from "../../dial/statusWords.js";
import { cropLabel, survivalModeLabel } from "../../dial/labels.js";
import { useAppLanguage } from "../../i18n/useAppLanguage.js";
import { buildResourceSummary } from "../../dial/resourceSummary.js";

const SURVIVAL_MODES: readonly SurvivalMode[] = ["nominal", "mode1", "mode2"];

/**
 * The Life Support console (M8.3): oxygen, CO2, water, food and cabin temperature, plus the
 * rations control (moved wholesale from the old Operate view — already fully real). M8.4 Part
 * B: rations is now locked to Sol Planning, same as Power's priority order, and ISRU/crop-task
 * status ship as read-only readouts — no settable MOXIE-priority or crop-priority parameter
 * exists in the sim today, and inventing one would mean a new, unsourced constant with no real
 * lever to attach it to (brief rule 1) — settled with the user before Part A was built.
 */
export function LifeSupportConsole() {
  const version = useRun((s) => s.version);
  const state = useRun((s) => s.state);
  const setSurvivalMode = useRun((s) => s.setSurvivalMode);
  const phase = useRun((s) => s.phase);
  const level = useDial((s) => s.level);
  const language = useAppLanguage();

  const summary = buildResourceSummary(state, level, language);
  const locked = phase !== "planning";

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
            helpKey="gauge.oxygen"
            level={level}
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
            helpKey="gauge.co2"
            level={level}
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
            helpKey="gauge.water"
            level={level}
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
            helpKey="gauge.food"
            level={level}
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
            helpKey="gauge.cabin"
            level={level}
          />
        </div>
      </section>

      <section className="panel" aria-labelledby="rations-heading">
        <h2 id="rations-heading">Rations</h2>
        <p className="panel-hint">
          Cutting rations stretches the stores and costs the crew morale and warmth.
          {locked && " Locked while the sol is running — adjust it during Sol Planning."}
        </p>
        <div className="button-row" role="group" aria-label="Survival mode">
          {SURVIVAL_MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={`btn ${state.food.mode === m ? "btn-active" : ""}`}
              aria-pressed={state.food.mode === m}
              disabled={locked}
              onClick={() => {
                setSurvivalMode(m);
              }}
            >
              {survivalModeLabel(m, level, language)}
              <span className="btn-sub">
                {survivalModes[m].kcalPerCrewDay.value} kcal · {survivalModes[m].waterLitersPerCrewDay.value} L water ·{" "}
                {survivalModes[m].habitatTempC.value} °C
              </span>
            </button>
          ))}
        </div>
        <details className="panel-detail">
          <summary>Why only food, water, and warmth?</summary>
          <p>
            Rations is the one real trade-off dial because eating less, drinking less, and running colder are
            choices a crew can actually make, at a real and survivable cost. Oxygen and CO₂ aren't — the
            life-support loop's whole job is to hold them at fixed safety thresholds regardless of what a
            trainee would prefer, so there's no "loosen it a bit" setting: past those thresholds is system
            failure, not a comfort trade-off.
          </p>
          <ul className="status-list">
            <li>
              <span className="status-list-label">Oxygen limit</span>
              <span className="status-list-value">
                Held near {habitat.targetO2PartialPressureMmHg.value} mmHg; mild hypoxia begins below{" "}
                {physiology.pio2HypoxiaLowerLimitMmHg.value} mmHg (OCHMO-TB003).
              </span>
            </li>
            <li>
              <span className="status-list-label">CO₂ limit</span>
              <span className="status-list-value">
                Capped at each mode&apos;s own limit above ({survivalModes.nominal.co2LimitMmHg.value}–
                {survivalModes.mode2.co2LimitMmHg.value} mmHg across modes); {physiology.co2ImmediatelyDangerousMmHg.value}{" "}
                mmHg is immediately dangerous to life and health (OCHMO-TB004).
              </span>
            </li>
          </ul>
        </details>
      </section>

      {/* M8.4 Part B: read-only — no settable MOXIE-priority or crop-priority control exists
       *  in the sim today; inventing one would mean a new, unsourced physical constant with no
       *  real lever to attach it to (brief rule 1). */}
      <section className="panel" aria-labelledby="isru-heading">
        <h2 id="isru-heading">ISRU &amp; crops</h2>
        <p className="panel-hint">Status only — no adjustable MOXIE or crop-task control exists yet.</p>
        {(() => {
          const growthBonus = co2GrowthBonusFraction(
            co2Ppm(state.atmosphere.o2PartialPressureMmHg, state.atmosphere.co2PartialPressureMmHg),
          );
          return growthBonus > 0.001 ? (
            <p className="panel-hint">
              Cabin CO₂ is in a real, documented crop-growth-boosting range — trays are growing{" "}
              {Math.round(growthBonus * 100)}% faster (WHEELER-2024-CO2-SALAD).
            </p>
          ) : null;
        })()}
        <ul className="status-list">
          {state.systems.moxie !== undefined && (
            <li>
              <span className="status-list-label">MOXIE</span>
              <span className="status-list-value">
                {state.isru.moxieRunning ? "Running" : "Not running"} ·{" "}
                {state.isru.moxieO2ProducedKg.toFixed(2)} kg O₂ made
              </span>
            </li>
          )}
          {state.food.trays.map((tray) => {
            const required = cropRequiredLightHours(tray.crop);
            const progressPct = Math.min(100, Math.round((tray.lightHours / required) * 100));
            return (
              <li key={tray.id}>
                <span className="status-list-label">{cropLabel(tray.crop, level, language)}</span>
                <span className="status-list-value">
                  {progressPct}% grown · {Math.round(tray.healthFraction * 100)}% healthy
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <FactCardGallery topic="co2-scrubber" heading="Real hardware: the ISS's CDRA CO₂ scrubber" />
      <FactCardGallery topic="veggie" heading="Real hardware: NASA's Veggie plant-growth hardware" />
    </div>
  );
}

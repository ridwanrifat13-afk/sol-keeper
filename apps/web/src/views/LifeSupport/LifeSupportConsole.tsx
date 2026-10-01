import {
  co2GrowthBonusFraction,
  co2Ppm,
  co2ScrubberDutyCycleFraction,
  cropRequiredLightHours,
  habitat,
  lifeSupport,
  physiology,
  survivalModes,
  thermalControlDutyCycleFraction,
  waterReclamationFraction,
  type Co2ScrubberMode,
  type SurvivalMode,
  type ThermalControlMode,
  type WaterReclamationMode,
} from "@sol-keeper/sim";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { Gauge } from "../../components/Gauge.js";
import { FactCardGallery } from "../../components/FactCardGallery.js";
import { MiniBar } from "../../components/MiniBar.js";
import { statusWord } from "../../dial/statusWords.js";
import {
  co2ScrubberModeLabel,
  cropLabel,
  survivalModeLabel,
  thermalControlModeLabel,
  waterReclamationModeLabel,
} from "../../dial/labels.js";
import { useAppLanguage } from "../../i18n/useAppLanguage.js";
import { buildResourceSummary } from "../../dial/resourceSummary.js";
import { DashboardGrid } from "../../components/DashboardGrid.js";

const SURVIVAL_MODES: readonly SurvivalMode[] = ["nominal", "mode1", "mode2"];
const CO2_SCRUBBER_MODES: readonly Co2ScrubberMode[] = ["full", "balanced", "eco"];
const WATER_RECLAMATION_MODES: readonly WaterReclamationMode[] = ["baseline", "brineProcessor"];
const THERMAL_CONTROL_MODES: readonly ThermalControlMode[] = ["comfort", "powerSave"];

/**
 * The Life Support console (M8.3): oxygen, CO2, water, food and cabin temperature, plus the
 * rations control (moved wholesale from the old Operate view — already fully real). M8.4 Part
 * B: rations is now locked to Sol Planning, same as Power's priority order, and ISRU/crop-task
 * status ship as read-only readouts — no settable MOXIE-priority or crop-priority parameter
 * exists in the sim today, and inventing one would mean a new, unsourced constant with no real
 * lever to attach it to (brief rule 1) — settled with the user before Part A was built.
 */
export function LifeSupportConsole() {
  useRun((s) => s.version);
  const state = useRun((s) => s.state);
  const oxygenHistory = useRun((s) => s.resourceHistory.oxygen);
  const waterHistory = useRun((s) => s.resourceHistory.water);
  const setSurvivalMode = useRun((s) => s.setSurvivalMode);
  const setCo2ScrubberMode = useRun((s) => s.setCo2ScrubberMode);
  const setWaterReclamationMode = useRun((s) => s.setWaterReclamationMode);
  const setThermalControlMode = useRun((s) => s.setThermalControlMode);
  const phase = useRun((s) => s.phase);
  const level = useDial((s) => s.level);
  const language = useAppLanguage();

  const summary = buildResourceSummary(state, level, language);
  const locked = phase !== "planning";
  const co2LimitMmHg = survivalModes[state.food.mode].co2LimitMmHg.value;
  const co2GrowthBonus = co2GrowthBonusFraction(
    co2Ppm(state.atmosphere.o2PartialPressureMmHg, state.atmosphere.co2PartialPressureMmHg),
  );

  return (
    <DashboardGrid className="console two-col" layoutKey="lifeSupport">
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
            history={oxygenHistory}
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
            history={waterHistory}
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

      <section className="panel" aria-labelledby="scrubber-heading">
        <h2 id="scrubber-heading">Air cleaner (CO₂ scrubber)</h2>
        <p className="panel-hint">
          A real lever in ordinary conditions, not just during an incident: run it flat out and
          CO₂ stays near zero; ease off and it climbs — toward a real, documented crop-growth
          boost if it stays under control, or toward real, permanent harm if it doesn't.
          {locked && " Locked while the sol is running — adjust it during Sol Planning."}
        </p>
        <div className="button-row" role="group" aria-label="CO2 scrubber duty cycle">
          {CO2_SCRUBBER_MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={`btn ${state.atmosphere.co2ScrubberMode === m ? "btn-active" : ""}`}
              aria-pressed={state.atmosphere.co2ScrubberMode === m}
              disabled={locked}
              onClick={() => {
                setCo2ScrubberMode(m);
              }}
            >
              {co2ScrubberModeLabel(m, level, language)}
              <span className="btn-sub">{Math.round(co2ScrubberDutyCycleFraction(m) * 100)}% capacity</span>
            </button>
          ))}
        </div>
        <p className="panel-hint">
          Currently {state.atmosphere.co2PartialPressureMmHg.toFixed(2)} mmHg, capped at{" "}
          {co2LimitMmHg.toFixed(1)} mmHg in {survivalModeLabel(state.food.mode, level, language)} mode.
          {co2GrowthBonus > 0.001 && (
            <> Crops are growing {Math.round(co2GrowthBonus * 100)}% faster from it right now.</>
          )}
          {state.atmosphere.co2PartialPressureMmHg > co2LimitMmHg &&
            " Above the limit — this is already costing the crew, the longer it stays here."}
        </p>
      </section>

      <section className="panel" aria-labelledby="water-reclamation-heading">
        <h2 id="water-reclamation-heading">Water reclamation</h2>
        <p className="panel-hint">
          Another real lever in ordinary conditions: the ISS&apos;s own Brine Processor Assembly
          recovers far more water than the baseline loop, at the cost of a recurring daily share
          of the crew-hours budget — competing with incident response and repairs for the same
          hours, not a free upgrade.
          {locked && " Locked while the sol is running — adjust it during Sol Planning."}
        </p>
        <div className="button-row" role="group" aria-label="Water reclamation mode">
          {WATER_RECLAMATION_MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={`btn ${state.water.reclamationMode === m ? "btn-active" : ""}`}
              aria-pressed={state.water.reclamationMode === m}
              disabled={locked}
              onClick={() => {
                setWaterReclamationMode(m);
              }}
            >
              {waterReclamationModeLabel(m, level, language)}
              <span className="btn-sub">
                {Math.round(waterReclamationFraction(m) * 100)}% recovered
                {m === "brineProcessor" && ` · ${lifeSupport.brineProcessorCrewHoursPerDay.value} crew-h/day`}
              </span>
            </button>
          ))}
        </div>
        <p className="panel-hint">
          Currently recovering {Math.round(state.water.recoveryFraction * 100)}% ·{" "}
          {state.water.potableKg.toFixed(0)} kg stored.
        </p>
      </section>

      <section className="panel" aria-labelledby="thermal-heading">
        <h2 id="thermal-heading">Heating &amp; cooling</h2>
        <p className="panel-hint">
          A third real lever: trimming the heater/cooler&apos;s rated capacity saves power for
          everything else, but the cabin drifts away from the current mode&apos;s comfort target
          for real, felt stretches — checked by direct simulation across every mission, this
          costs real cold-penalty hours without ever crossing the freeze-risk threshold, not a
          hidden trap.
          {locked && " Locked while the sol is running — adjust it during Sol Planning."}
        </p>
        <div className="button-row" role="group" aria-label="Thermal control mode">
          {THERMAL_CONTROL_MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={`btn ${state.thermal.controlMode === m ? "btn-active" : ""}`}
              aria-pressed={state.thermal.controlMode === m}
              disabled={locked}
              onClick={() => {
                setThermalControlMode(m);
              }}
            >
              {thermalControlModeLabel(m, level, language)}
              <span className="btn-sub">{Math.round(thermalControlDutyCycleFraction(m) * 100)}% capacity</span>
            </button>
          ))}
        </div>
        <p className="panel-hint">
          Cabin currently {state.thermal.habitatTempC.toFixed(1)} °C, target{" "}
          {survivalModes[state.food.mode].habitatTempC.value} °C.
        </p>
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
          <summary>Why not oxygen too?</summary>
          <p>
            Rations, the CO₂ scrubber's duty cycle, water reclamation, and thermal control are all real
            trade-off dials — eating less, drinking less, running colder, easing off the scrubber, recycling
            more water for a crew-hours cost, and trimming heater/cooler capacity are all choices a crew can
            actually make, each at a real and survivable cost. Oxygen isn't — the life-support loop's whole
            job is to hold it at a fixed safety threshold regardless of what a trainee would prefer, so
            there's no "loosen it a bit" setting: past that threshold is system failure, not a comfort
            trade-off.
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

      {/* M8.4 Part B: read-only — no settable MOXIE-priority control exists in the sim today;
       *  inventing one would mean a new, unsourced physical constant with no real lever to
       *  attach it to (brief rule 1). Mars-only: `state.systems.moxie` is `undefined` on the
       *  Moon (no atmosphere for MOXIE-style ISRU to work on), so this panel simply doesn't
       *  render there rather than showing an empty "ISRU" box with nothing in it. */}
      {state.systems.moxie !== undefined && (
        <section className="panel" aria-labelledby="isru-heading">
          <h2 id="isru-heading">ISRU</h2>
          <p className="panel-hint">Status only — no adjustable MOXIE control exists yet.</p>
          <ul className="status-list">
            <li>
              <span className="status-list-label">MOXIE</span>
              <span className="status-list-value">
                {state.isru.moxieRunning ? "Running" : "Not running"} ·{" "}
                {state.isru.moxieO2ProducedKg.toFixed(2)} kg O₂ made
              </span>
            </li>
          </ul>
        </section>
      )}

      {/* Player request: a standalone content box for crop conditions, split out of the old
       *  combined "ISRU & crops" panel — every scenario has real crop trays (state.food.trays)
       *  regardless of body, unlike MOXIE above, so this always renders. Growth/health numbers
       *  are the same ones HabitatView's own "Current conditions" table and CropSprite visuals
       *  already read — MiniBar (built for that table) reused here rather than a second bar
       *  component for the identical purpose. */}
      <section className="panel" aria-labelledby="crop-conditions-heading">
        <h2 id="crop-conditions-heading">Crop conditions</h2>
        <p className="panel-hint">Status only — no adjustable crop-task control exists yet.</p>
        {co2GrowthBonus > 0.001 && (
          <p className="panel-hint">
            Cabin CO₂ is in a real, documented crop-growth-boosting range — trays are growing{" "}
            {Math.round(co2GrowthBonus * 100)}% faster (WHEELER-2024-CO2-SALAD).
          </p>
        )}
        <ul className="crop-conditions-list">
          {state.food.trays.map((tray) => {
            const required = cropRequiredLightHours(tray.crop);
            const growthFraction = Math.min(1, tray.lightHours / required);
            const healthPct = Math.round(tray.healthFraction * 100);
            const trayStatusClass = healthPct < 60 ? "is-caution" : "is-nominal";
            return (
              <li key={tray.id} className={`crop-conditions-row ${trayStatusClass}`}>
                <span className="crop-conditions-name">{cropLabel(tray.crop, level, language)}</span>
                <span className="crop-conditions-stat">
                  <span aria-hidden="true">{healthPct < 60 ? "▲" : "●"}</span>{" "}
                  {Math.round(growthFraction * 100)}% grown · {healthPct}% healthy
                  <MiniBar fraction={growthFraction} statusClassName={trayStatusClass} />
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <FactCardGallery topic="co2-scrubber" heading="Real hardware: the ISS's CDRA CO₂ scrubber" />
      <FactCardGallery
        topic="veggie"
        heading="Real hardware: NASA's Veggie plant-growth hardware"
        className="panel-span-full"
      />
    </DashboardGrid>
  );
}

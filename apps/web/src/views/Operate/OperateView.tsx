import { useRun } from "../../store/run.js";
import { Gauge } from "../../components/Gauge.js";
import { TimeControls } from "../../components/TimeControls.js";
import { PowerPriorities } from "../../components/PowerPriorities.js";
import { EventFeed } from "../../components/EventFeed.js";
import { CrewPanel } from "../../components/CrewPanel.js";
import {
  STATUS,
  statusFromBand,
  statusFromCeiling,
  statusFromReserve,
} from "../../components/status.js";
import {
  crew as crewConstants,
  rationKgPerCrewDay,
  survivalModes,
  type SurvivalMode,
} from "@sol-keeper/sim";

const MODE_LABELS: Record<SurvivalMode, string> = {
  nominal: "Nominal",
  mode1: "Reduced",
  mode2: "Survival",
};

/** The Operate view: what the outpost is doing right now, and what the player can change. */
export function OperateView() {
  const version = useRun((s) => s.version);
  const state = useRun((s) => s.state);
  const scenario = useRun((s) => s.scenario);
  const setSurvivalMode = useRun((s) => s.setSurvivalMode);

  const living = state.crew.filter((c) => c.alive).length;
  const mode = survivalModes[state.food.mode];

  // Reserves are shown as days remaining, which is the unit a decision is actually made in.
  const waterDays =
    living > 0 ? state.water.potableKg / (living * crewConstants.waterUseTotalKgPerCrewDay.value) : 0;
  const foodDays =
    living > 0
      ? state.food.storedDryMassKg / (living * rationKgPerCrewDay(state.food.mode))
      : 0;

  const batteryFraction = state.power.batteryEnergyKwh / state.power.batteryCapacityKwh;
  const powerServedFraction =
    state.power.demandKw > 0 ? state.power.servedKw / state.power.demandKw : 1;

  return (
    <div className="operate" key={version}>
      <header className="mission-head">
        <div>
          <h1>Sol Keeper</h1>
          <p className="mission-site">
            {scenario.site.name} · {scenario.body === "mars" ? "Mars" : "Moon"} ·{" "}
            {scenario.durationSols} sols · {living}/{state.crew.length} crew
          </p>
        </div>
        <RunStatusBadge />
      </header>

      <TimeControls />

      <section className="panel" aria-labelledby="resources-heading">
        <h2 id="resources-heading">Resources</h2>
        <div className="gauge-grid">
          <Gauge
            icon="◇"
            label="Oxygen"
            value={state.atmosphere.o2PartialPressureMmHg}
            unit="mmHg"
            decimals={0}
            fraction={state.atmosphere.o2PartialPressureMmHg / 200}
            status={statusFromBand(state.atmosphere.o2PartialPressureMmHg, 120, 200)}
            detail={`${state.atmosphere.o2Kg.toFixed(1)} kg in the cabin`}
          />
          <Gauge
            icon="▽"
            label="Carbon dioxide"
            value={state.atmosphere.co2PartialPressureMmHg}
            unit="mmHg"
            decimals={2}
            fraction={state.atmosphere.co2PartialPressureMmHg / mode.co2LimitMmHg.value}
            status={statusFromCeiling(
              state.atmosphere.co2PartialPressureMmHg,
              mode.co2LimitMmHg.value,
            )}
            detail={`limit ${mode.co2LimitMmHg.value} mmHg in ${MODE_LABELS[state.food.mode]} mode`}
          />
          <Gauge
            icon="≈"
            label="Water"
            value={state.water.potableKg}
            unit="kg"
            decimals={0}
            fraction={Math.min(1, waterDays / 30)}
            status={statusFromReserve(Math.min(1, waterDays / 30))}
            detail={`${waterDays.toFixed(1)} days at the current rate`}
          />
          <Gauge
            icon="✦"
            label="Food"
            value={state.food.storedDryMassKg}
            unit="kg dry"
            decimals={0}
            fraction={Math.min(1, foodDays / 30)}
            status={statusFromReserve(Math.min(1, foodDays / 30))}
            detail={`${foodDays.toFixed(1)} days · ${state.food.cumulativeHarvestKg.toFixed(1)} kg grown`}
          />
          <Gauge
            icon="⌁"
            label="Battery"
            value={state.power.batteryEnergyKwh}
            unit="kWh"
            decimals={0}
            fraction={batteryFraction}
            status={statusFromReserve(batteryFraction)}
            detail={`${state.power.generationKw.toFixed(1)} kW in · ${state.power.servedKw.toFixed(1)} of ${state.power.demandKw.toFixed(1)} kW served`}
          />
          <Gauge
            icon="◈"
            label="Cabin"
            value={state.thermal.habitatTempC}
            unit="°C"
            decimals={1}
            fraction={Math.max(0, Math.min(1, (state.thermal.habitatTempC + 10) / 40))}
            status={statusFromBand(state.thermal.habitatTempC, mode.habitatTempC.value - 6, 30)}
            detail={`outside ${state.environment.outsideTempC.toFixed(0)} °C · ${state.environment.isDaylight ? "daylight" : "night"}`}
          />
        </div>

        {powerServedFraction < 1 && (
          <p className={`inline-alert ${STATUS.caution.className}`}>
            <span aria-hidden="true">{STATUS.caution.glyph}</span> Power shortfall:{" "}
            {state.power.shedSystems.length} system(s) shut down this hour.
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="rations-heading">
        <h2 id="rations-heading">Rations</h2>
        <p className="panel-hint">
          Cutting rations stretches the stores and costs the crew morale and warmth.
        </p>
        <div className="button-row" role="group" aria-label="Survival mode">
          {(Object.keys(MODE_LABELS) as SurvivalMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`btn ${state.food.mode === m ? "btn-active" : ""}`}
              aria-pressed={state.food.mode === m}
              onClick={() => {
                setSurvivalMode(m);
              }}
            >
              {MODE_LABELS[m]}
              <span className="btn-sub">
                {survivalModes[m].kcalPerCrewDay.value} kcal · {survivalModes[m].habitatTempC.value}{" "}
                °C
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="two-col">
        <PowerPriorities />
        <CrewPanel />
      </div>

      <EventFeed />

      <footer className="credits">
        <p>
          Every number in this simulation comes from published NASA data. Sources are listed
          in <code>docs/DATA_SOURCES.md</code>; a Data Sources screen follows at M3.
        </p>
        <p className="credits-fine">
          Not affiliated with or endorsed by NASA. Data credited to NASA and the cited
          researchers.
        </p>
      </footer>
    </div>
  );
}

function RunStatusBadge() {
  const status = useRun((s) => s.state.status);
  const reason = useRun((s) => s.state.endReasonCode);

  const presentation =
    status === "running"
      ? { glyph: "●", word: "Running", cls: "is-nominal" }
      : status === "won"
        ? { glyph: "★", word: "Mission complete", cls: "is-nominal" }
        : { glyph: "■", word: "Mission lost", cls: "is-critical" };

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

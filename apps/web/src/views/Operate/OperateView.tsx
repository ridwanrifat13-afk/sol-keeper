import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { Gauge } from "../../components/Gauge.js";
import { PowerPriorities } from "../../components/PowerPriorities.js";
import { EventFeed } from "../../components/EventFeed.js";
import { CrewPanel } from "../../components/CrewPanel.js";
import { DialSwitch } from "../../components/DialSwitch.js";
import { ScenarioSwitch } from "../../components/ScenarioSwitch.js";
import { EsmPanel } from "../../components/EsmPanel.js";
import { STATUS } from "../../components/status.js";
import { statusWord } from "../../dial/statusWords.js";
import { survivalModeLabel } from "../../dial/labels.js";
import { buildResourceSummary } from "../../dial/resourceSummary.js";
import { durationLabel } from "../../dial/missionTime.js";
import { survivalModes, type RunStatus, type SurvivalMode } from "@sol-keeper/sim";

const SURVIVAL_MODES: readonly SurvivalMode[] = ["nominal", "mode1", "mode2"];

/**
 * The Operate view: what the outpost is doing right now, and what the player can change.
 *
 * Every Gauge here gets the same three inputs regardless of Reality Dial level — the real
 * value, the physically accurate bar fraction, and the status the thresholds in status.ts
 * decided (via dial/resourceSummary.ts, shared with the Debrief) — and only asks
 * dial/present.ts to turn those into words. The simulation and the status thresholds never
 * see the dial level; only the last mile of formatting does.
 */
export function OperateView() {
  const version = useRun((s) => s.version);
  const state = useRun((s) => s.state);
  const scenario = useRun((s) => s.scenario);
  const setSurvivalMode = useRun((s) => s.setSurvivalMode);
  const level = useDial((s) => s.level);

  const summary = buildResourceSummary(state, level);
  const powerServedFraction =
    state.power.demandKw > 0 ? state.power.servedKw / state.power.demandKw : 1;

  return (
    <div className="operate" key={version}>
      <header className="mission-head">
        <div>
          <h1>Sol Keeper</h1>
          <p className="mission-site">
            {scenario.site.name} · {scenario.body === "mars" ? "Mars" : "Moon"} ·{" "}
            {durationLabel(scenario.durationHours, scenario.body)} · {summary.livingCrew}/{state.crew.length} crew
          </p>
        </div>
        <RunStatusBadge />
      </header>

      <ScenarioSwitch />

      <DialSwitch />

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
            icon="⌁"
            label="Battery"
            value={state.power.batteryEnergyKwh}
            unit={summary.battery.text.unit}
            decimals={summary.battery.text.decimals}
            valueText={summary.battery.text.valueText}
            fraction={summary.battery.fraction}
            status={summary.battery.status}
            statusLabel={statusWord(level, summary.battery.status.level, summary.battery.status.label)}
            detail={summary.battery.text.detail}
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

      <EsmPanel />

      <EventFeed />

      <footer className="credits">
        <p>
          Every number in this simulation comes from published NASA data. See the Data
          Sources tab above for the full list and what is tuned for gameplay.
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

/** Icon + word + colour class per outcome — never colour alone (brief rule 6). */
const RUN_STATUS_PRESENTATION: Record<RunStatus, { glyph: string; word: string; cls: string }> = {
  running: { glyph: "●", word: "Running", cls: "is-nominal" },
  success: { glyph: "★", word: "Mission complete", cls: "is-nominal" },
  partial: { glyph: "▲", word: "Mission ended — goal not met", cls: "is-caution" },
  abort: { glyph: "◆", word: "Mission aborted", cls: "is-caution" },
  loss: { glyph: "■", word: "Mission lost", cls: "is-critical" },
};

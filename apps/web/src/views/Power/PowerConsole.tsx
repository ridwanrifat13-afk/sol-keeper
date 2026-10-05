import { useTranslation } from "react-i18next";
import { power } from "@sol-keeper/sim";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { useSpaceWeather } from "../../data/spaceWeather.js";
import { Gauge } from "../../components/Gauge.js";
import { PowerPriorities } from "../../components/PowerPriorities.js";
import { ProvenanceBadge } from "../../components/ProvenanceBadge.js";
import { FactCardGallery } from "../../components/FactCardGallery.js";
import { AlarmBanner } from "../../components/AlarmBanner.js";
import { statusWord } from "../../dial/statusWords.js";
import { spaceWeatherTypeLabel } from "../../dial/spaceWeatherLabels.js";
import { buildResourceSummary } from "../../dial/resourceSummary.js";
import { useAppLanguage } from "../../i18n/useAppLanguage.js";
import { powerFactCardTopicFor } from "../../dial/factCardTopics.js";
import { DashboardGrid } from "../../components/DashboardGrid.js";
import { CockpitTarget } from "../../cockpit/CockpitTarget.js";

const MAX_EVENTS_SHOWN = 8;

/**
 * The Power console (M8.3): battery/generation status, the load-shed priority order, and —
 * folded in from the old Live Sky tab (M8's settled navigation) — real recent solar activity
 * from DONKI and "what NASA did" fact cards, since both are Power-relevant space weather.
 * Live Sky's light-time/distance panel goes to Comms instead (M8.4 Part C), not here.
 */
export function PowerConsole() {
  useRun((s) => s.version);
  const state = useRun((s) => s.state);
  const batteryHistory = useRun((s) => s.resourceHistory.battery);
  const scenario = useRun((s) => s.scenario);
  const phase = useRun((s) => s.phase);
  const cleanSolarArrays = useRun((s) => s.cleanSolarArrays);
  const level = useDial((s) => s.level);
  const language = useAppLanguage();
  const { t } = useTranslation();

  const summary = buildResourceSummary(state, level, language);
  const powerServedFraction =
    state.power.demandKw > 0 ? state.power.servedKw / state.power.demandKw : 1;
  const spaceWeather = useSpaceWeather();
  const locked = phase !== "planning";
  const remainingCrewHours = Math.max(
    0,
    state.crewHours.budgetTodayHours - state.crewHours.spentTodayHours,
  );
  const cleaningCostHours = power.routineArrayCleaningCrewHours.value;
  const canClean = scenario.body === "mars" && remainingCrewHours >= cleaningCostHours;

  return (
    <DashboardGrid className="console two-col" layoutKey="power">
      <header className="view-head">
        <h2>Power</h2>
        <p className="view-hint">
          Generation, storage, the load-shed order, and incoming space weather.
        </p>
      </header>

      <CockpitTarget id="power-battery" role="secondary" priority={1}>
        <section className="panel" aria-labelledby="power-resources-heading">
          <h2 id="power-resources-heading">Battery</h2>
          <div className="gauge-grid">
            <Gauge
              icon="⌁"
              label="Battery"
              value={state.power.batteryEnergyKwh}
              unit={summary.battery.text.unit}
              decimals={summary.battery.text.decimals}
              valueText={summary.battery.text.valueText}
              fraction={summary.battery.fraction}
              status={summary.battery.status}
              statusLabel={statusWord(
                level,
                summary.battery.status.level,
                summary.battery.status.label,
              )}
              detail={summary.battery.text.detail}
              helpKey="gauge.battery"
              level={level}
              history={batteryHistory}
            />
          </div>

          {powerServedFraction < 1 && (
            <AlarmBanner severity="caution">
              Power shortfall: {state.power.shedSystems.length} system(s) shut down this hour.
            </AlarmBanner>
          )}
        </section>
      </CockpitTarget>

      {/* M8.4 Part A: reactor throttle/array tilt stay read-only — no real lever exists to
       *  attach either to (brief rule 1). Array cleaning is no longer status-only (player
       *  request, M9.x): "quiet sol" interactivity, a routine any-sol maintenance action using
       *  the same real physics duststorm-2018's own post-storm cleanArrays response already
       *  models, not gated behind that one scripted incident. */}
      <CockpitTarget id="power-reactor-array" role="secondary" priority={2}>
        <section className="panel" aria-labelledby="reactor-array-heading">
          <h2 id="reactor-array-heading">Reactor &amp; array status</h2>
          <p className="panel-hint">
            Reactor and array output are read-only — cleaning is the one real lever here.
          </p>
          <ul className="status-list">
            <li>
              <span className="status-list-label">Solar array</span>
              <span className="status-list-value">
                {scenario.initial.solarArrayAreaM2} m² · {state.power.generationKw.toFixed(1)} kW
                generated
              </span>
            </li>
            <li>
              <span className="status-list-label">Dust obscuration</span>
              <span className="status-list-value">
                {Math.round(state.environment.dustObscurationFraction * 100)}%
              </span>
            </li>
            {scenario.initial.fissionReactorKwe > 0 && (
              <li>
                <span className="status-list-label">Fission reactor</span>
                <span className="status-list-value">
                  {scenario.initial.fissionReactorKwe} kWe rated
                </span>
              </li>
            )}
          </ul>
          {scenario.body === "mars" && (
            <>
              <p className="panel-hint">
                Routine dust settles on the array every sol, whether or not a storm hits — send
                someone out to wipe it off, any sol, for {cleaningCostHours} crew-hours and a real
                EVA radiation dose.
                {locked && " Locked while the sol is running — adjust it during Sol Planning."}
              </p>
              <button
                type="button"
                className="btn"
                disabled={locked || !canClean}
                onClick={() => {
                  cleanSolarArrays();
                }}
              >
                Clean solar arrays
                <span className="btn-sub">
                  {cleaningCostHours} crew-hours ·{" "}
                  {remainingCrewHours >= cleaningCostHours
                    ? "clears to the permanent floor"
                    : `only ${remainingCrewHours.toFixed(1)} h left today`}
                </span>
              </button>
            </>
          )}
        </section>
      </CockpitTarget>

      <CockpitTarget id="power-priorities" role="primary" priority={1}>
        <PowerPriorities />
      </CockpitTarget>

      <CockpitTarget id="power-space-weather" role="secondary" priority={3}>
        <section className="panel" aria-labelledby="space-weather-heading">
          <div className="panel-head-row">
            <h2 id="space-weather-heading">{t("liveSky.activityHeading")}</h2>
            <ProvenanceBadge status={spaceWeather.status} fetchedAt={spaceWeather.fetchedAt} />
          </div>
          <p className="panel-hint">
            {t(
              spaceWeather.status === "historical" ? "liveSky.hintHistorical" : "liveSky.hintLive",
            )}
          </p>
          {spaceWeather.events.length === 0 ? (
            <p className="live-sky-empty">{t("liveSky.empty")}</p>
          ) : (
            <ul className="live-sky-events">
              {spaceWeather.events.slice(0, MAX_EVENTS_SHOWN).map((event, i) => (
                <li key={`${event.type}-${event.startTime}-${i}`} className="live-sky-event">
                  <span className="live-sky-event-type">
                    {spaceWeatherTypeLabel(event.type, level, t)}
                  </span>
                  <span className="live-sky-event-time">
                    {new Date(event.startTime).toUTCString().slice(0, 22)}
                  </span>
                  {level !== "cadet" && event.classType && (
                    <span className="live-sky-event-class">{event.classType}</span>
                  )}
                  {event.link && (
                    <a
                      className="live-sky-event-link"
                      href={event.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("liveSky.nasaRecord")}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </CockpitTarget>

      <CockpitTarget id="power-fact-gallery" role="secondary" priority={4}>
        <FactCardGallery
          topic={powerFactCardTopicFor(scenario.body)}
          heading={
            scenario.body === "mars"
              ? "What NASA did: MOXIE"
              : "What NASA did: the lunar south pole"
          }
          className="panel-span-full"
        />
      </CockpitTarget>
    </DashboardGrid>
  );
}

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CommsPriority } from "@sol-keeper/sim";
import { useRun } from "../../store/run.js";
import { useLiveOrSnapshot } from "../../data/liveOrSnapshot.js";
import { ProvenanceBadge } from "../../components/ProvenanceBadge.js";
import { FactCardGallery } from "../../components/FactCardGallery.js";
import type { LightTimeResponse } from "../../../server-lib/types.js";
import { DashboardGrid } from "../../components/DashboardGrid.js";
import { CockpitTarget } from "../../cockpit/CockpitTarget.js";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const PRIORITIES: readonly { id: CommsPriority; label: string; hint: string }[] = [
  { id: "science", label: "Science downlink", hint: "Progress toward the mission's science goal." },
  {
    id: "personal",
    label: "Personal correspondence",
    hint: "A real, felt crew morale bonus instead.",
  },
];

/**
 * The Comms console (M8.3): the real Earth distance / light-time delay for the mission's own
 * body, folded in wholesale from the old Live Sky tab (M8's settled navigation) — this is the
 * exact fact the brief's "Mission Control messages arrive after the real light-time" mechanic
 * runs on, so it belongs here rather than with Power's own space-weather content.
 *
 * M8.4 Part C: downlink priority is a real, mutually exclusive trade-off, not a free bonus —
 * `models/comms.ts`'s own `commsStage` accrues either science.points (jezero-outpost's own
 * goal) or crew morale with the same comms uptime, never both, decided by this control and
 * locked to Sol Planning like every other station lever (M8.4 Parts A/B).
 */
export function CommsConsole() {
  // `state.comms.priority`/`state.science.points` are mutated in place — subscribing to
  // `version` too is what actually triggers a re-render (store/run.ts's own doc comment; the
  // same fix M8.2's DecisionCard needed for the same reason).
  useRun((s) => s.version);
  const scenario = useRun((s) => s.scenario);
  const commsPriority = useRun((s) => s.state.comms.priority);
  const setCommsPriority = useRun((s) => s.setCommsPriority);
  const phase = useRun((s) => s.phase);
  const locked = phase !== "planning";
  const { t } = useTranslation();

  const date = useMemo(() => todayIso(), []);
  const lightTime = useLiveOrSnapshot<LightTimeResponse>(
    `/snapshots/light-time-${scenario.body}.json`,
    `/api/light-time?body=${scenario.body}&date=${date}`,
  );

  const bodyWord = t(scenario.body === "mars" ? "liveSky.bodyMars" : "liveSky.bodyMoon");
  const oneWayMinutes = lightTime.data ? lightTime.data.oneWayLightSeconds / 60 : undefined;

  return (
    <DashboardGrid className="console two-col" layoutKey="comms">
      <header className="view-head">
        <h2>Comms</h2>
        <p className="view-hint">
          The real delay to Earth, and — on Mars — why urgent problems can't wait for a reply.
        </p>
      </header>

      <CockpitTarget id="comms-light-time" role="secondary" priority={1}>
        <section className="panel" aria-labelledby="light-time-heading">
          <div className="panel-head-row">
            <h2 id="light-time-heading">{t("liveSky.distanceHeading")}</h2>
            <ProvenanceBadge status={lightTime.status} fetchedAt={lightTime.data?.fetchedAt} />
          </div>
          {lightTime.data ? (
            <>
              <p className="live-sky-distance">
                {t("liveSky.distanceLine", {
                  km: Math.round(lightTime.data.distanceKm).toLocaleString(),
                  body: bodyWord,
                })}
              </p>
              <p className="panel-hint">
                {t("liveSky.radioDelay", {
                  oneWay: oneWayMinutes !== undefined ? oneWayMinutes.toFixed(1) : "—",
                  roundTrip: oneWayMinutes !== undefined ? (oneWayMinutes * 2).toFixed(1) : "—",
                })}
              </p>
            </>
          ) : (
            <p className="panel-hint">{t("liveSky.distanceLoading")}</p>
          )}
          {scenario.body === "mars" && (
            <p className="panel-hint">
              On Mars, a problem that needs an answer within the round-trip delay above has to be
              solved by the crew — Mission Control's reply will not arrive in time.
            </p>
          )}
        </section>
      </CockpitTarget>

      <CockpitTarget id="comms-downlink-priority" role="primary" priority={1}>
        <section className="panel" aria-labelledby="downlink-priority-heading">
          <h2 id="downlink-priority-heading">Downlink priority</h2>
          <p className="panel-hint">
            The same comms uptime feeds one of these, never both this hour.
            {locked && " Locked while the sol is running — adjust it during Sol Planning."}
          </p>
          <div className="button-row" role="group" aria-label="Downlink priority">
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`btn ${commsPriority === p.id ? "btn-active" : ""}`}
                aria-pressed={commsPriority === p.id}
                disabled={locked}
                onClick={() => {
                  setCommsPriority(p.id);
                }}
              >
                {p.label}
                <span className="btn-sub">{p.hint}</span>
              </button>
            ))}
          </div>
        </section>
      </CockpitTarget>

      <CockpitTarget id="comms-fact-gallery" role="secondary" priority={2}>
        <FactCardGallery
          topic="deep-space-network"
          heading="Real hardware: the Deep Space Network"
          className="panel-span-full"
        />
      </CockpitTarget>
    </DashboardGrid>
  );
}

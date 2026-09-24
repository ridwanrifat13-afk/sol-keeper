import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRun } from "../../store/run.js";
import { useLiveOrSnapshot } from "../../data/liveOrSnapshot.js";
import { ProvenanceBadge } from "../../components/ProvenanceBadge.js";
import type { LightTimeResponse } from "../../../server-lib/types.js";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The Comms console (M8.3): the real Earth distance / light-time delay for the mission's own
 * body, folded in wholesale from the old Live Sky tab (M8's settled navigation) — this is the
 * exact fact the brief's "Mission Control messages arrive after the real light-time" mechanic
 * runs on, so it belongs here rather than with Power's own space-weather content.
 *
 * Downlink priority and the delayed Mission Control message feed are M8.4 Part C's job, not
 * this shell-only pass.
 */
export function CommsConsole() {
  const scenario = useRun((s) => s.scenario);
  const { t } = useTranslation();

  const date = useMemo(() => todayIso(), []);
  const lightTime = useLiveOrSnapshot<LightTimeResponse>(
    `/snapshots/light-time-${scenario.body}.json`,
    `/api/light-time?body=${scenario.body}&date=${date}`,
  );

  const bodyWord = t(scenario.body === "mars" ? "liveSky.bodyMars" : "liveSky.bodyMoon");
  const oneWayMinutes = lightTime.data ? lightTime.data.oneWayLightSeconds / 60 : undefined;

  return (
    <div className="console">
      <header className="view-head">
        <h2>Comms</h2>
        <p className="view-hint">The real delay to Earth, and — on Mars — why urgent problems can't wait for a reply.</p>
      </header>

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
    </div>
  );
}

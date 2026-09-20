import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { useLiveOrSnapshot } from "../../data/liveOrSnapshot.js";
import { useSpaceWeather } from "../../data/spaceWeather.js";
import { ProvenanceBadge } from "../../components/ProvenanceBadge.js";
import { spaceWeatherTypeLabel } from "../../dial/spaceWeatherLabels.js";
import type { LightTimeResponse } from "../../../server-lib/types.js";

const MAX_EVENTS_SHOWN = 8;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Live Sky (M5): real recent solar activity from DONKI, and the actual Earth distance /
 * light-time delay for the mission's own body — the two live-data features the brief
 * scopes for this milestone. NASA image fact cards use the same /api/nasa-images
 * endpoint and snapshot pattern, but the card UI itself is M6 scope; this view does not
 * attempt it early.
 *
 * Both panels follow the same rule: paint the committed snapshot immediately (instant,
 * offline-safe), then upgrade to live data if it answers within 3 s, and always say which
 * one is on screen — never silently.
 */
export function LiveSkyView() {
  const scenario = useRun((s) => s.scenario);
  const level = useDial((s) => s.level);
  const { t } = useTranslation();

  const date = useMemo(() => todayIso(), []);
  const lightTime = useLiveOrSnapshot<LightTimeResponse>(
    `/snapshots/light-time-${scenario.body}.json`,
    `/api/light-time?body=${scenario.body}&date=${date}`,
  );
  const spaceWeather = useSpaceWeather();

  const bodyWord = t(scenario.body === "mars" ? "liveSky.bodyMars" : "liveSky.bodyMoon");
  const oneWayMinutes = lightTime.data ? lightTime.data.oneWayLightSeconds / 60 : undefined;

  return (
    <div className="live-sky">
      <header className="view-head">
        <h1>{t("liveSky.title")}</h1>
        <p className="view-hint">{t("liveSky.hint")}</p>
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
      </section>

      <section className="panel" aria-labelledby="space-weather-heading">
        <div className="panel-head-row">
          <h2 id="space-weather-heading">{t("liveSky.activityHeading")}</h2>
          <ProvenanceBadge status={spaceWeather.status} fetchedAt={spaceWeather.fetchedAt} />
        </div>
        <p className="panel-hint">
          {t(spaceWeather.status === "historical" ? "liveSky.hintHistorical" : "liveSky.hintLive")}
        </p>
        {spaceWeather.events.length === 0 ? (
          <p className="live-sky-empty">{t("liveSky.empty")}</p>
        ) : (
          <ul className="live-sky-events">
            {spaceWeather.events.slice(0, MAX_EVENTS_SHOWN).map((event, i) => (
              <li key={`${event.type}-${event.startTime}-${i}`} className="live-sky-event">
                <span className="live-sky-event-type">{spaceWeatherTypeLabel(event.type, level, t)}</span>
                <span className="live-sky-event-time">{new Date(event.startTime).toUTCString().slice(0, 22)}</span>
                {level !== "cadet" && event.classType && (
                  <span className="live-sky-event-class">{event.classType}</span>
                )}
                {event.link && (
                  <a className="live-sky-event-link" href={event.link} target="_blank" rel="noreferrer">
                    {t("liveSky.nasaRecord")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

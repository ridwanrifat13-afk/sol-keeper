import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRun } from "../../store/run.js";
import { useDial } from "../../store/dial.js";
import { useLiveOrSnapshot } from "../../data/liveOrSnapshot.js";
import { useSpaceWeather } from "../../data/spaceWeather.js";
import { ProvenanceBadge } from "../../components/ProvenanceBadge.js";
import { FactCardGallery } from "../../components/FactCardGallery.js";
import { spaceWeatherTypeLabel } from "../../dial/spaceWeatherLabels.js";
import type { LightTimeResponse } from "../../../server-lib/types.js";
import type { ImageQueryKey } from "../../../server-lib/validate.js";

const MAX_EVENTS_SHOWN = 8;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Which whitelisted image topic fits the current mission body — real fact-card photos,
 *  chosen by what the player is actually doing rather than a fixed, generic set. */
function factCardTopicFor(body: "mars" | "moon"): ImageQueryKey {
  return body === "mars" ? "moxie" : "lunar-south-pole";
}

/**
 * Live Sky (M5/M6): real recent solar activity from DONKI, the actual Earth distance /
 * light-time delay for the mission's own body, and — since M6 — "what NASA did" fact
 * cards using the same /api/nasa-images endpoint and snapshot pattern M5 already built.
 *
 * All three panels follow the same rule: paint the committed snapshot immediately
 * (instant, offline-safe), then upgrade to live data if it answers within 3 s, and always
 * say which one is on screen — never silently.
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

      <FactCardGallery
        topic={factCardTopicFor(scenario.body)}
        heading={scenario.body === "mars" ? "What NASA did: MOXIE" : "What NASA did: the lunar south pole"}
      />
    </div>
  );
}

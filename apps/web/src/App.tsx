import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRun } from "./store/run.js";
import { OperateView } from "./views/Operate/OperateView.js";
import { DebriefView } from "./views/Debrief/DebriefView.js";
import { DataSourcesView } from "./views/DataSources/DataSourcesView.js";
import { RippleView } from "./views/Ripple/RippleView.js";
import { LiveSkyView } from "./views/LiveSky/LiveSkyView.js";
import { LaunchPackingView } from "./views/LaunchPacking/LaunchPackingView.js";
import { LandingSiteView } from "./views/LandingSite/LandingSiteView.js";
import { LanguageSwitch } from "./components/LanguageSwitch.js";
import { TimeControls } from "./components/TimeControls.js";
import { DecisionCard } from "./components/DecisionCard.js";
import "./i18n/config.js";

type View = "operate" | "ripple" | "liveSky" | "launchPacking" | "landingSite" | "debrief" | "dataSources";

const TAB_IDS: readonly View[] = [
  "operate",
  "ripple",
  "liveSky",
  "launchPacking",
  "landingSite",
  "debrief",
  "dataSources",
];
const TAB_KEYS: Record<View, string> = {
  operate: "tabs.operate",
  ripple: "tabs.ripple",
  liveSky: "tabs.liveSky",
  launchPacking: "tabs.launchPacking",
  landingSite: "tabs.landingSite",
  debrief: "tabs.debrief",
  dataSources: "tabs.dataSources",
};

/**
 * The app shell. A plain tab switch over local state — seven views do not need a routing
 * library, and adding one would be a dependency the brief asks to clear first.
 *
 * Prepare (mission setup: crew size, scenario, landing site) is P0 in the brief's feature
 * list but is not named in any milestone through M6, so it stays deferred rather than built
 * to fit one. The player starts directly in Operate, as they did at M2, and switches
 * scenario from a control inside Operate itself (ScenarioSwitch) rather than a setup screen;
 * Landing Site (M6) is a viewer for the current scenario's real, fixed site, not a picker,
 * for the same reason.
 *
 * Tab labels and the language switch are the first (M5) i18n-wired part of the UI — see
 * i18n/config.ts for exactly what is and is not translated yet.
 *
 * M8.1: `TimeControls` renders here, in the always-mounted shell, rather than inside one tab's
 * view — its own tick-interval `useEffect` was previously tied to `OperateView`'s mount
 * lifecycle, so navigating away paused the mission by accident. It still owns the interval
 * itself (mounting/unmounting the whole app stops it, same design, just anchored higher).
 *
 * M8.2: `DecisionCard` renders here too, globally, for the same reason — a Decision Card
 * names its own owning station in the card itself (brief's M8 core loop), so it does not
 * require the player to navigate to any particular tab to see or answer it.
 */
export function App() {
  const [view, setView] = useState<View>("operate");
  const status = useRun((s) => s.state.status);
  const { t } = useTranslation();

  return (
    <main className="app">
      <div className="app-head-row">
        <nav className="tab-nav" aria-label={t("tabs.nav")}>
          {TAB_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`tab-button ${view === id ? "tab-button-active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => {
                setView(id);
              }}
            >
              {t(TAB_KEYS[id])}
              {id === "debrief" && status !== "running" && (
                <span className="tab-badge" aria-label={t("tabs.debriefReady")}>
                  ●
                </span>
              )}
            </button>
          ))}
        </nav>
        <LanguageSwitch />
      </div>

      <TimeControls />
      <DecisionCard />

      {view === "operate" && <OperateView />}
      {view === "ripple" && <RippleView />}
      {view === "liveSky" && <LiveSkyView />}
      {view === "launchPacking" && <LaunchPackingView />}
      {view === "landingSite" && <LandingSiteView />}
      {view === "debrief" && <DebriefView />}
      {view === "dataSources" && <DataSourcesView />}
    </main>
  );
}

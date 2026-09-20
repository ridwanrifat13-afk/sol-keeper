import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRun } from "./store/run.js";
import { OperateView } from "./views/Operate/OperateView.js";
import { DebriefView } from "./views/Debrief/DebriefView.js";
import { DataSourcesView } from "./views/DataSources/DataSourcesView.js";
import { RippleView } from "./views/Ripple/RippleView.js";
import { LiveSkyView } from "./views/LiveSky/LiveSkyView.js";
import { LanguageSwitch } from "./components/LanguageSwitch.js";
import "./i18n/config.js";

type View = "operate" | "ripple" | "liveSky" | "debrief" | "dataSources";

const TAB_IDS: readonly View[] = ["operate", "ripple", "liveSky", "debrief", "dataSources"];
const TAB_KEYS: Record<View, string> = {
  operate: "tabs.operate",
  ripple: "tabs.ripple",
  liveSky: "tabs.liveSky",
  debrief: "tabs.debrief",
  dataSources: "tabs.dataSources",
};

/**
 * The app shell. A plain tab switch over local state — five views do not need a routing
 * library, and adding one would be a dependency the brief asks to clear first.
 *
 * Prepare (mission setup: crew size, scenario, landing site) is P0 in the brief's feature
 * list but is not named in any milestone through M4, so it stays deferred rather than built
 * to fit one. The player starts directly in Operate, as they did at M2, and switches
 * scenario from a control inside Operate itself (ScenarioSwitch) rather than a setup screen.
 *
 * Tab labels and the language switch are the first (M5) i18n-wired part of the UI — see
 * i18n/config.ts for exactly what is and is not translated yet.
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

      {view === "operate" && <OperateView />}
      {view === "ripple" && <RippleView />}
      {view === "liveSky" && <LiveSkyView />}
      {view === "debrief" && <DebriefView />}
      {view === "dataSources" && <DataSourcesView />}
    </main>
  );
}

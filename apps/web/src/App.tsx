import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRun } from "./store/run.js";
import { PowerConsole } from "./views/Power/PowerConsole.js";
import { LifeSupportConsole } from "./views/LifeSupport/LifeSupportConsole.js";
import { CommsConsole } from "./views/Comms/CommsConsole.js";
import { IncidentCommandConsole } from "./views/IncidentCommand/IncidentCommandConsole.js";
import { MissionCommandConsole } from "./views/MissionCommand/MissionCommandConsole.js";
import { BriefingView } from "./views/Briefing/BriefingView.js";
import { DebriefView } from "./views/Debrief/DebriefView.js";
import { DataSourcesView } from "./views/DataSources/DataSourcesView.js";
import { LanguageSwitch } from "./components/LanguageSwitch.js";
import { TimeControls } from "./components/TimeControls.js";
import { DecisionCard } from "./components/DecisionCard.js";
import { DialSwitch } from "./components/DialSwitch.js";
import { RunStatusBadge } from "./components/RunStatusBadge.js";
import { EventFeed } from "./components/EventFeed.js";
import { durationLabel } from "./dial/missionTime.js";
import "./i18n/config.js";

type View = "power" | "lifeSupport" | "comms" | "incidentCommand" | "missionCommand" | "briefing" | "debrief";

const TAB_IDS: readonly View[] = [
  "power",
  "lifeSupport",
  "comms",
  "incidentCommand",
  "missionCommand",
  "briefing",
  "debrief",
];
const TAB_KEYS: Record<View, string> = {
  power: "tabs.power",
  lifeSupport: "tabs.lifeSupport",
  comms: "tabs.comms",
  incidentCommand: "tabs.incidentCommand",
  missionCommand: "tabs.missionCommand",
  briefing: "tabs.briefing",
  debrief: "tabs.debrief",
};

/**
 * The app shell (M8.3): the five station consoles plus Briefing and Debrief, replacing
 * Phase 2 (M2-M7)'s seven-tab IA — still a plain `useState<View>` tab switch, no router (the
 * brief reaffirms this is not needed for seven destinations; adding one would be a dependency
 * to clear first). Ripple Web, Live Sky, Launch Packing and Landing Site are no longer their
 * own tabs: their content folded into the five consoles (Ripple -> Incident Command, Live
 * Sky's two halves -> Power and Comms) or, for Landing Site/Launch Packing, is deferred to
 * M8.6's real Briefing content — those two files still exist but are temporarily unreached by
 * any tab until M8.6 folds them in, a disclosed gap for this sub-part, not a silent one.
 *
 * A fresh mission (and every `reset()`) now opens on Briefing, not mid-console, so "a new
 * player makes a first meaningful decision within 60 seconds" starts from the intended entry
 * point (brief's own M8 kickoff order: Briefing before every mission).
 *
 * Persistent, always-visible shell (not scoped to any one console): the tab nav, the mission
 * identity line + run-status badge, the Reality Dial switch, the sol clock (`TimeControls`,
 * M8.1), the Decision Card (M8.2), a Data Sources link opening that screen as an overlay
 * rather than consuming one of the seven tabs (still reachable everywhere, per CLAUDE.md rule
 * 5), and one shared mission log (`EventFeed`) rather than one copy per console.
 *
 * Tab labels and the language switch are the first (M5) i18n-wired part of the UI — see
 * i18n/config.ts for exactly what is and is not translated yet.
 */
export function App() {
  const [view, setView] = useState<View>("briefing");
  const [dataSourcesOpen, setDataSourcesOpen] = useState(false);
  const status = useRun((s) => s.state.status);
  const scenario = useRun((s) => s.scenario);
  const crew = useRun((s) => s.state.crew);
  const version = useRun((s) => s.version);
  const { t } = useTranslation();

  const livingCrew = crew.filter((c) => c.alive).length;

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
        <div className="app-head-actions">
          <button
            type="button"
            className="btn btn-quiet"
            aria-haspopup="dialog"
            aria-expanded={dataSourcesOpen}
            onClick={() => {
              setDataSourcesOpen(true);
            }}
          >
            {t("tabs.dataSources")}
          </button>
          <LanguageSwitch />
        </div>
      </div>

      <header className="mission-head" key={version}>
        <div>
          <h1>Sol Keeper</h1>
          <p className="mission-site">
            {scenario.site.name} · {scenario.body === "mars" ? "Mars" : "Moon"} ·{" "}
            {durationLabel(scenario.durationHours, scenario.body)} · {livingCrew}/{crew.length} crew
          </p>
        </div>
        <RunStatusBadge />
      </header>

      <DialSwitch />
      <TimeControls />
      <DecisionCard />

      {view === "power" && <PowerConsole />}
      {view === "lifeSupport" && <LifeSupportConsole />}
      {view === "comms" && <CommsConsole />}
      {view === "incidentCommand" && <IncidentCommandConsole />}
      {view === "missionCommand" && <MissionCommandConsole />}
      {view === "briefing" && <BriefingView />}
      {view === "debrief" && <DebriefView />}

      <EventFeed />

      <footer className="credits">
        <p>
          Every number in this simulation comes from published NASA data. See Data Sources
          (above) for the full list and what is tuned for gameplay.
        </p>
        <p className="credits-fine">
          Not affiliated with or endorsed by NASA. Data credited to NASA and the cited
          researchers.
        </p>
      </footer>

      {dataSourcesOpen && (
        <div
          className="overlay-backdrop"
          onClick={() => {
            setDataSourcesOpen(false);
          }}
        >
          <div
            className="overlay-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("tabs.dataSources")}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              className="btn btn-quiet overlay-close"
              onClick={() => {
                setDataSourcesOpen(false);
              }}
            >
              Close ✕
            </button>
            <DataSourcesView />
          </div>
        </div>
      )}
    </main>
  );
}

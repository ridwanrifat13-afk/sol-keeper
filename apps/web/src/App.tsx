import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRun } from "./store/run.js";
import { useAccessibility } from "./store/accessibility.js";
import { PowerConsole } from "./views/Power/PowerConsole.js";
import { LifeSupportConsole } from "./views/LifeSupport/LifeSupportConsole.js";
import { CommsConsole } from "./views/Comms/CommsConsole.js";
import { IncidentCommandConsole } from "./views/IncidentCommand/IncidentCommandConsole.js";
import { MissionCommandConsole } from "./views/MissionCommand/MissionCommandConsole.js";
import { HabitatView } from "./views/Habitat/HabitatView.js";
import { BriefingView } from "./views/Briefing/BriefingView.js";
import { DebriefView } from "./views/Debrief/DebriefView.js";
import { DataSourcesView } from "./views/DataSources/DataSourcesView.js";
import { LanguageSwitch } from "./components/LanguageSwitch.js";
import { LowPowerToggle } from "./components/LowPowerToggle.js";
import { TimeControls } from "./components/TimeControls.js";
import { DecisionCard } from "./components/DecisionCard.js";
import { SolSummaryView } from "./views/SolSummary/SolSummaryView.js";
import { CoachMark } from "./onboarding/CoachMark.js";
import { DialSwitch } from "./components/DialSwitch.js";
import { RunStatusBadge } from "./components/RunStatusBadge.js";
import { EventFeed } from "./components/EventFeed.js";
import { durationLabel } from "./dial/missionTime.js";
import { SetupWizard } from "./views/Setup/SetupWizard.js";
import { MissionReportView } from "./views/Report/MissionReportView.js";
import { applyRunLinkFromLocation, type BootRunLinkResult } from "./share/bootRunLink.js";
import "./i18n/config.js";

/** The tab-nav's own eight destinations — seven since M8.3, plus Habitat (M9.4a) as the
 *  confirmed 6th slot: after the five station consoles, before Briefing/Debrief. */
type TabView =
  | "power"
  | "lifeSupport"
  | "comms"
  | "incidentCommand"
  | "missionCommand"
  | "habitat"
  | "briefing"
  | "debrief";

/** M9: Setup is a real screen but deliberately not a tab-nav destination (see this file's own
 *  doc comment) — a separate, wider type rather than adding it to `TabView` and every
 *  `Record<TabView, ...>` below. M10.8's Mission Report joins it for the same reason: a
 *  standalone landing page for an inbound report link, not a mid-app tab (M10 plan's own
 *  finding #5). */
type View = TabView | "setup" | "report";

const TAB_IDS: readonly TabView[] = [
  "power",
  "lifeSupport",
  "comms",
  "incidentCommand",
  "missionCommand",
  "habitat",
  "briefing",
  "debrief",
];
const TAB_KEYS: Record<TabView, string> = {
  power: "tabs.power",
  lifeSupport: "tabs.lifeSupport",
  comms: "tabs.comms",
  incidentCommand: "tabs.incidentCommand",
  missionCommand: "tabs.missionCommand",
  habitat: "tabs.habitat",
  briefing: "tabs.briefing",
  debrief: "tabs.debrief",
};

/**
 * The app shell (M8.3): the five station consoles plus Briefing and Debrief, replacing
 * Phase 2 (M2-M7)'s seven-tab IA — still a plain `useState<View>` tab switch, no router (the
 * brief reaffirms this is not needed for this many destinations; adding one would be a
 * dependency to clear first). Ripple Web, Live Sky, Launch Packing and Landing Site are no
 * longer their own tabs: their content folded into the five consoles (Ripple -> Incident
 * Command, Live Sky's two halves -> Power and Comms) or, for Landing Site/Launch Packing, is
 * deferred to M8.6's real Briefing content — those two files still exist but are temporarily
 * unreached by any tab until M8.6 folds them in, a disclosed gap for this sub-part, not a
 * silent one.
 *
 * M9.4a adds Habitat as an eighth tab-nav destination, at the confirmed 6th slot (after the
 * five station consoles, before Briefing/Debrief) — a visualization, not a control surface:
 * it reads `state.environment` the same way every console reads its own slice, but has no
 * levers of its own.
 *
 * The app opens on Setup (M9) — a real mission-configuration wizard, not the placeholder id
 * switch `ScenarioSwitch` still is on Mission Command — and `reset()` itself still lands on
 * Briefing (M8.3's own settled choice for what a `reset()` in progress, e.g. Restart, should
 * show), so "a new player makes a first meaningful decision within 60 seconds" still starts
 * from Briefing once a mission exists, just with a real setup step before the first one.
 * Setup is deliberately not one of the tab-nav's own destinations (unlike the other seven) —
 * reachable again via "New Mission" in the header actions, matching Data Sources' own
 * non-tab placement — and while it's open, the tab nav, mission clock, and Decision Card for
 * whatever mission is still running underneath are hidden rather than shown alongside a
 * wizard for a mission that doesn't exist yet.
 *
 * Persistent, always-visible shell (not scoped to any one console): the tab nav, the mission
 * identity line + run-status badge, the Reality Dial switch, the sol clock (`TimeControls`,
 * M8.1), the Decision Card (M8.2), the end-of-sol summary (`SolSummaryView`, M8.5), a Data
 * Sources link opening that screen as an overlay rather than consuming one of the seven tabs
 * (still reachable everywhere, per CLAUDE.md rule 5), one shared mission log (`EventFeed`)
 * rather than one copy per console, and the First Light onboarding tutorial (`CoachMark`,
 * M8.7) that drives `view` itself on first launch until skipped or completed.
 *
 * Tab labels and the language switch are the first (M5) i18n-wired part of the UI — see
 * i18n/config.ts for exactly what is and is not translated yet.
 *
 * M9.4c adds a manual low-power-mode toggle (store/accessibility.ts) alongside the language
 * switch — a player choice, not auto-detected (no reliable cross-browser "low-end device"
 * signal exists) — that sets a `low-power-mode` class on the root element for `styles.css`'s
 * existing reduced-motion rules to also key off, on top of the OS's own
 * `prefers-reduced-motion` media query.
 *
 * M10.6 reads a shareable run link once at boot, in a `useEffect` (never at render time —
 * `window` doesn't exist under this app's own SSR-based render tests, `share/bootRunLink.ts`'s
 * own doc comment). A valid config-only link (a class mission) skips Setup for Briefing; a
 * valid config+fragment link (a report/replay link) skips straight to the Mission Report
 * (M10.8), which replays the recorded decisions tick by tick at a chosen speed rather than
 * jumping straight to the end (M10.9's `store/replay.ts`). A version mismatch or a malformed
 * link shows a dismissible banner and otherwise behaves exactly like opening the app with no
 * link at all.
 */
export function App() {
  const [view, setView] = useState<View>("setup");
  const [dataSourcesOpen, setDataSourcesOpen] = useState(false);
  const [linkBanner, setLinkBanner] = useState<BootRunLinkResult | undefined>(undefined);
  const status = useRun((s) => s.state.status);
  const scenario = useRun((s) => s.scenario);
  const crew = useRun((s) => s.state.crew);
  const version = useRun((s) => s.version);
  const lowPowerMode = useAccessibility((s) => s.lowPowerMode);
  const { t } = useTranslation();

  const livingCrew = crew.filter((c) => c.alive).length;

  // M9.4c: a single class on the root element, read by the same selectors that already
  // respond to the OS's own `prefers-reduced-motion` (styles.css) — this is the one DOM
  // side effect the manual low-power toggle needs; every actual animation rule lives in CSS.
  useEffect(() => {
    document.documentElement.classList.toggle("low-power-mode", lowPowerMode);
  }, [lowPowerMode]);

  // M10.6: read once, at boot — a run link is a landing-page concern, not something to
  // re-decode on every navigation, and re-running this after the player has started making
  // their own decisions would silently overwrite them with whatever the URL still says.
  useEffect(() => {
    const result = applyRunLinkFromLocation({ search: window.location.search, hash: window.location.hash });
    switch (result.kind) {
      case "none":
        return;
      case "versionMismatch":
      case "invalid":
        setLinkBanner(result);
        return;
      case "configOnly":
        setView("briefing");
        return;
      case "replaying":
        setView("report");
        return;
    }
  }, []);

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
            onClick={() => {
              setView("setup");
            }}
          >
            New Mission
          </button>
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
          <LowPowerToggle />
          <LanguageSwitch />
        </div>
      </div>

      {linkBanner !== undefined && (linkBanner.kind === "versionMismatch" || linkBanner.kind === "invalid") && (
        <div className="run-link-banner" role="status">
          <p>{t(linkBanner.kind === "versionMismatch" ? "shareLink.versionMismatch" : "shareLink.invalid")}</p>
          <button
            type="button"
            className="btn btn-quiet run-link-banner-close"
            aria-label={t("shareLink.dismiss")}
            onClick={() => {
              setLinkBanner(undefined);
            }}
          >
            ✕
          </button>
        </div>
      )}

      {view === "setup" ? (
        <SetupWizard
          onLaunch={() => {
            setView("briefing");
          }}
        />
      ) : view === "report" ? (
        <MissionReportView
          onBack={() => {
            setView("debrief");
          }}
        />
      ) : (
        <>
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
          <SolSummaryView />
          <CoachMark view={view} onNavigate={setView} />

          {view === "power" && <PowerConsole />}
          {view === "lifeSupport" && <LifeSupportConsole />}
          {view === "comms" && <CommsConsole />}
          {view === "incidentCommand" && <IncidentCommandConsole />}
          {view === "missionCommand" && <MissionCommandConsole />}
          {view === "habitat" && <HabitatView />}
          {view === "briefing" && <BriefingView />}
          {view === "debrief" && (
            <DebriefView
              onViewReport={() => {
                setView("report");
              }}
            />
          )}

          <EventFeed />
        </>
      )}

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

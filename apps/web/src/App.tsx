import { useState } from "react";
import { useRun } from "./store/run.js";
import { OperateView } from "./views/Operate/OperateView.js";
import { DebriefView } from "./views/Debrief/DebriefView.js";
import { DataSourcesView } from "./views/DataSources/DataSourcesView.js";
import { RippleView } from "./views/Ripple/RippleView.js";

type View = "operate" | "ripple" | "debrief" | "dataSources";

const TABS: readonly { id: View; label: string }[] = [
  { id: "operate", label: "Operate" },
  { id: "ripple", label: "Ripple Web" },
  { id: "debrief", label: "Debrief" },
  { id: "dataSources", label: "Data Sources" },
];

/**
 * The app shell. A plain tab switch over local state — four views do not need a routing
 * library, and adding one would be a dependency the brief asks to clear first.
 *
 * Prepare (mission setup: crew size, scenario, landing site) is P0 in the brief's feature
 * list but is not named in any milestone through M4, so it stays deferred rather than built
 * to fit one. The player starts directly in Operate, as they did at M2, and switches
 * scenario from a control inside Operate itself (ScenarioSwitch) rather than a setup screen.
 */
export function App() {
  const [view, setView] = useState<View>("operate");
  const status = useRun((s) => s.state.status);

  return (
    <main className="app">
      <nav className="tab-nav" aria-label="Sol Keeper views">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${view === tab.id ? "tab-button-active" : ""}`}
            aria-current={view === tab.id ? "page" : undefined}
            onClick={() => {
              setView(tab.id);
            }}
          >
            {tab.label}
            {tab.id === "debrief" && status !== "running" && (
              <span className="tab-badge" aria-label="ready">
                ●
              </span>
            )}
          </button>
        ))}
      </nav>

      {view === "operate" && <OperateView />}
      {view === "ripple" && <RippleView />}
      {view === "debrief" && <DebriefView />}
      {view === "dataSources" && <DataSourcesView />}
    </main>
  );
}

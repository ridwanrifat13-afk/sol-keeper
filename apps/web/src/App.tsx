import { useState } from "react";
import { useRun } from "./store/run.js";
import { OperateView } from "./views/Operate/OperateView.js";
import { DebriefView } from "./views/Debrief/DebriefView.js";
import { DataSourcesView } from "./views/DataSources/DataSourcesView.js";

type View = "operate" | "debrief" | "dataSources";

const TABS: readonly { id: View; label: string }[] = [
  { id: "operate", label: "Operate" },
  { id: "debrief", label: "Debrief" },
  { id: "dataSources", label: "Data Sources" },
];

/**
 * The app shell. A plain tab switch over local state — three views do not need a routing
 * library, and adding one would be a dependency the brief asks to clear first.
 *
 * Prepare (mission setup: crew size, scenario, landing site) is P0 in the brief's feature
 * list but is not named in M3's scope (Reality Dial, Black Box, Data Sources), so it stays
 * deferred rather than built to fit this milestone. The player starts directly in Operate,
 * as they did at M2.
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
      {view === "debrief" && <DebriefView />}
      {view === "dataSources" && <DataSourcesView />}
    </main>
  );
}

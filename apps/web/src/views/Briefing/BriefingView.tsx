import { useRun } from "../../store/run.js";
import { durationLabel } from "../../dial/missionTime.js";

/**
 * Mission Briefing (M8.3 stub — real content lands in M8.6): crew names/roles/stations,
 * duration, landing site, the hazard coming, primary/stretch goal, and what failure looks
 * like, per the brief's M8 section. This is the new default landing screen (App.tsx) so a
 * fresh mission opens here rather than mid-console.
 */
export function BriefingView() {
  const scenario = useRun((s) => s.scenario);

  return (
    <div className="console">
      <header className="view-head">
        <h2>Mission Briefing</h2>
        <p className="view-hint">
          {scenario.site.name} · {scenario.body === "mars" ? "Mars" : "Moon"} ·{" "}
          {durationLabel(scenario.durationHours, scenario.body)}
        </p>
      </header>
      <section className="panel">
        <p className="panel-hint">
          Full briefing content (crew roles and stations, landing site, the hazard coming,
          primary and stretch goals, what failure looks like) lands in M8.6 — for now, pick a
          station tab above to see the mission underway.
        </p>
      </section>
    </div>
  );
}

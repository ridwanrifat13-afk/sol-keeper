import type { MissionDifficulty } from "@sol-keeper/sim";
import { useSetup } from "../../store/setup.js";

// Real copy, not marketing text: every difficulty is scenario parameters only, never physics
// (CLAUDE.md's own Mission Difficulty section) — incident/failure trigger rate and warning
// time, nothing about how hard a resource is to manage once something goes wrong.
const DIFFICULTIES: readonly { id: MissionDifficulty; label: string; hint: string }[] = [
  {
    id: "training",
    label: "Training",
    hint: "Fewer incidents, more warning before each one — learn the stations first.",
  },
  {
    id: "nominal",
    label: "Nominal",
    hint: "The standard rate — a real, fair mission.",
  },
  {
    id: "flightRated",
    label: "Flight-Rated",
    hint: "Incidents come often and fast, with little warning — the real pace of a hard mission.",
  },
];

/** M9.2a's second setup step. */
export function DifficultyStep() {
  const difficulty = useSetup((s) => s.difficulty);
  const setDifficulty = useSetup((s) => s.setDifficulty);

  return (
    <section className="panel" aria-labelledby="setup-difficulty-heading">
      <h2 id="setup-difficulty-heading">Choose a difficulty</h2>
      <p className="panel-hint">
        This changes how often things go wrong and how much warning you get — never the
        physics of the station itself.
      </p>
      <div className="button-row" role="group" aria-label="Mission difficulty">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`btn btn-dial ${difficulty === d.id ? "btn-active" : ""}`}
            aria-pressed={difficulty === d.id}
            onClick={() => {
              setDifficulty(d.id);
            }}
          >
            {d.label}
            <span className="btn-sub">{d.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

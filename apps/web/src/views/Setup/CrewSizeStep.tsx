import { CREW_NAMES } from "@sol-keeper/sim";
import { useSetup } from "../../store/setup.js";

const MIN_CREW_SIZE = 2;
const MAX_CREW_SIZE = 6;

/** M9.2a's third setup step. Deliberately simple — crewSize already flows through the sim
 *  generically (consumption scales off live crew count, station coverage/fatigue already
 *  handles any size 2-6, packages/sim/src/engine/stations.ts), so this step only needs a
 *  stepper and honest copy about the real consequence, not a live preview of it.
 *
 * Player request: name your own crew. One text input per crew slot, prefilled with nothing
 * but placeholdered with the real default (`CREW_NAMES`, re-exported from the sim so this
 * never drifts from what a blank field actually becomes) — leaving any of them blank is a
 * real, supported choice, not an error state. */
export function CrewSizeStep() {
  const crewSize = useSetup((s) => s.crewSize);
  const setCrewSize = useSetup((s) => s.setCrewSize);
  const crewNames = useSetup((s) => s.crewNames);
  const setCrewName = useSetup((s) => s.setCrewName);

  return (
    <section className="panel" aria-labelledby="setup-crew-size-heading">
      <h2 id="setup-crew-size-heading">Choose your crew size</h2>
      <p className="panel-hint">
        A smaller crew means less food, water, and oxygen to launch — but every station still
        needs covering. Below 5 crew, at least one person will cover two stations at once,
        with a real fatigue cost for doing it.
      </p>
      <div className="button-row" role="group" aria-label="Crew size">
        <button
          type="button"
          className="btn"
          disabled={crewSize <= MIN_CREW_SIZE}
          onClick={() => {
            setCrewSize(crewSize - 1);
          }}
        >
          − Fewer
        </button>
        <span className="setup-crew-size-value" aria-live="polite">
          {crewSize} crew
        </span>
        <button
          type="button"
          className="btn"
          disabled={crewSize >= MAX_CREW_SIZE}
          onClick={() => {
            setCrewSize(crewSize + 1);
          }}
        >
          + More
        </button>
      </div>

      <h3 className="setup-crew-names-heading">Name your crew</h3>
      <p className="panel-hint">Optional — leave any blank and that crew member keeps a real default name.</p>
      <div className="setup-crew-names-grid">
        {Array.from({ length: crewSize }, (_, i) => {
          const fallback = CREW_NAMES[i % CREW_NAMES.length] ?? `Crew ${i + 1}`;
          return (
            <label key={i} className="setup-crew-name-row">
              <span className="setup-crew-name-label">Crew {i + 1}</span>
              <input
                type="text"
                className="setup-crew-name-input"
                value={crewNames[i] ?? ""}
                placeholder={fallback}
                maxLength={24}
                onChange={(e) => {
                  setCrewName(i, e.target.value);
                }}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}

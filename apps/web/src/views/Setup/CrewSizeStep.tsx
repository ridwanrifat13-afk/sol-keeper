import { useSetup } from "../../store/setup.js";

const MIN_CREW_SIZE = 2;
const MAX_CREW_SIZE = 6;

/** M9.2a's third setup step. Deliberately simple — crewSize already flows through the sim
 *  generically (consumption scales off live crew count, station coverage/fatigue already
 *  handles any size 2-6, packages/sim/src/engine/stations.ts), so this step only needs a
 *  stepper and honest copy about the real consequence, not a live preview of it. */
export function CrewSizeStep() {
  const crewSize = useSetup((s) => s.crewSize);
  const setCrewSize = useSetup((s) => s.setCrewSize);

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
    </section>
  );
}

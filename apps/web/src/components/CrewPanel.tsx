import { useRun } from "../store/run.js";
import { radiation } from "@sol-keeper/sim";
import { statusFromReserve } from "./status.js";

/**
 * Crew health, morale and accumulated dose.
 *
 * Dose is shown against the 600 mSv career limit rather than as a bare number, because the
 * number only means something next to the limit — that comparison is the whole point of the
 * radiation model.
 */
export function CrewPanel() {
  const version = useRun((s) => s.version);
  const crew = useRun((s) => s.state.crew);
  const careerLimit = radiation.careerLimitMSv.value;

  return (
    <section className="panel" aria-labelledby="crew-heading">
      <h2 id="crew-heading">Crew</h2>
      <ul className="crew-list" key={version}>
        {crew.map((member) => {
          const health = statusFromReserve(member.healthFraction);
          const dosePct = (member.cumulativeDoseMSv / careerLimit) * 100;

          return (
            <li key={member.id} className={`crew-row ${member.alive ? health.className : "is-critical"}`}>
              <span className="crew-name">
                {member.name}
                {!member.alive && <span className="crew-lost"> — lost</span>}
              </span>
              <span className="crew-stat">
                <span aria-hidden="true">{health.glyph}</span> health{" "}
                {Math.round(member.healthFraction * 100)}%
              </span>
              <span className="crew-stat">
                morale {Math.round(member.moraleFraction * 100)}%
              </span>
              <span className="crew-stat crew-dose">
                dose {member.cumulativeDoseMSv.toFixed(1)} mSv
                <span className="crew-dose-limit">
                  {" "}
                  ({dosePct.toFixed(0)}% of the {careerLimit} mSv career limit)
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

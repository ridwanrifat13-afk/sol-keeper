import { useRun } from "../store/run.js";
import { useDial } from "../store/dial.js";
import { radiation } from "@sol-keeper/sim";
import { statusFromReserve } from "./status.js";
import { presentDose } from "../dial/present.js";
import { statusWord } from "../dial/statusWords.js";
import { Avatar } from "./Avatar.js";

/**
 * Crew health, morale and accumulated dose.
 *
 * Dose is shown against the 600 mSv career limit rather than as a bare number, because the
 * number only means something next to the limit — that comparison is the whole point of the
 * radiation model, at every Reality Dial level.
 */
export function CrewPanel() {
  const version = useRun((s) => s.version);
  const crew = useRun((s) => s.state.crew);
  const level = useDial((s) => s.level);
  const careerLimit = radiation.careerLimitMSv.value;

  return (
    <section className="panel" aria-labelledby="crew-heading">
      <h2 id="crew-heading">Crew</h2>
      <ul className="crew-list" key={version}>
        {crew.map((member) => {
          const health = statusFromReserve(member.healthFraction);
          const dose = presentDose(level, member.cumulativeDoseMSv, careerLimit);
          const healthWord = statusWord(level, health.level, health.label);

          return (
            <li key={member.id} className={`crew-row ${member.alive ? health.className : "is-critical"}`}>
              <span className="crew-row-head">
                <Avatar name={member.name} statusClassName={member.alive ? health.className : "is-critical"} />
                <span className="crew-name">
                  {member.name}
                  {!member.alive && <span className="crew-lost"> — lost</span>}
                </span>
              </span>
              <span className="crew-stat">
                <span aria-hidden="true">{health.glyph}</span> {healthWord}
                {level !== "cadet" && ` (${Math.round(member.healthFraction * 100)}%)`}
              </span>
              <span className="crew-stat">
                {level === "cadet" ? "spirits" : "morale"} {Math.round(member.moraleFraction * 100)}%
              </span>
              <span className="crew-stat crew-dose">
                {level === "cadet" ? dose.headline : `dose ${dose.headline}`}
                <span className="crew-dose-limit"> {level === "cadet" ? dose.detail : `(${dose.detail})`}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

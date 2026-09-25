import { getScenario, sizeShielding, type ShieldingApproach } from "@sol-keeper/sim";
import { useSetup } from "../../store/setup.js";

const APPROACHES: readonly { id: ShieldingApproach; label: string; hint: string }[] = [
  {
    id: "hullOnly",
    label: "Hull only",
    hint: "No added shielding — the base habitat's own numbers, unchanged. Zero added mass.",
  },
  {
    id: "waterWall",
    label: "Water wall",
    hint: "Launch more water than you need to drink — it doubles as shielding, at a real mass cost.",
  },
  {
    id: "regolithBerm",
    label: "Regolith berm",
    hint: "Build a shielding berm on site — no launched mass, but real pre-mission crew-hours instead.",
  },
];

/** M9.2c's sixth and final choice step. Every number shown is computed live by the same
 *  engine/shielding.ts function the mission will actually launch with. */
export function ShieldingStep() {
  const scenarioId = useSetup((s) => s.scenarioId);
  const shieldingApproach = useSetup((s) => s.shieldingApproach);
  const setShieldingApproach = useSetup((s) => s.setShieldingApproach);

  const scenario = getScenario(scenarioId);
  const baseGPerCm2 = scenario.initial.shieldingGPerCm2;

  return (
    <section className="panel" aria-labelledby="setup-shielding-heading">
      <h2 id="setup-shielding-heading">Choose a shielding approach</h2>
      <p className="panel-hint">
        The base habitat already carries {baseGPerCm2} g/cm² of radiation shielding — a real
        mass-vs-labour trade-off on top of that.
      </p>
      <div className="button-row" role="group" aria-label="Shielding approach">
        {APPROACHES.map((a) => {
          const sized = sizeShielding(a.id);
          return (
            <button
              key={a.id}
              type="button"
              className={`btn btn-dial ${shieldingApproach === a.id ? "btn-active" : ""}`}
              aria-pressed={shieldingApproach === a.id}
              onClick={() => {
                setShieldingApproach(a.id);
              }}
            >
              {a.label}
              <span className="btn-sub">{a.hint}</span>
              <span className="btn-sub setup-sized-numbers">
                {sized.shieldingGPerCm2Delta > 0 && (
                  <>
                    +{sized.shieldingGPerCm2Delta} g/cm² ({baseGPerCm2 + sized.shieldingGPerCm2Delta} g/cm² total) ·{" "}
                  </>
                )}
                {sized.potableWaterKgDelta > 0 && <>+{sized.potableWaterKgDelta} kg water launched · </>}
                {sized.constructionCrewHours > 0 && <>{sized.constructionCrewHours} crew-h pre-mission · </>}
                {sized.shieldingGPerCm2Delta === 0 && sized.potableWaterKgDelta === 0 && sized.constructionCrewHours === 0 && (
                  <>No change from the base habitat</>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

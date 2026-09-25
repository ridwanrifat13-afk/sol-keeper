import {
  getLandingSite,
  getScenario,
  landingSitesForBody,
  sizePowerArchitecture,
  type PowerArchitecture,
} from "@sol-keeper/sim";
import { useSetup } from "../../store/setup.js";

const ARCHITECTURES: readonly { id: PowerArchitecture; label: string; hint: string }[] = [
  {
    id: "solarBattery",
    label: "Solar + battery",
    hint: "No moving parts, no fuel — but the battery has to survive the site's own longest dark stretch alone.",
  },
  {
    id: "fission",
    label: "Fission reactor",
    hint: "Runs day and night regardless of sunlight — the real NASA Fission Surface Power design, one fixed unit.",
  },
  {
    id: "hybrid",
    label: "Hybrid",
    hint: "The same reactor, plus a smaller daytime array for redundancy — not a lighter reactor, since none is sourced.",
  },
];

/** M9.2c's fifth setup step. Every number shown is computed live by the same
 *  engine/powerArchitecture.ts function the mission will actually launch with — not
 *  marketing copy, real sized numbers for whatever scenario/site/crew-size the player has
 *  chosen so far. */
export function PowerArchitectureStep() {
  const scenarioId = useSetup((s) => s.scenarioId);
  const landingSiteId = useSetup((s) => s.landingSiteId);
  const powerArchitecture = useSetup((s) => s.powerArchitecture);
  const setPowerArchitecture = useSetup((s) => s.setPowerArchitecture);

  const scenario = getScenario(scenarioId);
  const site = landingSiteId !== undefined ? getLandingSite(landingSiteId) : landingSitesForBody(scenario.body)[0];
  const peakDemandKw = scenario.systems.reduce((sum, spec) => sum + spec.nominalPowerKw, 0);

  return (
    <section className="panel" aria-labelledby="setup-power-heading">
      <h2 id="setup-power-heading">Choose a power architecture</h2>
      <p className="panel-hint">Sized live for this mission&apos;s own {peakDemandKw.toFixed(1)} kW peak demand.</p>
      <div className="button-row" role="group" aria-label="Power architecture">
        {ARCHITECTURES.map((a) => {
          const sized = site !== undefined ? sizePowerArchitecture(a.id, peakDemandKw, site, scenario.body) : undefined;
          return (
            <button
              key={a.id}
              type="button"
              className={`btn btn-dial ${powerArchitecture === a.id ? "btn-active" : ""}`}
              aria-pressed={powerArchitecture === a.id}
              onClick={() => {
                setPowerArchitecture(a.id);
              }}
            >
              {a.label}
              <span className="btn-sub">{a.hint}</span>
              {sized !== undefined && (
                <span className="btn-sub setup-sized-numbers">
                  {sized.solarArrayAreaM2 > 0 && <>{Math.round(sized.solarArrayAreaM2)} m² array · </>}
                  {sized.fissionReactorKwe > 0 && <>{sized.fissionReactorKwe} kWe reactor · </>}
                  {Math.round(sized.batteryCapacityKwh)} kWh battery
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

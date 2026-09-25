/**
 * M9's setup flow: layering a player's landing-site/crew-size/power/shielding choices onto
 * one of the three base scenarios, producing a new `Scenario` — never mutating the base one.
 * Pure, no DOM/fetch/Date.now/Math.random (brief rule 2), called once at mission setup
 * (`apps/web/src/store/setup.ts`'s `commit()`), never during a tick.
 *
 * Nothing about hazard scripting or win conditions changes here: `id`, `primaryGoal`,
 * `stretchGoal`, `durationHours`, `systems`, `scripted`, `briefingKey`, `scienceTargetPoints`,
 * and `body` all pass through from the base scenario untouched. Only the physical starting
 * configuration — `site`, `crewSize`, and `initial`'s power/battery/shielding/water fields —
 * is replaced.
 */
import { getLandingSite } from "../data/landingSites.js";
import type { LandingSiteId, PowerArchitecture, Scenario, ShieldingApproach } from "../types.js";
import { sizePowerArchitecture } from "./powerArchitecture.js";
import { sizeShielding } from "./shielding.js";

export interface SetupChoices {
  /** Must belong to `base.body` — the setup flow's own landing-site step is responsible for
   *  only ever offering sites of the right body; this function fails loudly rather than
   *  silently building a scenario with mismatched-body site data. */
  readonly landingSiteId: LandingSiteId;
  readonly crewSize: number;
  readonly powerArchitecture: PowerArchitecture;
  readonly shieldingApproach: ShieldingApproach;
}

export function buildCustomScenario(base: Scenario, choices: SetupChoices): Scenario {
  const site = getLandingSite(choices.landingSiteId);
  if (site.body !== base.body) {
    throw new Error(
      `buildCustomScenario: site ${site.id} is a ${site.body} site, but scenario ${base.id} is ${base.body}`,
    );
  }

  const peakDemandKw = base.systems.reduce((sum, spec) => sum + spec.nominalPowerKw, 0);
  const power = sizePowerArchitecture(choices.powerArchitecture, peakDemandKw, site, base.body);
  const shielding = sizeShielding(choices.shieldingApproach);

  return {
    ...base,
    site: { name: site.name, latDeg: site.latDeg.value, lonDeg: site.lonDeg.value },
    crewSize: choices.crewSize,
    initial: {
      ...base.initial,
      solarArrayAreaM2: power.solarArrayAreaM2,
      fissionReactorKwe: power.fissionReactorKwe,
      batteryEnergyKwh: power.batteryEnergyKwh,
      batteryCapacityKwh: power.batteryCapacityKwh,
      shieldingGPerCm2: base.initial.shieldingGPerCm2 + shielding.shieldingGPerCm2Delta,
      potableWaterKg: base.initial.potableWaterKg + shielding.potableWaterKgDelta,
    },
  };
}

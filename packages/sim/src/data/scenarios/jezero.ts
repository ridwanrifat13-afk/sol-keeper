/**
 * "Jezero Outpost" — the P0 scenario, and the one the whole Prepare -> Operate -> Debrief
 * loop is built around.
 *
 * Deliberately solar-only: without a reactor, the scripted dust storm forces the player to
 * choose what to shed, which is the lesson the power-priority mechanic exists to teach.
 * Site coordinates match the Jezero reference row in docs/trek_layers.md.
 */
import type { Scenario } from "../../types.js";
import { solsToHours } from "../../units.js";

export const jezeroOutpost: Scenario = {
  id: "jezero-outpost",
  body: "mars",
  site: { name: "Jezero Crater", latDeg: 18.4, lonDeg: 77.6 },
  primaryGoal: { id: "surviveWithDoseUnderLimit", briefKey: "scenario.jezero.goal.primary" },
  stretchGoal: { id: "harvestAllCropTrays", briefKey: "scenario.jezero.goal.stretch" },
  durationHours: Math.ceil(solsToHours(30)),
  crewSize: 4,

  initial: {
    // Sized for about 160 mmHg of oxygen in 200 m^3 at 22 degC — see the atmosphere model.
    o2Kg: 56,
    co2Kg: 0.5,
    potableWaterKg: 1200,
    foodDryMassKg: 150,
    batteryEnergyKwh: 150,
    batteryCapacityKwh: 200,
    habitatVolumeM3: 200,
    solarArrayAreaM2: 180,
    fissionReactorKwe: 0,
    shieldingGPerCm2: 10,
    cropTrays: [
      { crop: "lettuce", areaM2: 4 },
      { crop: "potato", areaM2: 4 },
    ],
  },

  // priority: lower is shed last. Power distribution and life support never go dark first.
  systems: [
    { id: "powerDistribution", trl: 9, nominalPowerKw: 0.1, priority: 0, spares: 2 },
    { id: "lifeSupport", trl: 8, nominalPowerKw: 0.8, priority: 1, spares: 2 },
    { id: "co2Scrubber", trl: 8, nominalPowerKw: 1.2, priority: 2, spares: 2 },
    { id: "thermalControl", trl: 8, nominalPowerKw: 2.5, priority: 3, spares: 1 },
    { id: "oxygenGenerator", trl: 7, nominalPowerKw: 2.0, priority: 4, spares: 1 },
    { id: "waterRecovery", trl: 7, nominalPowerKw: 0.9, priority: 5, spares: 1 },
    { id: "comms", trl: 9, nominalPowerKw: 0.5, priority: 6, spares: 1 },
    { id: "greenhouse", trl: 5, nominalPowerKw: 1.2, priority: 7, spares: 0 },
    { id: "moxie", trl: 4, nominalPowerKw: 0.3, priority: 8, spares: 0 },
  ],

  scripted: [
    { atHour: 200, hazard: "dustStorm", durationHours: 60, magnitude: 0.7 },
    { atHour: 300, hazard: "pumpFailure", durationHours: 1 },
    { atHour: 420, hazard: "solarParticleEvent", durationHours: 18, magnitude: 0.6 },
    { atHour: 500, hazard: "cropBlight", durationHours: 1, magnitude: 0.5 },
  ],

  briefingKey: "scenario.jezero.briefing",
};

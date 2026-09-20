/**
 * "The Long Night" — the answer to what First Light proves is nearly impossible without it:
 * a fission reactor, run across three full lunar synodic cycles (3 x 708 h = 2124 h, about
 * 88.5 Earth days).
 *
 * No solar array at all — the reactor is the whole answer, not a backup to it. NASA-FSP's
 * real numbers (40 kWe, 10-year design life, no more than 6000 kg) comfortably cover this
 * outpost's ~9 kW peak load with margin, so the day/night cycle stops being a power problem.
 * What replaces it as the challenge: three lunar nights' worth of accumulated risk in one
 * run — repeated solar particle events, stochastic system failures with a long mission to
 * exhaust spares over, and (long enough now for it to matter) crop cycles that actually have
 * time to complete. Wheat's 64-86 day cycle fits inside 88.5 days; potato and soybean's
 * 90-105 day cycles do not, on purpose — a mission long enough to grow some things and not
 * others is a real planning constraint, not an oversight.
 */
import type { Scenario } from "../../types.js";

export const theLongNight: Scenario = {
  id: "the-long-night",
  body: "moon",
  site: { name: "Shackleton Ridge", latDeg: -88.5, lonDeg: 129.0 },
  durationHours: 2124,
  crewSize: 4,

  initial: {
    o2Kg: 56,
    co2Kg: 0.5,
    potableWaterKg: 1400,
    // 4 crew x 0.62 kg/CM-day x ~88.5 days needs 219.5 kg at bare minimum before the
    // greenhouse's own modest 4+6 m^2 of trays contribute anything — 450 kg gives the same
    // margin over that floor Jezero gives over its own 30-sol minimum.
    foodDryMassKg: 450,
    // A modest buffer for load transients, not a survival reserve — the reactor is the
    // baseload, so this bank never has to carry the outpost through a full night alone.
    batteryEnergyKwh: 60,
    batteryCapacityKwh: 80,
    habitatVolumeM3: 200,
    solarArrayAreaM2: 0,
    fissionReactorKwe: 40,
    shieldingGPerCm2: 10,
    cropTrays: [
      { crop: "lettuce", areaM2: 4 },
      { crop: "wheat", areaM2: 6 },
    ],
  },

  systems: [
    { id: "powerDistribution", trl: 9, nominalPowerKw: 0.1, priority: 0, spares: 2 },
    { id: "lifeSupport", trl: 8, nominalPowerKw: 0.8, priority: 1, spares: 2 },
    { id: "co2Scrubber", trl: 8, nominalPowerKw: 1.2, priority: 2, spares: 2 },
    // 8 kW, not Jezero's 2.5: holding nominal 22 degC against the Moon's -178 degC night
    // needs 0.035 kW/K x 200 K =~ 7 kW of heater alone (Jezero's Mars night never gets
    // remotely that cold). The 40 kWe reactor has room to spare for it — that headroom is
    // the whole point of bringing one.
    { id: "thermalControl", trl: 8, nominalPowerKw: 8.0, priority: 3, spares: 2 },
    { id: "oxygenGenerator", trl: 7, nominalPowerKw: 2.0, priority: 4, spares: 2 },
    { id: "waterRecovery", trl: 7, nominalPowerKw: 0.9, priority: 5, spares: 2 },
    { id: "comms", trl: 9, nominalPowerKw: 0.5, priority: 6, spares: 1 },
    { id: "greenhouse", trl: 5, nominalPowerKw: 1.2, priority: 7, spares: 1 },
  ],

  scripted: [
    { atHour: 150, hazard: "solarParticleEvent", durationHours: 18, magnitude: 0.5 },
    { atHour: 900, hazard: "pumpFailure", durationHours: 1 },
    { atHour: 1400, hazard: "cropBlight", durationHours: 1, magnitude: 0.4 },
    { atHour: 1800, hazard: "solarParticleEvent", durationHours: 24, magnitude: 0.7 },
  ],

  briefingKey: "scenario.theLongNight.briefing",
};

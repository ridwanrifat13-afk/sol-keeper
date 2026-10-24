/**
 * M9.3 — Crisis Scenario: August 1972 Solar Particle Event (SPE-1972)
 *
 * Sourced from HRP-ARS (NASA Human Research Program Human Health and Disease in Space),
 * AGU-KNIPP-2018, CE4-LND-2020, and NASA-TP-3643.
 *
 * On August 4, 1972, between the Apollo 16 and Apollo 17 missions, the Sun unleashed
 * one of the largest solar particle events ever recorded in the space age.
 * An active region fired a series of coronal mass ejections that delivered massive
 * proton flux to the Moon. In translunar space or on the lunar surface, unshielded
 * astronauts would have absorbed lethal acute doses exceeding 400 rem (4,000 mSv).
 */
import type { SimState } from "../../types.js";
import type { CrisisScenario } from "../crisisScenario.js";

export const crisisSpe1972: CrisisScenario = {
  id: "crisis-spe-1972",
  body: "moon",
  site: { name: "Descartes Highlands / Apollo Outpost", latDeg: -8.97, lonDeg: 15.5 },
  primaryGoal: {
    id: "surviveFullDurationNoLoss",
    briefKey: "crisis.spe1972.goal.primary",
  },
  stretchGoal: {
    id: "noSystemLeftFailed",
    briefKey: "crisis.spe1972.goal.stretch",
  },
  scienceTargetPoints: 0,
  durationHours: 6,
  crisisMaxDurationHours: 12,
  crewSize: 3,

  initial: {
    o2Kg: 80,
    co2Kg: 0.05,
    potableWaterKg: 300,
    foodDryMassKg: 50,
    batteryEnergyKwh: 120,
    batteryCapacityKwh: 140,
    habitatVolumeM3: 45,
    solarArrayAreaM2: 25,
    fissionReactorKwe: 10, // 10 kWe reactor power ensures heater functions through lunar night [NASA-FSP]
    shieldingGPerCm2: 20, // Moon habitat regolith shielding base [HRP-ARS]
    cropTrays: [],
  },

  systems: [
    { id: "lifeSupport", trl: 9, nominalPowerKw: 0.5, priority: 0, spares: 1 },
    { id: "powerDistribution", trl: 9, nominalPowerKw: 0.3, priority: 1, spares: 1 },
    { id: "thermalControl", trl: 8, nominalPowerKw: 7.5, priority: 2, spares: 1 }, // 7.5 kW heater matches Moon cold loss
    { id: "comms", trl: 9, nominalPowerKw: 0.2, priority: 3, spares: 1 },
  ],

  scripted: [],

  briefingKey: "crisis.spe1972.briefing",
  crisisOnsetDescription: "crisis.spe1972.onset",

  availableMaterials: [
    "regolith storm shelter",
    "water wall bladder",
    "emergency dosimeter kit",
    "backup radio transceiver",
  ],

  entryState: {
    hour: 0,
    radiation: {
      ambientMSvPerDay: 1.5,
      shieldingGPerCm2: 20,
      solarParticleEventActive: true,
    },
    crew: [
      {
        id: "cdr",
        name: "Commander",
        location: "eva",
        healthFraction: 1,
        moraleFraction: 0.9,
        cumulativeDoseMSv: 0,
        eventDoseMSv: 0,
        bodyTempC: 37,
        alive: true,
        hydrationClock: 0,
        starvationClock: 0,
        hypothermiaClock: 0,
        hypoxiaClock: 0,
        heatStressClock: 0,
        pio2MmHg: 160,
        fatigueFraction: 0.1,
        injuryFraction: 0,
        primaryStation: "incidentCommand",
        backupStation: "power",
      },
      {
        id: "lmp",
        name: "Lunar Module Pilot",
        location: "eva",
        healthFraction: 1,
        moraleFraction: 0.9,
        cumulativeDoseMSv: 0,
        eventDoseMSv: 0,
        bodyTempC: 37,
        alive: true,
        hydrationClock: 0,
        starvationClock: 0,
        hypothermiaClock: 0,
        hypoxiaClock: 0,
        heatStressClock: 0,
        pio2MmHg: 160,
        fatigueFraction: 0.1,
        injuryFraction: 0,
        primaryStation: "lifeSupport",
        backupStation: "comms",
      },
      {
        id: "cmp",
        name: "Command Module Pilot",
        location: "habitat",
        healthFraction: 1,
        moraleFraction: 0.95,
        cumulativeDoseMSv: 0,
        eventDoseMSv: 0,
        bodyTempC: 37,
        alive: true,
        hydrationClock: 0,
        starvationClock: 0,
        hypothermiaClock: 0,
        hypoxiaClock: 0,
        heatStressClock: 0,
        pio2MmHg: 160,
        fatigueFraction: 0.05,
        injuryFraction: 0,
        primaryStation: "comms",
        backupStation: "incidentCommand",
      },
    ],
    systems: {
      thermalControl: {
        id: "thermalControl",
        trl: 8,
        nominalPowerKw: 7.5,
        priority: 2,
        operational: true,
        spares: 1,
        poweredThisHour: true,
        efficiencyPenaltyFraction: 0,
        maintenanceCreditUntilHour: 0,
      },
    },
    activeIncidents: [
      {
        id: "spe-1972",
        definitionId: "spe-1972",
        triggeredAtHour: 0,
        cause: "hazard.solarParticleEvent.start",
        detectedAtHour: 0,
      },
    ],
  },

  historicalOutcome: {
    summary: "crisis.spe1972.outcome.summary",
    keyMetric: {
      label: "Crew Peak Acute Dose",
      historicalValue: 250, // NASA 30-day acute limit in mSv [OCHMO-RAD]
      unit: "mSv",
      playerValue: (state: SimState) => {
        const doses = state.crew.map((c) => c.cumulativeDoseMSv);
        const maxDose = Math.max(0, ...doses);
        return Math.round(maxDose * 10) / 10;
      },
    },
    resolution: "crisis.spe1972.outcome.resolution",
    sourceId: "HRP-ARS",
    nasaLink: "https://ntrs.nasa.gov/citations/19970022985",
  },
};

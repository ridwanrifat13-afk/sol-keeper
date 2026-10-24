/**
 * M9.3 — Crisis Scenario: Apollo 13 CO2 Buildup (1970)
 *
 * Sourced from A13-CO2 (Apollo 13 Mission Report / Accident Review Board)
 * and OCHMO-TB-004.
 *
 * The Command Module's oxygen tank 2 ruptured at ~56 hours elapsed mission time.
 * The crew evacuated to the Lunar Module "Aquarius" as a lifeboat. Sized for 2 crew
 * for ~2 days, Aquarius now supported 3 crew on a ~4-day return trajectory.
 * The square Command Module LiOH canisters were incompatible with the LM's round
 * receptacles, causing carbon dioxide to rise steadily toward toxic levels.
 */
import type { SimState } from "../../types.js";
import type { CrisisScenario } from "../crisisScenario.js";
import { incidents as incidentConstants } from "../constants.js";

export const crisisApollo13Co2: CrisisScenario = {
  id: "crisis-apollo13-co2",
  body: "moon",
  site: { name: "Translunar Return Trajectory", latDeg: 0, lonDeg: 0 },
  primaryGoal: {
    id: "surviveFullDurationNoLoss",
    briefKey: "crisis.apollo13.goal.primary",
  },
  stretchGoal: {
    id: "noSystemLeftFailed",
    briefKey: "crisis.apollo13.goal.stretch",
  },
  scienceTargetPoints: 0,
  // Nominal scenario play duration (~4 hours to implement fix; 36 hours maximum before lethal failure)
  durationHours: 4,
  crisisMaxDurationHours: 36,
  crewSize: 3,

  initial: {
    o2Kg: 18,
    co2Kg: 0.061, // ~3.8 mmHg at 22 deg C in 6.7 m^3
    potableWaterKg: 100,
    foodDryMassKg: 15,
    batteryEnergyKwh: 40,
    batteryCapacityKwh: 50,
    habitatVolumeM3: 6.7, // Lunar Module ascent stage cabin volume [A13-CO2]
    solarArrayAreaM2: 0,
    fissionReactorKwe: 0,
    shieldingGPerCm2: 5,
    cropTrays: [],
  },

  systems: [
    // co2Scrubber carry 1 spare representing the available improvised adapter kit materials
    { id: "co2Scrubber", trl: 8, nominalPowerKw: 0.1, priority: 0, spares: 1 },
    { id: "lifeSupport", trl: 8, nominalPowerKw: 0.2, priority: 1, spares: 0 },
    { id: "powerDistribution", trl: 9, nominalPowerKw: 0.1, priority: 2, spares: 0 },
    { id: "thermalControl", trl: 8, nominalPowerKw: 0.3, priority: 3, spares: 0 },
    { id: "comms", trl: 9, nominalPowerKw: 0.1, priority: 4, spares: 0 },
  ],

  scripted: [],

  briefingKey: "crisis.apollo13.briefing",
  crisisOnsetDescription: "crisis.apollo13.onset",

  availableMaterials: [
    "hose from pressure suit",
    "plastic bags",
    "cardboard flight plan covers",
    "duct tape",
    "sock",
  ],

  entryState: {
    hour: 0,
    atmosphere: {
      o2Kg: 18,
      co2Kg: 0.061,
      habitatVolumeM3: 6.7,
      o2PartialPressureMmHg: 258, // 5.0 psia pure O2 LM cabin atmosphere [A13-CO2]
      co2PartialPressureMmHg: 3.8, // Onset ppCO2 [A13-CO2]
      scrubberEfficiencyFraction: 2 / 3, // Two-crew rated capacity for three crew [A13-CO2]
      co2ScrubberMode: "full",
      cumulativeCo2ExposureAboveLimitMmHgHours: 0,
      chronicCo2PenaltyApplied: false,
    },
    activeIncidents: [
      {
        id: "o2tank-apollo13",
        definitionId: "o2tank-apollo13",
        triggeredAtHour: 0,
        cause: "hazard.componentRisk",
        detectedAtHour: 0,
      },
    ],
  },

  historicalOutcome: {
    summary: "crisis.apollo13.outcome.summary",
    keyMetric: {
      label: "Peak Cabin ppCO2",
      historicalValue: incidentConstants.apollo13PeakCo2MmHg.value, // 15 mmHg
      unit: "mmHg",
      playerValue: (state: SimState) => {
        const incident = state.activeIncidents.find((i) => i.definitionId === "o2tank-apollo13");
        if (incident?.resolvedAtHour !== undefined) {
          const ratePerHour =
            incidentConstants.apollo13PeakCo2MmHg.value / incidentConstants.apollo13HoursToPeakCo2.value;
          const peakMmHg = 3.8 + ratePerHour * (incident.resolvedAtHour - incident.triggeredAtHour);
          return Math.round(peakMmHg * 10) / 10;
        }
        return Math.round(state.atmosphere.co2PartialPressureMmHg * 10) / 10;
      },
    },
    resolution: "crisis.apollo13.outcome.resolution",
    sourceId: "A13-CO2",
    nasaLink: "https://history.nasa.gov/alsj/a13/a13.co2-adapter.html",
  },
};

/**
 * "First Light" — a small outpost's first lunar night.
 *
 * Solar-only, deliberately: the Moon has no atmosphere, so its arrays out-produce Mars's by
 * a wide margin in daylight (no dust, no distance penalty — full 1361 W/m^2), but for
 * `lunarNightHours` (354 h, CE4-LND-2020's home body) there is exactly zero solar input,
 * nothing in between. That is the one lesson this scenario exists to teach, so the mission
 * duration (750 h) is sized to run past a full day-night-day cycle: the crew sees the sun
 * set, survives the dark on batteries and rationing, and sees it rise again — first light.
 *
 * No MOXIE: it is a Mars ISRU experiment that consumes the Martian CO2 atmosphere, which the
 * Moon does not have. No dust storms: the Moon has no atmosphere to carry dust in. Both would
 * be invented physics for this body, not a simplification of real physics (brief rule 1).
 */
import type { Scenario } from "../../types.js";

export const firstLight: Scenario = {
  id: "first-light",
  body: "moon",
  site: { name: "Shackleton Ridge", latDeg: -88.5, lonDeg: 129.0 },
  primaryGoal: { id: "surviveFullDurationNoLoss", briefKey: "scenario.firstLight.goal.primary" },
  stretchGoal: { id: "noSystemLeftFailed", briefKey: "scenario.firstLight.goal.stretch" },
  // Science still accrues here (harvest, comms uptime — no MOXIE on the Moon), it just isn't
  // this scenario's own win condition.
  scienceTargetPoints: 0,
  durationHours: 750,
  crewSize: 2,

  initial: {
    o2Kg: 34,
    co2Kg: 0.3,
    potableWaterKg: 800,
    foodDryMassKg: 80,
    // Sized against real physics, not guessed, and checked against a real constraint the
    // power-priority stage has: shedding is reactive, not anticipatory — it only sheds a
    // system once this hour's available energy can't cover it, so a battery that could only
    // cover the *critical* path across the whole night still gets drained by low-priority
    // systems (oxygen generator, water recovery, comms, greenhouse) early on, before those
    // ever get shed, leaving too little for the critical path later. The only capacity that
    // is actually safe against a passive playthrough is one that covers *full* demand
    // (10.5 kW) for the entire 354 h night: 3717 kWh, or 4646 kWh at 80% depth of discharge.
    // This is why the bank is 5000 kWh, not Jezero's 200 — a lunar night is a fundamentally
    // bigger energy problem than a 60 h Mars dust storm, verified by actually playing both
    // scenarios through rather than trusting the arithmetic alone (see ARCHITECTURE.md).
    batteryEnergyKwh: 4500,
    batteryCapacityKwh: 5000,
    habitatVolumeM3: 120,
    // Airless daylight is far more productive than Mars's (full 1361 W/m^2, no dust, no
    // distance penalty), but the daytime heater and life-support draw is real too, and the
    // 3200 kWh bank above needs a full day's surplus to recharge before the next 354 h of
    // darkness — the night, not the day, is where this scenario's difficulty lives.
    solarArrayAreaM2: 100,
    fissionReactorKwe: 0,
    shieldingGPerCm2: 8,
    cropTrays: [{ crop: "lettuce", areaM2: 3 }],
  },

  systems: [
    { id: "powerDistribution", trl: 9, nominalPowerKw: 0.1, priority: 0, spares: 2 },
    { id: "lifeSupport", trl: 8, nominalPowerKw: 0.4, priority: 1, spares: 2 },
    { id: "co2Scrubber", trl: 8, nominalPowerKw: 0.6, priority: 2, spares: 1 },
    // spares: 1, deliberately less than patchHull's declared sparesCost: 2 (M7.8 Part C.6,
    // reversing an M7.7 change; docs/M7.8_DIAGNOSIS.md has the data). M7.7 bumped this to 2 to
    // make patchHull reliably affordable, reasoning an improvised gamble shouldn't be the only
    // option; measured afterward, that wasn't the real problem — even fully funded, patchHull
    // (6 crew-hours) is a genuinely worse choice than sealModule (2 crew-hours, the permanent
    // ~50% solar-array loss, NASA-SMA-MIR-COLLISION) against depress-mir97's own fast kill
    // clock: greedyBot, which always takes sealModule, already clears idleBot's floor by a
    // wide margin here (26.7-53.3% vs 0-20%) via the existing automatic load-shedding alone —
    // sealModule needs no new survivability mechanic. Only 1 spare keeps First Light forcing
    // the brief's intended "spend real resources you don't have, or accept the permanent loss"
    // choice (Station rules); The Long Night keeps 2, so at least one scenario still lets a
    // well-stocked crew afford patchHull outright.
    { id: "thermalControl", trl: 8, nominalPowerKw: 7.0, priority: 3, spares: 1 },
    { id: "oxygenGenerator", trl: 7, nominalPowerKw: 1.0, priority: 4, spares: 1 },
    { id: "waterRecovery", trl: 7, nominalPowerKw: 0.5, priority: 5, spares: 1 },
    { id: "comms", trl: 9, nominalPowerKw: 0.3, priority: 6, spares: 1 },
    { id: "greenhouse", trl: 5, nominalPowerKw: 0.6, priority: 7, spares: 0 },
  ],

  scripted: [
    // Early, while there is still full daylight power to shelter through it — an SPE is a
    // body-agnostic hazard (the Moon has no magnetosphere either, so if anything it is more
    // exposed than Mars, not less).
    { atHour: 100, hazard: "solarParticleEvent", durationHours: 18, magnitude: 0.5 },
    // Deep into the 354 h night (which runs roughly 354-708 h here), at the worst possible
    // time for anything to break.
    { atHour: 500, hazard: "pumpFailure", durationHours: 1 },
  ],

  briefingKey: "scenario.firstLight.briefing",
};

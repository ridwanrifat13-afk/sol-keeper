import type { ScenarioId } from "@sol-keeper/sim";

export interface MissionGuide {
  readonly title: string;
  readonly tagline: string;
  readonly paragraphs: readonly string[];
}

/**
 * Player request: "create guides for each mission ... for respective selected missions."
 * Every hour/duration/magnitude/spares figure below is read straight off the scenario's own
 * definition (packages/sim/src/data/scenarios/*.ts) — this is strategy prose grounded in what
 * the sim actually schedules and enforces, not invented tips. Plain English only (this is new,
 * supplementary content outside the five i18n tables validation/i18nCompleteness.test.ts
 * tracks — decisionText/logText/onboardingText/goalText/gaugeHelp — the same scope limit
 * several other new panels shipped tonight already use for their own plain-English copy).
 */
export const MISSION_GUIDES: Record<ScenarioId, MissionGuide> = {
  "jezero-outpost": {
    title: "Jezero Outpost",
    tagline: "Mars · 30 sols · solar power and a real dust storm",
    paragraphs: [
      "Jezero runs entirely on solar arrays and a 200 kWh battery — no reactor backup. The mission's whole lesson arrives at hour 200: a 60-hour dust storm cuts your array output for over two days straight. Build battery margin before then, and know your power-priority order cold, because the sim sheds load reactively, not ahead of time — it won't protect a system you forgot to rank.",
      "Three more scripted events follow: a pump failure around hour 300, an 18-hour solar particle event at hour 420 (get crew to the storm shelter), and a crop blight near hour 500. thermalControl only carries 1 spare here, so a hull-breach incident forces a real choice between the cheap-but-permanent fix (sealModule) and the costly-but-lossless one (patchHull) — you can't casually afford both paths.",
      "The primary goal wants science returned, dose within limits, and everyone alive; the stretch goal is harvesting both crop trays. MOXIE and the greenhouse sit at the bottom of the power-priority list on purpose — they're the first things you'll have to shed, and the crop trays only accumulate growth hours while actually lit, so a long blackout shows up as a missed harvest weeks later.",
    ],
  },
  "first-light": {
    title: "First Light",
    tagline: "Moon · 2 crew · one full 354-hour lunar night",
    paragraphs: [
      "First Light is one long argument for battery sizing. The Moon's daylight is far more productive than Mars's (no dust, no distance penalty), but for 354 straight hours there is exactly zero solar input — nothing in between. The 5000 kWh bank exists to carry full demand through the entire night; anything you let low-priority systems drain early (oxygen generator, water recovery, comms, greenhouse) is capacity the critical path won't have later, since shedding only happens once this hour's power genuinely can't cover it.",
      "Only 2 crew means every station assignment matters — there's no spare hands for double-covering without leaving something else thin. An 18-hour solar particle event hits early, at hour 100, while there's still daylight power to shelter through comfortably; a pump failure hits at hour 500, deep in the night, at the worst possible time. thermalControl carries only 1 spare, so that failure forces the same permanent-loss-vs-costly-repair choice Jezero's dust storm does, except now with a drained battery watching.",
      "No MOXIE and no dust storms here — the Moon has no CO2 atmosphere to consume and no atmosphere at all to carry dust. The goal is survival with no loss across the full duration; the stretch goal is finishing with no system left in a failed state. Conserve aggressively as the night approaches — this mission is won or lost well before hour 354.",
    ],
  },
  "the-long-night": {
    title: "The Long Night",
    tagline: "Moon · 4 crew · three lunar nights, reactor-powered",
    paragraphs: [
      "The Long Night answers what First Light proves is nearly impossible without it: a real 40 kWe fission reactor (NASA-FSP's own numbers), run across three full lunar synodic cycles — about 88.5 Earth days. No solar array at all; the reactor comfortably covers the ~9 kW peak load, including the roughly 7 kW of heating the Moon's -178°C night alone demands. Day/night stops being the problem here.",
      "What replaces it is accumulated risk over a much longer mission. Four scripted events are spread across the full run: a solar particle event at hour 150, a pump failure at hour 900, a crop blight near hour 1400, and a second, larger 24-hour solar particle event at hour 1800. thermalControl carries 3 spares — enough to actually afford the clean patchHull fix once and still have a spare left for an ordinary repair later, a margin neither other mission gives you.",
      "Crew radiation dose accumulates across all three nights, so a shelter decision on the first solar particle event still matters by the third. The crop mix (lettuce and wheat) is chosen because wheat's 64-86 day cycle fits inside the mission; potato and soybean's 90-105 day cycles deliberately would not have. Same goal shape as First Light — survive the full duration with no loss, and finish with nothing left broken.",
    ],
  },
};

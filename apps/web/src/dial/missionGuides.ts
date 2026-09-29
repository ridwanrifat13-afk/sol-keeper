import type { ScenarioId } from "@sol-keeper/sim";

export interface MissionGuide {
  readonly title: string;
  readonly tagline: string;
  readonly paragraphs: readonly string[];
  /** An ordered, plain-language walkthrough of how to actually run this mission — written
   *  for someone with no space or engineering background, not a strategy summary for someone
   *  who's already played. */
  readonly steps: readonly string[];
  /** Every real way this specific mission can end badly — the scripted hazards this scenario
   *  schedules, plus the general lethal/mission-ending mechanics every mission shares
   *  (packages/sim's own engine/outcome.ts), reworded in plain terms. */
  readonly failureModes: readonly string[];
}

export interface GuideControl {
  readonly name: string;
  readonly where: string;
  readonly effect: string;
}

/**
 * Player request: "update the mission guides including how to lead a mission to success step
 * by step... what can fail a mission, what to toggle for what (even a non science user can
 * easily understand how to run the mission)."
 *
 * Every hour/duration/magnitude/spares figure below is read straight off the scenario's own
 * definition (packages/sim/src/data/scenarios/*.ts) or the engine's own real mechanics
 * (engine/outcome.ts's determineOutcome/requestAbort, models/crew.ts's lethal clocks) — this
 * is strategy and reference prose grounded in what the sim actually schedules and enforces,
 * not invented tips. Plain English only (new, supplementary content outside the five i18n
 * tables validation/i18nCompleteness.test.ts tracks — decisionText/logText/onboardingText/
 * goalText/gaugeHelp — the same scope limit several other new panels already use for their
 * own plain-English copy).
 *
 * `CONTROLS_REFERENCE` is deliberately scenario-independent and shown once, not duplicated
 * per mission in `MISSION_GUIDES` — every one of these controls exists, means the same thing,
 * and lives on the same console in all three missions; only how much it matters changes,
 * which is exactly what each mission's own `steps`/`failureModes` already say. One list this
 * project can keep accurate as controls change, not three copies that can quietly drift.
 */
export const CONTROLS_REFERENCE: readonly GuideControl[] = [
  {
    name: "Rations (Nominal / Reduced / Survival)",
    where: "Life Support, locked to Sol Planning",
    effect:
      "Eating and drinking less stretches your food and water further, but it costs crew morale and lets the cabin run colder. A real trade, not a free saving — use it when you're actually running short, not by default.",
  },
  {
    name: "Air cleaner / CO2 scrubber (Full scrub / Balanced / Ease off for crops)",
    where: "Life Support, locked to Sol Planning",
    effect:
      "Running it below full lets cabin CO2 climb — a documented, real boost to how fast your crops grow if you keep it under control, but a real risk of crossing your current rations mode's own CO2 limit if you forget about it.",
  },
  {
    name: "Water reclamation (Standard / Brine Processor Assembly)",
    where: "Life Support, locked to Sol Planning",
    effect:
      "The Brine Processor Assembly recovers far more water from the loop — real ISS hardware — at the cost of a recurring daily bite out of your crew-hours budget, the same pool repairs and incident responses draw from.",
  },
  {
    name: "Heating & cooling (Comfort / Power-save)",
    where: "Life Support, locked to Sol Planning",
    effect:
      "Power-save trims the heater/cooler to free up electricity for everything else, at the cost of a cabin that drifts away from your rations mode's own comfort temperature — felt as real cold (or heat) hours, checked to never freeze the cabin outright.",
  },
  {
    name: "Power priority list",
    where: "Power, locked to Sol Planning",
    effect:
      "When demand outruns what you can generate and store, whatever sits at the bottom of this list goes dark first. Put whatever you can't afford to lose — life support, the CO2 scrubber — near the top, and put anything you can live without (a crop tray, MOXIE) near the bottom on purpose.",
  },
  {
    name: "Clean solar arrays (Mars missions only)",
    where: "Power, locked to Sol Planning",
    effect:
      "Dust settles on the arrays every sol whether or not a storm hits. Spends real crew-hours and a real radiation dose from the EVA, but clears the array back to its best output — a routine chore worth doing on a quiet sol, not just after a storm.",
  },
  {
    name: "Downlink priority (Personal correspondence / Science downlink)",
    where: "Comms, locked to Sol Planning",
    effect: "A real trade between crew morale (personal messages home) and mission science points (the downlink). Neither is free.",
  },
  {
    name: "Crew location (habitat / storm shelter / EVA)",
    where: "Incident Command",
    effect:
      "Move a crew member to the storm shelter before or during a solar particle event to shield them from real radiation dose; send someone on EVA when a response (like cleaning the arrays) actually needs it, knowing EVA itself costs a real dose.",
  },
  {
    name: "Crew station assignment",
    where: "Mission Command",
    effect:
      "Which of the five stations (Power, Life Support, Comms, Incident Command, Mission Command) each crew member covers. A station nobody covers still gets an emergency response from whoever's free, just a weaker one — leaving one thin is a real, felt risk, not just a cosmetic choice.",
  },
  {
    name: "Authorize overtime (Standard hours / Authorize overtime)",
    where: "Mission Command",
    effect:
      "Raises today's crew-hours ceiling for extra incident response or repairs — but any hours actually worked past the normal budget cost the whole crew real fatigue once the sol ends. Free if you authorize it and don't end up needing the extra hours.",
  },
  {
    name: "Incident responses (the Decision Card)",
    where: "Wherever an incident's Decision Card appears",
    effect:
      "When something breaks, you choose how to fix it. Every option shown is real and has a real, disclosed cost — crew-hours, spare parts, or a permanent efficiency penalty if you use the cheap fix. Read the mechanism line before picking; the cheapest option is rarely free of a lasting cost.",
  },
];

/** The five choices made once, before a mission starts (the Setup wizard) — not a mid-mission
 *  toggle, but still a real answer to "what do I set, and what does it actually do." */
export const SETUP_CONTROLS_REFERENCE: readonly GuideControl[] = [
  {
    name: "Difficulty (Training / Nominal / Flight-rated)",
    where: "Setup",
    effect:
      "Scales how often incidents and random system failures happen, and how much warning you get before one hits. It never touches a physics constant — crew, radiation, food, water, and thermal behave identically at every difficulty.",
  },
  {
    name: "Crew size (2-6)",
    where: "Setup",
    effect:
      "More crew means more stations properly covered and a bigger daily crew-hours budget, but also more mouths to feed and water. A crew smaller than 5 leaves at least one station unstaffed from the start.",
  },
  {
    name: "Landing site",
    where: "Setup",
    effect:
      "A real trade in radiation, ice access, terrain difficulty, and sunlight — shown with a confidence badge per figure, since a few of these numbers are the best available estimate rather than a directly measured one.",
  },
  {
    name: "Power architecture (Solar + battery / Fission / Hybrid)",
    where: "Setup",
    effect:
      "How you generate and store power, sized to your own chosen crew size and site. A reactor removes most of the day/night power problem outright, at a real mass cost at launch.",
  },
  {
    name: "Shielding approach (Hull only / Water wall / Regolith berm)",
    where: "Setup",
    effect:
      "Water wall adds real radiation shielding by launching extra water mass; a regolith berm adds more shielding for free launched mass, funded instead by real pre-mission crew-hours. Hull only is the free default with the least protection.",
  },
];

export const MISSION_GUIDES: Record<ScenarioId, MissionGuide> = {
  "jezero-outpost": {
    title: "Jezero Outpost",
    tagline: "Mars · 30 sols · solar power and a real dust storm",
    paragraphs: [
      "Jezero runs entirely on solar arrays and a 200 kWh battery — no reactor backup. The mission's whole lesson arrives at hour 200: a 60-hour dust storm cuts your array output for over two days straight. The sim sheds load reactively, not ahead of time — it won't protect a system you forgot to rank, so the work has to happen before the storm, not during it.",
      "Quiet sols aren't idle waiting either. Five dials in Sol Planning keep working the whole mission through — rations, the CO2 scrubber, water reclamation, thermal control, and crew overtime — each a real trade against something else the mission needs, covered in the controls reference below.",
    ],
    steps: [
      "Setup: pick your crew size and power/shielding before you launch. Since Jezero has no reactor, extra battery margin (a bigger solar-battery sizing) matters more here than on either Moon mission — you're carrying your own night-time and storm-time power the whole way.",
      "Every sol, before clicking \"Run the sol\": check all five resource gauges (oxygen, CO2, water, food, battery). If any gauge already reads Caution, fix it now — adjust rations, the scrubber, or the power priority list — rather than hoping it holds through the sol.",
      "Set your power priority list early and keep it honest: put life support and the CO2 scrubber near the top, and put the greenhouse and MOXIE (both optional for survival) near the bottom on purpose, so a shortfall sheds the things you can actually afford to lose.",
      "By around hour 150, start building battery margin — charge headroom, not a full tank you immediately draw down. At hour 200 a 60-hour dust storm begins; whatever margin you haven't built by then, you won't get a second chance to build during it.",
      "When the dust storm hits (hour 200-260), expect your solar output to stay low the whole time. Ride it out on the priority list and battery margin you already set — this is the sol where a poorly-ordered list actually costs you a system.",
      "Around hour 300, a pump-related failure can strike a system with only one spare part in reserve. When its Decision Card appears, read the mechanism line on each option: one fix is cheap but leaves a permanent efficiency penalty, the other costs more crew-hours but leaves no lasting damage. You can't casually afford both paths on this mission, so choose deliberately.",
      "Around hour 420, an 18-hour solar particle event arrives. Move every crew member to the storm shelter as soon as it starts (Incident Command) — staying in the open habitat during it adds real, avoidable radiation dose.",
      "Around hour 500, a crop blight can hit. If you're chasing the stretch goal (harvest both crop trays), a hit here late in a 30-sol run is expensive to recover from — a healthy CO2-boosted grow cycle beforehand gives you more buffer.",
      "In the final few sols, check your actual standing against the primary goal (science returned, dose within limits, everyone alive) — nothing warns you automatically that you're falling short before the 30-sol clock runs out.",
    ],
    failureModes: [
      "Crew death from thirst, hunger, cold, or lack of oxygen — any resource gauge that's allowed to run out for long enough. This is the “loss” outcome: it ends the mission the moment every crew member is gone.",
      "Cumulative radiation dose crossing the 600 mSv career limit for any one crew member — a mission-ending failure the instant it's crossed, even if that person is still alive and everyone else is fine.",
      "The 30-sol clock running out without the primary goal met — not a death, but a “partial” outcome, not the success you're playing for.",
      "Losing power to life support or the CO2 scrubber during the dust storm, if the priority list wasn't set correctly or the battery wasn't charged going in.",
      "Letting the pump-failure Decision Card's warning window pass without a response — the sim applies a default outcome once the window closes, which is rarely the one you'd have chosen.",
      "You can call off the mission yourself (abort) at any time, but on Mars it's only actually allowed during the same real low-fuel departure window Mars missions use — attempting it outside that window is rejected, not silently ignored.",
    ],
  },
  "first-light": {
    title: "First Light",
    tagline: "Moon · 2 crew · one full 354-hour lunar night",
    paragraphs: [
      "First Light is one long argument for battery sizing. The Moon's daylight is far more productive than Mars's (no dust, no distance penalty), but for 354 straight hours there is exactly zero solar input — nothing in between. The 5000 kWh bank exists to carry full demand through the entire night; anything you let low-priority systems drain early is capacity the critical path won't have later.",
      "Only 2 crew means every station assignment matters — there's no spare hands for double-covering without leaving something else thin. No MOXIE and no dust storms here — the Moon has no CO2 atmosphere to consume and no atmosphere at all to carry dust.",
    ],
    steps: [
      "Setup: with only 2 crew, at least three of the five stations will start unstaffed. There's no fixing that with a setup choice — plan on some stations only getting an ad hoc emergency response, and weigh that when picking difficulty.",
      "Conserve aggressively from the very first sol, not just as the night approaches. Every kWh a low-priority system (comms, the greenhouse, water recovery) draws during the day is capacity the battery won't have once the 354-hour night starts — shedding only happens once demand genuinely can't be met that hour, so nothing protects unused capacity for you.",
      "Set your power priority list before daylight runs out: oxygen generator, water recovery, and life support belong well above comms and the greenhouse for a mission this power-constrained.",
      "Around hour 100, an 18-hour solar particle event hits — while there's still daylight power to shelter through comfortably. Move crew to the storm shelter as soon as it starts; this is the easiest of this mission's hazards to handle cleanly.",
      "As the lunar night approaches, this is the one mission where the thermal control power-save dial carries real risk, not just a mild one — First Light's own heater capacity has very little spare margin on the coldest stretch of a 354-hour night. Use it cautiously, and prefer trimming other systems first.",
      "During the long night itself, watch the battery gauge closely every sol — it's the one number that tells you whether your pre-night conservation actually worked. A battery trending toward empty mid-night has no daylight coming to rescue it for a long time.",
      "Around hour 500 (deep in the night, the worst possible time for it), a pump-related failure can hit a system with only one spare part in reserve — the same permanent-loss-versus-costly-repair choice Jezero's own dust storm forces, except now with a drained battery watching. Decide in advance which path you'll take if it happens.",
      "The goal here is survival with no loss across the full 354 hours, plus finishing with no system left in a failed state for the stretch goal — there's no partial credit for \"mostly\" making it through the night.",
    ],
    failureModes: [
      "Crew death from thirst, hunger, cold, or lack of oxygen — with only 2 crew, losing even one is losing half your crew's own capacity to respond to whatever comes next.",
      "Cumulative radiation dose crossing the 600 mSv career limit for either crew member — ends the mission instantly, independent of the battery or the night.",
      "The battery running dry mid-night with real hours of darkness still left — the single most common way this specific mission goes wrong, and the one this whole guide's early steps exist to prevent.",
      "The pump-failure Decision Card's warning window passing unanswered during the night, when crew-hours and battery margin are both already thin.",
      "Reaching hour 354 with the mission clock still running but a system left in a failed state — survival alone clears the primary goal, but costs you the stretch goal.",
      "Calling off the mission (abort) is allowed at any time on the Moon, unlike Mars — but it costs a real added transit time (about six days) taken directly off the mission clock, so it's a real cost, not a free undo.",
    ],
  },
  "the-long-night": {
    title: "The Long Night",
    tagline: "Moon · 4 crew · three lunar nights, reactor-powered",
    paragraphs: [
      "The Long Night answers what First Light proves is nearly impossible without it: a real 40 kWe fission reactor, run across three full lunar synodic cycles — about 88.5 Earth days. No solar array at all; the reactor comfortably covers the ~9 kW peak load, including the roughly 7 kW of heating the Moon's -178°C night alone demands. Day/night stops being the problem here.",
      "What replaces it is accumulated risk over a much longer mission. Crew radiation dose builds across all three nights, so a shelter decision on the first solar particle event still matters by the third — this mission is won or lost on patience and consistency, not on a single dramatic moment.",
    ],
    steps: [
      "Setup: with 4 crew and a reactor doing the heavy lifting, this is the most forgiving of the three missions on power — spend your setup choices on radiation shielding and crop mix confidence instead of worrying about battery sizing.",
      "Because the reactor covers demand comfortably, the power-saving dials (thermal control's power-save mode, easing off the CO2 scrubber) matter less here than on the other two missions. Don't reach for them by default — there's little to gain and a real cost if you do.",
      "Treat every sol the same way from day one: this mission rewards consistency over 2124 hours, not a single good decision. Establish a stable rations mode and station assignment early and keep it rather than reacting sol to sol.",
      "Around hour 150, an 18-hour solar particle event hits. Shelter your crew — and remember this is only the first of two: the same real radiation dose from this event stays on each crew member's record for the rest of the mission.",
      "Around hour 900, a pump-related failure can strike — but here the affected system carries three spare parts in reserve, not one. That's real room to take the clean, no-permanent-penalty repair path both other missions can't always afford.",
      "Around hour 1400, a crop blight can hit either the lettuce or wheat tray. Wheat's own 64-86 day growth cycle is chosen to fit inside this mission; recovering from a blight late still costs real time you have less of than it looks like at hour 1400.",
      "Around hour 1800, a second, larger 24-hour solar particle event hits. By now your crew's cumulative dose already includes the first event — check every crew member's own dose gauge against the 600 mSv career limit before deciding how aggressively to keep operating outside the shelter during it.",
      "Across all three nights, keep checking cumulative dose, not just the current event — it's the slow, easy-to-ignore failure mode on a mission this long, not a single dramatic shortfall.",
      "The goal is the same shape as First Light: survive the full duration with no loss, and finish with nothing left broken for the stretch goal.",
    ],
    failureModes: [
      "Crew death from thirst, hunger, cold, or lack of oxygen — same real lethal clocks as every mission, just with far more real hours for a small mistake to compound over 2124 hours.",
      "Cumulative radiation dose crossing the 600 mSv career limit for any crew member — the mission's own single biggest real risk, since dose from all three solar particle events adds up on the same running total.",
      "The 2124-hour clock running out without the primary goal met, or with a system left in a failed state costing the stretch goal.",
      "Treating the reactor's power margin as an excuse to stop watching the gauges — power isn't this mission's constraint, but life support, food, and water still are.",
      "Letting either pump-failure or crop-blight Decision Card's warning window pass unanswered.",
      "Calling off the mission (abort) is allowed at any time on the Moon, at the same real cost as First Light — about six added days of transit time taken directly off the mission clock.",
    ],
  },
};

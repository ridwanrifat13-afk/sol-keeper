# PHASE 2 BRIEF — SOL KEEPER: from simulation to trainer
Read first: @docs/PROJECT_BRIEF.md, @CLAUDE.md, @docs/DATA_SOURCES.md, @docs/LANDING_SITES.md.
All earlier rules still apply (sourced constants only, determinism, no NASA logo,
accessibility, env-var key handling, stop after each milestone).
Today: 2026-09-22. Submission: 2026-09-27.

## Where we are (after M6)
- No onboarding: a first-time player meets seven tabs and a wall of gauges, with no goal.
- Bangla is partial: five screens and all three-depth event-log text are English-only.
- No mission setup: crew size, scenario and landing site are fixed; the Landing Site
  screen is a viewer, not a picker.
- No real-device testing (emulation + Lighthouse only).
- No source row is human-verified yet.
- THE CORE PROBLEM: this is a watched simulation, not a trainer. The mission always
  succeeds, the crew is never truly at risk, decisions rarely change the outcome, and it
  does not look or feel like a space mission.

## Phase 2 goal
A role-based trainer where the player's decisions decide success or failure, grounded in
real physics, understandable within 60 seconds, and shareable in a classroom.

## TERMINOLOGY (this changed — apply it everywhere, including existing code)
- REALITY DIAL DEPTH = Cadet / Specialist / Commander. Presentation only. Never touches
  the simulation. Unchanged from Phase 1.
- MISSION DIFFICULTY = Training / Nominal / Flight-Rated. Scenario parameters only
  (starting margins, incident frequency, warning time, hint level). Never touches physics.
  Rename the old difficulty presets accordingly; keep save/URL compatibility by mapping
  old names to new ones.
- STATIONS = the five mission roles below. This is the new information architecture.
Rename in code, UI strings (en + bn) and docs in one pass, and note it in CLAUDE.md.

## STATIONS (the core of Phase 2)
One person does not run a space mission. The outpost is operated through five stations.
The player is the outpost lead and moves between them; each station is staffed by a named
crew member whose condition affects it.

1. POWER — generation, battery state of charge, load priorities, reactor or array health,
   dust cleaning, brownout order, night/storm energy planning.
2. LIFE SUPPORT & RESOURCES — O2, CO2, water loop, food stores and crops, rations
   (survival modes), spares inventory, ISRU (MOXIE, ice runs).
3. COMMUNICATIONS — Mission Control traffic delayed by the real light-time, Live Sky
   space-weather alerts, conjunction and Earth-visibility windows, telemetry downlink,
   science data return.
4. INCIDENT COMMAND — active faults, repair scheduling, spare parts, EVA go/no-go, storm
   shelter calls, depressurization response, fire response.
5. MISSION COMMAND — crew assignment to stations and tasks, crew-hours, health and
   morale, mission goals, abort decisions, daily plan approval.

Station rules:
- Each station has its own console view, its own alert state, and its own decision queue.
  A station badge shows how many decisions are waiting; nothing critical is hidden behind
  a tab the player has not opened — critical alerts surface globally.
- CREW ↔ STATION: each crew member is qualified for a primary station and one backup.
  An impaired crew member makes their station slower (longer response time, reduced repair
  success). A lost crew member leaves their station unstaffed until Mission Command
  reassigns someone, and a crew member covering two stations suffers a fatigue penalty.
  This is how crew loss is felt in gameplay, not just in a message.
- Decisions ORIGINATE AT STATIONS, from real state changes: something needs to be toggled,
  rebalanced, checked or authorized. Examples: Power — "battery will not cover the shadow
  period, cut a load or run the reactor hotter"; Life Support — "CO2 rising, scrubber
  degraded, choose repair now or ration activity"; Comms — "solar particle event warning
  received, Mission Control's advice is 14 minutes behind"; Incident Command — "coolant
  leak, isolate the module or attempt a repair EVA"; Mission Command — "the botanist is
  critical, reassign or abort the science plan". No decision may be cosmetic: each option
  must change state in a way the Black Box can later trace.
- OPTIONAL, ASK FIRST: because stations are separable, a pass-and-play classroom mode
  where students take one station each is nearly free. Propose it in M9 planning; do not
  build it without approval.

## Design principles (non-negotiable)
1. PASSIVE PLAY MUST FAIL. Doing nothing loses; sensible play usually wins; greedy play
   sometimes wins. Enforced by automated balance tests.
2. Every failure is explainable: the Black Box shows why it happened, which station saw it
   first, and which decision could have prevented it.
3. Stakes come from physics, not arbitrary damage. Every threshold is a constant in
   constants.ts with a source or "placeholder", and is listed for the team to verify.
4. Difficulty changes scenario parameters, never physics. The Reality Dial changes
   presentation, never simulation.
5. Crew loss is real but humane: no gore, respectful wording, all crew-loss text and
   visuals in presentation/crewLoss.ts. Cadet depth: "<name> became too sick to continue.
   The mission had to end." Specialist/Commander: "<name> was lost." Always followed by the
   Black Box explanation, never a bare "Game Over". (Approved by the team.)
6. Player-paced: the simulation pauses for decisions; nothing important happens while the
   player cannot respond.
7. Determinism preserved: SIM_VERSION + scenario + setup + seed + input log = identical
   run. All new randomness uses the injected seeded RNG.
8. Every new string goes through i18n with en and bn keys; CI fails on missing keys.
9. Performance: 30+ FPS on a low-end Android phone (2–3 GB RAM), a low-power mode, and
   prefers-reduced-motion honored.
10. NO SILENT SCOPE CUTS. The deadline is 2026-09-27 and the team has accepted no
    compromise on scope. If a milestone looks like it will not fit, STOP and ask me, with
    options; never quietly simplify, stub, or skip a feature. Flag anything stubbed as
    TODO(P2) in the milestone summary.
11. Stop at each milestone end: tests, typecheck, lint, `vercel build`, commit, and a
    summary of what was built, what is placeholder, and what the team must do.

## M7 — Stakes: failure, incidents, balance (engine first, UI minimal)
Engine:
- Per-crew physiology: O2 status, CO2 exposure, hydration, nutrition, core temperature,
  acute dose, cumulative dose, injury, fatigue, morale. Condition ladder
  nominal → impaired → critical → lost, with time-at-threshold rules from constants.
  Condition feeds station performance (see Station rules).
- Failure modes, each reachable in tests: hypoxia, hypercapnia, dehydration, starvation,
  hypothermia, acute radiation exposure (unsheltered during a particle event), cumulative
  dose beyond the career limit (mission failure, not death), depressurization, fire, and a
  power-collapse cascade (battery → heaters/ECLSS off → freeze → water → O2).
- Incident system: a data-driven catalog. Each incident has id, historical analogue +
  source ID, originating STATION, trigger (component reliability/TRL, scenario schedule, or
  Live Sky), warning time, physics effect, 2–3 responses with trade-offs, consequences, and
  three-depth text. Approved analogues to seed: Mir fire (1997), Progress–Mir collision and
  depressurization (1997), Apollo 13 oxygen tank failure (1970), Soyuz MS-22 coolant leak
  (2022), August 1972 solar particle event, 2018 Mars global dust storm, ISS CO2 scrubber
  failures. Add each to DATA_SOURCES.md as unverified; the team will supply sources. Use
  placeholders for numbers — never invent them.
- Component reliability: hourly failure hazard from TRL and maintenance
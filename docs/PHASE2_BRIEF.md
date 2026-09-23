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
- Component reliability: hourly failure hazard from TRL and maintenance state; repairs cost
  spares and crew-hours and can fail.
- Outcomes: SUCCESS (all crew safe, primary goal met), PARTIAL (crew safe, goal missed),
  ABORT (Moon: return possible with a sourced transit time; Mars: only at a departure
  window — make the player feel why), LOSS (crew lost; the mission continues if others
  survive, otherwise ends).
- Difficulty presets Training / Nominal / Flight-Rated as scenario parameters only.
Balance harness (required):
- Bots: idleBot (never acts), greedyBot (maximizes science, ignores margins), prudentBot
  (scripted sensible play across all five stations).
- 200 seeds per scenario × difficulty, headless. Targets:
  idleBot success ≤ 5% (Nominal, Flight-Rated), ≤ 30% (Training);
  prudentBot ≥ 85% Training, ≥ 70% Nominal, 40–60% Flight-Rated;
  greedyBot between idleBot and prudentBot.
  Every failure mode must appear in at least one idleBot or greedyBot seed.
- Write docs/BALANCE.md (outcomes and failure causes per scenario and difficulty). Tune
  only "tuned" constants and difficulty presets, never "measured" ones.
Done when: balance targets pass in CI, each failure mode has a test, and the Black Box
explains every LOSS and ABORT.
- Read @docs/INCIDENTS_AND_THRESHOLDS_v2.md. Thirst, hunger and cold ARE lethal paths and
  must be implemented as specified there, including the PIO2 conversion helper, the three
  separate cold paths, and the per-path cause-of-death tests in Part 5.

# M7.5 — Balance correction (before M8)
1. Audit bot fairness: list every engine value prudentBot reads. Any value a human player
   cannot see at the moment of decision must be hidden from the bots (sensor lag, warning
   false-alarm rate, delayed Mission Control advice, crew-hour execution latency).
   Re-run the harness and report the new numbers BEFORE tuning anything.
2. Add residual cost to every incident response: consumed spares, crew-hours, added wear
   (shortened MTBF), or dose. No response may restore the prior state.
3. Add incident coupling: degraded state raises the probability and severity of the next
   incident; improvised repairs shorten component life; storms drive EVAs which drive dose
   and fatigue.
4. Redefine Flight-Rated SUCCESS to require mission goals met (science returned, career
   dose within limits, outpost operable at handover), not survival alone. Survival without
   goals = PARTIAL.
5. Reframe componentRiskBaseChancePerHour as MTBF hours per component (realistic band
   2,000–20,000 h, TRL- and wear-scaled). The current 0.0045/h implies a 222-hour MTBF,
   which no flight hardware resembles.
6. Reclassify spe1972DoseMultiplier as "derived", with this note: Moon baseline
   1.37 mSv/day × 1500 ≈ 86 mSv/h ≈ 0.5 Gy over 6 h, matching the measured statement that
   a large unshielded SPE delivers >0.5 Gy over several hours [HRP-ARS].
7. Attach existing source IDs to the reopened placeholders: CO2 IDLH 30.4 mmHg
   [CO2-REVIEW-2026], ARS 0.1–0.2 / 2 / 3.25 Gy [HRP-ARS], dust tau 10.8 / 22 Wh [MER-TAU],
   Mir fire 14 min [NASA-SP-4030].
8. For the remaining incident magnitudes (Spektr leak rate, Apollo 13 CO2 rise, MS-22
   temperature rise), mark them "tuned" and record in DATA_SOURCES.md the MEASURED OUTCOME
   each is anchored to, not an invented rate.
9. Re-run 200 seeds × scenario × difficulty and update docs/BALANCE.md. Report which of
   steps 1–5 moved the Flight-Rated prudentBot rate, and by how much.
Push and run `vercel build` first. Stop after step 1's report and after step 9.

## M8 — Agency: sol loop, station consoles, decisions, briefing, onboarding
- Core loop: Sol Planning (paused, station by station) → run the sol (1× / 4× / 16×) →
  auto-pause on any incident or threshold crossing → Decision Card at the owning station →
  end-of-sol summary (3 lines max, one per station that acted).
- Planning controls by station: Power (priorities, reactor/array settings, dust cleaning),
  Life Support (rations, ISRU, crop tasks), Comms (downlink priority, message queue),
  Incident Command (repair queue, EVA go/no-go, shelter order), Mission Command (crew
  assignment, daily plan, goals).
- Decision Cards: 2–3 options, trade-offs shown at the current dial depth, a countdown in
  game time for urgent incidents, the owning station named, and a stated default
  consequence if the player does not choose.
- Mission Control messages arrive after the real light-time. On Mars, urgent problems must
  be solved before Earth can answer, and the game says so.
- Mission Briefing before every mission: crew names, roles and stations; duration; landing
  site; the hazard coming (scenario + Live Sky); primary goal; one stretch goal; what
  failure looks like. Readable in under 90 seconds, with a Cadet version using icons.
- Onboarding: first launch runs the "First Light" tutorial with coach marks, introducing
  one station at a time (Power → Life Support → Incident → Comms → Command). A "?" on every
  gauge explains it at the current depth.
- Replace the seven-tab IA with the five station consoles plus Briefing and Debrief.
  Propose the navigation in the M8 plan before building it.
Done when: a new player makes a first meaningful decision within 60 seconds, a prudent
human reaches SUCCESS, and an idle one cannot.

## M9 — Mission setup + space-themed visualization
- Setup flow: scenario → difficulty → crew size 2–6 (consumption scales; with fewer crew,
  one person covers two stations, with the fatigue penalty) → landing site → power
  architecture (solar + battery / fission / hybrid) → shielding approach → Launch Packing.
- Landing-site picker on the Trek maps, using ONLY docs/LANDING_SITES.md. Show each site's
  trade-offs (sunlight, ice, radiation, comms, terrain) with confidence flags, and never
  present a placeholder as a fact.
- Visualization: animated habitat cutaway; crew sprites move to their assigned stations and
  tasks; day/night lighting on the real sol or lunar-day cycle; dust-storm overlay tied to
  optical depth; red-alert lighting and a shelter animation during particle events;
  depressurization shown with warning lights and alarms, never gore; starfield sky, Earth in
  the lunar sky, Mars sky color shifting with dust.
- Mission-control styling: mission elapsed time and sol clock, telemetry-style station
  panels, alarm banner with severity levels. Original art only. ART DIRECTION IS PENDING:
  use a neutral dark mission-control palette from existing design tokens, keep all visual
  style in one theme module, and ask me before committing to a distinctive look.
- Rendering: SVG first; ask before adding PixiJS.
- AUDIO: not now. Leave a muted, empty audio hook and no asset files.
Done when: 30+ FPS in the Lighthouse mobile profile, low-power mode works, reduced motion
honored.

## M10 — Shareable seeded runs + mission report
- URL encodes SIM_VERSION, scenario, difficulty, crew size, site, power choice, seed;
  optionally the compressed input log in the fragment for exact replay (ask before adding a
  compression dependency). A SIM_VERSION mismatch shows "made with an older version"
  instead of breaking.
- Class mission: "Create class link" on setup. Every student gets the identical mission.
  No backend, no accounts, no personal data.
- Mission report: one printable page (print CSS → browser print to PDF): outcome, crew and
  their stations, site, decision timeline tagged by station, the Black Box causal chain, one
  "What NASA did" card, replay link, data-sources footer. Bilingual.
- Replay: opening a report link replays the run's decisions at speed.
Done when: two browsers opening the same link produce byte-identical final states (test).

## M11 — Bangla completion + release hardening
- Translate the remaining five screens, all station consoles and the three-depth event-log
  text into Bangla as DRAFT (needsReview: true). Export docs/i18n/bn_review.csv plus an
  import script; a native reviewer will come later.
- i18n completeness test: no missing keys in en or bn.
- docs/DEVICE_TEST.md checklist and a ?debug=1 overlay (FPS, memory, tick time).
- Data Sources screen shows every new source and its honest verification status.
- Feature freeze after M11: bug fixes only.

## Schedule
M7 09-22→23 · M8 09-23→24 · M9 09-24→25 · M10 09-26 · M11 09-26→27 · submit 09-27.
Scope is fixed. If a milestone will not fit, stop and ask me (principle 10).

## Start now
M7 in plan mode. Propose: the physiology model and thresholds; the station model and how
crew condition degrades each station; the incident schema and initial catalog with owning
stations; the outcome state machine; the three bot strategies; and the balance harness.
List every new constant with a proposed source or "placeholder", and list the terminology
renames you will make. Wait for my approval.
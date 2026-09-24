# Incident Magnitudes — Addendum to INCIDENTS_AND_THRESHOLDS_v2.md
Closes the three magnitudes left open after M7. Each is now anchored to published values.
Where no rate was ever published, the rate is DERIVED from physics plus a measured volume
and a documented outcome — not invented. Add the new source IDs to docs/DATA_SOURCES.md.
 
---
 
## 1. INC-DEPRESS-MIR97 — Spektr leak rate   [NASA-SMA-MIR-COLLISION], [NASA-SHUTTLE-MIR]
No leak rate or pressure-versus-time curve was ever published. What is documented:
- Spektr's pressurised volume: 62 m³ — measured [NASA-SHUTTLE-MIR,
  https://spaceflight.nasa.gov/history/shuttle-mir/spacecraft/s-mir-spektr-main.htm]
- The puncture caused "a relatively slow leak", and the crew had enough time to cut the
  cables running through the hatchway and install a hatch cover, saving the station —
  measured (qualitative).
- Sealing Spektr cost about half of Mir's power, because Spektr's arrays were isolated with
  it — measured [NASA-SMA-MIR-COLLISION].
DERIVE THE RATE, don't guess it. Use choked (sonic) orifice flow, which holds while the
cabin is far above vacuum:
```
v_eff = sqrt(γ·R·T) · (2/(γ+1))^((γ+1)/(2(γ-1)))     // ≈ 240 m/s for air at 294 K
dP/dt = −P · (Cd · A) / V · v_eff                     // exponential decay
τ      = V / (Cd · A · v_eff)                         // time constant
```
Check with a 10 mm hole in Spektr's 62 m³: A = 7.85e-5 m², Cd = 0.6, so τ ≈ 5,500 s
(about 91 minutes). Pressure falls to roughly 37% in 91 minutes — slow enough for a crew
to act, fast enough to be terrifying. That matches the documented outcome.
GAME VALUES: hole diameter 8–12 mm (derived), giving a sealing window of roughly 20–40
minutes of game time at habitat scale. Scale τ by the affected module's own volume, so
sealing a small module is far more urgent than a large one — a real and teachable effect.
RESIDUAL COST (for the M7.5 balance fix): sealing a module permanently removes its volume,
its equipment, and any power or storage attached to it. Mir lost half its power this way.
That is the model for "no fix restores the prior state".
 
## 2. INC-O2TANK-APOLLO13 — CO2 rise   [NEW: A13-CO2]
Documented values:
- The LM's lithium hydroxide canisters were sized for two crew for two days, but carried
  three crew for about four days — roughly three times the design demand — measured
  [A13-CO2, https://www.universetoday.com/articles/13-things-that-saved-apollo-13-part-10-duct-tape]
- Peak partial pressure: Jack Swigert recalled the CO2 partial pressure reading about
  15 mmHg at the worst point — measured (crew debrief).
- CO2 levels began to threaten the crew after about a day and a half in the LM, setting off
  alarms — measured (qualitative timeline).
- After the improvised adapter was installed, the accident review board reported that CO2
  partial pressure stayed below 2 mmHg for the rest of the return — measured
  [https://www.universetoday.com/articles/13-more-things-that-saved-apollo-13-part-5-the-co2-partial-pressure-sensor]
MODEL — anchor to outcome, derive the rate:
```
scrubberCapacityFraction ≈ 0.33 of demand      // 2-crew-2-day unit doing 3-crew-4-day work
ppCO2 rises from the engine's own CO2 production (1.00 kg/CM-day, BVAD) minus removal
Tune ONLY the cabin volume and mixing efficiency so the curve reaches 15 mmHg at about
36 h, then drops below 2 mmHg within a few hours of the repair.
```
Assert all three points in tests: 15 mmHg peak, about 36 h to reach it, below 2 mmHg after
the fix. The crossings of 3, 7.6 and 15 mmHg [OCHMO-TB-004, OCHMO-TB047] then fall out of
the model rather than being placed by hand.
RESIDUAL COST: the improvised repair consumes spare parts that were meant for something
else, and the adapter degrades scrubber efficiency slightly for the rest of the mission.
 
## 3. INC-COOLANT-MS22 — temperature rise   [NEW: MS22-THERMAL]
Documented values (Roscosmos and NASA, December 2022 – March 2023):
- Crew habitation module reached 30 °C; the instrumentation and equipment compartment
  temporarily reached 40 °C — measured [MS22-THERMAL, https://tass.com/science/1552657]
- After ground teams powered down spacecraft systems, temperatures across the vehicle
  stabilised at about 30 °C — measured (same source).
- Roscosmos explicitly denied reports of 50 °C — measured (useful negative bound).
- Hole size: about 0.8 mm; most of the coolant had leaked out within a day — measured.
- The later crewed thermal test used these abort criteria: descent module above 31 °C at
  95% relative humidity (the wet-bulb limit, where the body can no longer shed heat by
  sweating), service module above 40 °C, or main computer above 45 °C — measured
  [NEW: NSF-MS22, https://www.nasaspaceflight.com/2023/03/soyuz-ms-22-return/]
MODEL:
```
Equipment bays heat faster than crew space:   +40 °C bay, +30 °C cabin
Coolant loss completes in ~24 h from a sub-millimetre radiator breach
Mitigation = shed electrical load: powering systems down stabilises temperature
```
ADD A WET-BULB CHECK to the thermal model: crew impairment begins when cabin temperature
exceeds 31 °C with relative humidity near 95%, because sweating stops working. This gives
heat a failure path of its own, mirroring the cold path, and it is measured rather than
tuned. Equipment limits: 40 °C for bays, 45 °C for computers, above which components fail.
RESIDUAL COST — THE IMPORTANT ONE: the only real mitigation was to switch systems off.
In the game, cooling the habitat by shedding load must mean losing capability for as long
as the fault persists: science stops, ISRU stops, comms windows are missed, and crops lose
light. The crew could not even use tablets, because they generate heat, and wrote notes on
paper instead. That is a perfect Cadet-depth detail for a fact card.
 
---
 
## New source IDs
A13-CO2, MS22-THERMAL, NSF-MS22. Note on provenance: the Apollo 13 CO2 figures come from
crew debrief and accident-review-board material reported second-hand, and the MS-22 figures
come from Roscosmos statements via news agencies. Both are labelled "measured-reported"
rather than "measured", and the Data Sources screen should say so. If someone later finds
the Apollo 13 Mission Report ECS section (NTRS) or a NASA ISS blog post with the same
numbers, upgrade the rows.
 
## Balance note (feeds M7.5)
All three incidents now carry a permanent cost: Spektr loses a module and its power,
Apollo 13 consumes spares and degrades the scrubber, MS-22 forces a capability shutdown
while the fault lasts. Once these are implemented, re-run the Flight-Rated prudentBot
before touching any hazard rate — this alone should pull it down from 97–100%.

---

# Addendum 2 — M7.6 Part D: the last four incidents

Closes the four magnitudes M7.6 Part D asked for (fire-mir97, spe-1972, duststorm-2018,
scrubber-iss), following the same discipline as Addendum 1 above: real documented facts
anchor each magnitude; where no number was ever published for the specific residual-cost
effect this sim adds, the magnitude is tuned and disclosed as such, never invented as if
measured. Full research trail and exact source rows in docs/DATA_SOURCES.md.

## 4. INC-FIRE-MIR97 — smoke recovery, cleanup, and permanent equipment damage
[NASA-MIR-FIRE-25YR], [MIR-FIRE-LINENGER]
Documented values:
- Some of Kvant-1's solar panels were charred by the fire — measured
  [NASA-MIR-FIRE-25YR, https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/].
  No damage to the station's structure; no lasting harm to the crew — same source.
- Jerry Linenger's own firsthand account (BBC Science Focus): full respirators lasted
  "maybe 45 minutes to an hour" before the crew switched to filter masks; roughly a day
  before things were properly cleaned out; a water-based extinguisher was used, followed
  by about 24 elapsed hours of one crew member mopping up condensation with old clothing —
  measured-reported (firsthand crew account, not a primary NASA document)
  [MIR-FIRE-LINENGER, https://www.sciencefocus.com/space/fire-in-space-jerry-linenger].
RESIDUAL COST, three parts, all applied the hour the fire triggers, regardless of which
response is chosen (the crew fights, evacuates, or ignores the fire itself — the smoke and
the charred panels are consequences of the fire, not of that choice):
- Damaged equipment stays damaged: a permanent, modest efficiencyPenaltyFraction on
  powerDistribution (tuned magnitude — no percentage was published for how much capability
  Kvant-1's charred panels actually lost).
- Cleanup costs crew-hours: a one-time crew-hours debit the same hour (tuned — Linenger's
  own ~24 elapsed hours describes one crew member's wall-clock task, not directly a
  crew-hours budget figure in this sim's own units, so it is not a literal conversion).
- Smoke degrades crew performance for a recovery period: every response leaves a bounded
  ongoing effect running for mirFireSmokeRecoveryHours (24 h, the more precisely stated of
  Linenger's two figures — used instead of the brief's own less-precisely-sourced "36
  hours", a discrepancy disclosed in the constant's own note for the lead developer to
  reconcile if a firmer primary source turns up), adding a small tuned fatigueFraction each
  hour of that window.

## 5. INC-SPE-1972 — electronics degradation, halted science, interrupted crop light
[AGU-KNIPP-2018]
Documented values: Knipp et al. (2018, Space Weather, AGU), quoting Rauschenbach (1980):
"an ~5% drop in solar cell power generation capability for the INTELSAT IV F-2 solar panel
arrays during the 4 August SEP event, roughly equivalent to 2 years of magnetospheric
trapped-radiation exposure to the panels." The same paper reports a Defense Communications
Satellite Program II satellite suffering a mission-ending on-orbit power failure shortly
after the same event (Shea & Smart, 1998) — measured
[AGU-KNIPP-2018, https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2018SW002024].
RESIDUAL COST:
- Electronics take a degradation roll: independent of the crew's shelter decision (the real
  particles hit hardware regardless of where the crew is standing), a tuned-probability roll
  (no rate exists to derive one from a single historical event) applies the real, measured
  5% figure above as a permanent efficiencyPenaltyFraction on comms — this sim's own
  established stand-in for sensitive spacecraft electronics.
- Sheltering halts science and interrupts crop light: while any crew member is sheltering,
  the comms-uptime and MOXIE science-point credits pause (not the underlying O2 production
  itself, which the crew still needs), and the greenhouse's grow-light accumulation pauses
  too — crew attention, not electrical power, is the cause, a distinct mechanism from the
  existing power-priority shedding.
- Cumulative career dose was already verified permanent (never reset) before this pass;
  spe1972DoseMultiplier itself was also reclassified from a placeholder to "derived" this
  same pass, now citing HRP-ARS with the M7.5 brief's own derivation
  (1.37 mSv/day x 1500 ~= 0.5 Gy over 6 h).

## 6. INC-DUSTSTORM-2018 — permanent dust, EVA dose, battery degradation
[JPL-DUSTSTORM2018-TAU], [LORENZ-2020-INSIGHT-DUST]
Documented values:
- Dust optical depth (tau) reached 10.8 at Opportunity's location during the 2018 storm,
  versus a pre-storm background of about 1.2 — "the highest ever recorded on Mars" —
  measured [JPL-DUSTSTORM2018-TAU, https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/].
- InSight's own solar arrays declined at roughly 0.28%/sol from steady-state dust
  accumulation (the same rate reported for the Sojourner rover, Landis 1996), with no full
  recovery possible short of a dust-devil-scale cleaning event; the mission ultimately died
  of accumulated dust that was never cleaned — measured
  [LORENZ-2020-INSIGHT-DUST, Lorenz et al. 2020, Earth and Space Science 7(5)].
RESIDUAL COST:
- Dust accumulation is permanent and cumulative: this sim tracks obscuration as a 0-1
  fraction, not optical depth, so the real tau comparison above is used qualitatively
  (justifying real, felt severity) rather than converted through an invented tau-to-fraction
  formula. Each time this incident triggers, environment.dustObscurationFraction gains a
  permanent floor (tuned magnitude, anchored to InSight's own "never fully cleaned" outcome)
  it can never be cleaned back below again, however many cleaning responses follow.
- Cleaning EVAs cost crew-hours (already declared) and dose: the crew member sent out is
  exposed at the sim's own "eva" shielding factor for the response's declared duration,
  using the exact GCR transmission physics radiationStage itself runs — not an invented EVA
  dose rate.
- Deep battery discharge cycles permanently reduce usable capacity: checked once per
  incident, from whichever response actually resolves it (including its own default), since
  the storm's own power crisis — not the cleanup choice made afterward — is what drove the
  battery down. A real, well-documented property of battery chemistry in general; the
  specific percentage is tuned, since no source here ties a number to this sim's own
  abstracted battery model.

## 7. INC-SCRUBBER-ISS — repeat degradation and chronic CO2 exposure
[ICES-2019-CDRA]
Documented values: Cmarik & Knox (2019, ICES-2019-5) document real, recurring CDRA
sorbent-bed degradation — silica gel discoloration and performance loss "after many
operating cycles" — as one of the ISS's most crew-maintenance-intensive systems, without
stating a specific post-repair capacity percentage — measured
[ICES-2019-CDRA, https://ntrs.nasa.gov/api/citations/20190030370/downloads/20190030370.pdf].
RESIDUAL COST:
- A repaired bed runs at reduced capacity for the rest of the mission: every successful
  swapCartridge applies a small, tuned, permanent efficiencyPenaltyFraction to co2Scrubber,
  stacking multiplicatively across repeated triggers of this same recurring-failure
  incident — distinct from (and stacking with) the existing improvised-repair penalty,
  which only applies on a spares shortfall.
- Cumulative CO2 exposure above 3 mmHg (survivalModes' own OCHMO-TB047-sourced co2LimitMmHg)
  is tracked and carries a lasting performance cost: an integral of hours-above-limit
  weighted by how far above (mmHg-hours), not gated to when scrubber-iss specifically is
  active, since ordinary excursions add up the same real way. Crossing a tuned threshold
  applies a one-time, permanent crew fatigue increase, standing in for OCHMO's own
  documented concern about chronic sub-acute CO2 exposure's cognitive effects.

## New source IDs (Addendum 2)
NASA-MIR-FIRE-25YR (primary NASA material), MIR-FIRE-LINENGER (firsthand crew account,
"measured-reported" tier), AGU-KNIPP-2018 (peer-reviewed, Space Weather/AGU),
ICES-2019-CDRA (primary NASA/NTRS conference paper), JPL-DUSTSTORM2018-TAU (primary
NASA/JPL reporting), LORENZ-2020-INSIGHT-DUST (peer-reviewed, Earth and Space Science).
Full rows in docs/DATA_SOURCES.md. The three "-PENDING" placeholders this addendum replaces
(INC-SPE-1972-PENDING, INC-SCRUBBER-ISS-PENDING, INC-DUSTSTORM2018-PENDING) are gone from
both the source registry and every constant that cited them.

## Balance note (feeds M7.6 Part D.13)
Measured, 150 seeds x scenario x difficulty (docs/BALANCE.md, regenerated after this pass):
First Light's prudentBot moved from 54.0%/38.7%/32.7% (Training/Nominal/Flight-Rated) to
45.3%/37.3%/31.3% — a real but modest further decline (Training moved most, ~9 points),
consistent with adding four more real residual costs to an already-thin 2-person-crew
scenario. Traced seed-by-seed: 79 of 82 (96%) of First Light Training's remaining
prudentBot losses are still `depress-mir97`'s own pre-existing fast kill clock (M7.8 Part A's
own finding, unchanged), not a new failure mode from this pass — this addendum's own four
new mechanics account for the other 3. Jezero and The Long Night, both far better resourced,
show no meaningful movement on their own already-passing numbers. No hazard rate was tuned
to produce any of this movement — every change here is a residual-cost mechanic or a
previously-undeclared/misattributed constant, per the brief's own restriction.
 
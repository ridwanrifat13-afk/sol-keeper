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
 
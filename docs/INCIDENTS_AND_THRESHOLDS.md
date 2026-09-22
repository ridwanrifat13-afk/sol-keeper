# Incidents and Danger Thresholds — v2
Supersedes v1. Changes in v2: thirst, hunger and cold are now MODELLED AS LETHAL with the
team's sources; oxygen limits replaced with exact OCHMO-TB-003 values; lunar return transit
and Mir fire duration resolved.
Confidence flags: measured = NASA standard / flown data / peer-reviewed · derived = computed
by us from a measured anchor · tuned = balance only · placeholder = needs a source.

---

# PART 1 — DANGER THRESHOLDS

## 1.1 Oxygen — RESOLVED (replaces the 1968 figures in v1)   [OCHMO-TB-003]
Source: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf
All measured:
- PIO2 normoxia target: 145–155 mmHg
- PIO2 mild-hypoxia lower limit: 127 mmHg
- PIO2 indefinite hyperoxia upper limit: 356 mmHg
- PIO2 short-term hyperoxia upper limit: 791 mmHg
- Total cabin pressure: >5.0 to 15.0 psia
- Minimum diluent gas fraction: 30%

ENGINE NOTE — DO NOT SKIP: these limits are PIO2 (inspired O2 pressure in the airway),
not cabin ppO2. The engine tracks cabin ppO2, so convert before comparing:
  PIO2 = (P_total − 47 mmHg) × FO2      (47 mmHg = water-vapour pressure at body
  temperature; derived, standard respiratory physiology)
Equivalently PIO2 ≈ ppO2 − 47 × FO2. A cabin can sit above 127 mmHg ppO2 and still be
hypoxic once this correction is applied. Implement the conversion in one helper used by
every atmosphere check, and unit-test it.

Ladder:
- nominal: PIO2 145–155
- impaired (mild hypoxia): PIO2 below 127 — performance penalty grows as PIO2 falls
- critical: PIO2 below 100 — tuned; the fall from impaired to unconscious has no NASA
  number, so label the time constant "tuned"
- fire/toxicity risk: PIO2 above 356 sustained, or diluent fraction below 30%

## 1.2 Carbon dioxide — unchanged from v1   [OCHMO-TB-004]
3 mmHg nominal limit; 3.8 mmHg 8-hour limit; 7.6 and 10–15 mmHg survival modes; 30.4 mmHg
(4%) immediately dangerous to life and health. CDRA removes six person-equivalents.

## 1.3 Thirst — NOW LETHAL   [NEW: NASA-SPACEBIO-1975]
Source: NTRS 19760019741, Protection Against Adverse Spaceflight Factors —
https://ntrs.nasa.gov/api/citations/19760019741/downloads/19760019741.pdf
Measured anchors:
- Survival without water: up to about 14 days (336 h) under ideal conditions.
- Under highly unfavourable environmental conditions, death can occur within hours.

MODEL:
```
survivalHours = 336 · fEnv · fWork
  fEnv  = 1.0 at 18–22 °C cabin;  falls with heat, low humidity, or suit operations
  fWork = 1.0 at rest;            falls with EVA and heavy work
  clamp survivalHours to [6, 336]
hydrationClock += dt / survivalHours     // 0 → 1, 1 = lost
partial intake slows the clock proportionally:
  clockRate = max(0, 1 − intakeL / requiredL) / survivalHours
requiredL = 4.0 nominal, 1.25 mode 1, 0.75 mode 2   [OCHMO-TB047]
```
Condition stages (fractions of the clock — TUNED, flag them): impaired 0.20,
critical 0.55, lost 1.00. The 336-hour ceiling and the "hours in unfavourable conditions"
floor are measured; everything between them is our interpolation. Say so in the
Commander depth and on the Data Sources screen.
Design consequence: a water-loop failure now has a hard deadline, so rationing (mode 1 at
1.25 L) buys real time and is a meaningful decision, not flavour.

## 1.4 Hunger — NOW LETHAL   [NEW: NASA-NUTRITION-2015]
Source: NTRS 20150000512 —
https://ntrs.nasa.gov/api/citations/20150000512/downloads/20150000512.pdf
Anchors (NASA discusses these as projections and historical human evidence, NOT as
physiological constants — label them "measured-projection" in the registry):
- Total starvation: survival on the order of 1–2 months; hunger-striker evidence gives
  about 60 days as an upper bound.
- About 1000 kcal/day: survival potentially beyond 4–6 months, with substantial
  performance deterioration.

MODEL — energy-deficit integrator, not a simple clock:
```
requiredKcal = 3600 nominal, 1800 mode 1, 600 mode 2       [OCHMO-TB047]
deficit      = max(0, requiredKcal − intakeKcal)           // kcal/day
lethalDeficit = 60 days × 3600 kcal = 216,000 kcal         // derived from the 60-day anchor
starvationClock += deficit · dtDays / lethalDeficit
```
Check against the second anchor: at 1000 kcal/day the deficit is 2600 kcal/day, giving
about 83 days to the clock's end — consistent with "beyond 4–6 months potentially" only if
we allow metabolic adaptation. Add an adaptation term that reduces the required intake by
up to 15% after two weeks of restriction (TUNED), which moves 1000 kcal/day to roughly
4 months and keeps both anchors satisfied. Document this in docs/BALANCE.md.
Stages: impaired 0.25, critical 0.60, lost 1.00 (tuned).
Design consequence: starvation is a slow failure that only bites on long Mars missions —
exactly right. It should almost never kill on a 30-sol lunar mission, and that asymmetry is
itself a lesson about mission duration.

## 1.5 Cold — NOW LETHAL, WITH ONE HONEST CORRECTION   [NEW: NASA-HYPOTHERMIA-2008]
Source: NTRS 20080014194, Shuttle contingency water-landing survivability —
https://ntrs.nasa.gov/api/citations/20080014194/downloads/20080014194.pdf
Measured anchors:
- More than 12 hours survival in 4.4 °C (40 °F) water wearing the suit alone.
- More than 22 hours in a life raft in 4.4 °C water and rain, in the suit.
- Hypothermia was identified as the major threat.

CAVEAT THAT MUST BE HONOURED: these are WATER-IMMERSION figures. Water removes body heat
far faster than air at the same temperature (roughly an order of magnitude, dominated by
conduction and convection), so applying 12 hours directly to a cold habitat would kill crews
in a cabin that a real astronaut would merely find miserable. Use the immersion anchor where
it fits, and derive the air case from it with a clearly flagged factor.

MODEL — three distinct cold paths:
1. CABIN COOL (22 → 18 → 15 °C): performance penalties only, straight from the survival
   modes [OCHMO-TB047]. No lethality above 15 °C.
2. CABIN COLD (below 15 °C, heaters failing): hypothermia clock
   ```
   survivalHoursAir(T) = 12 h × kAir × g(T)      // kAir = 10, DERIVED + TUNED
   g(T) rises as T rises; anchor g(4.4 °C) = 1
   clamp to [12, 480] hours
   ```
   So a 4.4 °C cabin is survivable for roughly five days, not twelve hours, while a cabin
   at or below freezing converges toward the immersion figure. kAir is the single most
   important tuned number here — expose it in BALANCE.md and label it in-game.
3. SUIT OR EVA THERMAL FAILURE, and immersion-like exposure: use the 12-hour and 22-hour
   anchors directly, with no kAir factor. This is where the source actually applies, and it
   makes a suit failure during an EVA genuinely frightening.
Stages: impaired 0.20, critical 0.55, lost 1.00 of the applicable clock (tuned).
KEEP THE PHYSICS PATH TOO: the habitat freezing still breaks the water loop and cascades
into oxygen and water failures. In most runs that cascade should reach the crew before the
hypothermia clock does — which is realistic, and the Black Box should show it that way.

## 1.6 Radiation — unchanged from v1   [HRP-ARS]
ARS threshold 0.1–0.2 Gy acute (CDC 0.7 Gy with mild symptoms from 0.3 Gy); 0.5–1 Gy minor
blood-system damage; ~5% lethality at 2 Gy; ~50% mortality within 60 days at 3.25 Gy
without care; >1 Gy unlikely if shelter (5–10 g/cm²) is reached in time; design target
250 mGy-equivalent to blood-forming organs.

## 1.7 Solar particle event warning — unchanged from v1
Onset about 30 minutes after the flare; NOAA median lead time 88 minutes (Cycle 24) with a
24% false-alarm rate; some events give no usable warning.

## 1.8 Dust and solar power — unchanged from v1
Clear tau 0.6–0.7; InSight coped to about tau 4; Opportunity died at tau 10.8 with about
22 Wh; NASA planning values 450 W/m² nominal versus 100 W/m² in a storm.

## 1.9 Abort timing — RESOLVED for the Moon   [NEW: NASA-ORION-FS]
Source: Orion overview fact sheet —
https://www.nasa.gov/wp-content/uploads/2021/04/617409main_orion_overview_fs_33012.pdf
- Planned lunar return transit: 9–19 days (measured, per the fact sheet; verify the exact
  wording when transcribing, since it may describe total mission phases).
- Artemis I actual return-transit phase: flight days 20–26, about 6 days (measured).
GAME VALUES: lunar ABORT costs about 6 days of transit, with a 9–19 day range available for
harder scenarios. Mars ABORT remains gated on the departure window (~780-day synodic
period, ~500-day surface stay) [NTRS-20120012929], [NSSDC-FACTS].

---

# PART 2 — INCIDENT CATALOG
All seven incidents as in v1, with one resolution:

## INC-FIRE-MIR97 — duration RESOLVED   [NEW: NASA-SP-4030]
Source: NASA SP-4030 — https://www.nasa.gov/wp-content/uploads/2023/04/sp4030.pdf
GAME VALUE: 14 minutes of burn. Documented alternative: 90 seconds. Status: historically
disputed. Show the 14-minute figure in play, and note the dispute in the fact card — a good
lesson that even flown history carries uncertainty.

(INC-DEPRESS-MIR97, INC-O2TANK-APOLLO13, INC-COOLANT-MS22, INC-SPE-1972,
INC-DUSTSTORM-2018, INC-SCRUBBER-ISS are unchanged from v1.)

---

# PART 3 — CONSTANTS TO ADD (with flags)
| Constant | Value | Unit | Source ID | Confidence |
|---|---|---|---|---|
| pio2NormoxiaRange | 145–155 | mmHg | OCHMO-TB-003 | measured |
| pio2HypoxiaLowerLimit | 127 | mmHg | OCHMO-TB-003 | measured |
| pio2HyperoxiaIndefinite | 356 | mmHg | OCHMO-TB-003 | measured |
| pio2HyperoxiaShortTerm | 791 | mmHg | OCHMO-TB-003 | measured |
| cabinPressureRange | 5.0–15.0 | psia | OCHMO-TB-003 | measured |
| minDiluentFraction | 0.30 | — | OCHMO-TB-003 | measured |
| waterVapourPressureBody | 47 | mmHg | physiology | derived |
| thirstSurvivalIdeal | 336 | h | NASA-SPACEBIO-1975 | measured |
| thirstSurvivalExtreme | 6 | h | NASA-SPACEBIO-1975 | measured (floor: "within hours") |
| starvationLethalDeficit | 216,000 | kcal | NASA-NUTRITION-2015 | derived (60 d × 3600) |
| starvationAdaptationMax | 0.15 | — | — | tuned |
| hypothermiaImmersion4C | 12 | h | NASA-HYPOTHERMIA-2008 | measured |
| hypothermiaRaft4C | 22 | h | NASA-HYPOTHERMIA-2008 | measured |
| hypothermiaAirFactor (kAir) | 10 | — | derived from the above | derived + tuned |
| lunarReturnTransitNominal | 6 | d | NASA-ORION-FS | measured (Artemis I) |
| lunarReturnTransitRange | 9–19 | d | NASA-ORION-FS | measured (verify wording) |
| mirFireDuration | 14 | min | NASA-SP-4030 | measured (disputed: 90 s) |

# PART 4 — NEW SOURCE IDS
NASA-SPACEBIO-1975, NASA-NUTRITION-2015, NASA-HYPOTHERMIA-2008, NASA-ORION-FS,
NASA-SP-4030, plus the v1 list.

# PART 5 — BALANCE IMPLICATIONS FOR M7
With thirst, hunger and cold lethal, the bots must now find these deaths:
- idleBot on a 500-sol Mars run should die of thirst or cold long before starvation.
- Starvation should essentially never kill on a 30-sol lunar mission. If it does, the food
  model is wrong.
- A heater failure should usually kill through the freeze cascade (water loop → O2), not
  through the hypothermia clock. If hypothermia wins more than about a quarter of the time,
  kAir is too low.
Add one test per lethal path asserting the cause of death, so a future tuning change cannot
silently turn the game into a starvation simulator.
# Decision Audit — M7.6 Part A (+ Part B, answered empirically)

Read-only analysis. No engine code was changed to produce this report, per the brief's
"STOP and report before making changes" instruction. Every finding below cites the exact
file/line it comes from so it can be checked directly.

## 1. Grep sweep: hardcoded/decision-independent outcome inputs

**Determinism (clean):** no `Math.random`, `Date.now`, or unseeded RNG anywhere in
`packages/sim/src`. Every stochastic draw goes through `Rng.stream(name)`, seeded from
`params.seed` (confirmed by grep — only `engine/state.ts`, `engine/tick.ts`,
`engine/runWithBot.ts` ever construct an `Rng`).

**`state.status` is set in exactly 5 places, all in `engine/outcome.ts`, none behind an RNG
roll** — outcomes are fully determined by physics state, never a direct probability check
against success/failure. Good.

**Raw, unsourced magic-number probabilities** (brief rule 1 requires every parameter to live
in `constants.ts` with a source or "placeholder" — these three don't):
- `engine/events.ts:72` — `rng.stream("hazards").chance(0.5)`, a coin flip choosing whether a
  scripted `pumpFailure` hits `waterRecovery` or `thermalControl`. No decision can influence
  which one.
- `engine/events.ts:157` — `stream.chance(0.15)`, the **ordinary per-hour auto-repair chance**
  for any broken system with spares available. This is not decision-gated at all — it fires
  every hour regardless of anything a player or bot does, and it runs **before**
  `incidentsStage` in the pipeline, so it can spontaneously repair a system an incident just
  broke (e.g. `fire-mir97`'s `ignore` response sets `powerDistribution.operational = false`;
  `scrubber-iss`'s trigger sets `co2Scrubber.operational = false`) on a later hour,
  independent of which incident response was chosen. Expected time to auto-repair is
  ~6.7 hours regardless of player skill.
- `engine/events.ts:94` — `ctx.rng.stream("crops").range(0.5, 1)`, the multiplier on scripted
  `cropBlight` damage. Less concerning (crop blight isn't one of the 7 incidents, so there's
  no decision point to bypass), but still an unsourced literal.

**A hardcoded outcome value:** `engine/goals.ts`, the `surviveWithDoseUnderLimit` branch
(jezero-outpost's own `primaryGoal`) is `return true;` — unconditionally. By the time a run
reaches the goal check, `engine/outcome.ts`'s own dose-exceeded branch has already exited the
run early if the limit was crossed, so this goal is trivially satisfied every time it's
actually evaluated. **No decision reaches this specific goal check** — it was already true
before any decision could matter. (Flagged as intentional, not dead code, when this was
written in M7 — but M7.5 step 4 explicitly asks to redefine Flight-Rated success around real
goals, which this directly blocks for jezero-outpost until fixed.)

**`Scenario.stretchGoal` is completely dead.** Declared and populated on all three scenarios,
but `checkGoal` is only ever called with `scenario.primaryGoal` (`engine/outcome.ts`) —
`stretchGoal` is never read anywhere else in the engine or the app. It currently has zero
effect on anything.

**Mission Difficulty stays in its lane (clean).** `missionDifficulty`'s three fields
(`incidentRateMultiplier`, `failureRateMultiplier`, `warningTimeMultiplier`) are read in
exactly three places (`engine/incidents.ts` x2, `engine/events.ts` x1), all scaling a *rate*,
never writing to `state.status` or any crew/resource state directly. Consistent with brief
rule 4.

## 2. Outcome state machine trace

`state.status` (`engine/outcome.ts`) branches on, in order: `living.length === 0` → LOSS;
`cumulativeDoseMSv >= careerLimitMSv` (any crew member) → PARTIAL; at `durationHours`,
`checkGoal(primaryGoal)` → SUCCESS/PARTIAL; `requestAbort()` (explicit call only) → ABORT.

| Outcome branch | Reads | Decisions that can change it | Decisions that CANNOT |
|---|---|---|---|
| LOSS (`crew.alive`) | `crewCondition()`: hydration/starvation/hypothermia/hypoxia clocks, `pio2MmHg`, `eventDoseMSv`, `fatigueFraction`, `injuryFraction`, `heatStressClock` | Incident responses (injury via fire-mir97, dose via spe-1972's `shelterNow`, O2/CO2/heat via the three M7.5 incidents), `food.mode` (prudentBot's rationing) | `primaryStation`/`backupStation` are `readonly` — **no decision can ever reassign a crew member**, despite the brief's own Station rule ("a lost crew member leaves their station unstaffed until Mission Command reassigns someone"). No water-specific rationing decision exists (only food). |
| PARTIAL (dose limit) | `cumulativeDoseMSv` — background GCR every hour (unavoidable) plus SPE spikes (avoidable) | `spe-1972`'s `shelterNow` (avoids the spike); water-wall shielding is recomputed every hour from `potableKg` (`models/water.ts:100-102`), so consumption/rationing *indirectly* thins or preserves shielding | GCR's baseline rate itself — no decision increases shielding above the scenario's starting value plus whatever water is left; there is no explicit "add shielding" decision. |
| SUCCESS/PARTIAL (goal) | `checkGoal(primaryGoal, state)` | For Moon scenarios (`surviveFullDurationNoLoss`): same as the LOSS branch, but distinguishes "some but not all crew died" reaching duration | For jezero-outpost (`surviveWithDoseUnderLimit`): **nothing** — see the hardcoded `true` above. |
| ABORT | `requestAbort()`, explicit call | N/A — a player/bot choice | **No bot ever calls it.** `idleBot`/`greedyBot`/`prudentBot` (`engine/bots.ts`) have no abort logic at all. ABORT is unreachable in every balance-harness run to date, and untested by `validation/balance.test.ts`. |

**The Station model is built but completely disconnected.** `stationPerformance`,
`stationCoverer`, `isDoubleCovering` (`engine/stations.ts`) and `availableCrewHours`
(`models/crew.ts`) are exported from `index.ts` but grep finds **zero callers** anywhere in
the simulation logic. Crew condition currently has no effect on incident-response success or
repair odds — directly contradicting the brief's own Station rule: "An impaired crew member
makes their station slower (longer response time, reduced repair success)."

## 3. Per-incident-response state-write audit

**No response's declared `crewHoursCost` is ever deducted from anything, anywhere.** There is
no crew-hours pool it draws down. It is read in exactly two places, both inside
`engine/bots.ts`'s own response-ranking heuristics (`totalCost()`), never by the engine
itself. `sparesCost` is *partially* real: three responses (`fight`, `improviseAdapter`,
`swapCartridge`) declare it, but only `fight`'s effect actually decrements
`system.spares` (conditionally, `if (system.spares > 0)`) — `improviseAdapter` and
`swapCartridge` declare a `sparesCost` and never touch `spares` at all. **No response is ever
blocked or made unavailable for insufficient spares or crew-hours** — every option is always
"affordable"; the cost fields are narrative/ranking labels only.

| Incident | Response | Declares | Actually writes | Note |
|---|---|---|---|---|
| fire-mir97 | `fight` | spares 1, crew-h 4 | `injuryFraction` −0.25, `spares` −1 (real) | |
| | `evacuate` | crew-h 2 | **nothing** | Its only effect is *not* applying `ignore`'s penalty |
| | `ignore` (default) | — | `injuryFraction` +0.2, `system.operational = false` | |
| depress-mir97 | `sealModule` | crew-h 2 | `power.arrayAreaLossM2` + (stops the leak) | Real, permanent |
| | `patchHull` | spares 2, crew-h 6 | **nothing directly** — stops the leak only via omitting `leavesOngoing` | Declared cost is fiction |
| | `ignoreLeak` (default) | — | **nothing directly** — leak continues via `leavesOngoing: true` | |
| o2tank-apollo13 | `improviseAdapter` | spares 1, crew-h 3 | `co2Kg` down, `scrubberEfficiencyFraction` permanent × (1−0.1) | Real |
| | `rationActivity` | crew-h 1 | **nothing** — `leavesOngoing: true` | **Functionally identical to the default below** |
| | `noResponse` (default) | — | **nothing** — `leavesOngoing: true` | Same state changes as `rationActivity` |
| coolant-ms22 | `shedLoad` | crew-h 6 | `habitatTempC` −8, every crop tray `healthFraction` − | Real |
| | `rideItOut` (default) | — | **nothing** — `leavesOngoing: true` | |
| spe-1972 | `shelterNow` | crew-h 2 | every living crew `location = "stormShelter"` | Real, read by `radiationStage` and `effectiveShieldingGPerCm2` |
| | `continueOperations` (default) | — | **nothing** | |
| duststorm-2018 | `cleanArrays` | crew-h 3 | `dustObscurationFraction` −0.15 | Real |
| | `shedNonEssential` | crew-h 1 | `dustObscurationFraction` −0.05 | Real, smaller |
| | `noResponse` (default) | — | **nothing** | |
| scrubber-iss | `swapCartridge` | spares 1, crew-h 2 | `system.operational = true` | Spares cost is fiction (never deducted) |
| | `manualVenting` | crew-h 3 | `co2Kg` × 0.7 | Scrubber stays broken — subject to the 0.15/h auto-repair regardless |
| | `noResponse` (default) | — | **nothing** | |

**One genuinely cosmetic decision, matching the brief's own definition exactly:**
`o2tank-apollo13`'s `rationActivity` response and its `noResponse` default write the *same
nothing* and both leave the CO2 rise running (`leavesOngoing: true`) — choosing
`rationActivity` over doing nothing at all currently has **zero effect** on any state the
outcome or failure paths read.

## Part B — the identical greedy/prudent success counts (answered empirically)

Ran a 30-seed, seed-by-seed comparison of `greedyBot` vs `prudentBot` on First Light and The
Long Night at Nominal, comparing status, elapsed hour, each incident's chosen response, and a
hash of the full final state (read-only script, not committed).

**Result: category (b) — "counts equal but per-seed outcomes differ — coincidence,
harmless."** `identicalOutcome: 30/30` (status and hour always match) but
`identicalHash: 0/30` (the full final state is different on *every single seed*) and
`differentResponseChoices: 30/30` (the two bots never pick the same response to the same
incident). This is **not** category (c) — decisions clearly do write different state, every
time. They just aren't the deciding factor between success and failure on these two scenarios
at Nominal difficulty specifically: both bots' real choices are "good enough" to survive
there, consistent with §3's finding that unenforced cost fields and the disconnected Station
model mean the *specific* response chosen (beyond "did something address the incident's root
cause or not") often doesn't move the needle until Flight-Rated, where the earlier
`docs/BALANCE.md` numbers already show real separation between idle/greedy/prudent.

## Summary for M7.6 Parts C and D

Findings that most directly inform what's next:
- The unenforced `crewHoursCost`/`sparesCost` fields and the disconnected Station model are
  the most likely root cause of weak decision-sensitivity at lower difficulties — Part C's
  `worstChoiceBot` and counterfactual tests will make this precisely measurable per incident.
- `o2tank-apollo13`'s `rationActivity` is a confirmed cosmetic decision today — a concrete,
  fixable example for Part C's counterfactual test to catch.
- jezero-outpost's `primaryGoal` check and the entirely-dead `stretchGoal` field are the
  concrete blockers for M7.5 step 4 (Flight-Rated success requiring goals met).
- ABORT's unreachability by any bot is worth a decision in Part D or M8: either give a bot a
  reason to abort, or accept it stays player-only until M8's UI exists.

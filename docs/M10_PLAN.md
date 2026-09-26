# M10 — Shareable seeded runs + mission report (plan)

## Status (updated 2026-09-26)

**Done and pushed to `main`:** M10.1 (`ef94762`), M10.2 (`01455ab`), M10.3 (`7e6e5b4`).
**Just finished, not yet merged:** M10.4 (`packages/sim/src/engine/replay.ts`,
`store/run.ts`'s `inputLog`) and M10.5 (`apps/web/src/share/runLink.ts` + `binaryCodec.ts`).
No `SIM_VERSION` bump for either: M10.4 only adds a call path for five decisions that used to
mutate `SimState` with no log entry at all, plus a pure replay driver over the exact same
path; M10.5 is `apps/web`-only.
**Not started:** M10.6 through M10.9 — the dependent chain below.

**Disclosed gap for M10.6/M10.7 to pick up**: `RunStore` (`apps/web/src/store/run.ts`) carries
`params`/`scenario` but not the three setup choices (`landingSiteId`/`powerArchitecture`/
`shieldingApproach`) that produced `scenario` — `buildCustomScenario` bakes them into numeric
fields (`solarArrayAreaM2`, `shieldingGPerCm2`, …) and discards the ids themselves, and
`useSetup`'s wizard state resets on `commit()`. `share/runLink.ts`'s `RunLinkConfig` needs all
three to encode a link. M10.5's own tests construct a `RunLinkConfig` directly rather than
from a live run, since nothing in the app currently holds one mid-mission. "Create class
link" (setup-time, M10.7) is unaffected — `useSetup`'s own fields are still live at that
point — but "Copy report link" from a finished/in-progress run needs `RunStore` to start
carrying these three fields (set once at `reset()`, alongside `params`/`scenario`) before
M10.7 can build a link from a real run.

## The brief's M10 text, verbatim

From `docs/PHASE2_BRIEF.md` lines 379–390:

```
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
```

Two wording details pinned before design:

- The URL field list ("scenario, difficulty, crew size, site, power choice, seed") predates
  M9.1d's `ShieldingApproach`, which is now a real setup choice that changes initial state
  (`sizeShielding` → `initial.shieldingGPerCm2`). Encoding it is mandatory for the done-when
  bar — the brief's list is a floor, not a ceiling.
- "optionally the compressed input log" attaches *optional* to **compression**; the separate
  "Replay: opening a report link replays the run's decisions at speed" bullet is not marked
  optional. Capturing/replaying the input log is in scope; compressing it is what needs a
  dependency ask.

## User decisions (confirmed 2026-09-25)

1. **Full replay (config + decision log)**, hand-rolled ~20-line varint + base64url codec, no
   compression dependency (measured: 660–1800 chars worst case, compression buys nothing).
2. **Bilingual scope**: report chrome (headings/labels/outcome/tables) gets real en+bn now;
   log-derived prose (`i18n/logText.ts`, decision timeline lines, causal-chain descriptions)
   stays English until M11 translates it — disclosed on the page and in each summary.
3. **SIM_VERSION bump rule added to CLAUDE.md**, next to the seven non-negotiables, plus
   `docs/ARCHITECTURE.md`.

Also proceeding (disclosed defects the milestone's own correctness depends on, not separately
blocked): fixing the duplicate-`EventId` bug in the player-decision path (`store/run.ts`'s
`resolveIncident` builds a second `EventLogger` for an hour the tick already logged), and
closing the "every browser run has used seed 1" gap (`Params.seed` is real and wired through
the sim, but no UI path has ever set it away from the default). **Both are done — M10.2 and
M10.3 above.**

## Verified findings

### 1. Seed — real sim field, never set by the UI (closed by M10.2)
`Params.seed: number` (`packages/sim/src/types.ts:129`) flows into `createRngState(params.seed)`
(`engine/state.ts:219`) and genuinely determines every stochastic draw across the seven RNG
streams. `DEFAULT_PARAMS.seed = 1` (`store/run.ts:61`) was never overridden before M10.2 —
every browser mission before it ran on seed 1. Fixed `apps/web`-side only (rule 2 unaffected):
`store/setup.ts` now rolls a real seed via `crypto.getRandomValues` at wizard-open time, shown
on Launch Packing with reroll + manual entry.

### 2. SIM_VERSION — now exists (closed by M10.1)
`packages/sim/src/version.ts` → `export const SIM_VERSION = 1` (plain integer, not semver),
re-exported from `index.ts`. Bump rule: any change to the tick pipeline/order, any model, any
`constants.ts`/`scenarios` value, the incident catalog or responses, the RNG or draw
count/order, `engine/state.ts`'s initial state, or `engine/setup.ts`'s sizing. Never for
`apps/web`, i18n, styling, docs. Enforced by `validation/simVersion.test.ts`'s golden
fingerprints. Documented in `CLAUDE.md` (new section) and `docs/ARCHITECTURE.md` §4.

### 3. Player-decision record — incident responses exist, five other input kinds don't (closed by M10.4)
`applyResponse`/`resolveResponseAttempt` (`engine/incidents.ts`) already logs chosen responses
with hour + station-recoverable data — decision timeline needs no new sim data for that part.
But `setSurvivalMode`, `setPriority`, `setCrewLocation`, `assignStation`, `setCommsPriority`
(`store/run.ts`) mutate `SimState` directly with **no log entry at all**, and each changes later
physics (rations, load-shed order, radiation exposure, station coverage, science-vs-morale).
Real, new plumbing needed — not an invented gap. **Closed by M10.4**: all six now go through
`applyInput`, each logging its own `decision.*` entry.

**Bug found and fixed (M10.3):** `EventLogger` ids are `${hour}:${seq}`, `seq` starting at 0
per *instance* (`engine/log.ts`). `tick()` builds one logger per hour; `store/run.ts`'s
`resolveIncident` builds a **second** logger for the same hour after the tick already logged
it → duplicate `4:0`, reproduced empirically (Jezero seed 7) and fixed by deriving the
starting `seq` from what that hour's entries already used. See `validation/log.test.ts`.

### 4. Class mission — pins the seed, does not omit it
Hypothesis inverted: a class link must **pin** the seed (same as a report link), or students get
different incident hours/rolls/outcomes and can no longer compare decisions, defeating the
classroom purpose. Mechanical difference from an ordinary link is only: created from Setup
before a mission is played, no input-log fragment (nothing played yet), lands on Briefing
instead of the Report.

### 5. Black Box Debrief overlap with the new Mission Report
`DebriefView.tsx` already has real outcome text, the strongest part (causal chain via
`majorIncidents`/`causalCascade`/`crewLossConditions`), but is missing crew+stations, site,
a station-tagged decision timeline, a "What NASA did" card, replay link, and is not i18n-wired.
Decision: **separate `views/Report/MissionReportView.tsx`**, not a DebriefView rewrite —
different jobs (interactive/exploratory vs. single linear printable page) and different
lifetimes (mid-app tab vs. landing page for an inbound link with no prior run). Shared logic
stays in `dial/blackBox.ts` + new small pure helpers.

"What NASA did" card: text-only, from `def.analogue` (e.g. "Progress–Mir collision and
depressurization, June 1997") + `SOURCE_REGISTRY[def.sourceId]` — no network/image fetch,
print-safe, zero invented facts.

### 6. Print CSS — none exists yet
No `@media print` anywhere in `styles.css`. New block at the end of the file: invert dark
panels to white/black-text for print, hide tab nav/header actions/Decision Card/EventFeed,
print link URLs after anchors, `page-break-inside: avoid` per section. Status still never
colour-alone on paper (existing `--pattern` classes already carry glyph + border, survives
greyscale). Note for whoever builds M10.8: `styles.css`'s existing `@media (prefers-reduced-
motion: reduce)` block was moved to the very end of the file in M9.7 specifically so a later
same-specificity rule can never silently out-rank it again (cascade-order bug, see that
commit) — add `@media print` before that block, or re-check the ordering doesn't reintroduce
a similar issue for anything print touches.

### 7. Compression — measured, not needed (see user decision 1 above)
Feature A (config in query string): 95–141 chars including origin. Feature B (input log in
fragment): 660–1800 base64url chars worst-case realistic play. No compression dependency
proposed or needed at these sizes.

### 8. i18n — confirmed paths
`apps/web/src/i18n/config.ts` → `./locales/en.json`/`./locales/bn.json`, i18next +
react-i18next. New `report` namespace in both files. `logText.ts` has no locale parameter
(English-only, M11's job) — see user decision 2.

### 9. No new Vercel function needed
Entirely client-side — a plain URL (`/?v=1&sc=...#i=...`), parsed in the browser. The fragment
is never sent to any server by HTTP definition. `CLAUDE.md`'s `/api` whitelisting rule doesn't
bind this directly, but its *spirit* does: every inbound URL field is whitelisted, range/union
checked, and anything unrecognised shows a visible "this link isn't valid" state rather than a
partially-applied mission.

## Design decisions

- **D1 — One input-application code path in the sim.** New `packages/sim/src/engine/replay.ts`:
  `RunInput` discriminated union (rations/priority/crewLocation/station/commsPriority/
  incidentResponse), `applyInput(ctx, input)`, `replayRun(params, scenario, inputs, throughHour)`.
  `store/run.ts`'s six mutators become thin wrappers calling `applyInput` + appending to a new
  `inputLog` in the **web store** (not `SimState` — keeps `SimState` a pure world snapshot,
  `runWithBot` untouched). Makes "replay reproduces play" true by construction.
- **D2 — `runFingerprint(state): string`** (FNV-1a over canonical key-sorted JSON) — printed on
  the report as a "run signature" line, gives the done-when e2e test something to assert
  without a debug-only `window` hook, gives a classroom a one-glance identical-mission check.
  **Done in M10.1** (`packages/sim/src/engine/fingerprint.ts`).
- **D3 — Seed generation lives in `apps/web`, never `packages/sim`** — `crypto.getRandomValues`
  at wizard-open, shown on Launch Packing with re-roll + manual entry. Rule 2 untouched.
  **Done in M10.2.**
- **D4 — Human-readable ids in the URL**, not packed indices — a URL is a save format with
  indefinite lifetime; `"jezero-outpost"` can't be silently re-pointed by a future enum reorder.

## Sub-parts

| # | Scope | Depends on | Status |
|---|---|---|---|
| M10.1 | `SIM_VERSION`, `runFingerprint()`, golden-fingerprint guard test, CLAUDE.md + ARCHITECTURE.md rule | — | **Done** (`ef94762`) |
| M10.2 | Real seed: `store/setup.ts` seed field (crypto-rolled), Launch Packing re-roll/manual entry, `commit()` wiring | — | **Done** (`01455ab`) |
| M10.3 | `EventLogger` starting-seq fix + duplicate-id regression test | — | **Done** (`7e6e5b4`) |
| M10.4 | `engine/replay.ts` (`RunInput`/`applyInput`/`replayRun`), `store/run.ts` mutators refactored onto it + `inputLog`, play-vs-replay equality test | M10.3 | **Done** |
| M10.5 | `share/runLink.ts` encode/decode, whitelist+validate every field, legacy-difficulty mapping, versionMismatch/invalid results, frozen-literal regression test | M10.1, M10.2, M10.4 | **Done** |
| M10.6 | Boot-time URL entry in App.tsx (3 modes: no params/config-only/config+fragment), version-mismatch banner | M10.5 | Not started |
| M10.7 | "Create class link" + "Copy report link" UI, clipboard + visible-input fallback | M10.5, M10.6 | Not started |
| M10.8 | `MissionReportView.tsx` + print CSS + `report` i18n namespace (both locales) | M10.6 | Not started |
| M10.9 | Replay-at-speed driver + done-when tests (Vitest determinism proof + e2e two-browser test) | M10.4, M10.6, M10.8 | Not started |

M10.4 onward is a strict dependency chain — start there next. Honest cut line if time runs
short: M10.9's e2e half (the Vitest proof alone still discharges the done-when claim) — raise
this with the user rather than taking the cut quietly.

## Verification per sub-part

`pnpm typecheck && pnpm lint && pnpm test` after each; `vercel build` before each commit.
New sim tests: golden fingerprint (M10.1, done), duplicate-EventId regression (M10.3, done),
play-vs-replay equality (M10.4, still to write). New web tests: codec round-trip +
frozen-literal decode + malformed/out-of-range rejection (M10.5). New `e2e/share.spec.ts` for
the two-browser done-when sentence (M10.9) — must use `e2e/fixtures.ts`. Manual: print-preview
in Chrome+Firefox, A4+Letter, both languages, a long run and a crew-loss run — confirm page
breaks, greyscale legibility, no NASA logo/insignia anywhere on the printed page (rule 5, extra
scrutiny since a printed artifact is most likely to be mistaken for official). Re-run
`e2e/offline.spec.ts` after M10.6.

## Critical files

- `apps/web/src/store/run.ts` — the five still-unrecorded mutations (`setSurvivalMode`,
  `setPriority`, `setCrewLocation`, `assignStation`, `setCommsPriority`) that M10.4 must
  refactor onto `applyInput` + a new `inputLog`
- `packages/sim/src/engine/log.ts` — `EventLogger` (seq fix already done),
  `causalCascade`/`rootCauses`/`directEffects` for the report's causal-chain section
- `packages/sim/src/index.ts` — public export surface; `SIM_VERSION`/`runFingerprint` and (as
  of M10.4) `RunInput`/`RecordedInput`/`applyInput`/`replayRun` all exported
- `apps/web/src/store/setup.ts` — `commit()` (now passes `seed`), `resolveScenario`
- `apps/web/src/App.tsx` — boot-time URL entry, new report view, three landing modes (all M10.6, not started)
- `apps/web/src/styles.css` — first `@media print` block (M10.8, not started) — mind the
  end-of-file ordering note in §6 above

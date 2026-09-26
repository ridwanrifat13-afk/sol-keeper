# M10 — Shareable seeded runs + mission report (plan)

## Status (updated 2026-09-26)

**Done and pushed to `main`:** M10.1 (`ef94762`), M10.2 (`01455ab`), M10.3 (`7e6e5b4`).
**M10.4 through M10.9 all done, not yet merged** — the whole M10 milestone is complete:
M10.4 (`packages/sim/src/engine/replay.ts`, `store/run.ts`'s `inputLog`), M10.5
(`apps/web/src/share/runLink.ts` + `binaryCodec.ts`), M10.6 (`share/bootRunLink.ts`,
`App.tsx`'s boot-time `useEffect`, the version-mismatch/invalid banner), M10.7 ("Create class
link" on Launch Packing, "Copy report link" on Debrief, the shared `CopyLinkButton` clipboard
+visible-fallback component), M10.8 (`views/Report/MissionReportView.tsx`, print CSS, the
`report` i18n namespace in both locales), and M10.9 (the replay-at-speed driver, `store/
replay.ts` + `components/ReplayControls.tsx`, plus the done-when tests). No `SIM_VERSION`
bump anywhere in the chain: M10.4 only adds a call path for five decisions that used to
mutate `SimState` with no log entry at all, plus a pure replay driver over the exact same
path; a small `data.crew` fix in that same file (M10.8, below) is a log *payload* change, not
a physics one; M10.5-M10.9 are otherwise `apps/web`-only.

**M10.9 — the replay-at-speed driver.** `share/bootRunLink.ts`'s config+fragment mode no
longer jumps straight to the final state (`replayRun`, instant — M10.6/M10.8's original
behaviour): it resets `useRun` to a fresh hour-0 run and hands the decoded input log to a new
`store/replay.ts` (`useReplay`), which ticks through the mission in real time at a chosen
speed (paused/1×/4×/16×, the same vocabulary `TimeControls` already uses), applying each
recorded input the instant `state.hour` reaches it — through the *same* six `useRun` mutators
a live player's own clicks call, so a replay logs and records exactly as the original play
did, not through a second copy of that logic. Deliberately not built on `useRun`'s own
`step()`: that one is shaped around the M8 core loop (Sol Planning's phase gate, auto-pause
so a real player can react) — nothing to react to here, since every decision is already
decided. `components/ReplayControls.tsx` (shown only while a replay is active, absent
entirely when `MissionReportView` is reached the normal way, via Debrief's "View printable
Mission Report") drives it with the same `useEffect`+`setInterval` shape `TimeControls` uses.
Because `MissionReportView` already renders from live `useRun` state, no separate "replaying"
layout was needed — the same page just fills in further as the replay ticks forward, landing
on the correct final outcome (or `outcomeRunning` if `throughHour` is reached before the
mission itself ends) once `useReplay.active` goes false.

**The done-when bar, discharged twice over.** `apps/web/tests/doneWhen.test.ts`: two entirely
independent `decodeRunLinkQuery`/`decodeRunLinkFragment`/`replayRun` calls from the identical
URL string (no shared object between them at all) produce byte-identical final states and
matching `runFingerprint`s, across an empty-decision run, a run recording all five
non-incident decision kinds, a run with a real `incidentResponse` (the one kind that draws
from RNG streams beyond the tick itself), and a full mission replayed to a genuine ending
(`"loss"`). `apps/web/tests/bootRunLink.test.ts`'s own new test complements this: it drives
the *actual shipped mechanism* (`applyRunLinkFromLocation` → `useReplay` ticked to completion,
no real timer) and checks it agrees with `replayRun` computed independently — proving the
mechanism a real browser runs is the same one the pure proof already covers.
`e2e/share.spec.ts` proves it the other way: two real, separate Chromium contexts open the
identical URL, each runs the real replay-at-speed driver (fast-forwarded via the on-page 16×
control, never a test-only shortcut), and both end on the same `MissionReportView`-printed run
signature and the same outcome text. **Manually verified passing** against the sandbox's full
Chromium binary via a local, uncommitted config override (the standard `pnpm exec playwright
test` invocation still hits the same missing-`chrome-headless-shell` environment blocker
flagged in the M10.6 summary — unrelated to this spec's own correctness, confirmed by the
override run passing outright).

**M10.8 also closed a real presentation gap M10.4 left open**: the five player-decision log
codes (`decision.rations.set`, `.priority.changed`, `.crewLocation.set`, `.station.assigned`,
`.commsPriority.set`) had no `i18n/logText.ts` templates at any Reality Dial level, so any of
them rendered as their own raw code string in `DebriefView`'s mission log and `EventFeed` —
not just a Mission Report gap, a live regression in every mission played since M10.4 shipped.
Closed: templates added at all three levels (`SPECIALIST`/`CADET`/`COMMANDER`), a new
`commsPriorityLabel` in `dial/labels.ts`, and `resolveField` branches for `station`/`priority`/
`direction`. Alongside it, `engine/replay.ts`'s `crewLocation`/`station` cases now log the
crew member's display name (`data.crew`), not the internal `crewId` — the same convention
every other crew-naming log entry already followed, but M10.4 itself missed it.

**The M10.6/M10.7 disclosed gap is closed.** `RunStore` (`apps/web/src/store/run.ts`) now
carries a `setupChoices: RunSetupChoices` field (`landingSiteId`/`powerArchitecture`/
`shieldingApproach`) alongside `params`/`scenario`, set by every `reset()`/`loadReplayedRun()`
call — `store/setup.ts`'s `resolveScenario()` now returns `{ scenario, setupChoices }` (was
just `Scenario`) so `commit()` threads the wizard's real choices straight through instead of
resolving the "no site chosen yet" default a second time; every pre-M9 caller with no choices
of its own (`ScenarioSwitch`, `TimeControls`' Restart, a bare `reset()` in a test) gets the
same default `resolveScenario` already used for an unvisited setup step. "Copy report link"
(M10.7) can now build a `RunLinkConfig` from any live `RunStore` via `params` + `setupChoices`.

**M10.6's own forward note is resolved**: `App.tsx`'s boot-time effect now lands a
config+fragment link (a report/replay link) on M10.8's real `MissionReportView`, not Debrief —
the one `setView("debrief")` call the M10.6 summary flagged is now `setView("report")`.
`configOnly`'s `setView("briefing")` is unchanged (the class-mission landing spot never
moved). M10.9 replaced the instant `loadReplayedRun` (which used to jump straight to the
final state via `replayRun`) with the real animated replay-at-speed driver — see the M10.9
status note above.

Manually verified in a real Chromium browser (via Playwright, `vite preview` against a
production build) — see the boot-mode screenshots sent alongside the M10.6 summary: fresh
load opens Setup with no banner; a config-only link lands on Briefing at hour 0; a
config+fragment link lands on the Mission Report (updated from M10.6's own Debrief interim
target) with the exact replayed hour, event log, and resource state; a version-mismatch link
and an invalid link both show their own dismissible banner and otherwise degrade to a fresh
Setup exactly like opening the app with no link at all.

**M10.8, also manually verified end to end**: a finished-mission report link (`vite preview`
against a production build, real Chromium) renders every required section — outcome, the
real crew roster with real names/stations, landing site, a station-tagged decision timeline
with real log text, the Black Box causal chain, a "What NASA did" card citing a real
`SOURCE_REGISTRY` entry, the replay-link section, and the data-sources footer. Switching the
language toggle to Bangla re-renders every `t()`-driven heading/label/outcome string in
Bangla, while log-derived text (station names, decision text, causal-chain descriptions)
correctly stays English either way, matching the page's own disclosure note. Emulating print
media confirms the tab nav, header actions, the Report's own "Back"/print-hint toolbar, and
the "Copy report link" section all disappear (`display: none`), and a real
`page.pdf()`-generated PDF (screenshots + PDF sent alongside this summary) shows a clean,
black-on-white, chrome-free printout.

**M10.7, also manually verified end to end**: clicking "Create class link" on Launch Packing
copies a real link to the clipboard (confirmed via a real Chromium clipboard read, not just
that the button exists) and shows the visible fallback field either way; opening that exact
link lands on Briefing with the same configuration. Clicking "Copy report link" on Debrief —
while a mission is still running, not only once it's finished — likewise copies a working
link; opening it lands on Debrief with the replayed state. `buildRunLinkUrl` (`share/
runLink.ts`), `buildClassLinkConfig` (`store/setup.ts`), and `runLinkConfigFromStore`
(`store/run.ts`) are the three pure, unit-tested functions behind both buttons — `CopyLinkButton`
itself (`components/CopyLinkButton.tsx`) is the one place the Clipboard API is called, with a
visible read-only input as the fallback for a non-secure origin, an unsupported browser, or a
declined permission.

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

### 5. Black Box Debrief overlap with the new Mission Report — closed by M10.8
`DebriefView.tsx` already had real outcome text, the strongest part (causal chain via
`majorIncidents`/`causalCascade`/`crewLossConditions`), but was missing crew+stations, site,
a station-tagged decision timeline, a "What NASA did" card, replay link, and was not i18n-wired.
Built as a **separate `views/Report/MissionReportView.tsx`**, not a DebriefView rewrite —
different jobs (interactive/exploratory vs. single linear printable page) and different
lifetimes (mid-app tab vs. landing page for an inbound link with no prior run). Shared logic
(`majorIncidents`/`groupIncidents`/`causalCascade`/`directEffects`/`logText`) stays reused
from `dial/blackBox.ts` and `@sol-keeper/sim` directly; two new small pure helpers were added
rather than folded into `blackBox.ts` itself, since neither is about incident-grouping or
crew loss: `dial/decisionTimeline.ts` (station-tagging) and `dial/whatNasaDid.ts` (the NASA
analogue cards). `DebriefView` keeps its own "Copy report link" (useful mid-mission, per
finding #4's own "Copy report link ... works at any point in a run") and gains a new "View
printable Mission Report" link once a mission ends, so a normal playthrough — not just an
inbound link — has a real way to reach the Report.

"What NASA did" card: text-only, from `def.analogue` (e.g. "Progress–Mir collision and
depressurization, June 1997") + `SOURCE_REGISTRY[def.sourceId]` — no network/image fetch,
print-safe, zero invented facts.

### 6. Print CSS — closed by M10.8
Added directly before the `@media (prefers-reduced-motion: reduce)` block (per this finding's
own ordering note — M9.7 moved that block to the very end of the file specifically so a later
same-specificity rule can never silently out-rank it again). Inverts `--bg`/`--bg-panel`/
`--line`/`--text`/`--text-dim`/`--shell-*` to a black-on-white palette (leaves `--nominal`/
`--caution`/`--critical` alone — a colour printer still shows them, a black-and-white one
already has the glyph + border); hides `.app-head-row` (tab nav + header actions),
`.decision-card-overlay`, `.event-feed-panel` (a class added to `EventFeed.tsx` specifically
so this rule has something to target), `.coach-mark`, `.credits`, `.run-link-banner`, and the
Report's own `.report-toolbar`/`.report-no-print` (its "Back" button and "Copy report link"
section — dead links on paper); prints every link's `href` after it via `a[href]:after`;
`page-break-inside: avoid` on `.panel`/`.nasa-card`/`.report-decision-row`/`.incident-row`/
`.crew-loss-report`. Status still never colour-alone on paper (existing `--pattern` classes
already carry glyph + border, survives greyscale, untouched by this block).

### 7. Compression — measured, not needed (see user decision 1 above)
Feature A (config in query string): 95–141 chars including origin. Feature B (input log in
fragment): 660–1800 base64url chars worst-case realistic play. No compression dependency
proposed or needed at these sizes.

### 8. i18n — confirmed paths, `report` namespace closed by M10.8
`apps/web/src/i18n/config.ts` → `./locales/en.json`/`./locales/bn.json`, i18next +
react-i18next. `report` namespace now real in both files (37 keys each, key sets checked
identical) — headings, labels, per-`RunStatus` outcome title+detail, table headers, section
hints, the page's own bilingual-scope disclosure line. `logText.ts` still has no locale
parameter (English-only, M11's job) — see user decision 2; the Report page cites this
directly in its own `report.disclosureNote`.

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
| M10.6 | Boot-time URL entry in App.tsx (3 modes: no params/config-only/config+fragment), version-mismatch banner | M10.5 | **Done** |
| M10.7 | "Create class link" + "Copy report link" UI, clipboard + visible-input fallback | M10.5, M10.6 | **Done** |
| M10.8 | `MissionReportView.tsx` + print CSS + `report` i18n namespace (both locales) | M10.6 | **Done** |
| M10.9 | Replay-at-speed driver + done-when tests (Vitest determinism proof + e2e two-browser test) | M10.4, M10.6, M10.8 | **Done** |

M10.1 through M10.9 are all done — the whole M10 milestone is complete. The e2e half of the
done-when bar was not cut: `e2e/share.spec.ts` exists and passed against the sandbox's full
Chromium binary (a local, uncommitted config override — see the M10.9 status note above for
why the standard invocation doesn't run in this sandbox at all).

## Verification per sub-part

`pnpm typecheck && pnpm lint && pnpm test` after each; `vercel build` before each commit (not
run in this sandbox — the CLI isn't installed here; flagged to the lead developer in the M10.4
summary). New sim tests: golden fingerprint (M10.1, done), duplicate-EventId regression
(M10.3, done), play-vs-replay equality (M10.4, done). New web tests: codec round-trip +
frozen-literal decode + malformed/out-of-range rejection (M10.5, done); the two done-when
Vitest suites (`doneWhen.test.ts`, `bootRunLink.test.ts`, M10.9, done). `e2e/share.spec.ts`
for the two-browser done-when sentence (M10.9, done) uses `e2e/fixtures.ts` as required.
Manual: print-preview verified (Chromium's own PDF output confirmed in M10.8's summary; the
lead developer separately confirmed Firefox/A4+Letter/a crew-loss run's print output). Re-run
`e2e/offline.spec.ts` after M10.6: still blocked
on the same missing-`chrome-headless-shell` sandbox issue, unrelated to any M10 change.

## Critical files

- `apps/web/src/store/run.ts` — the five decisions (`setSurvivalMode`, `setPriority`,
  `setCrewLocation`, `assignStation`, `setCommsPriority`) refactored onto `applyInput` + a new
  `inputLog` (M10.4, done) — the same six mutators `store/replay.ts` (M10.9) dispatches
  recorded inputs through, so a replay logs and records exactly as the original play did
- `packages/sim/src/engine/log.ts` — `EventLogger` (seq fix already done),
  `causalCascade`/`rootCauses`/`directEffects` used by both `DebriefView` and the report's
  causal-chain section
- `packages/sim/src/index.ts` — public export surface; `SIM_VERSION`/`runFingerprint`,
  `RunInput`/`RecordedInput`/`applyInput`/`replayRun` all exported (M10.1/M10.4)
- `apps/web/src/store/setup.ts` — `commit()` (passes `seed`), `resolveScenario`,
  `buildClassLinkConfig` (M10.7)
- `apps/web/src/App.tsx` — boot-time URL entry and its three landing modes (M10.6); routes a
  config+fragment link to `views/Report/MissionReportView.tsx` (M10.8), which starts a replay
  via `store/replay.ts` (M10.9) rather than jumping straight to the final state
- `apps/web/src/store/replay.ts` + `components/ReplayControls.tsx` — the replay-at-speed
  driver and its speed controls (M10.9)
- `apps/web/src/styles.css` — the `@media print` block (M10.8), placed directly before the
  reduced-motion block per §6's own ordering note
- `apps/web/src/i18n/logText.ts` + `dial/labels.ts` — the five `decision.*` codes' templates
  and the `station`/`priority`/`direction` `resolveField` branches (M10.8), closing a gap
  M10.4 left open (see the M10.8 status note above)
- `apps/web/tests/doneWhen.test.ts` + `e2e/share.spec.ts` — the done-when proof, at the pure
  decode-and-replay level and via two real browser contexts (M10.9)

# Device test checklist (M11)

CLAUDE.md rule 6: "Must run on a low-end Android phone and work offline after first load."
`scripts/lighthouse.ts` and `e2e/fps.spec.ts` check the closest automated stand-ins
(Lighthouse's mobile CPU/network throttle, a CDP-throttled Playwright run) on every CI-style
run, but neither one is a real phone. This checklist is what the lead developer runs by hand,
on an actual low-end device, before a release — the automated checks catch regressions between
manual passes, they don't replace this one.

No number below is invented: where a bar exists already (30+ FPS, the M9 done-when text),
it's repeated from `scripts/lighthouse.ts`/`e2e/fps.spec.ts` rather than re-guessed. Where this
checklist asks for a judgment call ("feels responsive"), that's disclosed as exactly that.

## What counts as "a low-end Android phone" here

Whatever real device the lead developer has that is closest to Lighthouse's own mobile
emulation target (a Moto G4-class device, per `scripts/lighthouse.ts`'s own comment) — a
budget or 3+ year old Android phone, not a current flagship. Note the actual model/Android
version/browser used when running this checklist; "low-end" is relative and the note is what
makes a later re-run comparable.

## Using the `?debug=1` overlay

Open the app with `?debug=1` appended to the URL (e.g. `https://.../?debug=1` or, for a local
build, `http://localhost:4173/?debug=1`) to show a small on-screen panel with:

- **FPS** — real `requestAnimationFrame` frames per second, sampled continuously in ~0.5 s
  windows (the same technique `e2e/fps.spec.ts` uses, just running live instead of once in CI).
- **Memory** — `performance.memory.usedJSHeapSize` in MB. Chromium-only (same caveat as
  `store/accessibility.ts`'s own `navigator.deviceMemory` guard) — shows "n/a" on Firefox/
  Safari rather than a fake number.
- **Tick** — the last simulation tick's wall-clock time in ms, plus a running average, so a
  slow tick (e.g. a heavy incident-resolution hour) is visible rather than hidden inside an
  overall FPS number that a paused clock would show as fine regardless.

It costs nothing to leave off a shared link — it only appears when `?debug=1` is explicitly in
the URL, and it renders nothing (not even a hidden DOM node) otherwise.

## Checklist

Run through a full mission (Setup -> Briefing -> a few sols -> an incident -> Debrief -> Data
Sources) on the device, with `?debug=1` on for the first pass:

- [ ] **Cold load.** First load over the device's real network (not desktop Wi-Fi tethered to
      the phone) is tolerable — no blank white screen for more than a few seconds.
- [ ] **FPS while idle.** `?debug=1`'s FPS reading stays at or above 30 while sitting on the
      Habitat view doing nothing (the same bar as `e2e/fps.spec.ts`'s idle check).
- [ ] **FPS during the establishing-shot transit animation** (Setup step 5) stays at or above
      30 while the animation is actually playing.
- [ ] **Low-power mode measurably helps.** Toggle it on; the transit animation's frame count
      drops to near-zero (it should freeze, not just slow down) and FPS elsewhere either stays
      the same or improves — it should never make things worse.
- [ ] **Tick time stays reasonable.** Run at 16× speed for at least one full sol; `?debug=1`'s
      tick average does not visibly climb over the run (a climbing average across a long run,
      as opposed to one slow tick during a heavy incident hour, would point at a real leak or
      an O(n) growth this checklist exists to catch before a release).
- [ ] **Memory stays bounded.** If the device is Chromium-based, `?debug=1`'s memory reading
      should not climb continuously over a full mission — some growth then a GC dip is normal;
      a straight upward line across 30 sols is not.
- [ ] **Touch targets are usable** with a real thumb, not a mouse cursor — station tabs,
      Decision Card response buttons, the ration-mode buttons, the time-control buttons.
- [ ] **Every gauge's low/caution/critical state is distinguishable without color** — squint
      test or a grayscale screenshot: icon + pattern + text should still tell the states apart
      (CLAUDE.md rule 6).
- [ ] **Offline after first load.** Load the app once with network on, then turn on airplane
      mode and reload. The app shell, a mission already in progress, and Live Sky's last-cached
      snapshot data should all still work (`vite.config.ts`'s own `VitePWA`/Workbox setup is
      what this is actually testing — this step just confirms it works on a real device, not
      only in a desktop DevTools "offline" simulation).
- [ ] **Rotation.** Portrait is the primary orientation this app is designed for; landscape
      should not visibly break layout (clipped buttons, unreadable text) even if it isn't the
      polished case.
- [ ] **Text scaling.** With the phone's own OS-level font-size setting turned up one notch,
      no text is clipped or overlapping.
- [ ] **The Reality Dial and language switch both work** and their choice survives a reload
      (both are `localStorage`-backed — confirms it isn't silently failing under this browser's
      real storage/private-mode behavior, unlike a desktop dev session that never hits that
      edge).

## Recording the result

Note, in the PR or milestone summary that references this checklist, at minimum: device model,
Android version, browser (and version), and which of the above passed/failed/was not
applicable. A partial run (e.g. only the FPS/memory/offline checks, skipping rotation) is more
useful recorded honestly than not recorded at all.

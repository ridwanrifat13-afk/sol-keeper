# Station photo sources — not served

Raw source photographs for `scripts/generate-station-images.ts` (`pnpm gen:station-images`),
which reads every `*.jpg`/`*.png` here and writes resized/re-encoded derivatives into
`apps/web/public/stations/` — the one directory the app actually references.

**Deliberately outside `apps/web/public/`.** These sources run 1.7–2.3MB each; the first time
they sat under `public/stations/`, `vite-plugin-pwa`'s service-worker precache step hard-failed
the production build the instant any precached asset exceeded its 2MB default (confirmed
directly, not a hypothetical — see the build error this moved them to fix). Keeping them here
means Vite never copies them into `dist/` and the PWA precache never sees them at all.

Provenance for every image here is tracked in `apps/web/public/stations/CREDITS.md`, not in
this file.

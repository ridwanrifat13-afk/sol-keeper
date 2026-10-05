# Station cockpit photographs — provenance

M9.1's own "Provenance and disclosure (REQUIRED)" section. One entry per image this folder's
derivatives are generated from, stating how it was produced and who holds the rights, before
it ships.

## power / comms / incidentCommand / missionCommand / lifeSupport × moon / mars (ten images)

**Status: provenance not yet recorded — flagged, not resolved.** Ten real, multi-monitor
console photographs supplied by the lead developer directly into this project (originals in
`apps/web/stations-src/`, not served — see that directory's own note, and
`scripts/generate-station-images.ts`'s doc comment, for why), replacing the single
stock-photo placeholder (`moon-lifeSupport.jpg`) this mechanism was originally demonstrated
against. Source filenames: `{moon-,mars-}{power,comms,incidentCommand,missionCommand,
lifeSupport}.{png,jpg}`.

- What they show: realistic multi-screen mission-control console interiors (wall-mounted
  monitor arrays, physical control panels, keyboards), one per station per body — no NASA
  logo, insignia, or "meatball" visible in any of them (brief rule 5, checked directly).
- How they reached this project: supplied by the lead developer as local files. **I do not
  know the tool, prompt, process, or date used to produce them, or who holds the rights** —
  per the brief's own instruction ("Flag to me any image where you cannot determine
  provenance"), this is that flag. If these are AI-generated, the brief notes Space Apps
  separately requires disclosing that in the project submission, not just here.
- **Lead developer: please fill in, per image or as one note covering all ten if they share
  a single source/process:** the tool or model used (if AI-generated), the prompt or process,
  the date, and who holds the rights to the output. Until this is filled in, do not treat
  these as cleared for public submission.

None of the ten has been calibrated yet (`/cockpit-calibrate`) — `screenMaps.ts` is
deliberately empty, so every station renders Classic view only until a real, drag-calibrated
entry is added for it.

## moon-lifeSupport.jpg (retired placeholder — no longer in this folder)

The original stock-photo placeholder (a broadcast video monitor, background removed,
provenance also unresolved) this mechanism was first built and demonstrated against has been
deleted, along with its generated derivatives and its screenMaps.ts entry (calibrated against
that specific image's geometry — meaningless for the real photograph above). Nothing to
migrate; this note exists only so a reader of git history isn't left guessing why it vanished.

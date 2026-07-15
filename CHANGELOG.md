# Changelog

## 0.1.5

### Added
- **Climbs tab** — every categorised climb of the stage, with its foot, length, average
  gradient and ascent, plus a classification of who has climbed it fastest: ascent time,
  gap to the best, VAM and average speed. Everything comes from the race's own official
  climb data, so names, categories and distances are the ones on the roadbook. Summit
  finishes are included. In a replay every climb is filled in from the moment the stage
  loads; live, riders are timed as they climb. Note that the feed stops following most of
  the field a few kilometres from the line, so a summit finish times only the riders it
  was still tracking.

### Fixed
- **VAM over 500 m / 1 km / 5 km never appeared live** — the windowed VAM needs altitude,
  and the live feed turns out to never send it (`mAlt` is absent from every rider of every
  live frame). It only ever worked on stages imported from ASO's official files, which
  reconstruct altitude themselves. The stage's official altimetry (`trace.json`) is now
  loaded for the live stage too, so all four VAM figures work everywhere; recordings carry
  their own copy so replays stay self-contained. No manual per-stage setup any more.
- **Windowed VAM showing impossible values** — a feed resync can teleport a rider a
  kilometre in one 6 s frame, which produced VAMs up to 32000 m/h. Such windows are now
  rejected, and the 500 m / 1 km / 5 km figures are held to a ceiling no one can sustain.
  The instantaneous VAM is untouched: it is a momentary speed × grade reading, and riders
  attacking a steep ramp really do spike it.
- **Windowed VAM hidden whenever the instantaneous one was missing** — the group row gated
  all four figures on the instantaneous VAM, which drops out on every flat metre; the row
  now shows whenever any figure is available.
- **Stage 9 (2026-07-12) length wrong** — listed as 185.48 km instead of 154.6 km.

## 0.1.4

### Added
- **VAM (average climbing speed)** — per-group and per-rider vertical ascent speed in
  m/h, shown in the group rows and the rider card. Four figures: an instantaneous value
  (from the feed's speed × grade) plus rolling windows over the last 500 m, 1 km and 5 km
  of road. Vertical gain is read from the clean stage profile, falling back to the feed's
  GPS altitude when no profile is loaded. History is kept per rider, so the values stay
  correct as groups split and merge; a group shows its best climber's VAM, and values are
  hidden on flat/descent. Works in both live and replay.

### Fixed
- **Replay stalling on feed gaps** — fast-forward speeds (×5–×60) no longer freeze for
  minutes on gaps in a recording (feed drops, neutralized zones); the inter-tick wait is
  capped in those modes only. ×1 still plays gaps faithfully so the replay stays aligned
  with the live TV broadcast.
- **Gradient with long decimals** — road grade from the backend-sourced stages showed
  many decimal places in the group row; it's now rounded to one decimal.

## 0.1.3

### Fixed
- **Replay caching** — stages failed to load with `DataCloneError: #<Object> could not
  be cloned` on install (the reactive index entry reached IndexedDB as a Svelte proxy).
  The entry is now round-tripped to a plain object before caching. This shipped in code
  after 0.1.2 was published but was never released.
- **Replay showed the wrong stage** — every recording opened as "Stage 4" because the
  stage was picked as the first key of the embedded season map instead of by the
  recording's own date. Now selected by date.
- **Replay scrubber double-playback** — dragging the timeline while playing made the
  thumb fight between the playback position and the drag target ("two flows"). The
  scrubber now suspends playback while dragging and resumes on release.
- **Replay play/pause** — the button decided its action from a mirror of the play state
  that could desync; it now toggles off the replayer's real state.

### Added
- **Official replay source** — stages can be archived from ASO's post-stage static files
  (per-rider `positions.csv` in the public bucket) via `data-repo/import-official.mjs`,
  converted into the same recording format the live recorder produces. Primary VOD
  source; the live SSE recorder stays as a fallback. (Data-repo tooling only — no
  extension-facing change.)

# Changelog

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

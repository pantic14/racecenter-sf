// @ts-check

// In dev the Vite proxy handles CORS; the built extension page needs absolute URLs
// because its origin is chrome-extension:// (host_permissions bypasses CORS there).
export const BASE_URL = import.meta.env.DEV ? '' : 'https://racecenter.letour.fr';

export const YEAR = new Date().getUTCFullYear();
export const RACE_KEY = `racecenter.letour.fr-${YEAR}`;
export const TELEMETRY_BIND = `telemetryCompetitor-${YEAR}`;

/**
 * The live-stream channel carrying a stage's checkpoints — the same payload the REST
 * endpoint serves, re-sent whenever ASO refreshes the roadside weather. Keyed by stage, not
 * just season, unlike the telemetry one.
 * @param {number} stage
 */
export const checkpointBind = (stage) => `checkpoint-${YEAR}-${stage}`;

// ASO's public asset bucket (the one dansmacourse.letour.fr reads). Serves each stage's
// official altimetry — our only altitude source for a live stage, since the telemetry feed
// never sends mAlt. Open CORS (`access-control-allow-origin: *`), so it needs no
// host_permissions, and each stage's trace is published days BEFORE the stage runs.
// The bucket hash is an ASO build env var: undocumented, may rotate per season.
export const BUCKET_BASE = 'https://storage.googleapis.com/tdf-prod-assets-7d6b412378cb7194';

/** @param {number} stage stage number (not the date) */
export const traceUrl = (stage) => `${BUCKET_BASE}/tdf/${YEAR}/stage-${stage}/trace.json`;

// Public data repo hosting stage recordings for replay (M6), baked in — users only
// pick from the available recordings, they never configure a URL. raw.githubusercontent
// serves index.json + the recordings with open CORS. See doc/replay-plan.md.
export const DATA_REPO_URL = 'https://raw.githubusercontent.com/pantic14/racecenter-data/main';

// The official stage distances differ from the ones used in the live gps data;
// these corrections are applied with existence guards in api.js.
export const STAGE_LENGTH_OVERRIDES = {
  '2026-07-04': 19.53,
  '2026-07-05': 168.4,
  '2026-07-06': 195.87,
  '2026-07-07': 181.87,
  '2026-07-08': 158.22,
  '2026-07-09': 186.17,
  '2026-07-10': 175.06,
  '2026-07-11': 180.37,
  // 154.6, not 185.48 (a straight typo) and not the 159.42 the stage's trace.json claims:
  // every other stage's official distance agrees with its trace to 2 dp, but stage 9's
  // trace holds the neutral-inclusive length. The feed itself tops out at 154.61.
  '2026-07-12': 154.6,
  '2026-07-14': 166.59,
  '2026-07-15': 161.29,
  '2026-07-16': 179.03,
  '2026-07-17': 205.78,
  '2026-07-18': 155.23,
  '2026-07-19': 183.82,
  '2026-07-21': 26.09,
  '2026-07-22': 174.61,
  '2026-07-23': 185.15,
  '2026-07-24': 127.87,
  '2026-07-25': 170.81,
  '2026-07-26': 132.94,
};

// Race-local "today": stages run in CEST and finish before ~18:00,
// so UTC+2 gives the right stage date at any hour of the day.
export function raceToday() {
  return new Date(Date.now() + 2 * 3600 * 1000).toISOString().split('T')[0];
}

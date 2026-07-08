// @ts-check

// In dev the Vite proxy handles CORS; the built extension page needs absolute URLs
// because its origin is chrome-extension:// (host_permissions bypasses CORS there).
export const BASE_URL = import.meta.env.DEV ? '' : 'https://racecenter.letour.fr';

export const YEAR = new Date().getUTCFullYear();
export const RACE_KEY = `racecenter.letour.fr-${YEAR}`;
export const TELEMETRY_BIND = `telemetryCompetitor-${YEAR}`;

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
  '2026-07-12': 185.48,
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

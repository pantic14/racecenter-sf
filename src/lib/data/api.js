// @ts-check
import { BASE_URL, YEAR, STAGE_LENGTH_OVERRIDES, raceToday, traceUrl } from '../config.js';

async function fetchJson(path) {
  const res = await fetch(BASE_URL + path);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  if (res.status === 204) throw new Error(`${path} -> empty response (204)`);
  return res.json();
}

/** @returns {Promise<Record<number, any>>} bib -> rider info (names, team, photo, nationality) */
export async function fetchRiders() {
  const list = await fetchJson(`/api/allCompetitors-${YEAR}`);
  /** @type {Record<number, any>} */
  const byBib = {};
  for (const r of list) {
    if (r.bib) byBib[r.bib] = r;
  }
  return byBib;
}

/** @returns {Promise<any[]>} */
export async function fetchTeams() {
  return fetchJson(`/api/team-${YEAR}`);
}

/**
 * @returns {Promise<{stages: Record<string, any>, today: string, currentStage: any}>}
 * stages keyed by 'yyyy-mm-dd'; today clamped into the race window.
 */
export async function fetchStages() {
  const list = await fetchJson(`/api/stage-${YEAR}`);
  list.sort((a, b) => (a.date < b.date ? -1 : 1));

  /** @type {Record<string, any>} */
  const stages = {};
  let first = '9999-99-99';
  let last = '0000-00-00';
  for (const s of list) {
    const date = s.date.substring(0, 10);
    s.name = `Stage ${s.stage} - ${s.arrivalCity?.label ?? ''}`;
    if (STAGE_LENGTH_OVERRIDES[date] != null) s.length = STAGE_LENGTH_OVERRIDES[date];
    stages[date] = s;
    if (date < first) first = date;
    if (date > last) last = date;
  }

  let today = raceToday();
  if (today < first) today = first;
  if (today > last) today = last;

  return { stages, today, currentStage: stages[today] };
}

/**
 * A stage's checkpoints: ASO's own points of interest along the route. Carries the
 * categorised climbs (name, length, gradient, category) and per-point weather — including
 * rain, which the telemetry feed has never had. Available for every stage of the season,
 * past and future, so no sniffing or guessing is needed.
 * @param {number} stage stage number
 */
export async function fetchCheckpoints(stage) {
  return fetchJson(`/api/checkpoint-${YEAR}-${stage}`);
}

/**
 * A stage's official altimetry from ASO's bucket — the altitude source for a live stage,
 * since the telemetry feed carries no mAlt. Unlike the profile CSV this needs no
 * per-stage URL sniffing and is published before the stage runs. Open CORS, so it goes
 * direct in dev too (no Vite proxy needed).
 * @param {number} stage stage number
 */
export async function fetchTrace(stage) {
  const url = traceUrl(stage);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

/** @param {string} url absolute or site-relative profile CSV url */
export async function fetchProfileCsv(url) {
  // Strip the racecenter origin so dev fetches go through the Vite proxy: the CSV
  // host sends no CORS headers, so an absolute cross-origin fetch is blocked in dev.
  // BASE_URL re-adds the absolute origin in the built extension (host_permissions).
  const path = url.replace(/^https?:\/\/racecenter\.letour\.fr/i, '');
  const full = path.startsWith('http') ? path : BASE_URL + path;
  const res = await fetch(full);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}
